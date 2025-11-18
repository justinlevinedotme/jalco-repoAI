import fs from "fs/promises";
import path from "path";
import { ensureDir, fileExists, writeFile } from "../utils/fs";

interface InitOptions {
  sample?: boolean;
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
`;

const AI_MCP_INSTRUCTIONS_CONTENT = `# AI MCP Instructions

Use MCP tools to operate inside this repository. Follow these guidelines:

- **GitMCP** handles repository operations:
  - search code
  - list files and directories
  - read files
  - write files
  - apply patches/diffs
  - view changes/diffs
- **context7** (or similar) provides external documentation lookups for frameworks, libraries, and APIs. Do not mix external lookups with repository edit tools.

## Workflow for tasks

1. **Intake**: create a task from the template in \`tasks/\`.
2. **Context**: use GitMCP search/read tools to fill Section 1.
3. **Criteria**: draft proposed success criteria in Section 2.
4. **Approval**: a human edits Section 3 and sets status to \`in_progress\`.
5. **Implementation**: use GitMCP to edit code; log work in Section 4.
6. **Docs/Cleanup**: update docs/comments/tests as needed.
7. **Review**: human verifies and sets status to \`done\`.
`;

const AI_GITMCP_INTEGRATION_CONTENT = `# AI GitMCP Integration

Use GitMCP tools for all repository interactions. Typical tools (names may vary by client):

- \`gitmcp.search\` — search the codebase.
- \`gitmcp.readFile\` — read file contents.
- \`gitmcp.writeFile\` — write files.
- \`gitmcp.applyPatch\` — apply diffs/patches safely.
- \`gitmcp.listDirectory\` — list files and directories.
- \`gitmcp.diff\` — view changes.

Rules:

- Do not guess file paths; discover with GitMCP.
- Do not bypass the task system; every change maps to a task.
- Use context7 (or similar) for external docs, not GitMCP.

Example (Context agent):

1. List files with \`gitmcp.listDirectory\`.
2. Search for a keyword with \`gitmcp.search\`.
3. Read relevant files with \`gitmcp.readFile\`.
4. Update the task file Section 1 with findings using \`gitmcp.writeFile\` or \`gitmcp.applyPatch\`.
`;

const AI_README_CONTENT = `# Read This First (AI)

Use this file as the catch-all instructions when a human says, “read this file.” Treat it as your starting point to orient yourself.

- Start here, then read \`.aicontext/AI_WORKFLOW_TASKS.md\`, \`.aicontext/AI_MCP_INSTRUCTIONS.md\`, and relevant agent files in \`.aicontext/agents/\`.
- Confirm the current task in \`tasks/\` and respect its status and approved criteria.
- Prefer discovery over guessing: use GitMCP list/search/read before acting.
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

**Mission:** Capture new requests as tasks and ensure they are scoped.

**What to read:** \`.aicontext/AI_WORKFLOW_TASKS.md\`, \`.aicontext/AI_MCP_INSTRUCTIONS.md\`, \`.aicontext/TASK_TEMPLATE.md\`. Read existing tasks if related.

**Tools to use:** GitMCP list/search/read/write/applyPatch for repository files; context7 for external docs if needed.

**Responsibilities:**
- Create new task files from the template.
- Populate frontmatter (id, title, status, priority) and Section 0.
- Ask clarifying questions in Section 1.4.
- Set status to \`planning\` or \`awaiting_approval\` as appropriate.

**Sections allowed to edit:** Frontmatter; Section 0; add notes to Section 1.4.

**Things never allowed:** Do not change approved criteria; do not implement code; do not move tasks forward without human approval.
`,
  context: `# Agent: Context Researcher

**Mission:** Gather repository context so criteria can be drafted confidently.

**What to read:** Task frontmatter; Sections 0 and 1 to avoid duplicating work; \`.aicontext/AI_GITMCP_INTEGRATION.md\`.

**Tools to use:** GitMCP list/search/read for code; applyPatch/writeFile for updating Section 1; context7 for external docs.

**Responsibilities:**
- Identify relevant files/directories.
- Summarize current behavior and risks in Section 1.
- Capture open questions for the human.

**Sections allowed to edit:** Section 1 only.

**Things never allowed:** Do not edit Section 3; do not change code; do not approve scope.
`,
  criteria: `# Agent: Criteria & Scope

**Mission:** Propose clear, testable success criteria.

**What to read:** Task frontmatter; Sections 0 and 1; \`.aicontext/AI_WORKFLOW_TASKS.md\`.

**Tools to use:** GitMCP read/search if more context is needed; context7 for external docs.

**Responsibilities:**
- Draft Section 2 proposed success criteria.
- Ensure criteria are measurable and aligned with the task.
- Tag risks or dependencies.

**Sections allowed to edit:** Section 2.

**Things never allowed:** Do not modify Section 3; do not implement code; do not change task status beyond recommendations.
`,
  implementation: `# Agent: Implementation

**Mission:** Implement approved work once scope is set to \`in_progress\`.

**What to read:** Task frontmatter; Sections 0-3; \`.aicontext/AI_GITMCP_INTEGRATION.md\`.

**Tools to use:** GitMCP search/read/applyPatch/writeFile/diff; context7 for external docs; local tests commands as documented.

**Responsibilities:**
- Follow approved criteria in Section 3.
- Update code, tests, and docs as needed.
- Log work chronologically in Section 4.

**Sections allowed to edit:** Codebase; Section 4 implementation log.

**Things never allowed:** Do not change Section 3; do not start work if status is not \`in_progress\`.
`,
  docs: `# Agent: Docs & Cleanup

**Mission:** Ensure documentation, comments, and cleanup are completed.

**What to read:** Task Sections 0-4; CODESTYLE; prior work notes.

**Tools to use:** GitMCP read/applyPatch/writeFile/diff; context7 for doc references.

**Responsibilities:**
- Update docs/comments/tests impacted by the change.
- Ensure formatting and lint expectations are met.
- Add follow-up items to Section 5 if needed.

**Sections allowed to edit:** Code/doc updates; Section 5 where follow-ups are logged.

**Things never allowed:** Do not change Section 3; do not rewrite history of Section 4 beyond clarifications.
`,
  review: `# Agent: Review & Sync

**Mission:** Verify work, sync indexes, and close out tasks.

**What to read:** Full task file especially Sections 3-5; TASKS_INDEX.

**Tools to use:** GitMCP diff/read/write; sync command for TASKS_INDEX; context7 if external verification is needed.

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
  summary: { created: string[]; skipped: string[] },
): Promise<void> {
  if (await fileExists(filePath)) {
    summary.skipped.push(filePath);
    return;
  }
  await writeFile(filePath, addTrailingNewline(content));
  summary.created.push(filePath);
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
  const summary = { created: [] as string[], skipped: [] as string[] };
  const root = process.cwd();
  const sampleEnabled = options.sample !== false;

  // Core directories
  await ensureDir(path.join(root, ".aicontext"));
  await ensureDir(path.join(root, ".aicontext", "agents"));
  await ensureDir(path.join(root, "tasks"));
  await ensureDir(path.join(root, ".github", "workflows"));

  // Core instruction files
  await createIfMissing(path.join(root, ".aicontext", "AI_WORKFLOW_TASKS.md"), AI_WORKFLOW_TASKS_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "AI_MCP_INSTRUCTIONS.md"), AI_MCP_INSTRUCTIONS_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "AI_GITMCP_INTEGRATION.md"), AI_GITMCP_INTEGRATION_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "AI_README.md"), AI_README_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "CODESTYLE.md"), CODESTYLE_CONTENT, summary);
  await createIfMissing(path.join(root, ".aicontext", "TASK_TEMPLATE.md"), TASK_TEMPLATE_CONTENT, summary);

  // Agents
  await createIfMissing(path.join(root, ".aicontext", "agents", "01-intake-planner.md"), agentContent.intake, summary);
  await createIfMissing(path.join(root, ".aicontext", "agents", "02-context-researcher.md"), agentContent.context, summary);
  await createIfMissing(path.join(root, ".aicontext", "agents", "03-criteria-scope.md"), agentContent.criteria, summary);
  await createIfMissing(path.join(root, ".aicontext", "agents", "04-implementation.md"), agentContent.implementation, summary);
  await createIfMissing(path.join(root, ".aicontext", "agents", "05-docs-cleanup.md"), agentContent.docs, summary);
  await createIfMissing(path.join(root, ".aicontext", "agents", "06-review-sync.md"), agentContent.review, summary);

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
  console.log("Next steps: customize `.aicontext/CODESTYLE.md`, adjust agent files for your repo, and start creating tasks in `tasks/`.");
}
