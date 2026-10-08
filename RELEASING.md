# Releasing the admin portal

Merging a pull request into `main` deploys to production via Cloudflare Pages
(project `crewradr-admin`). Full process, rules and rollback: see
`docs/release_process.md` in the `crewradr` repo.

- Branch -> PR (Conventional Commit title) -> CI green -> squash-merge.
- Bump `package.json` `version` in the PR that should count as a new release; a merge
  with a new version is tagged `release-X.Y.Z` automatically.
- Verify a deploy: `curl https://admin.crewradr.app/version.json` -> `sha` equals the merge
  commit, `version` equals `package.json`.
- Local builds write `public/version.txt` and `public/version.json` (git-ignored).
