# Context Compaction Protocol

Use this when the chat/context window gets tight (≥ ~85% capacity) to preserve key details for this repo’s task flow.

## Steps

1. Announce compaction
   ```markdown
   [STATUS: Context Compaction]
   Context window above 85% capacity
   Initiating maintenance steps for context preservation...
   ```

2. Consolidate the task file
   - Section 4 (Implementation log): ensure the log is current; add a brief handoff note (what changed, tests run/results, gaps).
   - Section 5 (Completion/review): add follow-ups or review notes if any.
   - If a Context Manifest is in use (after Section 1), update it only if there were true discoveries; if not present and not needed, skip.

3. Capture discoveries/drift
   - If new behavior/deps/config gotchas surfaced, add a short “Discovered During Implementation” note in Section 4 or Section 5.
   - If nothing new: note “No context updates needed.”

4. Documentation touch-ups (only if impacted)
   - Update relevant docs (README, workflows, agent files, other docs) if the change altered behavior or instructions; note what was updated or skipped and why.

5. Completion summary
   ```markdown
   [COMPLETE: Context Compaction]
   ✓ Work logs consolidated
   ✓ Context manifest [updated/current]
   ✓ Documentation [updated/current]

   Ready to continue with fresh context window.
   ```

## Notes

- Keep it lightweight: update context/docs only for real drift or discoveries.
- Use file paths and short summaries; avoid code snippets. Call `context7` for external doc clarification when needed.
- Keep code edits focused; use the GitHub server only for PR/issue/review actions, not for local code changes.
