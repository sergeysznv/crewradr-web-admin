const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const en = JSON.parse(fs.readFileSync('src/messages/en.json', 'utf8'));
const allKeys = Object.keys(en);

// Find all t() calls with literal string keys
const out = execSync('grep -roh "t([\\\"'\\"'\\\"]\\([a-zA-Z_][a-zA-Z0-9_]*\\)" src/ --include="*.tsx" --include="*.ts"', { encoding: 'utf8', shell: true });
const usedKeys = new Set();
for (const m of out.matchAll(/t\(['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]/g)) {
  usedKeys.add(m[1]);
}

// Hard-coded keys from NAV_ITEMS
['webNavFleet','webNavLiveMap','webNavMembers','webNavCrewSettings','webNavAuditLog','webNavCompliance','webNavProvisioning','webNavMyAccount'].forEach(k => usedKeys.add(k));

const unused = allKeys.filter(k => !usedKeys.has(k));
console.log('Total keys:', allKeys.length);
console.log('Used keys:', usedKeys.size);
console.log('Unused keys:', unused.length);
console.log(unused.join('\n'));
