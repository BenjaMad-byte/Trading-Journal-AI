import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Image, CheckCircle, AlertCircle } from 'lucide-react';
import { importApi } from '../api';
import { PageHeader } from './ui';

// Brokers the backend can parse (keys match csv_parser.BROKER_PARSERS).
// 'auto' lets the server sniff the format from the file's first lines.
const BROKERS = [
  { value: 'auto', label: 'Détection automatique' },
  { value: 'thinkorswim', label: 'Thinkorswim (Schwab)' },
  { value: 'ibkr', label: 'Interactive Brokers (IBKR)' },
  { value: 'tradovate', label: 'Tradovate' },
  { value: 'generic', label: 'Autre courtier (modèle générique)' },
];

// Served from frontend/public/templates, so they download straight from the app.
const TEMPLATE_URL = '/templates/generic_trades_template.csv';
const EXAMPLE_URL = '/templates/generic_trades_example.csv';

const BROKER_HELP = {
  auto: "Choisissez un courtier ci-dessus, ou laissez Détection automatique et l'importateur reconnaîtra un relevé de compte Thinkorswim ou un relevé d'activité IBKR.",
  thinkorswim: <>Export depuis Thinkorswim desktop : <em>Monitor → Account Statement → export icon → Export to File (CSV)</em></>,
  ibkr: <>Export depuis IBKR Client Portal : <em>Performance &amp; Reports → Statements → Activity → pick the period → Download as CSV</em></>,
  tradovate: <>Export depuis Tradovate (web) : <em>Reports → Performance → Export</em></>,
  generic: <>Copiez vos exécutions dans le modèle, une ligne par exécution. Les achats et ventes du même symbole sont regroupés automatiquement en trades aller-retour, de la même façon qu'un import de courtier.</>,
};

const BROKER_DROP_LABEL = {
  auto: 'Déposez votre CSV de courtier (Thinkorswim, IBKR ou Tradovate)',
  thinkorswim: 'Déposez le relevé de compte Thinkorswim (CSV)',
  ibkr: "Déposez le relevé d'activité IBKR (CSV)",
  tradovate: 'Déposez l\'export Performance de Tradovate (CSV)',
  generic: 'Déposez votre modèle générique rempli (CSV)',
};

// Map the free-text broker stored on an account to a dropdown value.
function brokerFromAccount(account) {
  const b = (account?.broker || '').toLowerCase();
  if (/ibkr|interactive/.test(b)) return 'ibkr';
  if (/thinkorswim|tos|schwab/.test(b)) return 'thinkorswim';
  if (/tradovate|apex/.test(b)) return 'tradovate';
  return 'auto';
}

/* Shown on every broker choice, so someone whose broker is missing finds the
   way in before giving up. Expands into the column reference when the generic
   template is the selected broker. */
const TEMPLATE_COLUMNS = [
  ['date', 'Obligatoire', 'YYYY-MM-DD, ou MM/DD/YYYY'],
  ['time', 'Obligatoire', 'HH:MM ou HH:MM:SS sur 24 heures, ou 1:05 PM'],
  ['symbol', 'Obligatoire', 'AAPL. Les futures commencent par un slash : /MESU26'],
  ['side', 'Obligatoire', 'BUY ou SELL. BUY TO COVER et SELL SHORT fonctionnent aussi'],
  ['quantity', 'Obligatoire', 'Actions ou contrats, toujours positif'],
  ['price', 'Obligatoire', "Prix d'exécution par action ou par contrat"],
  ['commission', 'Facultatif', 'Frais pour cette exécution. Vide = 0'],
  ['asset_type', 'Facultatif', 'STOCK (par défaut), OPTION ou FUTURE'],
  ['expiry, strike, put_call', 'Options', '2026-08-28, 765, CALL ou PUT'],
  ['multiplier', 'Facultatif', "Valeur du point pour un future que l'application ne reconnaît pas"],
];

function GenericTemplateTip({ open, onUse }) {
  return (
    <div className="notice" style={{ marginTop: 16, display: 'block' }}>
      <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
        Votre courtier n'est pas dans la liste ?
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        Téléchargez le{' '}
        <a href={TEMPLATE_URL} download="generic_trades_template.csv">modèle vierge</a>
        {' '}ou un{' '}
        <a href={EXAMPLE_URL} download="generic_trades_example.csv">exemple rempli</a>
        , collez vos exécutions depuis n'importe quel export de courtier ou tableur, puis importez-le avec
        {' '}
        {open ? <strong>Autre courtier (modèle générique)</strong> : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUse} style={{ padding: '0 4px', verticalAlign: 'baseline' }}>
            Autre courtier (modèle générique)
          </button>
        )}
        . Les colonnes peuvent être dans n'importe quel ordre, les noms courants comme Ticker, Qty ou Fees sont reconnus, et les colonnes supplémentaires sont ignorées.
      </div>

      {open && (
        <div className="scroll-x" style={{ marginTop: 12 }}>
          <table style={{ fontSize: 12.5 }}>
            <caption className="sr-only">Colonnes du modèle générique</caption>
            <thead>
              <tr><th>Colonne</th><th>Requis</th><th>Ce qu'on y met</th></tr>
            </thead>
            <tbody>
              {TEMPLATE_COLUMNS.map(([name, need, what]) => (
                <tr key={name}>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', textAlign: 'left' }}>{name}</td>
                  <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{need}</td>
                  <td>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8 }}>
            Si une ligne ne peut pas être lue, rien n'est importé et l'erreur indique la ligne
            concernée, pour qu'une exécution manquante ne puisse jamais changer silencieusement votre P&amp;L.
          </div>
        </div>
      )}
    </div>
  );
}

function TextPreview({ file }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = e => setText(e.target.result);
    reader.readAsText(file);
  }, [file]);
  return (
    <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--radius-md)', border: '1px solid var(--divider)', padding: 12, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
      {text || "Chargement de l'aperçu..."}
    </div>
  );
}

function DropZone({ label, accept, onFile, file, icon: Icon }) {
  const [active, setActive] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setActive(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={`dropzone ${active ? 'active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setActive(true); }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current.click(); } }}
      role="button"
      tabIndex={0}
      aria-label={file ? `Fichier sélectionné ${file.name}. Choisir un autre fichier` : `${label}. Appuyez sur Entrée pour parcourir`}
    >
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} tabIndex={-1} onChange={e => onFile(e.target.files[0])} />
      {file ? (
        <div>
          <Icon size={24} style={{ marginBottom: 8, color: 'var(--accent-line)' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
          <div className="num" style={{ fontSize: 13, marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB</div>
        </div>
      ) : (
        <div>
          <Icon size={28} style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Glissez-déposez, ou cliquez pour parcourir</div>
        </div>
      )}
    </div>
  );
}

export default function Import({ accounts, accountId }) {
  // CSV import state
  const [csvFile, setCsvFile] = useState(null);
  const [csvAccountId, setCsvAccountId] = useState(accountId || '');
  const [csvBroker, setCsvBroker] = useState(() => brokerFromAccount(accounts.find(a => a.id === accountId)));
  const [importing, setImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState(null);

  // Diary upload state
  const [diaryFile, setDiaryFile] = useState(null);
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().slice(0, 10));
  const [diaryAccountId, setDiaryAccountId] = useState(accountId || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [diaryResult, setDiaryResult] = useState(null);
  const [diaryError, setDiaryError] = useState(null);

  const handleCsvImport = async () => {
    if (!csvFile || !csvAccountId) {
      setCsvError('Veuillez sélectionner un fichier et un compte.');
      return;
    }
    setImporting(true);
    setCsvResult(null);
    setCsvError(null);
    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('account_id', csvAccountId);
    fd.append('broker', csvBroker);
    try {
      const res = await importApi.importCsv(fd);
      setCsvResult(res.data);
    } catch (e) {
      setCsvError(e.response?.data?.error || e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDiaryUpload = async () => {
    if (!diaryFile || !diaryAccountId || !diaryDate) {
      setDiaryError('Veuillez sélectionner une image, un compte et une date.');
      return;
    }
    setAnalyzing(true);
    setDiaryResult(null);
    setDiaryError(null);
    const fd = new FormData();
    fd.append('file', diaryFile);
    fd.append('account_id', diaryAccountId);
    fd.append('date', diaryDate);
    try {
      const res = await importApi.uploadDiary(fd);
      setDiaryResult(res.data);
      if (res.data.analysis_error) {
        setDiaryError("Journal enregistré, mais l'analyse IA a échoué : " + res.data.analysis_error);
      }
    } catch (e) {
      setDiaryError(e.response?.data?.error || e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <PageHeader title="Importer" subtitle="Importez vos exécutions de courtier, ou laissez Claude lire un journal de trading." />

      <div className="grid-2">

        {/* CSV Import */}
        <section className="card">
          <h2 className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--accent-line)" aria-hidden="true" />
            Importer un CSV de courtier
          </h2>

          <DropZone
            label={BROKER_DROP_LABEL[csvBroker]}
            accept=".csv"
            onFile={setCsvFile}
            file={csvFile}
            icon={FileText}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 16 }}>
            <div>
              <label className="field-label" htmlFor="imp-csv-broker">Courtier</label>
              <select
                id="imp-csv-broker"
                value={csvBroker}
                onChange={e => setCsvBroker(e.target.value)}
                style={{ width: '100%' }}
              >
                {BROKERS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="imp-csv-account">Compte</label>
              <select
                id="imp-csv-account"
                value={csvAccountId}
                onChange={e => {
                  setCsvAccountId(e.target.value);
                  // Follow the account's broker when it has a recognisable one.
                  const acct = accounts.find(a => String(a.id) === e.target.value);
                  const guess = brokerFromAccount(acct);
                  if (guess !== 'auto') setCsvBroker(guess);
                }}
                style={{ width: '100%' }}
                required
              >
                <option value="">Sélectionner un compte...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={handleCsvImport}
            disabled={importing || !csvFile || !csvAccountId}
          >
            {importing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Importation...</> : <><Upload size={16} /> Importer les trades</>}
          </button>

          {csvResult && (
            <div className="notice pos" role="status" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--result-pos)', fontWeight: 600, marginBottom: 4 }}>
                <CheckCircle size={16} /> Import terminé
              </div>
              <div style={{ fontSize: 14 }}>{csvResult.message}</div>
              {csvResult.errors?.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--result-neg)', marginTop: 4 }}>
                  {csvResult.errors.length} erreur(s) de base de données
                </div>
              )}
            </div>
          )}

          {csvError && (
            <div className="notice neg" role="alert" style={{ marginTop: 12 }}>
              <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{csvError}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            {BROKER_HELP[csvBroker]}
          </div>

          <GenericTemplateTip open={csvBroker === 'generic'} onUse={() => setCsvBroker('generic')} />
        </section>

        {/* Diary Upload */}
        <section className="card">
          <h2 className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={18} color="var(--accent-line)" aria-hidden="true" />
            Analyser le journal de trading
          </h2>

          {diaryFile ? (
            <div style={{ marginBottom: 12 }}>
              {/\.(txt|csv)$/i.test(diaryFile.name) ? (
                <TextPreview file={diaryFile} />
              ) : /\.(heic|heif)$/i.test(diaryFile.name) ? (
                // Browsers cannot render HEIC; the server converts it to JPEG on upload.
                <div style={{ padding: 12, border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--text-secondary)' }}>
                  {diaryFile.name} (photo iPhone, sera convertie à l'import)
                </div>
              ) : (
                <img src={URL.createObjectURL(diaryFile)} alt="Aperçu du journal"
                  style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 'var(--radius-md)', border: '1px solid var(--divider)', display: 'block' }} />
              )}
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setDiaryFile(null)}>Supprimer</button>
            </div>
          ) : (
            <DropZone
              label="Déposez une photo de notes manuscrites, une capture d'écran, ou un fichier .txt / .csv"
              accept=".png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.txt,.csv"
              onFile={setDiaryFile}
              file={null}
              icon={Image}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 16 }}>
            <div>
              <label className="field-label" htmlFor="imp-diary-date">Date</label>
              <input
                id="imp-diary-date"
                type="date"
                value={diaryDate}
                onChange={e => setDiaryDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="imp-diary-account">Compte</label>
              <select
                id="imp-diary-account"
                value={diaryAccountId}
                onChange={e => setDiaryAccountId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Sélectionner un compte...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={handleDiaryUpload}
            disabled={analyzing || !diaryFile || !diaryAccountId || !diaryDate}
          >
            {analyzing
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Analyse avec Claude AI...</>
              : <><Upload size={16} /> Analyser le journal</>
            }
          </button>

          {analyzing && (
            <div role="status" style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Claude est en train de lire votre journal. Cela prend 10 à 20 secondes...
            </div>
          )}

          {diaryResult && !diaryResult.analysis_error && (
            <div className="notice pos" role="status" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--result-pos)', fontWeight: 600, marginBottom: 4 }}>
                <CheckCircle size={16} /> Analyse terminée
              </div>
              {diaryResult.trade_count != null && (
                <div style={{ fontSize: 14 }}>{diaryResult.trade_count} trade(s) trouvé(s) dans votre journal.</div>
              )}
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Voir l'analyse complète dans la page Journal.</div>
            </div>
          )}

          {diaryError && (
            <div className="notice neg" role="alert" style={{ marginTop: 12 }}>
              <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{diaryError}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            Claude AI va lire vos notes manuscrites ou tapées et en extraire la stratégie, les stops, les multiples R, l'état émotionnel, et plus encore.
          </div>
        </section>
      </div>
    </div>
  );
}
