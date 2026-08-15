// One-shot merge for web admin P2: applies .agents/i18n_p2_rest.json
// (key → {en,es,fr,ar,zh,ru}) into src/messages/*.json. Inserts new keys at
// sorted position, replaces existing values in place (minimal diff).
//
// Run: node scripts/merge_p2_rest.js
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const staging = path.join(root, '.agents', 'i18n_p2_rest.json');
if (!fs.existsSync(staging)) {
  console.error('staging file not found: ' + staging);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(staging, 'utf8'));
const locales = ['en', 'es', 'fr', 'ar', 'zh', 'ru'];

function placeholders(s) {
  const out = new Set();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m;
  while ((m = re.exec(s))) out.add(m[1]);
  return out;
}

const errors = [];
for (const [key, vals] of Object.entries(data)) {
  if (typeof vals.en !== 'string' || !vals.en.length) {
    errors.push(`key '${key}' has no en value`);
    continue;
  }
  const phEn = placeholders(vals.en);
  for (const l of locales) {
    const v = vals[l];
    if (typeof v !== 'string' || !v.length) {
      errors.push(`key '${key}' missing ${l} value`);
      continue;
    }
    const ph = placeholders(v);
    const miss = [...phEn].filter((p) => !ph.has(p));
    const extra = [...ph].filter((p) => !phEn.has(p));
    if (miss.length || extra.length) {
      errors.push(`key '${key}' ${l}: placeholder mismatch missing:${JSON.stringify(miss)} extra:${JSON.stringify(extra)}`);
    }
  }
}
if (errors.length) {
  console.error(`${errors.length} validation errors (first 50):`);
  for (const e of errors.slice(0, 50)) console.error('  ' + e);
  process.exit(1);
}

const keyRe = /^(\t*")([^"]+)(":\s*)(.*)(,?)(\s*)$/;
for (const l of locales) {
  const file = path.join(root, 'src', 'messages', l + '.json');
  let raw = fs.readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);

  const existing = new Set();
  const outLines = [];
  const insertions = Object.keys(data).sort((a, b) => a.localeCompare(b));
  let ii = 0;
  for (const line of lines) {
    const m = keyRe.exec(line);
    if (!m) {
      // Flush any remaining insertions before the closing brace. The last
      // flushed line must not carry a trailing comma (strict JSON), and the
      // preceding existing entry needs one if it lacks it.
      if (line.trim() === '}' && ii < insertions.length) {
        const prev = outLines[outLines.length - 1];
        if (prev !== undefined && keyRe.test(prev) && !/,\s*$/.test(prev)) {
          outLines[outLines.length - 1] = prev + ',';
        }
        const remaining = insertions.length - ii;
        for (let n = 0; n < remaining; n++) {
          const isLast = n === remaining - 1;
          outLines.push(
            '\t' + JSON.stringify(insertions[ii]) + ': ' +
            JSON.stringify(data[insertions[ii]][l]) + (isLast ? '' : ','));
          ii++;
        }
      }
      outLines.push(line);
      continue;
    }
    const k = m[2];
    if (k in data) {
      existing.add(k);
      outLines.push(m[1] + k + m[3] + JSON.stringify(data[k][l]) + ',' + m[6]);
      continue;
    }
    while (ii < insertions.length && insertions[ii].localeCompare(k) < 0) {
      outLines.push('\t' + JSON.stringify(insertions[ii]) + ': ' + JSON.stringify(data[insertions[ii]][l]) + ',');
      ii++;
    }
    outLines.push(line);
  }
  fs.writeFileSync(file, outLines.join(eol));
  const m2 = JSON.parse(fs.readFileSync(file, 'utf8'));
  const missingKeys = Object.keys(data).filter((k) => !(k in m2));
  console.log(`${l}: ${Object.keys(data).length - missingKeys.length} keys applied${missingKeys.length ? ' MISSING:' + missingKeys.join(',') : ''}`);
}
console.log('done');
