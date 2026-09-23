@AGENTS.md

## Cross-review

After finishing a feature, Scott runs `/cross-review`: GPT-6 Astra reviews the
branch through Codex, read-only, and Claude fixes what it agrees with. The
reviewer rules apply only to the agent currently reviewing, regardless of model.

Rejection rule: a Medium or Low point may be rejected with a one-line reason.
A High point may be rejected only with evidence (a test, a code reference, or
documentation), and every rejected High point goes in the report for Scott to
decide. At most two review rounds; never merge, Scott merges.

When asked to review, follow `Reviewer rules (only when asked to review)` in AGENTS.md.

For Astra-built work, Codex runs `cross-review` using the loop in AGENTS.md.
For Claude-built work, keep using `/cross-review` from this repository.
