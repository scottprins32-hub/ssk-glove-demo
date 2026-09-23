@AGENTS.md

## Cross-review

After finishing a feature, Scott runs `/cross-review`: GPT-6 Astra reviews the
branch through Codex, read-only, and Claude fixes what it agrees with. The
"Reviewer rules" in AGENTS.md are for Astra only, not for Claude.

Rejection rule: a Medium or Low point may be rejected with a one-line reason.
A High point may be rejected only with evidence (a test, a code reference, or
documentation), and every rejected High point goes in the report for Scott to
decide. At most two review rounds; never merge, Scott merges.
