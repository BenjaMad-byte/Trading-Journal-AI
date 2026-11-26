import { useEffect, useRef, useState } from 'react';
import './landing.css';
import dashboardImg from './dashboard.png';
import {
  PRODUCT, SUPABASE_URL, SUPABASE_ANON_KEY, NAV_LINKS, HERO, PROBLEM, BENEFITS_TITLE, BENEFITS,
  STEPS_TITLE, STEPS, TAGLINE, PROOF, FAQ_TITLE, FAQ, FINAL, FOOTER, META,
} from './copy';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Révèle chaque section une seule fois, à l'entrée dans la fenêtre.
function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return undefined;
    if (!('IntersectionObserver' in window)) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'is-in' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

function WaitlistForm({ id }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', message: '' });
  const busy = status.kind === 'loading';

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setStatus({ kind: 'error', message: 'Saisis ton adresse email pour rejoindre la liste.' });
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setStatus({ kind: 'error', message: 'Cette adresse email n’est pas valide. Vérifie le format, par exemple nom@domaine.com.' });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus({ kind: 'error', message: 'La liste d’attente n’est pas encore connectée. Réessaie plus tard.' });
      return;
    }
    setStatus({ kind: 'loading', message: '' });
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email: value.toLowerCase() }),
      });
      if (res.status === 409) {
        setStatus({ kind: 'ok', message: `${value} est déjà sur la liste d’attente.` });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStatus({ kind: 'ok', message: `Inscription enregistrée pour ${value}.` });
      setEmail('');
    } catch (err) {
      setStatus({ kind: 'error', message: 'L’inscription a échoué. Vérifie ta connexion puis réessaie.' });
    }
  };

  const errId = `${id}-msg`;
  return (
    <form className="wl" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor={`${id}-email`}>Adresse email</label>
      <div className="wl-row">
        <input
          id={`${id}-email`}
          className="wl-input body-3"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status.kind === 'error'}
          aria-describedby={errId}
          disabled={busy}
        />
        <button className="btn button-md" type="submit" disabled={busy}>
          {busy ? 'Envoi en cours' : HERO.cta}
        </button>
      </div>
      <p
        id={errId}
        className={`wl-msg caption-2 ${status.kind === 'error' ? 'is-error' : ''} ${status.kind === 'ok' ? 'is-ok' : ''}`}
        role="status"
        aria-live="polite"
      >
        {status.message}
      </p>
    </form>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('landing-lock', open);
    return () => document.body.classList.remove('landing-lock');
  }, [open]);
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Navigation principale">
        <a className="nav-brand title-4" href="#top">{PRODUCT}</a>
        <ul className="nav-links">
          {NAV_LINKS.map((l) => (
            <li key={l.href}><a className="nav-link title-4" href={l.href}>{l.label}</a></li>
          ))}
        </ul>
        <button
          type="button"
          className={`nav-toggle ${open ? 'is-open' : ''}`}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span />
        </button>
      </nav>
      <div id="menu-mobile" className={`menu ${open ? 'is-open' : ''}`}>
        <ul>
          {NAV_LINKS.map((l, i) => (
            <li key={l.href} style={{ '--i': i }}>
              <a className="heading-4" href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

// Chaque mot passe du ton atténué au ton plein en franchissant la ligne de déclenchement.
function Tagline() {
  const wrapRef = useRef(null);
  const words = TAGLINE.split(' ');
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const nodes = wrap.querySelectorAll('.tg-word');
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-lit'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-lit');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return (
    <section className="section tagline" aria-label="Notre idée">
      <p className="tagline-text heading-3" ref={wrapRef}>
        {words.map((w, i) => (
          <span key={i} className="tg-word">{w}{i < words.length - 1 ? ' ' : ''}</span>
        ))}
      </p>
    </section>
  );
}

function Hero() {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <h1 className="hero-title heading-1">
          {HERO.titleLines.map((line, i) => (
            <span key={i} className="hero-line">{line}</span>
          ))}
        </h1>
        <p className="hero-sub body-3">{HERO.sub}</p>
        <div id="rejoindre" className="hero-form">
          <WaitlistForm id="hero" />
          <p className="hero-proof caption-2">{HERO.proof}</p>
        </div>
      </div>
      <div className={`shot ${loaded ? 'is-loaded' : ''}`}>
        <img
          src={dashboardImg}
          alt={HERO.imageAlt}
          width="3120"
          height="2160"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </section>
  );
}

export default function Landing() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = META.title;
    let meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta ? meta.getAttribute('content') : null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', META.description);
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(ld);
    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) meta.setAttribute('content', prevDesc);
      ld.remove();
    };
  }, []);

  return (
    <div className="landing">
      <a className="skip" href="#contenu">Aller au contenu</a>
      <Nav />
      <main id="contenu">
        <Hero />

        <Reveal as="section" className="section narrow" aria-labelledby="t-probleme">
          <h2 id="t-probleme" className="section-title heading-2">{PROBLEM.title}</h2>
          {PROBLEM.body.map((p, i) => <p key={i} className="lead body-3">{p}</p>)}
          <p className="lead lead-strong body-2">{PROBLEM.solution}</p>
        </Reveal>

        <Reveal as="section" className="section" id="benefices" aria-labelledby="t-benefices">
          <h2 id="t-benefices" className="section-title heading-2 centered">{BENEFITS_TITLE}</h2>
          <ul className="cards">
            {BENEFITS.map((b) => (
              <li key={b.title} className="card">
                <h3 className="title-1">{b.title}</h3>
                <p className="body-6 muted">{b.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" className="section" id="fonctionnement" aria-labelledby="t-etapes">
          <h2 id="t-etapes" className="section-title heading-2 centered">{STEPS_TITLE}</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-n caption-3" aria-hidden="true">{i + 1}</span>
                <h3 className="title-1">{s.title}</h3>
                <p className="body-6 muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Tagline />

        <Reveal as="section" className="section" aria-labelledby="t-preuve">
          <h2 id="t-preuve" className="section-title heading-2 centered">{PROOF.title}</h2>
          <p className="caption-2 muted centered note">{PROOF.note}</p>
          <ul className="stats">
            {PROOF.stats.map((s) => (
              <li key={s.label} className="stat">
                <span className="stat-v heading-5">{s.value}</span>
                <span className="caption-2 muted">{s.label}</span>
              </li>
            ))}
          </ul>
          <ul className="quotes">
            {PROOF.quotes.map((q, i) => (
              <li key={i} className="card">
                <blockquote className="body-2">{q.text}</blockquote>
                <p className="caption-2 muted">{q.author}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" className="section narrow" id="faq" aria-labelledby="t-faq">
          <h2 id="t-faq" className="section-title heading-2">{FAQ_TITLE}</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q} className="faq-item">
                <summary className="title-3">{f.q}</summary>
                <p className="body-6 muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="section final" aria-labelledby="t-final">
          <h2 id="t-final" className="section-title heading-2 centered">{FINAL.title}</h2>
          <p className="lead body-3 centered">{FINAL.sub}</p>
          <div className="final-form"><WaitlistForm id="final" /></div>
        </Reveal>
      </main>

      <footer className="footer">
        <p className="caption-2 muted">{FOOTER.disclaimer}</p>
        <ul className="footer-links">
          {FOOTER.legal.map((l) => (
            <li key={l.label}>
              <span className="footer-off caption-2" aria-disabled="true" title={l.note}>{l.label}</span>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
