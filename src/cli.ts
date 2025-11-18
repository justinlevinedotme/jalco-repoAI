#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init";
import { runSync } from "./commands/sync";

const program = new Command();

program.name("jalco-repoAI").description("AI task workflow scaffold and sync CLI").version("1.0.0");

program
  .command("init")
  .description("Bootstrap the AI task workflow scaffold in the current repository")
  .option("--no-sample", "Skip creating a sample task")
  .action(async (options: { sample?: boolean }) => {
    try {
      await runInit(options);
    } catch (error: any) {
      console.error(`Error during init: ${error?.message ?? error}`);
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("Regenerate tasks/TASKS_INDEX.md from task frontmatter")
  .action(async () => {
    try {
      await runSync();
    } catch (error: any) {
      console.error(`Error during sync: ${error?.message ?? error}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});
