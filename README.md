# jalco-repoai

Reusable CLI to scaffold and sync an AI task workflow for any repository.

## Commands

- `npx jalco-repoai init` – bootstrap `.aicontext`, agents, templates, tasks index, optional sample task, and auto-sync workflow (idempotent; will not overwrite existing files).
- `npx jalco-repoai sync` – regenerate `tasks/TASKS_INDEX.md` from task frontmatter.

## Install

Once published to a registry:

- From npm (public): `npm install -g jalco-repoai` or run on-demand via `npx jalco-repoai init`.
- From GitHub Packages (scoped): `npm install @YOUR_GH_USERNAME/jalco-repoai --registry=https://npm.pkg.github.com`.

> Note: GitHub Packages requires a scoped package name matching your GitHub username/org. Update `package.json` name accordingly (e.g., `"name": "@YOUR_GH_USERNAME/jalco-repoai"`).

## Publishing to GitHub Packages

1) Update `package.json` `name` to scoped form (`@<owner>/jalco-repoai`) and optionally add:
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

## MCP usage

- Start the Docker MCP gateway: `docker mcp gateway run` (requires Docker running).
- Built-in servers: `context7` (docs via `resolve-library-id` + `get-library-docs`) and `sequentialthinking` (planning/reasoning).
- Load additional servers dynamically with `mcp-add`/`mcp-find` (e.g., `docker`, `node-code-sandbox`, `dockerhub`).
- See `.aicontext/MCP_SERVERS.md` for the recommended servers and quickstart.

## Upgrade and publishing

- Bump version before publishing: `npm version patch` (or `minor`/`major`), then push tags so CI publishes (`git push && git push --tags`).
- Publish to npm: push a tag `vX.Y.Z` to trigger `.github/workflows/npm-publish.yml` or run `npm publish` locally after `npm run build`.
- Publish to GitHub Packages: create a release or dispatch `.github/workflows/publish-github-package.yml`.
- Update downstream repos:
  - If agent/templates changed: reinstall with `npm install jalco-repoai@X.Y.Z` (or your scoped name), then re-run `npx jalco-repoai init --no-sample` to regenerate missing files. Existing files are not overwritten; copy updated agent files from the package if you need to replace them.
  - Alternatively, use `npx jalco-repoai init --no-sample --update-agents` to overwrite agent files with the latest templates.
  - If workflows changed: re-run `npx jalco-repoai init --no-sample` to recreate missing workflows (will not override existing), or manually replace the files from the package.***
