import { useState, useEffect, useCallback, useRef } from 'react';
import { kpisApi, tradesApi, edgeReportApi, goalsApi } from '../api';
import DateRangePicker from './DateRangePicker';
import DashboardRender from '../v3/DashboardRender';
import {
  PageHeader, } from './ui';

const MONTHS_SHORT = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const fmtLong = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} ${Number(day)}, ${y}`;
};

// ── Goals Panel ───────────────────────────────────────────────────────────────

const GOAL_FIELDS = [
  { key: 'win_rate',         label: 'Taux de réussite trade %',  suffix: '%',  step: 1,   min: 0, max: 100 },
  { key: 'profit_factor',    label: 'Facteur de profit',         suffix: '',   step: 0.1, min: 0 },
  { key: 'day_win_rate',     label: 'Taux de réussite jour %',   suffix: '%',  step: 1,   min: 0, max: 100 },
  { key: 'expectancy',       label: 'Espérance ($)',             prefix: '$',  suffix: '', step: 5, min: 0 },
  { key: 'avg_win_loss_ratio', label: 'Ratio Gain/Perte moyen',  suffix: '',  step: 0.1, min: 0 },
];

function GoalsPanel({ draft, onChange, onSave, onCancel, accountLabel, saving, error }) {
  return (
    <section className="card" style={{ marginBottom: 20, boxShadow: 'inset 0 0 0 1px var(--accent-line-soft), var(--shadow-card)' }} aria-labelledby="goals-title">
      <div className="panel-head" style={{ marginBottom: 14 }}>
        <div>
          <h2 id="goals-title" className="section-title">Objectifs</h2>
          <div className="section-sub">S'applique à {accountLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Annuler</button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
      {error && (
        <div className="notice neg" role="alert" style={{ marginBottom: 14 }}>
          Impossible d'enregistrer les objectifs : {error}. Vos modifications sont toujours là, réessaie.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {GOAL_FIELDS.map(f => (
          <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="field-label" style={{ marginBottom: 0 }}>{f.label}</span>
            <input
              type="number"
              step={f.step}
              min={f.min}
              max={f.max}
              value={draft?.[f.key] ?? ''}
              onChange={e => onChange({ ...draft, [f.key]: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function Dashboard({ accountId, accounts = [], selectedAccountId, onDayClick, onOpenDetail, onViewAllTrades }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openPositions, setOpenPositions] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [closingPos, setClosingPos] = useState(null);
  const [closePrice, setClosePrice] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [closeTime, setCloseTime] = useState('16:00');
  const [closeCommission, setCloseCommission] = useState('0');
  const [closeError, setCloseError] = useState(null);
  const [closeSubmitting, setCloseSubmitting] = useState(false);
  const [edgeReport, setEdgeReport] = useState(null);
  const [goals, setGoals] = useState(null);
  const [showGoals, setShowGoals] = useState(false);
  const [goalsDraft, setGoalsDraft] = useState(null);
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsError, setGoalsError] = useState(null);
  // Bumped after a write so every panel refetches; also drives Retry.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  // Each effect run takes a ticket; a response that is not the newest is dropped,
  // so a slow reply cannot overwrite a newer account or date selection.
  const kpiRun = useRef(0);
  const positionsRun = useRef(0);

  useEffect(() => {
    const run = ++kpiRun.current;
    const current = () => run === kpiRun.current;
    setLoading(true);
    setError(null);
    const params = {};
    if (accountId != null) params.account_id = accountId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    kpisApi.get(params)
      .then(r => { if (current()) { setKpis(r.data); setLoading(false); } })
      .catch(e => { if (current()) { setError(e.message); setLoading(false); } });

    edgeReportApi.get(params)
      .then(r => { if (current()) setEdgeReport(r.data); })
      .catch(() => { if (current()) setEdgeReport(null); });
  }, [accountId, dateFrom, dateTo, reloadKey]);

  useEffect(() => {
    const params = {};
    if (accountId != null) params.account_id = accountId;
    goalsApi.get(params).then(r => setGoals(r.data)).catch(() => {});
  }, [accountId]);

  const openCloseModal = (pos) => {
    const execs = pos.executions || [];
    const side = (pos.side || 'LONG').toUpperCase();
    const entryAction = side === 'LONG' ? 'BOT' : 'SOLD';
    const exitAction  = side === 'LONG' ? 'SOLD' : 'BOT';
    const entryQty = execs.filter(e => e.action === entryAction).reduce((s, e) => s + (e.qty || 0), 0);
    const exitQty  = execs.filter(e => e.action === exitAction).reduce((s, e) => s + (e.qty || 0), 0);
    // Default to today, never a hard-coded date, and never before the last fill.
    const lastFill = execs.map(e => e.date).filter(Boolean).sort().pop();
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setClosingPos({
      id: pos.id, ticker: pos.ticker, side, openQty: entryQty - exitQty, exitAction,
      lastFillDate: lastFill || pos.date,
    });
    setClosePrice('');
    setCloseDate(lastFill && lastFill > localToday ? lastFill : localToday);
    setCloseTime('16:00');
    setCloseCommission('0');
    setCloseError(null);
  };

  const handleClosePosition = async () => {
    if (!closingPos || !closePrice || !closeDate) return;
    const price = parseFloat(closePrice);
    const commission = closeCommission === '' ? 0 : parseFloat(closeCommission);
    if (!(price > 0)) { setCloseError('Entre un prix de sortie supérieur à 0.'); return; }
    if (Number.isNaN(commission) || commission < 0) { setCloseError('Les frais ne peuvent pas être négatifs.'); return; }
    if (closingPos.lastFillDate && closeDate < closingPos.lastFillDate) {
      setCloseError(`La sortie ne peut pas être antérieure au dernier remplissage du ${closingPos.lastFillDate}.`);
      return;
    }
    setCloseSubmitting(true);
    setCloseError(null);
    try {
      await tradesApi.addExecution(closingPos.id, {
        action: closingPos.exitAction,
        qty: closingPos.openQty,
        price,
        date: closeDate,
        time: `${(closeTime || '16:00').slice(0, 5)}:00`,
        commission,
      });
      setClosingPos(null);
      // The exit changes P&L, the calendar and recent trades, so refetch them all.
      reload();
    } catch (e) {
      setCloseError(e.response?.data?.detail || e.message);
    } finally {
      setCloseSubmitting(false);
    }
  };

  const handleSaveGoals = () => {
    const payload = { ...goalsDraft };
    if (accountId != null) payload.account_id = accountId;
    setGoalsSaving(true);
    setGoalsError(null);
    goalsApi.put(payload)
      .then(r => { setGoals(r.data); setShowGoals(false); })
      .catch(e => setGoalsError(e.response?.data?.detail || e.message))
      .finally(() => setGoalsSaving(false));
  };

  useEffect(() => {
    const run = ++positionsRun.current;
    const current = () => run === positionsRun.current;
    const params = { open_only: true };
    if (accountId != null) params.account_id = accountId;
    tradesApi.list(params)
      .then(r => { if (current()) setOpenPositions(r.data); })
      .catch(() => { if (current()) setOpenPositions([]); });

    const recentParams = { limit: 5 };
    if (accountId != null) recentParams.account_id = accountId;
    tradesApi.list(recentParams)
      .then(r => { if (current()) setRecentTrades(r.data); })
      .catch(() => { if (current()) setRecentTrades([]); });
  }, [accountId, reloadKey]);

  const accountLabel = (() => {
    const a = accounts.find(x => x.id === selectedAccountId);
    return a ? a.name : 'Tous les comptes';
  })();

  const { daily_pnl = [] } = kpis || {};
  const span = daily_pnl.length
    ? `${fmtLong(daily_pnl[0].date)} to ${fmtLong(daily_pnl[daily_pnl.length - 1].date)}`
    : null;

  if (error) return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle={accountLabel}
        actions={<DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={({ dateFrom: f, dateTo: t }) => { setDateFrom(f); setDateTo(t); }}
        />}
      />
      <div className="notice neg" role="alert" style={{ alignItems: 'center' }}>
        <span style={{ flex: 1 }}>Impossible de charger le tableau de bord : {error}. Aucun trade n'a été modifié.</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>Réessayer</button>
      </div>
    </div>
  );

  return (
    <div>
      {loading ? (
        <div className="v3-band"><div className="v3-empty">Chargement…</div></div>
      ) : (
        <DashboardRender
          kpis={kpis}
          goals={goals}
          accountLabel={accountLabel}
          span={span}
          dateFrom={dateFrom}
          dateTo={dateTo}
          accountId={accountId}
          onDayClick={onDayClick}
          onOpenDetail={onOpenDetail}
          onViewAllTrades={onViewAllTrades}
          openPositions={openPositions}
          recentTrades={recentTrades}
          edgeReport={edgeReport}
          showGoals={showGoals}
          onToggleGoals={() => { setGoalsDraft({ ...goals }); setShowGoals(v => !v); }}
          goalsNode={showGoals ? (
            <GoalsPanel
              saving={goalsSaving}
              error={goalsError}
              draft={goalsDraft}
              onChange={setGoalsDraft}
              onSave={handleSaveGoals}
              onCancel={() => setShowGoals(false)}
              accountLabel={accountLabel}
            />
          ) : null}
          RangePicker={(
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={({ dateFrom: f, dateTo: t }) => { setDateFrom(f); setDateTo(t); }}
            />
          )}
          closingPos={closingPos}
          setClosingPos={setClosingPos}
          closeDate={closeDate}
          setCloseDate={setCloseDate}
          closeTime={closeTime}
          setCloseTime={setCloseTime}
          closePrice={closePrice}
          setClosePrice={setClosePrice}
          closeCommission={closeCommission}
          setCloseCommission={setCloseCommission}
          closeError={closeError}
          closeSubmitting={closeSubmitting}
          handleClosePosition={handleClosePosition}
          openCloseModal={openCloseModal}
        />
      )}
    </div>
  );
}
