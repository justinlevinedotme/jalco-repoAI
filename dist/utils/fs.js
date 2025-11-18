"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.fileExists = fileExists;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.readMarkdownFrontmatter = readMarkdownFrontmatter;
exports.writeMarkdownFrontmatter = writeMarkdownFrontmatter;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const yaml_1 = __importDefault(require("yaml"));
async function ensureDir(dirPath) {
    await promises_1.default.mkdir(dirPath, { recursive: true });
}
async function fileExists(filePath) {
    try {
        await promises_1.default.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function readFile(filePath) {
    return promises_1.default.readFile(filePath, "utf8");
}
async function writeFile(filePath, content) {
    await ensureDir(path_1.default.dirname(filePath));
    await promises_1.default.writeFile(filePath, content, "utf8");
}
async function readMarkdownFrontmatter(filePath) {
    var _a, _b;
    const content = await readFile(filePath);
    const lines = content.split("\n");
    if (((_a = lines[0]) === null || _a === void 0 ? void 0 : _a.trim()) !== "---") {
        return { frontmatter: {}, body: content };
    }
    const closingIndex = lines.indexOf("---", 1);
    if (closingIndex === -1) {
        return { frontmatter: {}, body: content };
    }
    const frontmatterLines = lines.slice(1, closingIndex).join("\n");
    const frontmatter = (_b = yaml_1.default.parse(frontmatterLines)) !== null && _b !== void 0 ? _b : {};
    const body = lines.slice(closingIndex + 1).join("\n");
    return { frontmatter, body };
}
async function writeMarkdownFrontmatter(filePath, frontmatter, body) {
    const yamlContent = yaml_1.default.stringify(frontmatter).trimEnd();
    const serialized = `---\n${yamlContent}\n---\n${body}`;
    await writeFile(filePath, serialized);
}
