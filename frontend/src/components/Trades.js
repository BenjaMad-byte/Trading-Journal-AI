import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { tradesApi } from '../api';
import TradeRow from './TradeRow';
import { PageHeader, KpiStrip, KpiCell, MoneyValue } from './ui';

const PAGE_SIZE = 25;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} ${Number(day)}, ${y}`;
};

function getOpenTime(trade) {
  const execs = trade.executions || [];
  if (!execs.length) return '';
  return [...execs].sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0].time || '';
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronDown size={12} style={{ opacity: 0.35 }} aria-hidden="true" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} aria-hidden="true" />
    : <ChevronDown size={12} aria-hidden="true" />;
}

export default function Trades({ accountId, initialDateFrom = '', initialDateTo = '', onOpenDetail }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [customSetups, setCustomSetups] = useState([]);
  const reloadCustomSetups = useCallback(async () => {
    try {
      const res = await tradesApi.listCustomSetups();
      setCustomSetups(res.data || []);
    } catch { /* dropdown still works with the built-in setups */ }
  }, []);
  useEffect(() => { reloadCustomSetups(); }, [reloadCustomSetups]);

  const [sortCol, setSortCol] = useState('datetime');
  const [sortDir, setSortDir] = useState('desc');

  const [ticker, setTicker] = useState('');
  const [instrType, setInstrType] = useState('');
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  // A slow reply from an earlier filter must not overwrite the newest one.
  const loadRun = useRef(0);
  const load = useCallback(async () => {
    const run = ++loadRun.current;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (accountId != null) params.account_id = accountId;
      if (ticker) params.ticker = ticker;
      if (instrType) params.instrument_type = instrType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await tradesApi.list(params);
      if (run !== loadRun.current) return;
      setTrades(res.data);
    } catch (e) {
      if (run !== loadRun.current) return;
      setError(e.message);
    } finally {
      if (run === loadRun.current) setLoading(false);
    }
  }, [accountId, ticker, instrType, dateFrom, dateTo]);

  useEffect(() => { load(); setPage(1); }, [load]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'datetime' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const sorted = [...trades].sort((a, b) => {
    let av, bv;
    switch (sortCol) {
      case 'datetime':
        av = (a.date || '') + '|' + getOpenTime(a);
        bv = (b.date || '') + '|' + getOpenTime(b);
        break;
      case 'ticker': av = a.ticker || ''; bv = b.ticker || ''; break;
      case 'side': av = a.side || ''; bv = b.side || ''; break;
      case 'type': av = a.instrument_type || ''; bv = b.instrument_type || ''; break;
      case 'net_pnl': av = a.net_pnl ?? 0; bv = b.net_pnl ?? 0; break;
      case 'r_multiple': av = a.r_multiple ?? -999; bv = b.r_multiple ?? -999; break;
      default: av = a.date || ''; bv = b.date || '';
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalNet = trades.reduce((s, t) => s + (t.net_pnl || 0), 0);
  const winners = trades.filter(t => (t.net_pnl || 0) > 0).length;
  const winRate = trades.length ? (winners / trades.length * 100).toFixed(1) : 0;

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const firstShown = sorted.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(page * PAGE_SIZE, sorted.length);

  const period = dateFrom || dateTo
    ? `${dateFrom ? fmtDay(dateFrom) : 'Début'} au ${dateTo ? fmtDay(dateTo) : "aujourd'hui"}`
    : 'Toutes les dates';

  // Plain render function (not a component) so headers keep focus across re-sorts.
  const sortTh = (col, label, className) => (
    <th key={col} className={className} aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => handleSort(col)} data-active={sortCol === col ? 'true' : undefined}>
        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader
        title="Trades"
        subtitle="Cliquez sur une ligne pour ouvrir le trade. La colonne Setup est modifiable directement."
      />

      <KpiStrip label="Résumé des trades filtrés">
        <KpiCell label="Période sélectionnée" value={<span style={{ fontSize: 22 }}>{period}</span>} />
        <KpiCell label="P&L net" value={<MoneyValue value={totalNet} />} tone={totalNet >= 0 ? 'pos' : 'neg'} />
        <KpiCell label="Trades" value={<span className="num">{trades.length.toLocaleString('en-US')}</span>} />
        <KpiCell label="Taux de réussite" value={<span className="num">{winRate}%</span>} foot={<><span className="num">{winners}</span> gains</>} />
      </KpiStrip>

      {/* Filter bar */}
      <div role="search" aria-label="Filtrer les trades" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="field-label" htmlFor="tv-ticker">Symbole</label>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} aria-hidden="true" />
            <input
              id="tv-ticker"
              placeholder="Symbole..."
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              style={{ paddingLeft: 32, width: 170 }}
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="tv-type">Type</label>
          <select id="tv-type" value={instrType} onChange={e => setInstrType(e.target.value)} style={{ width: 140 }}>
            <option value="">Tous les types</option>
            <option value="STOCK">Action</option>
            <option value="OPTION">Option</option>
            <option value="FUTURE">Future</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="tv-from">Du</label>
          <input id="tv-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 160 }} />
        </div>
        <div>
          <label className="field-label" htmlFor="tv-to">Au</label>
          <input id="tv-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 160 }} />
        </div>
        {(ticker || instrType || dateFrom || dateTo) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setTicker(''); setInstrType(''); setDateFrom(''); setDateTo(''); }}
          >
            Effacer
          </button>
        )}
      </div>

      {error && (
        <div className="notice neg" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <section className="card panel-flush" aria-label="Trades">
        <div className="table-container">
          <table style={{ minWidth: 980 }}>
            <thead>
              <tr>
                {sortTh('datetime', 'Date / Heure')}
                {sortTh('ticker', 'Symbole')}
                {sortTh('type', 'Type')}
                {sortTh('side', 'Sens')}
                {sortTh('net_pnl', 'P&L net', 'num')}
                <th>Setup / Stratégie</th>
                <th title="MFE / MAE / efficacité de sortie : meilleur gain atteint, pire perte atteinte, et la part du mouvement capturée">MFE / MAE / Sortie</th>
                {sortTh('r_multiple', 'R', 'num')}
                <th><span className="sr-only">Développer</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
                    Aucun trade trouvé. Importez un CSV pour commencer.
                  </td>
                </tr>
              ) : (
                paginated.map(trade => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    openTime={getOpenTime(trade)}
                    onOpenDetail={(t) => onOpenDetail(t, paginated)}
                    customSetups={customSetups}
                    onCustomSetupsChanged={reloadCustomSetups}
                    onTradeDeleted={load}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          gap: 8, padding: '12px 20px', borderTop: '1px solid var(--divider-soft)',
        }}>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Affichage de <span className="num">{firstShown}-{lastShown}</span> sur <span className="num">{sorted.length}</span> trades
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                ← Précédent
              </button>
              <span className="text-muted num" style={{ fontSize: 13 }}>Page {page} sur {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Suivant →
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
