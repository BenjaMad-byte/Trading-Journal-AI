import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { kpisApi, insightsApi } from '../api';
import { Sparkles } from 'lucide-react';

const fmt$ = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function Strategies({ accountId }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (accountId != null) params.account_id = accountId;
    kpisApi.get(params)
      .then(r => { setKpis(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accountId]);

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const params = {};
      if (accountId != null) params.account_id = accountId;
      const res = await insightsApi.get(params);
      setInsights(res.data.insights);
    } catch (e) {
      setInsightsError(e.response?.data?.detail || e.message);
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading) return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Stratégies</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 300 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    </div>
  );

  const { by_strategy = [], by_instrument = {} } = kpis || {};

  const instrData = Object.entries(by_instrument).map(([key, val]) => ({
    name: key,
    pnl: val.net_pnl || 0,
    count: val.count || 0,
    winRate: val.count ? Math.round(val.wins / val.count * 100) : 0,
  }));

  const INST_COLORS = { STOCK: '#5bb0d7', OPTION: '#e8a95c', FUTURE: '#6bc987' };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Stratégies</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* P&L by Strategy */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>P&L par stratégie</div>
          {by_strategy.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune donnée de stratégie pour le moment. Tague les trades avec un setup de playbook dans Trades ; les stratégies extraites des entrées du journal apparaissent aussi ici.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, by_strategy.length * 36)}>
              <BarChart data={by_strategy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tickFormatter={fmt$} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis type="category" dataKey="strategy" width={130} tick={{ fill: 'var(--text)', fontSize: 12 }} />
                <Tooltip
                  formatter={(v, n) => [fmt$(v), n]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Bar dataKey="net_pnl" name="P&L net">
                  {by_strategy.map((s, i) => (
                    <Cell key={i} fill={s.net_pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* P&L by Instrument */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>P&L par type d'instrument</div>
          {instrData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune donnée d'instrument pour le moment.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={instrData}
                  dataKey="pnl"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, pnl }) => `${name}: ${fmt$(pnl)}`}
                >
                  {instrData.map((entry, i) => (
                    <Cell key={i} fill={INST_COLORS[entry.name] || '#8f9297'} />
                  ))}
                </Pie>
                <Tooltip formatter={fmt$} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Win Rate Table */}
      {by_strategy.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Tableau de performance des stratégies</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Stratégie</th>
                  <th style={{ textAlign: 'right' }}>Trades</th>
                  <th style={{ textAlign: 'right' }}>P&L net</th>
                  <th style={{ textAlign: 'right' }}>Taux de réussite</th>
                  <th style={{ textAlign: 'right' }}>R moyen</th>
                </tr>
              </thead>
              <tbody>
                {by_strategy.map((s, i) => (
                  <tr key={i}>
                    <td>{s.strategy}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{s.count}</td>
                    <td style={{ textAlign: 'right', color: s.net_pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {fmt$(s.net_pnl)}
                    </td>
                    <td style={{ textAlign: 'right', color: s.win_rate >= 50 ? 'var(--green)' : 'var(--red)' }}>
                      {s.win_rate}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {s.avg_r ? `${Number(s.avg_r).toFixed(2)}R` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>Analyses de coaching IA</div>
          <button
            className="btn btn-primary"
            onClick={handleGenerateInsights}
            disabled={loadingInsights}
          >
            {loadingInsights
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Génération...</>
              : <><Sparkles size={16} /> Générer les analyses</>
            }
          </button>
        </div>

        {insightsError && (
          <div style={{ color: 'var(--red)', fontSize: 13 }}>{insightsError}</div>
        )}

        {insights ? (
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.7,
            fontFamily: 'inherit',
          }}>
            {insights}
          </pre>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Clique sur "Générer les analyses" pour obtenir un retour de coaching personnalisé de l'IA Claude basé sur tes données de trading.
          </div>
        )}
      </div>
    </div>
  );
}
