---
name: cross-review
description: Run the SSK repository's Astra-builds, Claude-Opus-5.5-reviews loop when asked to cross-review completed feature work.
---

Read AGENTS.md at the repository root and execute its
`Cross-review loop (Astra builds, Claude reviews)` section.
Use `python3 scripts/claude-review.py --base <base>` for the reviewer call.
This skill runs in Codex. Preserve Claude's separate `.claude/commands/cross-review.md`
workflow, which sends Claude-built work to Astra. Never invoke both loops together.
