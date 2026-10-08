// Usage: node scripts/check-version-bump.js <base-ref>   (e.g. origin/main)
// Passes when package.json's version is unchanged; otherwise it must not go backwards.
const cp = require('child_process');
const fs = require('fs');

const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/check-version-bump.js <base-ref>');
  process.exit(2);
}

const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  if (!m) {
    console.error(`ERROR: "${v}" is not a plain X.Y.Z version.`);
    process.exit(1);
  }
  return m.slice(1).map(Number);
};

const baseVersion = JSON.parse(
  cp.execFileSync('git', ['show', `${base}:package.json`], { encoding: 'utf8' }),
).version;
const headVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
console.log(`base: ${baseVersion}   head: ${headVersion}`);

if (baseVersion === headVersion) {
  console.log('OK: version unchanged.');
  process.exit(0);
}

const [b, h] = [parse(baseVersion), parse(headVersion)];
for (let i = 0; i < 3; i++) {
  if (h[i] > b[i]) {
    console.log(`OK: ${baseVersion} -> ${headVersion}`);
    process.exit(0);
  }
  if (h[i] < b[i]) break;
}
console.error(`ERROR: version went backwards (${baseVersion} -> ${headVersion}).`);
process.exit(1);
