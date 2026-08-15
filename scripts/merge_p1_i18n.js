// One-shot merge for web admin P1: replaces identical-to-English values in
// src/messages/<locale>.json with translations from .agents/i18n_p1 batches.
// In-place line edits keep the git diff minimal.
//
// Run: node scripts/merge_p1_i18n.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const p1Dir = path.join(root, '.agents', 'i18n_p1');
const msgDir = path.join(root, 'src', 'messages');
const locales = ['es', 'fr', 'ar', 'zh', 'ru'];

function placeholders(s) {
  const out = new Set();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m;
  while ((m = re.exec(s))) out.add(m[1]);
  return out;
}

const errors = [];
for (const l of locales) {
  const dir = path.join(p1Dir, l);
  const replacements = {};
  for (const f of fs.readdirSync(dir).filter((x) => /^batch_\d+\.json$/.test(x))) {
    const src = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const outF = f.replace(/\.json$/, '_translated.json');
    if (!fs.existsSync(path.join(dir, outF))) {
      errors.push(`${l}/${f}: translated file missing`);
      continue;
    }
    const out = JSON.parse(fs.readFileSync(path.join(dir, outF), 'utf8'));
    for (const [k, enVal] of Object.entries(src)) {
      if (!(k in out)) { errors.push(`${l}/${f}: key '${k}' missing`); continue; }
      const tr = out[k];
      if (typeof tr !== 'string' || !tr.length) { errors.push(`${l}/${f}: '${k}' empty`); continue; }
      const phEn = placeholders(enVal);
      const phTr = placeholders(tr);
      const miss = [...phEn].filter((p) => !phTr.has(p));
      const extra = [...phTr].filter((p) => !phEn.has(p));
      if (miss.length || extra.length) {
        errors.push(`${l}/${f}: '${k}' placeholder mismatch missing:${JSON.stringify(miss)} extra:${JSON.stringify(extra)}`);
        continue;
      }
      replacements[k] = tr;
    }
  }

  const file = path.join(msgDir, l + '.json');
  let raw = fs.readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const keyRe = /^(\t*")([^"]+)(":\s*)(.*)(,?)(\s*)$/;
  const newLines = lines.map((line) => {
    const m = keyRe.exec(line);
    if (!m) return line;
    const k = m[2];
    if (!(k in replacements)) return line;
    return m[1] + k + m[3] + JSON.stringify(replacements[k]) + ',' + m[6];
  });
  fs.writeFileSync(file, newLines.join(eol));

  const after = JSON.parse(fs.readFileSync(file, 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(msgDir, 'en.json'), 'utf8'));
  const still = Object.keys(en).filter((k) => after[k] === en[k] && k in after);
  console.log(`${l}: replaced ${Object.keys(replacements).length} values | still identical-to-en: ${still.length}`);
}

if (errors.length) {
  console.error(`\n${errors.length} validation errors (first 50):`);
  for (const e of errors.slice(0, 50)) console.error('  ' + e);
  process.exit(1);
}
console.log('done');
