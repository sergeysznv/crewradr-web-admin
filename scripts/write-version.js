// Writes public/version.txt (git SHA, polled by the in-app "new version" banner)
// and public/version.json (package version + SHA + build time) before each build.
// Cloudflare Pages exposes CF_PAGES_COMMIT_SHA; GitHub Actions exposes GITHUB_SHA.
const fs = require('fs');
const cp = require('child_process');

let sha = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '';
if (!sha) {
  try {
    sha = cp.execFileSync('git', ['rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
  } catch (e) {
    sha = '';
  }
}
sha = (sha || 'unknown').slice(0, 7);

const pkg = require('../package.json');
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/version.txt', sha);
fs.writeFileSync(
  'public/version.json',
  JSON.stringify({ name: pkg.name, version: pkg.version, sha, builtAt: new Date().toISOString() }, null, 2) + '\n',
);
console.log(`Version ${pkg.version} (${sha}) written to public/version.txt and version.json`);
