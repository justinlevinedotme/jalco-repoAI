"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSync = runSync;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("../utils/fs");
const TASKS_HEADER = "# Tasks Index\n\n| ID | Title | Status | Priority | Owner | Tags | Updated |\n|----|-------|--------|----------|-------|------|---------|\n";
async function findTaskFiles(tasksDir) {
    await (0, fs_1.ensureDir)(tasksDir);
    const entries = await promises_1.default.readdir(tasksDir);
    return entries
        .filter((name) => /^T-[^/]+\.md$/i.test(name))
        .map((name) => path_1.default.join(tasksDir, name));
}
function formatTags(tags) {
    if (Array.isArray(tags)) {
        return tags.join(", ");
    }
    if (typeof tags === "string") {
        return tags;
    }
    return "";
}
async function buildTaskRow(filePath) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { frontmatter } = await (0, fs_1.readMarkdownFrontmatter)(filePath);
    return {
        id: (_a = frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.id) !== null && _a !== void 0 ? _a : "",
        title: (_b = frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.title) !== null && _b !== void 0 ? _b : "",
        status: (_c = frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.status) !== null && _c !== void 0 ? _c : "",
        priority: (_d = frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.priority) !== null && _d !== void 0 ? _d : "",
        owner: (_e = frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.owner) !== null && _e !== void 0 ? _e : "",
        tags: formatTags(frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.tags),
        updated: (_g = (_f = frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.updated_at) !== null && _f !== void 0 ? _f : frontmatter === null || frontmatter === void 0 ? void 0 : frontmatter.updated) !== null && _g !== void 0 ? _g : "",
    };
}
function renderTable(rows) {
    const tableRows = rows
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((row) => `| ${row.id} | ${row.title} | ${row.status} | ${row.priority} | ${row.owner} | ${row.tags} | ${row.updated} |`)
        .join("\n");
    return TASKS_HEADER + (tableRows ? `${tableRows}\n` : "");
}
async function runSync() {
    var _a;
    const root = process.cwd();
    const tasksDir = path_1.default.join(root, "tasks");
    const taskFiles = await findTaskFiles(tasksDir);
    const rows = [];
    for (const filePath of taskFiles) {
        try {
            rows.push(await buildTaskRow(filePath));
        }
        catch (error) {
            throw new Error(`Failed to parse ${path_1.default.relative(root, filePath)}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        }
    }
    const indexContent = renderTable(rows);
    await (0, fs_1.writeFile)(path_1.default.join(tasksDir, "TASKS_INDEX.md"), indexContent);
    console.log(`Indexed ${rows.length} task(s).`);
}
