# jalco-repoAI

Reusable CLI to scaffold and sync an AI task workflow for any repository.

## Commands

- `npx jalco-repoAI init` – bootstrap `.aicontext`, agents, templates, tasks index, optional sample task, and auto-sync workflow (idempotent; will not overwrite existing files).
- `npx jalco-repoAI sync` – regenerate `tasks/TASKS_INDEX.md` from task frontmatter.

## Install

Once published to a registry:

- From npm (public): `npm install -g jalco-repoAI` or run on-demand via `npx jalco-repoAI init`.
- From GitHub Packages (scoped): `npm install @YOUR_GH_USERNAME/jalco-repoAI --registry=https://npm.pkg.github.com`.

> Note: GitHub Packages requires a scoped package name matching your GitHub username/org. Update `package.json` name accordingly (e.g., `"name": "@YOUR_GH_USERNAME/jalco-repoAI"`).

## Publishing to GitHub Packages

1) Update `package.json` `name` to scoped form (`@<owner>/jalco-repoAI`) and optionally add:
   ```json
   "publishConfig": { "registry": "https://npm.pkg.github.com" }
   ```
2) Create a release or manually dispatch the workflow `.github/workflows/publish-github-package.yml`. The workflow builds and runs `npm publish` using `secrets.GITHUB_TOKEN` with `packages: write` permission.
3) Install via the scoped name and registry URL (see above).

## Local build

```
npm install
npm run build
node dist/cli.js init --no-sample
node dist/cli.js sync
```
