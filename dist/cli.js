#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const sync_1 = require("./commands/sync");
const program = new commander_1.Command();
program.name("jalco-repoai").description("AI task workflow scaffold and sync CLI").version("1.0.0");
program
    .command("init")
    .description("Bootstrap the AI task workflow scaffold in the current repository")
    .option("--no-sample", "Skip creating a sample task")
    .option("--update-agents", "Overwrite agent instruction files with the latest templates")
    .action(async (options) => {
    var _a;
    try {
        await (0, init_1.runInit)(options);
    }
    catch (error) {
        console.error(`Error during init: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        process.exit(1);
    }
});
program
    .command("sync")
    .description("Regenerate tasks/TASKS_INDEX.md from task frontmatter")
    .action(async () => {
    var _a;
    try {
        await (0, sync_1.runSync)();
    }
    catch (error) {
        console.error(`Error during sync: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        process.exit(1);
    }
});
program.parseAsync(process.argv).catch((error) => {
    console.error(error);
    process.exit(1);
});
