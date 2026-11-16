/**
 * Progressive enhancements. All navigation works without this script;
 * it only remembers browsing preferences and improves disclosure widgets.
 */
import { DIRECTIONS, LANGS, STORAGE_KEYS, type KnowledgeBase } from '../i18n/config';

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode, blocked site data); preferences are optional.
  }
}

// Remember the language and direction of the page actually shown, so an explicit link wins
// over the saved preference and then becomes the new preference.
const root = document.documentElement;
const lang = root.dataset.lang;
if (lang && (LANGS as readonly string[]).includes(lang)) store(STORAGE_KEYS.lang, lang);
const kb = root.dataset.kb as KnowledgeBase | undefined;
const dir = root.dataset.dir;
if (kb && dir && (DIRECTIONS as readonly string[]).includes(dir)) store(STORAGE_KEYS.direction(kb), dir);

// Dropdowns: close on outside click and Escape; only one open at a time.
const dropdowns = Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-dropdown]'));
document.addEventListener('click', (event) => {
  for (const dropdown of dropdowns) {
    if (dropdown.open && !dropdown.contains(event.target as Node)) dropdown.open = false;
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const dropdown of dropdowns) {
    if (dropdown.open) {
      dropdown.open = false;
      dropdown.querySelector('summary')?.focus();
    }
  }
});
for (const dropdown of dropdowns) {
  dropdown.addEventListener('toggle', () => {
    if (dropdown.open) dropdowns.forEach((other) => other !== dropdown && (other.open = false));
  });
}

// Document contents: expanded on wide screens, collapsed into a panel on narrow screens.
const tocPanel = document.querySelector<HTMLDetailsElement>('[data-toc-panel]');
if (tocPanel) {
  const wide = window.matchMedia('(min-width: 900px)');
  const sync = () => {
    tocPanel.open = wide.matches;
  };
  sync();
  wide.addEventListener('change', sync);
}
