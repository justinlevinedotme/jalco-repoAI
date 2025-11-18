import fs from "fs/promises";
import path from "path";
import { ensureDir, fileExists, writeFile } from "../utils/fs";

interface InitOptions {
  sample?: boolean;
  updateAgents?: boolean;
}

const AI_WORKFLOW_TASKS_CONTENT = `# AI Workflow Tasks

This repository uses file-based tasks located in \`tasks/T-XXXX-*.md\`. Each task uses YAML frontmatter followed by structured sections owned by different agents and humans.

## Status lifecycle

- \`planning\`
- \`needs_context\`
- \`awaiting_approval\`
- \`in_progress\`
- \`in_review\`
- \`done\`

## Task file sections

1. **0. User story / problem** — human-written description of the request or bug.
2. **1. Context gathered by AI(s)** — AI collects relevant code context and summarizes it.
3. **2. Proposed success criteria (AI draft)** — AI proposes testable acceptance criteria.
4. **3. Approved success criteria (human-edited)** — human edits/approves; this is the contract.
5. **4. Implementation log / notes** — AI logs work performed and decisions made.
6. **5. Completion checklist & review** — final notes, review outcomes, and follow-ups.

## Rules

- AIs MUST NOT bypass tasks. Non-trivial work must reference a task.
- Once Section 3 is approved, it is the source of truth for scope.
- Use the sections only as intended; do not repurpose or delete them.
- Intake owns Sections 0-2: create the task, gather context (Section 1), and draft criteria (Section 2). When drafting criteria, end with a short approval keyword the human can reply with (e.g., \`approve T-0002 criteria\`). Humans should paste criteria into Section 3 and flip status to \`in_progress\` when approving.
- For complex tasks, add a brief “Context Manifest” after Section 1: current flow, components/config touched, risks/edge cases, file paths. If not needed, note why it’s skipped.
`;

const AI_MCP_INSTRUCTIONS_CONTENT = `# AI MCP Instructions

Use MCP tools to operate inside this repository. Follow these guidelines:
- **context7** (Docker MCP gateway) for external docs lookups (\`resolve-library-id\`, \`get-library-docs\`); use it whenever you need framework/library references.
- **sequentialthinking** (gateway) for structured reasoning and plan helpers.
- **github** (gateway, if enabled) for GitHub-side operations: issues/PRs, review comments, branches, releases. Keep local code edits in your editor/CLI, and use the GitHub server only for GitHub API actions.
- **MCP_DOCKER** gateway exposes dynamic tools (\`mcp-add\`, \`mcp-find\`, \`mcp-remove\`) so you can load servers like \`docker\`, \`node-code-sandbox\`, \`dockerhub\`, or \`mcp-api-gateway\`. See \`.aicontext/MCP_SERVERS.md\` for quickstart commands and recommended servers.

## Workflow for tasks

1. **Intake (now includes context + criteria)**: create a task in \`tasks/\`, gather context in Section 1 using normal repo search/read commands (e.g., \`rg\`, \`ls\`, \`cat\`) and \`context7\` for external docs, then draft proposed success criteria in Section 2 with an approval keyword suggestion (e.g., “Reply with \`approve T-0002 criteria\` to proceed”).
2. **Approval**: a human pastes the criteria into Section 3 and sets status to \`in_progress\` (or replies with the approval keyword and performs the Section 3/status update).
3. **Implementation**: edit code/tests/docs in the repo; log work in Section 4. Use the \`github\` server for GitHub API actions (comments, PRs, branches) if enabled.
4. **Docs/Cleanup**: update docs/comments/tests as needed; use the GitHub server only for PR/issue/review actions, never for code edits.
5. **Review**: human verifies and sets status to \`done\`.
`;

const AI_GITMCP_INTEGRATION_CONTENT = `# AI Repository Integration

Use standard repo tooling for interactions:

- Search the codebase with \`rg\` (ripgrep) or your editor search.
- Read files with \`cat\`, \`sed\`, or editor view.
- Write/update files with your editor or CLI tools; use patch-based edits to keep diffs small and reviewable.
- List files/directories with \`ls\`/\`find\`.
- View diffs with \`git diff\` (or your editor’s SCM view).

Rules:

- Do not guess file paths; discover with \`ls\`/\`find\`/search first.
- Do not bypass the task system; every change maps to a task.
- Use \`context7\` for external docs, not for repo edits.

Example (Context agent):

1. List files/directories with \`ls\`/\`find\`.
2. Search for a keyword with \`rg\`.
3. Read relevant files with \`cat\`/editor.
4. Update the task file Section 1 with findings using your editor or a patch-based edit.
`;

const CONTEXT_COMPACTION_CONTENT = `# Context Compaction Protocol

Use this when the chat/context window gets tight (≥ ~85% capacity) to preserve key details.

## Steps

1) Announce compaction
   \`\`\`markdown
   [STATUS: Context Compaction]
   Context window above 85% capacity
   Initiating maintenance agents for context preservation...
   \`\`\`

2) Run maintenance agents (adapted to this repo)
   - Logging — ensure the task file’s Section 4 (Implementation log) is up to date; summarize work and status.
   - Context refinement — check for discoveries/drift; add a “Discovered During Implementation” note (Section 4/5) only if new behavior/deps/config gotchas surfaced; otherwise note “No context updates needed.”
   - Service documentation — if code/flows changed enough to affect docs, update relevant docs (README, workflows, agent files, other docs) and note what was touched or skipped.

3) Completion summary
   \`\`\`markdown
   [COMPLETE: Context Compaction]
   ✓ Work logs consolidated
   ✓ Context manifest [updated/current]
   ✓ Service documentation [updated/current]

   Ready to continue with fresh context window.
   \`\`\`

## Notes

- Keep it lightweight: only update context/docs when there’s true drift or discoveries.
- Use file paths and short summaries; avoid code snippets. Call \`context7\` if you need external doc clarification.
`;

const MCP_SERVERS_CONTENT = `# MCP Servers Guide

This repository is MCP-first. Use this guide to start the Docker MCP gateway and load helpful servers.

## Quickstart

- Ensure Docker is running.
- Start the gateway (stdio): \`docker mcp gateway run\`
- Built-in servers in this gateway:
  - \`context7\` — external docs lookup (\`resolve-library-id\`, \`get-library-docs\`).
  - \`sequentialthinking\` — structured reasoning / plan helper.
- Add or inspect servers using the dynamic tools exposed by \`MCP_DOCKER\`:
  - \`mcp-find docker\` – list available Docker-backed servers.
  - \`mcp-add <server>\` – load a server into the registry for this session.
  - \`mcp-remove <server>\` – unload if no longer needed.

## Recommended servers

| Server | Purpose | Notes |
| --- | --- | --- |
| \`docker\` | Run Docker CLI commands via MCP (build/run/inspect). | Requires local Docker privileges; prefer safe flags/no-destructive commands. |
| \`node-code-sandbox\` | Disposable Node.js container to run short JS tooling/scripts. | Good for quick transforms without touching host. |
| \`github\` | Official GitHub MCP server for issues/PRs/repos. | Provide auth token via the server config; scope to the target repo. |
| \`dockerhub\` | Interact with Docker Hub. | Requires \`dockerhub.pat_token\` secret. |
| \`mcp-api-gateway\` | Access arbitrary APIs if configured with Swagger + headers. | Provide config via \`mcp-config-set\` before use. |
| \`arxiv-mcp-server\` | Search/download arXiv papers to local storage. | Configure \`storage_path\` with \`mcp-config-set\`. |

## Typical flows

- **Docs lookup**: Use \`context7\` for framework/library docs; keep repo edits in your editor/CLI.
- **Isolated experiments**: Use \`node-code-sandbox\` for small scripts that should not run on the host.
- **Container tasks**: Use \`docker\` server for builds/tests that must run in containers. Avoid destructive commands unless explicitly approved.
- **API exploration**: Use \`mcp-api-gateway\` when you have a Swagger URL and auth header; set config first.

## Troubleshooting

- If \`mcp-add\` fails with “Transport closed,” restart the gateway: \`docker mcp gateway run\`.
- Keep tokens out of tasks and code; store them as MCP secrets/environment variables.
`;

const AI_README_CONTENT = `# Read This First (AI)

Use this file as the catch-all instructions when a human says, “read this file.” Treat it as your starting point to orient yourself.

- Start here, then read \`.aicontext/AI_WORKFLOW_TASKS.md\`, \`.aicontext/AI_MCP_INSTRUCTIONS.md\`, and relevant agent files in \`.aicontext/agents/\`.
- Confirm the current task in \`tasks/\` and respect its status and approved criteria.
- Prefer discovery over guessing: list/search/read files before acting.
- If repo-specific rules are missing, ask for clarification in the task file.
- When unsure, propose next steps and await approval instead of acting silently.

> TODO: The human should add repo-specific constraints, test commands, and any security or data-handling rules here.
`;

const CODESTYLE_CONTENT = `# CODESTYLE

> TODO: Customize this file for your repository. These notes guide AI contributors.

## Languages
- Primary languages in this repo (fill in).

## Formatting
- List commands (e.g., \`pnpm format\`, \`npm run lint\`, \`cargo fmt\`).

## Imports / organization
- Document preferred import ordering, path aliases, and lint rules.

## Testing
- How to run tests locally and in CI; required coverage or smoke checks.

## Commit/branch conventions
- Branch naming, commit message format, release or CI requirements.
`;

const TASK_TEMPLATE_CONTENT = `---
id: T-XXXX
title: "Short title"
status: planning
priority: medium
owner: ""
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
tags: []
---

## 0. User story / problem

(Describe the problem in your own words.)

---

## 1. Context gathered by AI(s)

### 1.1 Relevant files / dirs

### 1.2 Summary of current behavior

### 1.3 Risks / constraints / assumptions

### 1.4 Open questions for the human

### Context Manifest (optional for complex tasks)

- Current flow and components/config touched
- Key file paths and entry points
- Notable risks/edge cases
- Docs/links to consult (use context7 if needed)
- If skipped: explain why it’s not needed

---

## 2. Proposed success criteria (AI draft)

(AI suggests testable criteria here.)

---

## 3. Approved success criteria (human-edited)

(Human edits this; this becomes the contract.)

---

## 4. Implementation log / notes

- YYYY-MM-DD – agent-name: summary of work

---

## 5. Completion checklist & review

### 5.1 Human review notes

### 5.2 Follow-up tasks (spinoffs)
`;

const WORKFLOW_CONTENT = `name: jalco-repoAI auto sync

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run jalco-repoAI init (idempotent)
        run: npx jalco-repoAI init --no-sample

      - name: Sync tasks index
        run: npx jalco-repoAI sync

      - name: Commit changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: sync AI task index and agent templates via jalco-repoAI"
          branch: \${{ github.ref_name }}
`;

const agentContent = {
  intake: `# Agent: Intake & Planner

**Mission:** Capture new requests as tasks, gather context, and propose criteria so work can start.

**What to read:** \`.aicontext/AI_WORKFLOW_TASKS.md\`, \`.aicontext/AI_MCP_INSTRUCTIONS.md\`, \`.aicontext/TASK_TEMPLATE.md\`. Read existing tasks if related.

**Tools to use:** Repo search/read/edit via your editor/CLI; prefer patch-based edits. Use context7 for external docs if needed.

**Responsibilities:**
- Create new task files from the template.
- Populate frontmatter (id, title, status, priority) and Section 0.
- Gather context in Section 1 (files/behavior/risks/questions) with a Definition of Ready checklist: scope clarity, test commands identified, risky areas noted, dependencies/owners, and doc lookups via context7 when needed.
- If complex, add a short “Context Manifest” after Section 1: current flow, components/config touched, risks/edge cases, file/path pointers. If skipped, state why.
- Draft proposed success criteria in Section 2 with an approval keyword the human can reply with.
- Set status to \`planning\` or \`awaiting_approval\` as appropriate.

**Sections allowed to edit:** Frontmatter; Sections 0, 1, and 2 (including optional Context Manifest).

**Things never allowed:** Do not change approved criteria; do not implement code; do not move tasks forward without human approval.
`,
  context: `# Agent: Context Researcher

**Mission:** Gather repository context so criteria can be drafted confidently (or confirm intake context is sufficient).

**What to read:** Task frontmatter; Sections 0 and 1 to avoid duplicating work; \`.aicontext/AI_GITMCP_INTEGRATION.md\`.

**Tools to use:** Repo search/read via editor/CLI; patch-based updates for Section 1; context7 for external docs.

**Responsibilities:**
- Identify relevant files/directories.
- Build an “evidence pack” in Section 1: paths/refs + short summaries, at least one risk and one open question (unless truly none).
- Call out unclear APIs/libs and prompt a context7 lookup if needed.
- Add/confirm a brief Context Manifest after Section 1 for complex tasks (current flow, components/config touched, risks/edge cases, file/path pointers). If not needed, note why.

**Sections allowed to edit:** Section 1 only.

**Things never allowed:** Do not edit Section 3; do not change code; do not approve scope.
`,
  criteria: `# Agent: Criteria & Scope

**Mission:** Propose clear, testable success criteria with measurability and risks/assumptions.

**What to read:** Task frontmatter; Sections 0 and 1; \`.aicontext/AI_WORKFLOW_TASKS.md\`.

**Tools to use:** Repo search/read via editor/CLI; context7 for external docs.

**Responsibilities:**
- Draft Section 2 proposed success criteria.
- For each criterion: state observable behavior, how to verify (command/test), and a risk/assumption note.
- Ensure criteria are aligned with the task and reference any needed context7 docs if unclear.

**Sections allowed to edit:** Section 2.

**Things never allowed:** Do not modify Section 3; do not implement code; do not change task status beyond recommendations.
`,
  implementation: `# Agent: Implementation

**Mission:** Implement approved work once scope is set to \`in_progress\`.

**What to read:** Task frontmatter; Sections 0-3; \`.aicontext/AI_GITMCP_INTEGRATION.md\`.

**Tools to use:** Repo search/read/edit/diff via editor/CLI; context7 for external docs; local test commands as documented.

**Responsibilities:**
- Follow approved criteria in Section 3.
- Update code, tests, and docs as needed.
- Log work chronologically in Section 4, including a brief “handoff note”: what changed, tests run/results, known gaps or follow-ups.
- If new discoveries arise (hidden deps/behavior/config gotchas), note them in Section 4 under “Discovered During Implementation” or ensure Section 5 gets a follow-up entry.

**Sections allowed to edit:** Codebase; Section 4 implementation log.

**Things never allowed:** Do not change Section 3; do not start work if status is not \`in_progress\`.
`,
  docs: `# Agent: Docs & Cleanup

**Mission:** Ensure documentation, comments, and cleanup are completed.

**What to read:** Task Sections 0-4; CODESTYLE; prior work notes.

**Tools to use:** Repo read/edit/diff via editor/CLI; context7 for doc references.

**Responsibilities:**
- Update docs/comments/tests impacted by the change.
- Ensure formatting and lint expectations are met.
- If code changes impact docs, identify affected files (README, workflows, agent files, etc.), update what’s relevant, and note what was updated or skipped and why.
- Add follow-up items to Section 5 if needed.

**Sections allowed to edit:** Code/doc updates; Section 5 where follow-ups are logged.

**Things never allowed:** Do not change Section 3; do not rewrite history of Section 4 beyond clarifications.
`,
  review: `# Agent: Review & Sync

**Mission:** Verify work, sync indexes, and close out tasks.

**What to read:** Full task file especially Sections 3-5; TASKS_INDEX.

**Tools to use:** Repo diff/read/write via editor/CLI; sync command for TASKS_INDEX; context7 if external verification is needed.

**Responsibilities:**
- Check work against approved criteria.
- Note review results and follow-ups in Section 5.
- Run jalco-repoAI sync to refresh \`tasks/TASKS_INDEX.md\`.

**Sections allowed to edit:** Section 5; TASKS_INDEX via sync; metadata fields like updated_at if appropriate.

**Things never allowed:** Do not change Section 3; do not override implementation decisions without documenting rationale.
`,
};

function addTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

async function createIfMissing(
  filePath: string,
  content: string,
  summary: { created: string[]; skipped: string[]; updated: string[] },
  overwrite = false,
): Promise<void> {
  const exists = await fileExists(filePath);
  if (exists && !overwrite) {
    summary.skipped.push(filePath);
    return;
  }
  await writeFile(filePath, addTrailingNewline(content));
  if (exists && overwrite) {
    summary.updated.push(filePath);
  } else {
    summary.created.push(filePath);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildSampleTask(): string {
  const date = today();
  return `---
id: T-0001
title: "Sample task: customize or delete"
status: planning
priority: medium
owner: ""
created_at: ${date}
updated_at: ${date}
tags: []
---

## 0. User story / problem

This is a sample task to demonstrate the workflow. Feel free to customize or delete it.

---

## 1. Context gathered by AI(s)

### 1.1 Relevant files / dirs

### 1.2 Summary of current behavior

### 1.3 Risks / constraints / assumptions

### 1.4 Open questions for the human

---

## 2. Proposed success criteria (AI draft)

(AI suggests testable criteria here.)

---

## 3. Approved success criteria (human-edited)

(Human edits this; this becomes the contract.)

---

## 4. Implementation log / notes

- ${date} – sample-agent: created sample task

---

## 5. Completion checklist & review

### 5.1 Human review notes

### 5.2 Follow-up tasks (spinoffs)
`;
}

export async function runInit(options: InitOptions = {}): Promise<void> {
  const summary = { created: [] as string[], skipped: [] as string[], updated: [] as string[] };
  const root = process.cwd();
  const sampleEnabled = options.sample !== false;
  const updateAgents = options.updateAgents === true;

  // Core directories
  await ensureDir(path.join(root, ".aicontext"));
  await ensureDir(path.join(root, ".aicontext", "agents"));
  await ensureDir(path.join(root, "tasks"));
  await ensureDir(path.join(root, ".github", "workflows"));

  // Core instruction files
  await createIfMissing(path.join(root, ".aicontext", "AI_WORKFLOW_TASKS.md"), AI_WORKFLOW_TASKS_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "AI_MCP_INSTRUCTIONS.md"), AI_MCP_INSTRUCTIONS_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "AI_GITMCP_INTEGRATION.md"), AI_GITMCP_INTEGRATION_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "MCP_SERVERS.md"), MCP_SERVERS_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "CONTEXT_COMPACTION.md"), CONTEXT_COMPACTION_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "AI_README.md"), AI_README_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "CODESTYLE.md"), CODESTYLE_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "TASK_TEMPLATE.md"), TASK_TEMPLATE_CONTENT, summary);

  // Agents
  await createIfMissing(
    path.join(root, ".aicontext", "agents", "01-intake-planner.md"),
    agentContent.intake,
    summary,
    updateAgents,
  );
  await createIfMissing(
    path.join(root, ".aicontext", "agents", "02-context-researcher.md"),
    agentContent.context,
    summary,
    updateAgents,
  );
  await createIfMissing(
    path.join(root, ".aicontext", "agents", "03-criteria-scope.md"),
    agentContent.criteria,
    summary,
    updateAgents,
  );
  await createIfMissing(
    path.join(root, ".aicontext", "agents", "04-implementation.md"),
    agentContent.implementation,
    summary,
    updateAgents,
  );
  await createIfMissing(
    path.join(root, ".aicontext", "agents", "05-docs-cleanup.md"),
    agentContent.docs,
    summary,
    updateAgents,
  );
  await createIfMissing(
    path.join(root, ".aicontext", "agents", "06-review-sync.md"),
    agentContent.review,
    summary,
    updateAgents,
  );

  // Tasks index
  const tasksIndexPath = path.join(root, "tasks", "TASKS_INDEX.md");
  const tasksIndexHeader = "# Tasks Index\n\n| ID | Title | Status | Priority | Owner | Tags | Updated |\n|----|-------|--------|----------|-------|------|---------|\n";
  await createIfMissing(tasksIndexPath, tasksIndexHeader, summary);

  // Sample task
  const tasksDirEntries: string[] = await fs.readdir(path.join(root, "tasks"));
  const hasTasks = tasksDirEntries.some((name: string) => /^T-[^/]+\.md$/i.test(name));
  if (!hasTasks && sampleEnabled) {
    await createIfMissing(path.join(root, "tasks", "T-0001-sample-task.md"), buildSampleTask(), summary);
  } else if (!sampleEnabled) {
    summary.skipped.push("Sample task (--no-sample)");
  }

  // GitHub workflow
  await createIfMissing(
    path.join(root, ".github", "workflows", "jalco-repoAI-auto-sync.yml"),
    WORKFLOW_CONTENT,
    summary,
  );

  // Summary logging
  console.log("jalco-repoAI init finished.");
  const formatItem = (item: string) => (path.isAbsolute(item) ? path.relative(root, item) : item);
  if (summary.created.length > 0) {
    console.log("Created:");
    summary.created.forEach((item) => console.log(`  - ${formatItem(item)}`));
  }
  if (summary.skipped.length > 0) {
    console.log("Skipped (already existed or not requested):");
    summary.skipped.forEach((item) => console.log(`  - ${formatItem(item)}`));
  }
  if (summary.updated.length > 0) {
    console.log("Updated:");
    summary.updated.forEach((item) => console.log(`  - ${formatItem(item)}`));
  }
  console.log("Next steps: customize `.aicontext/CODESTYLE.md`, adjust agent files for your repo, and start creating tasks in `tasks/`.");
}
