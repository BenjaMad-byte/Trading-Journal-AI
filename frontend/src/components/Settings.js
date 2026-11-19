import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, GitMerge, Trash2, Search } from 'lucide-react';
import { libraryApi, appSettingsApi, cloudApi } from '../api';
import { PageHeader } from './ui';

const SECTIONS = [
  { id: 'general', label: 'Général' },
  { id: 'account', label: 'Compte' },
  { id: 'strategy', label: 'Stratégies' },
  { id: 'source', label: 'Sources' },
  { id: 'tag', label: 'Tags' },
];

const CLOUD_SESSION_KEY = 'lj_cloud_session';

const TAG_TYPE_LABEL = {
  mistake: 'Erreurs', execution: 'Exécution', setup: 'Setup', emotion: 'Émotion', outcome: 'Résultat',
};
const TAG_TYPE_ORDER = ['mistake', 'execution', 'setup', 'emotion', 'outcome'];

const SECTION_COPY = {
  strategy: {
    title: 'Stratégies',
    sub: 'La raison pour laquelle vous avez pris le trade, la même idée qu\'un setup.',
    noun: 'une stratégie',
  },
  source: {
    title: 'Sources',
    sub: "D'où vient l'idée ou l'alerte.",
    noun: 'une source',
  },
};

const errText = (e) => e?.response?.data?.detail || e?.response?.data?.error || e?.message || 'Une erreur est survenue';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One editable list: strategies, sources, or a single tag type. */
function ItemList({ kind, tagType = '', title, sub, noun, items, onChanged }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '' });
  const [mode, setMode] = useState(null); // { type: 'edit'|'merge'|'delete', name }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const base = { kind, tag_type: tagType };
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)) : items;
  }, [items, query]);

  const close = () => { setMode(null); setForm({}); setError(null); };
  const run = async (fn, message) => {
    setBusy(true); setError(null);
    try {
      const res = await fn();
      setNotice(message(res?.data || {}));
      close();
      await onChanged();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const startAdd = () => { close(); setAdding(true); setDraft({ name: '', description: '' }); };
  const saveAdd = () => run(
    () => libraryApi.create({ ...base, name: draft.name, description: draft.description }),
    () => { setAdding(false); return `Added "${draft.name.trim()}".`; },
  );

  const open = (type, item) => {
    setAdding(false); setError(null); setNotice(null);
    setMode({ type, name: item.name });
    if (type === 'edit') setForm({ name: item.name, description: item.description || '' });
    if (type === 'merge') setForm({ target: '' });
    if (type === 'delete') setForm({ reassign: '' });
  };

  const others = (name) => items.filter(i => i.name !== name);

  return (
    <section className="card panel-flush" aria-label={title}>
      <div className="settings-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="section-title">{title} <span className="text-muted num" style={{ fontWeight: 500, fontSize: 14 }}>{items.length}</span></h2>
          {sub && <div className="section-sub">{sub}</div>}
        </div>
        <div className="settings-tools">
          <label className="settings-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Rechercher ${title.toLowerCase()}`}
              aria-label={`Rechercher ${title.toLowerCase()}`}
            />
          </label>
          <button type="button" className="btn btn-primary btn-sm" onClick={startAdd}>
            <Plus size={14} /> Ajouter {noun}
          </button>
        </div>
      </div>

      {notice && <div className="notice pos settings-notice" role="status">{notice}</div>}

      {adding && (
        <div className="settings-form">
          <label>
            <span className="field-label">Nom</span>
            <input autoFocus value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && draft.name.trim()) saveAdd(); if (e.key === 'Escape') setAdding(false); }} />
          </label>
          <label style={{ flex: 2 }}>
            <span className="field-label">Description (facultatif)</span>
            <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </label>
          <div className="settings-form-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !draft.name.trim()} onClick={saveAdd}>Enregistrer</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setError(null); }}>Annuler</button>
          </div>
          {error && <div className="notice neg" role="alert" style={{ flexBasis: '100%' }}>{error}</div>}
        </div>
      )}

      <div className="table-container">
        <table style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: 20 }}>Nom</th>
              <th>Description</th>
              <th className="num">Trades</th>
              <th className="num" style={{ paddingRight: 20 }}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(item => {
              const active = mode && mode.name === item.name ? mode.type : null;
              const fixed = false;
              return [
                <tr key={item.name} className={active ? 'row-selected' : undefined}>
                  <td style={{ paddingLeft: 20, fontWeight: 600 }}>
                    {item.name}
                    {item.aliases?.length > 0 && (
                      <div className="text-muted" style={{ fontSize: 12.5, fontWeight: 400, marginTop: 2 }}>
                        Également enregistré sous : {item.aliases.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: 14 }}>{item.description || ''}</td>
                  <td className="num">{item.trades}</td>
                  <td className="num" style={{ paddingRight: 20, whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => open('edit', item)} aria-label={`Modifier ${item.name}`}>
                      <Pencil size={13} /> Modifier
                    </button>
                    {!fixed && (
                      <>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => open('merge', item)} aria-label={`Fusionner ${item.name} avec ${noun}`} disabled={items.length < 2}>
                          <GitMerge size={13} /> Fusionner
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--result-neg)' }} onClick={() => open('delete', item)} aria-label={`Supprimer ${item.name}`}>
                          <Trash2 size={13} /> Supprimer
                        </button>
                      </>
                    )}
                  </td>
                </tr>,
                active && (
                  <tr key={`${item.name}-panel`} className="settings-panel-row">
                    <td colSpan={4}>
                      {active === 'edit' && (
                        <div className="settings-form">
                          <label>
                            <span className="field-label">Nom</span>
                            <input value={form.name} disabled={fixed} autoFocus={!fixed}
                              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                          </label>
                          <label style={{ flex: 2 }}>
                            <span className="field-label">Description</span>
                            <input value={form.description} autoFocus={fixed}
                              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                          </label>
                          <div className="settings-form-actions">
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !String(form.name || '').trim()}
                              onClick={() => run(
                                () => libraryApi.update({ ...base, name: item.name, new_name: form.name, description: form.description }),
                                (r) => (r.name && r.name !== item.name
                                  ? `Renommé « ${item.name} » en « ${r.name} » sur ${plural(r.trades ?? item.trades, 'trade')}.`
                                  : `Enregistré « ${item.name} ».`),
                              )}>
                              Enregistrer
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Annuler</button>
                          </div>
                          {!fixed && item.trades > 0 && (
                            <div className="text-muted" style={{ flexBasis: '100%', fontSize: 13 }}>
                              Le renommage met à jour {plural(item.trades, 'trade')}.
                            </div>
                          )}
                        </div>
                      )}

                      {active === 'merge' && (
                        <div className="settings-form">
                          <label style={{ flex: 2 }}>
                            <span className="field-label">Fusionner « {item.name} » avec</span>
                            <select value={form.target} autoFocus onChange={e => setForm({ target: e.target.value })}>
                              <option value="">Choisir {noun}…</option>
                              {others(item.name).map(o => <option key={o.name} value={o.name}>{o.name} ({o.trades})</option>)}
                            </select>
                          </label>
                          <div className="settings-form-actions">
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !form.target}
                              onClick={() => run(
                                () => libraryApi.merge({ ...base, source_name: item.name, target_name: form.target }),
                                (r) => `Fusionné « ${item.name} » dans « ${form.target} » : ${plural(r.moved ?? item.trades, 'trade')} déplacé(s).`,
                              )}>
                              Fusionner
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Annuler</button>
                          </div>
                          <div className="text-muted" style={{ flexBasis: '100%', fontSize: 13 }}>
                            {form.target
                              ? `Déplace ${plural(item.trades, 'trade')} vers « ${form.target} » et supprime « ${item.name} ». Si l'IA écrit « ${item.name} » à nouveau, c'est enregistré comme « ${form.target} ».`
                              : 'Choisissez le nom à conserver.'}
                          </div>
                        </div>
                      )}

                      {active === 'delete' && (
                        <div className="settings-form">
                          {item.trades > 0 ? (
                            <label style={{ flex: 2 }}>
                              <span className="field-label">{plural(item.trades, 'trade')} utilisent « {item.name} ». Les réaffecter à</span>
                              <select value={form.reassign} autoFocus onChange={e => setForm({ reassign: e.target.value })}>
                                <option value="">Laisser vide</option>
                                {others(item.name).map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                              </select>
                            </label>
                          ) : (
                            <div style={{ flex: 2, alignSelf: 'center' }}>Supprimer « {item.name} » ? Aucun trade ne l'utilise.</div>
                          )}
                          <div className="settings-form-actions">
                            <button type="button" className="btn btn-danger btn-sm" disabled={busy}
                              onClick={() => run(
                                () => libraryApi.remove({ ...base, name: item.name, reassign_to: form.reassign || null }),
                                (r) => (r.reassigned_to
                                  ? `Supprimé « ${item.name} ». ${plural(r.affected, 'trade')} utilisent maintenant « ${r.reassigned_to} ».`
                                  : `Supprimé « ${item.name} ».${r.affected ? ` ${plural(r.affected, 'trade')} laissé(s) vide(s).` : ''}`),
                              )}>
                              Supprimer
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Annuler</button>
                          </div>
                        </div>
                      )}
                      {error && <div className="notice neg" role="alert" style={{ marginTop: 10 }}>{error}</div>}
                    </td>
                  </tr>
                ),
              ];
            })}
            {!shown.length && (
              <tr><td colSpan={4}><div className="empty">{query ? 'Aucun résultat pour cette recherche.' : `Rien dans « ${title} » pour le moment.`}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Common IANA zones a trader might realistically be importing from. Not
// exhaustive — the backend accepts any valid IANA zone name, so this list
// is just a convenient picker rather than a hard restriction.
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Est US — New York (heure de la Bourse)' },
  { value: 'America/Chicago', label: 'Centre US — Chicago' },
  { value: 'America/Denver', label: 'Montagnes US — Denver' },
  { value: 'America/Los_Angeles', label: 'Pacifique US — Los Angeles' },
  { value: 'Europe/London', label: 'Royaume-Uni — Londres' },
  { value: 'Europe/Berlin', label: 'Europe centrale — Berlin, Paris, Madrid' },
  { value: 'Europe/Bucharest', label: 'Europe de l\'Est — Bucarest, Athènes, Helsinki' },
  { value: 'Europe/Moscow', label: 'Moscou' },
  { value: 'Asia/Dubai', label: 'Dubaï' },
  { value: 'Asia/Kolkata', label: 'Inde — Mumbai, Delhi' },
  { value: 'Asia/Singapore', label: 'Singapour' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

function loadCloudSession() {
  try {
    const raw = localStorage.getItem(CLOUD_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Compte : connexion email/mot de passe (Supabase) + sauvegarde/restauration cloud du journal. */
function CloudAccount() {
  const [session, setSession] = useState(loadCloudSession);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);

  const saveSession = (s) => {
    setSession(s);
    if (s) localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(CLOUD_SESSION_KEY);
  };

  const refreshStatus = useCallback((s) => {
    if (!s) return;
    cloudApi.status({ access_token: s.access_token, refresh_token: s.refresh_token })
      .then(res => setLastBackup(res.data.last_backup))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshStatus(session); }, [session, refreshStatus]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === 'signup') {
        const res = await cloudApi.signup(email, password);
        if (res.data.access_token) {
          saveSession({ access_token: res.data.access_token, refresh_token: res.data.refresh_token, email: res.data.email });
          setNotice('Compte créé et connecté.');
        } else {
          setNotice(res.data.message);
        }
      } else {
        const res = await cloudApi.login(email, password);
        saveSession({ access_token: res.data.access_token, refresh_token: res.data.refresh_token, email: res.data.email });
      }
      setPassword('');
    } catch (e2) {
      setError(errText(e2));
    } finally {
      setBusy(false);
    }
  };

  const logout = () => { saveSession(null); setLastBackup(null); };

  const doBackup = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await cloudApi.backup({ access_token: session.access_token, refresh_token: session.refresh_token });
      setNotice('Sauvegarde envoyée.');
      refreshStatus(session);
    } catch (e2) {
      setError(errText(e2));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    if (!window.confirm('Restaurer la dernière sauvegarde cloud ? Cela remplace le journal local actuel (une copie de sécurité est gardée sur le disque).')) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await cloudApi.restore({ access_token: session.access_token, refresh_token: session.refresh_token });
      setNotice('Restauré. Rechargement...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e2) {
      setError(errText(e2));
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div className="card" style={{ padding: 'var(--space-5)', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 'var(--space-4)' }}>
          Lie le journal à une adresse email pour pouvoir le sauvegarder et le
          restaurer depuis un autre ordinateur.
        </p>
        <form onSubmit={submit} className="settings-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <label>
            <span className="field-label">Email</span>
            <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>
            <span className="field-label">Mot de passe</span>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {mode === 'signup' ? 'Créer le compte' : 'Se connecter'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(m => m === 'signup' ? 'login' : 'signup'); setError(null); }}>
              {mode === 'signup' ? "J'ai déjà un compte" : 'Créer un compte'}
            </button>
          </div>
          {error && <div className="notice neg" role="alert">{error}</div>}
          {notice && <div className="notice pos" role="status">{notice}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 'var(--space-5)', maxWidth: 480 }}>
      <h3 style={{ marginTop: 0 }}>Connecté</h3>
      <p className="text-muted" style={{ fontSize: 13 }}>{session.email}</p>
      <p className="text-muted" style={{ fontSize: 13 }}>
        Dernière sauvegarde : {lastBackup ? new Date(lastBackup).toLocaleString('fr-FR') : 'aucune'}
      </p>
      {error && <div className="notice neg" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="notice pos" role="status" style={{ marginBottom: 12 }}>{notice}</div>}
      <div className="settings-form-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={doBackup}>Sauvegarder maintenant</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={doRestore}>Restaurer dernière sauvegarde</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={logout}>Se déconnecter</button>
      </div>
    </div>
  );
}

/** General app settings: currently just the CSV import timezone. */
function GeneralSettings() {
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    appSettingsApi.get()
      .then(res => { if (!cancelled) setTimezone(res.data.import_timezone); })
      .catch(e => { if (!cancelled) setLoadError(errText(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const save = async (value) => {
    setTimezone(value);
    setSaving(true);
    setNotice(null);
    try {
      await appSettingsApi.put({ import_timezone: value });
      setNotice('Enregistré. Les trades réimportés à partir de maintenant utiliseront ce fuseau horaire.');
    } catch (e) {
      setLoadError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-5)', maxWidth: 560 }}>
      <h3 style={{ marginTop: 0 }}>Fuseau horaire d'import</h3>
      <p className="text-muted" style={{ fontSize: 13, marginBottom: 'var(--space-4)' }}>
        L'export CSV de Thinkorswim horodate les exécutions avec l'horloge
        système locale de l'application de bureau, pas l'heure de la Bourse.
        Réglez le fuseau horaire de l'ordinateur sur lequel vous tradez —
        le journal convertit chaque exécution importée à l'heure de l'Est US
        pour qu'elle corresponde correctement aux graphiques de prix et au
        calcul de durée de détention. Cela n'affecte que les trades importés
        après ce changement ; les trades déjà importés gardent leurs horaires
        existants.
      </p>

      {loadError && <div className="notice neg" role="alert" style={{ marginBottom: 12 }}>{loadError}</div>}
      {notice && <div className="notice pos" role="status" style={{ marginBottom: 12 }}>{notice}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 36, width: 320 }} />
      ) : (
        <select
          value={timezone}
          disabled={saving}
          onChange={e => save(e.target.value)}
          aria-label="Fuseau horaire d'import"
          style={{ fontSize: 14, padding: '8px 12px', minWidth: 320 }}
        >
          {!TIMEZONE_OPTIONS.some(o => o.value === timezone) && timezone && (
            <option value={timezone}>{timezone} (personnalisé)</option>
          )}
          {TIMEZONE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function Settings() {
  const [lib, setLib] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [section, setSection] = useState('strategy');

  const load = useCallback(async () => {
    try {
      const res = await libraryApi.list();
      setLib(res.data);
      setLoadError(null);
    } catch (e) {
      setLoadError(errText(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onTabKey = (e) => {
    const i = SECTIONS.findIndex(s => s.id === section);
    if (e.key === 'ArrowRight') setSection(SECTIONS[(i + 1) % SECTIONS.length].id);
    if (e.key === 'ArrowLeft') setSection(SECTIONS[(i - 1 + SECTIONS.length) % SECTIONS.length].id);
  };

  return (
    <div>
      <PageHeader
        title="Réglages"
        subtitle="Nettoyez les noms utilisés par le journal. Les renommages et fusions mettent à jour chaque trade qui utilise le nom."
      />

      <div className="tabs" role="tablist" aria-label="Sections des réglages" style={{ marginBottom: 'var(--space-5)' }}>
        {SECTIONS.map(s => (
          <button
            type="button"
            key={s.id}
            role="tab"
            id={`settings-tab-${s.id}`}
            aria-selected={section === s.id}
            aria-controls="settings-panel"
            tabIndex={section === s.id ? 0 : -1}
            className="tab"
            onClick={() => setSection(s.id)}
            onKeyDown={onTabKey}
          >
            {s.label}
            {lib && s.id !== 'general' && s.id !== 'account' && (
              <span className="text-muted num" style={{ marginLeft: 6, fontWeight: 500 }}>
                {s.id === 'tag'
                  ? TAG_TYPE_ORDER.reduce((n, t) => n + (lib.tags?.[t]?.length || 0), 0)
                  : (s.id === 'strategy' ? lib.strategies : lib.sources).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="settings-panel" aria-labelledby={`settings-tab-${section}`}>
        {section === 'general' && <GeneralSettings />}
        {section === 'account' && <CloudAccount />}
        {section !== 'general' && section !== 'account' && loadError && <div className="notice neg" role="alert">{loadError}</div>}
        {section !== 'general' && section !== 'account' && !lib && !loadError && <div className="skeleton" style={{ height: 320 }} />}

        {lib && section === 'strategy' && (
          <ItemList kind="strategy" {...SECTION_COPY.strategy} items={lib.strategies} onChanged={load} />
        )}
        {lib && section === 'source' && (
          <ItemList kind="source" {...SECTION_COPY.source} items={lib.sources} onChanged={load} />
        )}
        {lib && section === 'tag' && (
          <div className="stack">
            {TAG_TYPE_ORDER.map(t => (
              <ItemList
                key={t}
                kind="tag"
                tagType={t}
                title={`Tags : ${TAG_TYPE_LABEL[t]}`}
                noun="un tag"
                items={lib.tags?.[t] || []}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
