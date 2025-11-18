import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

export async function readMarkdownFrontmatter(
  filePath: string,
): Promise<{ frontmatter: any; body: string }> {
  const content = await readFile(filePath);
  const lines = content.split("\n");

  if (lines[0]?.trim() !== "---") {
    return { frontmatter: {}, body: content };
  }

  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterLines = lines.slice(1, closingIndex).join("\n");
  const frontmatter = YAML.parse(frontmatterLines) ?? {};
  const body = lines.slice(closingIndex + 1).join("\n");

  return { frontmatter, body };
}

export async function writeMarkdownFrontmatter(
  filePath: string,
  frontmatter: any,
  body: string,
): Promise<void> {
  const yamlContent = YAML.stringify(frontmatter).trimEnd();
  const serialized = `---\n${yamlContent}\n---\n${body}`;
  await writeFile(filePath, serialized);
}
