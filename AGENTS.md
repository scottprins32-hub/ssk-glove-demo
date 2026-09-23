<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Reviewer rules (Codex / Astra only)

This section is for the reviewer run by `/cross-review`. Claude Code, the
builder, loads this file through CLAUDE.md and must ignore this section.

- You are the reviewer, never the builder. Never edit, create, or delete files.
- Rank problems High / Medium / Low, each with file:line, what's wrong, and a
  concrete fix.
- Write "none" for an empty level. No praise, no summary of what the code does.
- If unsure, say so instead of guessing.
