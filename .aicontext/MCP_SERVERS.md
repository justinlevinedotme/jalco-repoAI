# MCP Servers Guide

This repository is MCP-first. Use this guide to start the Docker MCP gateway and load helpful servers.

## Quickstart

- Ensure Docker is running.
- Start the gateway (stdio): `docker mcp gateway run`
- Built-in servers in this gateway:
  - `context7` — external docs lookup (`resolve-library-id`, `get-library-docs`).
  - `sequentialthinking` — structured reasoning / plan helper.
- Add or inspect servers using the dynamic tools exposed by `MCP_DOCKER`:
  - `mcp-find docker` – list available Docker-backed servers.
  - `mcp-add <server>` – load a server into the registry for this session.
  - `mcp-remove <server>` – unload if no longer needed.

## Recommended servers

| Server | Purpose | Notes |
| --- | --- | --- |
| `docker` | Run Docker CLI commands via MCP (build/run/inspect). | Requires local Docker privileges; prefer safe flags/no-destructive commands. |
| `node-code-sandbox` | Disposable Node.js container to run short JS tooling/scripts. | Good for quick transforms without touching host. |
| `github` | Official GitHub MCP server for issues/PRs/repos. | Provide auth token via the server config; scope to the target repo. |
| `dockerhub` | Interact with Docker Hub. | Requires `dockerhub.pat_token` secret. |
| `mcp-api-gateway` | Access arbitrary APIs if configured with Swagger + headers. | Provide config via `mcp-config-set` before use. |
| `arxiv-mcp-server` | Search/download arXiv papers to local storage. | Configure `storage_path` with `mcp-config-set`. |

## Typical flows

- **Docs lookup**: Use `context7` for framework/library docs; keep repo edits in your editor/CLI.
- **Isolated experiments**: Use `node-code-sandbox` for small scripts that should not run on the host.
- **Container tasks**: Use `docker` server for builds/tests that must run in containers. Avoid destructive commands unless explicitly approved.
- **API exploration**: Use `mcp-api-gateway` when you have a Swagger URL and auth header; set config first.
- **GitHub operations**: Use `github` to read/create/update issues/PRs, comment on PR reviews, create branches, and push files. Keep destructive actions (e.g., merges, deletes) explicit and auditable.

### GitHub server quick actions (examples)

- Read/search: `list_issues`, `list_pull_requests`, `pull_request_read`, `search_code`.
- PR review: `add_comment_to_pending_review`, `pull_request_review_write`, `merge_pull_request`, `update_pull_request_branch`.
- Issues: `issue_read`, `issue_write`, `add_issue_comment`, `assign_copilot_to_issue`, `sub_issue_write`.
- Branch/files: `create_branch`, `push_files`, `create_or_update_file`, `delete_file`.
- Releases/tags: `list_releases`, `get_latest_release`, `get_release_by_tag`, `list_tags`, `get_tag`.

> Provide a scoped GitHub token in the server config. Use least privilege and target the intended repo.

## Troubleshooting

- If `mcp-add` fails with “Transport closed,” restart the gateway: `docker mcp gateway run`.
- Keep tokens out of tasks and code; store them as MCP secrets/environment variables.
