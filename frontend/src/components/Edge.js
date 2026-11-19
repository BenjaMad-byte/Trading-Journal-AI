import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { edgeReportApi } from '../api';
import DateRangePicker from './DateRangePicker';

const fmt$ = (v) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: '20px 24px 24px' }}>
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function NoData({ msg }) {
  return (
    <div className="empty" style={{ padding: '24px 0' }}>
      {msg || 'Pas encore assez de données.'}
    </div>
  );
}

const barTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value || 0;
  return (
    <div style={{
      background: 'var(--surface-control)', border: '1px solid var(--divider-strong)',
      borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 13, boxShadow: 'var(--shadow-dropdown)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
      <div className="num" style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
};


export function RMultipleDist({ data }) {
  if (!data || data.every(d => d.count === 0)) return <NoData msg="Aucune donnée de Multiple R. Enregistre le stop loss et renseigne le Multiple R par trade." />;
  const filtered = data.filter(d => d.count > 0);
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={filtered} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider-soft)" />
        <XAxis dataKey="bucket" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false}
          tickFormatter={v => `${Number(v) >= 0 ? '+' : ''}${v}R`} />
        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
        <ReferenceLine x="0" stroke="var(--divider-strong)" />
        <Tooltip content={barTip} cursor={{ fill: 'var(--surface-hover)' }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {filtered.map((entry, i) => (
            <Cell key={i} fill={Number(entry.bucket) >= 0 ? 'var(--result-pos)' : 'var(--result-neg)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmotionTable({ data }) {
  if (!data || data.length === 0) return <NoData msg="Aucune donnée émotionnelle. Enregistre l'état émotionnel par trade." />;

  return (
    <div className="scroll-x">
    <table style={{ minWidth: 520 }}>
      <thead>
        <tr>
          {['État', 'Trades', 'Taux de réussite', 'P&L moyen', 'R moyen'].map(h => (
            <th key={h} className={h === 'État' ? undefined : 'num'}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => {
          const pnlColor = row.avg_pnl >= 0 ? 'var(--result-pos)' : 'var(--result-neg)';
          const wr = row.win_rate;
          const wrColor = wr >= 55 ? 'var(--result-pos)' : wr >= 40 ? 'var(--caution)' : 'var(--result-neg)';
          return (
            <tr key={i}>
              <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {row.state}
              </td>
              <td className="num">{row.trade_count}</td>
              <td className="num" style={{ color: wrColor, fontWeight: 600 }}>
                {wr.toFixed(1)}%
              </td>
              <td className="num" style={{ color: pnlColor, fontWeight: 600 }}>
                {row.avg_pnl >= 0 ? '+' : '-'}{fmt$(Math.abs(row.avg_pnl))}
              </td>
              <td className="num" style={{ color: row.avg_r != null ? (row.avg_r >= 0 ? 'var(--result-pos)' : 'var(--result-neg)') : 'var(--text-secondary)' }}>
                {row.avg_r != null ? `${row.avg_r >= 0 ? '+' : ''}${row.avg_r.toFixed(2)}R` : 'n/a'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

export function MistakeFreq({ data }) {
  if (!data || data.length === 0) return <NoData msg="Aucune donnée d'erreur. Tague les erreurs par trade." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider-soft)" horizontal={false} />
        <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="mistake" tick={{ fill: 'var(--text-secondary)', fontSize: 12.5 }} axisLine={false} tickLine={false} width={170} />
        <Tooltip content={barTip} cursor={{ fill: 'var(--surface-hover)' }} />
        <Bar dataKey="count" fill="var(--caution)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HoldTime({ data }) {
  if (!data || (data.winners_avg_min == null && data.losers_avg_min == null)) {
    return <NoData msg="Pas encore assez de données de timing de trade." />;
  }
  const bars = [
    { label: 'Gagnants', value: data.winners_avg_min, fill: 'var(--result-pos)' },
    { label: 'Perdants', value: data.losers_avg_min, fill: 'var(--result-neg)' },
  ].filter(b => b.value != null);

  const fmtMin = (m) => {
    if (m == null) return 'n/d';
    if (m < 60) return `${Math.round(m)}m`;
    return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', paddingTop: 8 }}>
      {bars.map(b => (
        <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '1 1 120px' }}>
          <div className="num" style={{ fontSize: 30, fontWeight: 600, fontFamily: 'var(--font-display)', color: b.fill, lineHeight: 1 }}>
            {fmtMin(b.value)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Durée moy. ({b.label.toLowerCase()})</div>
        </div>
      ))}
      {bars.length === 2 && bars[1].value != null && bars[0].value != null && (
        <div style={{ flex: '1 1 160px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {bars[1].value > bars[0].value
            ? `Tu gardes tes perdants ${(bars[1].value / bars[0].value).toFixed(1)}x plus longtemps que tes gagnants. Pense à couper les pertes plus vite.`
            : `Tu gardes tes gagnants ${(bars[0].value / bars[1].value).toFixed(1)}x plus longtemps que tes perdants. Bonne discipline, tu laisses courir les gains.`}
        </div>
      )}
    </div>
  );
}

export default function Edge({ accountId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (accountId != null) params.account_id = accountId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    edgeReportApi.get(params)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [accountId, dateFrom, dateTo]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Analyses Edge</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {data ? `${data.total_trades || 0} trades` : 'Chargement...'}
            {data?.expectancy != null && (
              <span style={{ marginLeft: 12, color: data.expectancy >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                Espérance : {data.expectancy >= 0 ? '+' : ''}{fmt$(data.expectancy)}/trade
              </span>
            )}
          </div>
        </div>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={({ dateFrom: f, dateTo: t }) => { setDateFrom(f); setDateTo(t); }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Distribution du Multiple R">
              <RMultipleDist data={data?.r_multiple_dist} />
            </Section>
            <Section title="Durée de détention, Gagnants vs Perdants">
              <HoldTime data={data?.hold_time} />
            </Section>
          </div>

          <Section title="Émotion vs résultat">
            <EmotionTable data={data?.emotion_outcomes} />
          </Section>

          <Section title="Fréquence des erreurs">
            <MistakeFreq data={data?.mistake_frequency} />
          </Section>
        </div>
      )}
    </div>
  );
}
