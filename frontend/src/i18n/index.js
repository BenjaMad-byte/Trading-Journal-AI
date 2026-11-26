/* Interface language, saved in this browser only.

   The English text in the code is the key: t('Dashboard') returns 'Dashboard' in English and the
   matching entry of fr.js in French. A string with no entry shows in English, so a screen can be
   translated bit by bit and new upstream text never breaks anything. Variables use {name}:
   t('{n} trades', { n: 3 }). */
import { useSyncExternalStore } from 'react';
import fr from './fr';

export const STORAGE_KEY = 'journal-lang';

export const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'fr', name: 'Français' },
];

const DICTIONARIES = { fr };
const known = (id) => LANGUAGES.some((l) => l.id === id);
const listeners = new Set();

export function getLang() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return known(saved) ? saved : 'en';
  } catch (e) {
    return 'en';
  }
}

let current = getLang();

function applyToPage(lang) {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', lang);
}

export function setLang(id) {
  const lang = known(id) ? id : 'en';
  try {
    if (lang === 'en') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    /* private mode: the choice lasts until the page closes */
  }
  current = lang;
  applyToPage(lang);
  listeners.forEach((fn) => fn());
  return lang;
}

/* Translation with an explicit language. Exported for tests and non-React code. */
export function translate(lang, text, vars) {
  const dictionary = DICTIONARIES[lang];
  const out = (dictionary && Object.prototype.hasOwnProperty.call(dictionary, text)) ? dictionary[text] : text;
  if (!vars) return out;
  return out.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

export function t(text, vars) {
  return translate(current, text, vars);
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/* In a component: const { t, lang } = useT(). The component redraws when the language changes. */
export function useT() {
  const lang = useSyncExternalStore(subscribe, () => current, () => 'en');
  return { t: (text, vars) => translate(lang, text, vars), lang };
}

applyToPage(current);
