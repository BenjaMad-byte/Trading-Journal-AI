import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area,
} from 'recharts';
import { reportsApi, edgeReportApi } from '../api';
import DateRangePicker from './DateRangePicker';
import { RMultipleDist, EmotionTable, MistakeFreq, HoldTime } from './Edge';
import { PageHeader, PanelHead } from './ui';
import { Measures, Seg } from '../v3/parts';

const fmt$ = (v) =>
  `${v < 0 ? '-' : ''}$${Math.abs(Number(v || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const signed$ = (v) => `${Number(v) > 0 ? '+' : ''}${fmt$(v)}`;
const tone = (v) => (Number(v) > 0 ? 'pos' : Number(v) < 0 ? 'neg' : '');
const AXIS_TICK = { fontSize: 11, fill: 'var(--text-secondary)' };

/* Rows under this many trades are demoted: a one-trade strategy at 100% and
   an infinite profit factor is noise, and sorting by net puts it on top. */
export const THIN_SAMPLE = 10;

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'setups', label: 'Setups et stratégie' },
  { id: 'sources-tags', label: 'Sources et tags' },
  { id: 'timing', label: 'Horaire' },
  { id: 'execution', label: 'Exécution' },
  { id: 'symbols', label: 'Symboles' },
  { id: 'psychology', label: 'Psychologie' },
];

// Strategy and source tags mirror their own fields, so the tag report skips them.
const TAG_TYPE_ORDER = ['mistake', 'execution', 'setup', 'emotion', 'outcome'];
const TAG_TYPE_LABEL = { mistake: 'Erreurs', execution: 'Exécution', setup: 'Setup', emotion: 'Émotion', outcome: 'Résultat' };

function Section({ title, hint, children }) {
  return (
    <section className="card">
      <PanelHead title={title} sub={hint} />
      {children}
    </section>
  );
}

function NoData({ msg }) {
  return (
    <div className="empty">
      {msg || 'Pas encore assez de données.'}
    </div>
  );
}

/* Every /api/reports bucket has the same shape, so one table renders all of them. */
function BucketTable({ rows, labelHead = 'Catégorie', sortByPnl = false, max }) {
  if (!rows || !rows.length) return <NoData />;
  let data = sortByPnl ? [...rows].sort((a, b) => b.net_pnl - a.net_pnl) : rows;
  if (max) data = data.slice(0, max);

  const best = Math.max(...data.map(r => Math.abs(r.net_pnl)), 1);

  return (
    <div className="scroll-x" style={{ margin: '0 -24px' }}>
      <table style={{ minWidth: 820 }}>
        <thead>
          <tr>
            <th style={{ paddingLeft: 24 }}>{labelHead}</th>
            <th className="num">Trades</th>
            <th className="num">Réussite %</th>
            <th className="num">P&amp;L net</th>
            <th className="num">Moy.</th>
            <th className="num">Moy. Gain</th>
            <th className="num">Moy. Perte</th>
            <th className="num">FP</th>
            <th className="num">Effic. sortie</th>
            <th style={{ width: 120, paddingRight: 24 }}><span className="sr-only">Taille relative</span></th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => {
            const pos = r.net_pnl >= 0;
            return (
              <tr key={r.key} className={r.trades < THIN_SAMPLE ? 'thin' : undefined}>
                <td style={{ paddingLeft: 24, fontWeight: 600 }}>
                  {r.label}
                  {r.trades < THIN_SAMPLE && (
                    <span className="v3-thin" title={`Moins de ${THIN_SAMPLE} trades, à traiter comme du bruit`}>faible</span>
                  )}
                </td>
                <td className="num text-muted">{r.trades}</td>
                <td className="num">{r.win_rate}%</td>
                <td className={`num ${tone(r.net_pnl)}`} style={{ fontWeight: 600 }}>
                  {signed$(r.net_pnl)}
                </td>
                <td className={`num ${tone(r.avg_pnl)}`}>
                  {signed$(r.avg_pnl)}
                </td>
                <td className="num text-muted">{signed$(r.avg_win)}</td>
                <td className="num text-muted">{fmt$(r.avg_loss)}</td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {r.profit_factor == null ? <span className="text-muted" title="Aucun trade perdant dans cette ligne">&mdash;</span> : r.profit_factor.toFixed(2)}
                </td>
                <td className="num text-muted">
                  {r.exit_efficiency == null ? '-' : `${r.exit_efficiency}%`}
                </td>
                <td style={{ paddingRight: 24 }} aria-hidden="true">
                  <div style={{ background: 'var(--surface-inset)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.abs(r.net_pnl) / best * 100}%`, height: '100%',
                      background: pos ? 'var(--result-pos)' : 'var(--result-neg)', borderRadius: 3,
                    }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* One breakdown, drawn either way. The page holds a single view mode, so the
   switch at the top flips every section at once rather than per section. */
function Breakdown({ view, rows, labelHead, sortByPnl, max, height }) {
  if (!rows || !rows.length) return <NoData />;
  return view === 'table'
    ? <BucketTable rows={rows} labelHead={labelHead} sortByPnl={sortByPnl} max={max} />
    : <BucketBars rows={sortByPnl ? [...rows].sort((a, b) => b.net_pnl - a.net_pnl).slice(0, max || 24) : rows} height={height} />;
}

/* Net P&L bars for an ordered bucket list (timing charts read better than a table). */
function BucketBars({ rows, height = 240 }) {
  if (!rows || !rows.length) return <NoData />;
  const data = rows.map(r => ({ name: r.label, pnl: r.net_pnl, trades: r.trades, wr: r.win_rate }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--divider-soft)" vertical={false} />
        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false}
               tickFormatter={(v) => fmt$(v)} width={62} />
        <Tooltip
          cursor={{ fill: 'var(--accent-soft)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="card" style={{ padding: '8px 12px', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div className={`num ${tone(d.pnl)}`} style={{ fontWeight: 600 }}>
                  {signed$(d.pnl)}
                </div>
                <div className="text-muted">{d.trades} trades · {d.wr}% de réussite</div>
              </div>
            );
          }}
        />
        <ReferenceLine y={0} stroke="var(--divider)" />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl >= 0 ? 'var(--result-pos)' : 'var(--result-neg)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EquityCurve({ curve }) {
  if (!curve || curve.length < 2) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={curve} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-line)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--accent-line)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--divider-soft)" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK}
               axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={AXIS_TICK} axisLine={false}
               tickLine={false} tickFormatter={(v) => fmt$(v)} width={68} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="card" style={{ padding: '8px 12px', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div>Capital : <b className="num">{fmt$(d.cumulative)}</b></div>
                <div className={`num ${tone(d.pnl)}`}>
                  Jour : {signed$(d.pnl)}
                </div>
                {d.drawdown < 0 && (
                  <div className="num neg">Drawdown : {fmt$(d.drawdown)}</div>
                )}
              </div>
            );
          }}
        />
        <ReferenceLine y={0} stroke="var(--divider)" />
        <Area type="monotone" dataKey="cumulative" stroke="var(--accent-line)" strokeWidth={2}
              fill="url(#eqGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DrawdownCurve({ curve }) {
  if (!curve || curve.length < 2) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={curve} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--result-neg)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--result-neg)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--divider-soft)" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK}
               axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={AXIS_TICK} axisLine={false}
               tickLine={false} tickFormatter={(v) => fmt$(v)} width={68} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="card" style={{ padding: '8px 12px', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div className="num neg">{fmt$(payload[0].value)} sous le pic</div>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="drawdown" stroke="var(--result-neg)" strokeWidth={1.5}
              fill="url(#ddGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Reports({ accountId }) {
  // one view mode for the whole page: you are either scanning or reading numbers
  const [view, setView] = useState('bars');
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [edge, setEdge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (accountId != null) params.account_id = accountId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    Promise.all([
      reportsApi.get(params).then(r => r.data).catch(() => null),
      edgeReportApi.get(params).then(r => r.data).catch(() => null),
    ]).then(([rep, edg]) => {
      setData(rep && rep.has_data ? rep : null);
      setEdge(edg);
      setLoading(false);
    });
  }, [accountId, dateFrom, dateTo]);

  const s = data?.summary;
  const gap = { display: 'flex', flexDirection: 'column', gap: 20 };

  return (
    <div>
      <PageHeader
        title="Rapports"
        subtitle={loading ? 'Chargement...' : data
          ? `${data.trade_count.toLocaleString('en-US')} trades sur ${s.trading_days} séances`
          : 'Aucun trade dans cette période'}
        actions={
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={({ dateFrom: f, dateTo: t }) => { setDateFrom(f); setDateTo(t); }}
          />
        }
      />

      <div className="tabs" role="tablist" aria-label="Sections du rapport" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            type="button"
            role="tab"
            id={`report-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="report-panel"
            tabIndex={tab === t.id ? 0 : -1}
            key={t.id}
            className="tab"
            onClick={() => setTab(t.id)}
            onKeyDown={e => {
              const i = TABS.findIndex(x => x.id === tab);
              if (e.key === 'ArrowRight') { setTab(TABS[(i + 1) % TABS.length].id); }
              if (e.key === 'ArrowLeft') { setTab(TABS[(i - 1 + TABS.length) % TABS.length].id); }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 18px' }}>
        <Seg
          label="Comment afficher chaque répartition"
          value={view}
          onChange={setView}
          options={[{ id: 'bars', label: 'Barres' }, { id: 'table', label: 'Tableau' }]}
        />
      </div>

      {loading ? (
        <div style={gap}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      ) : !data ? (
        <div className="card"><NoData msg="Importez des trades pour voir les rapports." /></div>
      ) : (
        <div style={gap} role="tabpanel" id="report-panel" aria-labelledby={`report-tab-${tab}`}>

          {tab === 'overview' && (
            <>
              <Measures
                items={[
                  { label: 'P&L net', value: signed$(s.net_pnl), met: s.net_pnl >= 0,
                    read: `${s.green_days} séances vertes contre ${s.red_days} rouges` },
                  { label: 'Drawdown max', value: fmt$(s.max_drawdown), tone: 'neg',
                    read: `Le plus profond le ${s.max_drawdown_date}` },
                  { label: 'Jours verts', value: `${s.green_days} / ${s.trading_days}`,
                    met: s.green_days > s.trading_days / 2,
                    read: `${Math.round(s.green_days / s.trading_days * 100)}% des séances clôturées en hausse` },
                  { label: 'Meilleur jour', value: signed$(s.best_day), met: true, read: 'Votre meilleure séance' },
                  { label: 'Pire jour', value: fmt$(s.worst_day), tone: 'neg', read: 'Votre pire séance' },
                  { label: 'Moy. jour vert', value: signed$(s.avg_green_day), met: true,
                    read: `Contre un jour rouge moyen de ${fmt$(s.avg_red_day)}` },
                  { label: 'Plus longue série', value: `${s.longest_win_streak}G`, met: true,
                    read: `Pire série ${s.longest_loss_streak}P` },
                  { label: 'Trades / jour', value: String(s.avg_trades_per_day), read: 'Sur toutes les séances de la période' },
                ]}
              />

              <div className="grid-2-1">
                <Section title="Courbe de capital" hint="P&L net cumulé par jour de trading.">
                  <EquityCurve curve={data.equity_curve} />
                </Section>

                <Section title="Drawdown" hint="Distance sous le pic de capital en cours. C'est le chiffre que surveille une prop firm.">
                  <DrawdownCurve curve={data.equity_curve} />
                </Section>
              </div>

              <Section title="Performance mensuelle">
                <Breakdown view={view} rows={data.by_month} labelHead="Mois" height={260} />
              </Section>
            </>
          )}

          {tab === 'setups' && (
            <>
              <Section title="Par setup" hint="Les setups de votre playbook que vous avez tagués sur vos trades.">
                <Breakdown view={view} rows={data.by_setup} labelHead="Setup" sortByPnl />
              </Section>
              <Section title="Par note de setup" hint="De A++ à F. Une échelle monotone signifie que la notation est fiable.">
                <Breakdown view={view} rows={data.by_grade} labelHead="Note" />
              </Section>
              <Section title="Par stratégie" hint="Ce que l'analyse du journal a identifié pour le trade.">
                <Breakdown view={view} rows={data.by_strategy} labelHead="Stratégie" sortByPnl max={20} />
              </Section>
              <div className="grid-2">
                <Section title="Par instrument">
                  <Breakdown view={view} rows={data.by_instrument} labelHead="Type" sortByPnl />
                </Section>
                <Section title="Long vs Short">
                  <Breakdown view={view} rows={data.by_side} labelHead="Côté" sortByPnl />
                </Section>
              </div>
            </>
          )}

          {tab === 'sources-tags' && (
            <>
              <Section title="Par source" hint="D'où vient l'idée ou l'alerte. Chaque trade a une seule source.">
                <Breakdown view={view} rows={data.by_source || []} labelHead="Source" sortByPnl />
              </Section>
              {TAG_TYPE_ORDER.filter(t => (data.by_tag || {})[t]?.length).map((t, i) => (
                <Section
                  key={t}
                  title={`Tags : ${TAG_TYPE_LABEL[t]}`}
                  hint={i === 0 ? 'Un trade avec plusieurs tags est compté dans chacun d\'eux, donc les lignes de tags ne s\'additionnent pas à votre P&L net.' : undefined}
                >
                  <Breakdown view={view} rows={data.by_tag[t]} labelHead="Tag" sortByPnl />
                </Section>
              ))}
              {!Object.keys(data.by_tag || {}).length && (
                <Section title="Tags"><div className="empty">Aucun trade tagué sur cette période.</div></Section>
              )}
            </>
          )}

          {tab === 'timing' && (
            <>
              <Section title="Par jour de la semaine">
                <Breakdown view={view} rows={data.by_day_of_week} labelHead="Jour" />
              </Section>
              <Section title="Par heure de la journée" hint="Regroupé sur la première entrée.">
                <Breakdown view={view} rows={data.by_session} labelHead="Fenêtre d'entrée" />
              </Section>
              <Section title="Par durée de détention" hint="De la première entrée à la dernière sortie. Les détentions courtes sont généralement des stops ou des poursuites de prix.">
                <Breakdown view={view} rows={data.by_hold_time} labelHead="Détention" />
              </Section>
            </>
          )}

          {tab === 'execution' && (
            <>
              <Section title="Sortie échelonnée vs tout-ou-rien"
                       hint="Trades avec plusieurs sorties vs une seule sortie.">
                <Breakdown view={view} rows={data.by_management} labelHead="Gestion" height={200} />
              </Section>
              <div className="grid-2">
                <Section title="Distribution du Multiple R" hint="R réalisé par trade, d'après l'analyse du journal.">
                  <RMultipleDist data={edge?.r_multiple_dist} />
                </Section>
                <Section title="Durée de détention : gagnants vs perdants">
                  <HoldTime data={edge?.hold_time} />
                </Section>
              </div>
              <Section title="Efficacité de sortie par setup"
                       hint="Pourcentage de l'excursion favorable maximale réellement capturé, gagnants uniquement. 40-60% est une plage normale pour un day trader discrétionnaire.">
                <Breakdown view={view} rows={data.by_setup} labelHead="Setup" sortByPnl />
              </Section>
            </>
          )}

          {tab === 'symbols' && (
            <Section title="Par symbole" hint="Top 40 par P&L net. Attention si un seul symbole porte tout le compte.">
              <Breakdown view={view} rows={data.by_symbol} labelHead="Symbole" sortByPnl />
            </Section>
          )}

          {tab === 'psychology' && (
            <>
              <Section title="Par état émotionnel" hint="Auto-déclaré dans le journal. Les lignes « revanche » et « frustré » sont celles à surveiller.">
                <Breakdown view={view} rows={data.by_emotion} labelHead="Émotion" sortByPnl />
              </Section>
              <Section title="Émotion vs résultat">
                <EmotionTable data={edge?.emotion_outcomes} />
              </Section>
              <Section title="Fréquence des erreurs">
                <MistakeFreq data={edge?.mistake_frequency} />
              </Section>
            </>
          )}

        </div>
      )}
    </div>
  );
}
