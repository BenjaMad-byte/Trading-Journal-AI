import { translate, getLang, setLang, STORAGE_KEY, LANGUAGES } from './index';
import fr from './fr';

afterEach(() => {
  setLang('en');
  window.localStorage.clear();
  document.documentElement.setAttribute('lang', 'en');
});

test('English is the default and returns the text unchanged', () => {
  expect(getLang()).toBe('en');
  expect(translate('en', 'Dashboard')).toBe('Dashboard');
});

test('French returns the dictionary entry, and a missing entry falls back to English', () => {
  expect(translate('fr', 'Dashboard')).toBe('Tableau de bord');
  expect(translate('fr', 'A string nobody translated yet')).toBe('A string nobody translated yet');
});

test('an inherited property name is not mistaken for a translation', () => {
  expect(translate('fr', 'constructor')).toBe('constructor');
  expect(translate('fr', 'toString')).toBe('toString');
});

test('variables are filled in, and an unknown variable stays visible', () => {
  expect(translate('en', '{n} trades on {day}', { n: 3, day: 'Monday' })).toBe('3 trades on Monday');
  expect(translate('en', 'Hello {who}', {})).toBe('Hello {who}');
});

test('setLang saves the choice, sets <html lang> and English clears the key', () => {
  expect(setLang('fr')).toBe('fr');
  expect(getLang()).toBe('fr');
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe('fr');
  expect(document.documentElement.getAttribute('lang')).toBe('fr');
  setLang('en');
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('an unknown saved language falls back to English', () => {
  window.localStorage.setItem(STORAGE_KEY, 'klingon');
  expect(getLang()).toBe('en');
  expect(setLang('klingon')).toBe('en');
});

test('every language in the picker has a name, and French has no empty translation', () => {
  for (const l of LANGUAGES) expect(l.name).toBeTruthy();
  for (const [key, value] of Object.entries(fr)) {
    expect(key.trim()).not.toBe('');
    expect(value.trim()).not.toBe('');
  }
});
