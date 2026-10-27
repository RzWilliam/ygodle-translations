// Validates the locale files in src/locales against en.json (the source language):
//  - every key used in the code exists in en.json (static t("...") / i18nKey="..." calls)
//  - every other locale has the same keys, the same {{placeholders}} and <tags>
// Missing translations are warnings (i18next falls back to English); broken JSON,
// unknown keys used in code and placeholder mismatches are errors.
//
// Usage: node scripts/check-locales.js [--strict] [--locales <dir>] [--no-code]
//   --strict   turns warnings (missing translations) into errors
//   --locales  directory holding the <lang>.json files (default src/locales)
//   --no-code  skip the scan of src/ (used by the translations repo, which has no code)
// The same file is copied as-is into the ygodle-translations repo.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : undefined;
};
const LOCALES_DIR = path.resolve(ROOT, argValue('--locales') ?? path.join('src', 'locales'));
const SRC_DIR = path.join(ROOT, 'src');
const SOURCE_LANG = 'en';
const strict = process.argv.includes('--strict');
const scanCode = !process.argv.includes('--no-code');

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

let errors = 0;
let warnings = 0;
const error = (msg) => { errors++; console.error(`  ✗ ${msg}`); };
const warn = (msg) => { warnings++; console.warn(`  ! ${msg}`); };

// { "a": { "b": "x" } } → { "a.b": "x" }; arrays are leaves (returnObjects)
const flatten = (obj, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, out);
    else out[full] = value;
  }
  return out;
};

const tokens = (value) => {
  const text = Array.isArray(value) ? value.join('\n') : String(value);
  const placeholders = [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
  const tags = [...text.matchAll(/<\/?(\w+)>/g)].map((m) => m[1]);
  return { placeholders: [...new Set(placeholders)].sort(), tags: [...new Set(tags)].sort() };
};

const loadLocale = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
  } catch (e) {
    error(`${file}: invalid JSON (${e.message})`);
    return null;
  }
};

const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
const source = loadLocale(`${SOURCE_LANG}.json`);
if (!source) process.exit(1);
const sourceKeys = flatten(source);
const sourceBaseKeys = new Set(Object.keys(sourceKeys).map((k) => k.replace(PLURAL_SUFFIX, '')));

// 1. Keys used in the code must exist in the source locale
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : walk(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });

const KEY_PATTERNS = [
  /\bt\(\s*["']([\w.-]+)["']/g, // t("a.b") / t('a.b')
  /i18nKey=["']([\w.-]+)["']/g, // <Trans i18nKey="a.b" />
  /\b(?:labelKey|nameKey|textKey):\s*["']([\w.-]+)["']/g, // data tables pointing at keys
];
if (scanCode) console.log(`Checking keys used in src/ against ${SOURCE_LANG}.json`);
for (const file of scanCode ? walk(SRC_DIR) : []) {
  const code = fs.readFileSync(file, 'utf8');
  for (const pattern of KEY_PATTERNS) {
    for (const [, key] of code.matchAll(pattern)) {
      if (!key.includes('.')) continue; // not a translation key
      if (!sourceBaseKeys.has(key) && !(key in sourceKeys)) {
        error(`${path.relative(ROOT, file)}: unknown key "${key}"`);
      }
    }
  }
}

// 2. Every locale must mirror the source keys and placeholders
for (const file of files) {
  const lang = path.basename(file, '.json');
  if (lang === SOURCE_LANG) continue;
  console.log(`Checking ${file}`);
  const locale = loadLocale(file);
  if (!locale) continue;
  const keys = flatten(locale);
  const baseKeys = new Set(Object.keys(keys).map((k) => k.replace(PLURAL_SUFFIX, '')));

  if (!keys['language.name']) error(`${file}: "language.name" is required (shown in the language picker)`);

  let missing = 0;
  for (const key of sourceBaseKeys) {
    if (!baseKeys.has(key)) {
      missing++;
      warn(`${file}: missing "${key}"`);
    }
  }
  for (const key of baseKeys) {
    if (!sourceBaseKeys.has(key)) error(`${file}: unknown key "${key}" (not in ${SOURCE_LANG}.json)`);
  }

  for (const [key, value] of Object.entries(keys)) {
    const baseKey = key.replace(PLURAL_SUFFIX, '');
    const sourceValue = sourceKeys[key] ?? sourceKeys[`${baseKey}_other`] ?? sourceKeys[baseKey];
    if (sourceValue === undefined) continue;
    if (Array.isArray(sourceValue) !== Array.isArray(value)) {
      error(`${file}: "${key}" must be ${Array.isArray(sourceValue) ? 'a list' : 'a string'}`);
      continue;
    }
    const expected = tokens(sourceValue);
    const actual = tokens(value);
    // {{count}} may be dropped in a singular form ("une minute"), every other placeholder must stay
    const expectedPlaceholders = expected.placeholders.filter((p) => !(p === 'count' && PLURAL_SUFFIX.test(key)));
    const missingPlaceholders = expectedPlaceholders.filter((p) => !actual.placeholders.includes(p));
    const unknownPlaceholders = actual.placeholders.filter((p) => !expected.placeholders.includes(p));
    if (missingPlaceholders.length || unknownPlaceholders.length) {
      error(`${file}: "${key}" placeholders differ (expected {{${expected.placeholders.join('}}, {{')}}})`);
    }
    if (expected.tags.join() !== actual.tags.join()) {
      error(`${file}: "${key}" tags differ (expected <${expected.tags.join('>, <')}>)`);
    }
    // Attributes written in a translation are applied to the component (<a href="…">)
    const text = Array.isArray(value) ? value.join('\n') : String(value);
    if (/<\w+[^\w>]/.test(text)) {
      error(`${file}: "${key}" tags must not have attributes (write <tag>…</tag>)`);
    }
  }

  const total = sourceBaseKeys.size;
  console.log(`  ${lang}: ${Math.round(((total - missing) / total) * 100)}% translated (${total - missing}/${total})`);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 || (strict && warnings > 0) ? 1 : 0);
