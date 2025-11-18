import fs from "fs/promises";
import path from "path";
import { ensureDir, readMarkdownFrontmatter, writeFile } from "../utils/fs";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  owner: string;
  tags: string;
  updated: string;
}

const TASKS_HEADER =
  "# Tasks Index\n\n| ID | Title | Status | Priority | Owner | Tags | Updated |\n|----|-------|--------|----------|-------|------|---------|\n";

async function findTaskFiles(tasksDir: string): Promise<string[]> {
  await ensureDir(tasksDir);
  const entries: string[] = await fs.readdir(tasksDir);
  return entries
    .filter((name: string) => /^T-[^/]+\.md$/i.test(name))
    .map((name: string) => path.join(tasksDir, name));
}

function formatTags(tags: any): string {
  if (Array.isArray(tags)) {
    return tags.join(", ");
  }
  if (typeof tags === "string") {
    return tags;
  }
  return "";
}

async function buildTaskRow(filePath: string): Promise<TaskRow> {
  const { frontmatter } = await readMarkdownFrontmatter(filePath);
  return {
    id: frontmatter?.id ?? "",
    title: frontmatter?.title ?? "",
    status: frontmatter?.status ?? "",
    priority: frontmatter?.priority ?? "",
    owner: frontmatter?.owner ?? "",
    tags: formatTags(frontmatter?.tags),
    updated: frontmatter?.updated_at ?? frontmatter?.updated ?? "",
  };
}

function renderTable(rows: TaskRow[]): string {
  const tableRows = rows
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (row) =>
        `| ${row.id} | ${row.title} | ${row.status} | ${row.priority} | ${row.owner} | ${row.tags} | ${row.updated} |`,
    )
    .join("\n");
  return TASKS_HEADER + (tableRows ? `${tableRows}\n` : "");
}

export async function runSync(): Promise<void> {
  const root = process.cwd();
  const tasksDir = path.join(root, "tasks");
  const taskFiles = await findTaskFiles(tasksDir);

  const rows: TaskRow[] = [];
  for (const filePath of taskFiles) {
    try {
      rows.push(await buildTaskRow(filePath));
    } catch (error: any) {
      throw new Error(`Failed to parse ${path.relative(root, filePath)}: ${error?.message ?? error}`);
    }
  }

  const indexContent = renderTable(rows);
  await writeFile(path.join(tasksDir, "TASKS_INDEX.md"), indexContent);

  console.log(`Indexed ${rows.length} task(s).`);
}
