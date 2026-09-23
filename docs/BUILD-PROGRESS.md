# SSK configurator build progress

Updated: 2026-09-24, Europe/Amsterdam. Scott explicitly authorized autonomous overnight research/build/refinement with Claude, prioritizing working product over integration perfection. No merges: Scott merges. Do not publish live CCV changes without approval.

## Workspace
- Current glove repo: /Users/scottprins/Projects/ssk-glove-demo (fresh clone, origin scottprins32-hub/ssk-glove-demo).
- Old /Users/scottprins/dev/ssk-glove-demo is untouched July scaffold. Do not use it.
- Current glove branch feature/ssk-custom-studio includes the completed setup branch plus product refinements.
- Claude CLI /Users/scottprins/.local/bin/claude version 2.1.281; exact claude-opus-5-5 login verified. Older /usr/local/bin/claude exists; do not use it.
- Claude desktop composer set to Local, current repo, Opus 5.5, High effort. No new build task sent there.
- Original Claude cloud Glove configurator finished reverse workflow, pushed 5e2494e main. Do not restart it concurrently.

## Done / evidence
- Astra -> Opus read-only runner, role-scoped instructions, Codex skill and preserved reverse Claude /cross-review.
- 11 deterministic runner tests passed. Two real Opus 5.5 reviews executed; final has High none / Medium none. Useful Low issues fixed/tested afterward (no third review).
- Local .cross-review/ preserves raw reviews; REVIEW.md final second response; numbered .bak files ignored and preserved.
- Independent evaluator passed six-test earlier revision. Later product changes need fresh bounded review.

## Product priorities
1. Inspect current desktop/mobile glove experience and 44 Pro's current builder. Save concrete comparison, screenshots and actionable issues.
2. Fix order correctness and recovery first: unsupported tied fields, size/web consistency, data/reference roundtrip, honest preview limits, share/export and review completeness.
3. Improve glove interface deliberately, retaining original photography and confirmed catalogue.
4. Inspect latest bag branch claude/new-session-nch0vr (26210f8), reuse working product/material/part model rather than stale main (51a9724).
5. Build clothing experience only from verified catalogue/assets/options. Distinguish a design enquiry from an orderable SKU; never invent supplier facts.
6. Research CCV Shop integration from official docs, prepare secure external configurator/link/embed and validated order handoff. No client-side API secrets; no invented cart endpoint.
7. End-to-end mobile/desktop/a11y/order tests, Claude reviews and justified refinement. Make reviewable commits/PRs without merging.

## Verified sources
- https://sskeurope.ccvshop.nl/ live CCV store, clothing/bags/gloves and clubwear categories.
- https://44pro.com/ current custom builder links, series and positions.
- https://www.ccv.eu/en/service-contact/developer-portal/webshop-api official platform/API overview.
- https://github.com/ccvshop official SDK/examples.
- https://demo.ccvshop.nl/API/Docs/ web tool failed; retry directly/browser.

## Constraints / unknowns
- Glove README is partly stale: claims back-only but palm assets and code are present. Verify rendered behavior.
- Palm/back2 tied color is explicitly unsupported in current code comments/README; form asks separately. Verify source before changing.
- Historical bag notes must not override current CLAUDE.md/schema: letters differ per chart (backpack E piping/F zip, shoulder F piping/H zip).
- Shop admin/API and live checkout provisioning not verified. Publish not authorized.
- No current clothing custom schema discovered yet.

## Usage / continuation
Heartbeat automation ssk-configurator-overnight-build runs hourly in this task. Check live Codex limits before large blocks and Claude app usage/reset time before reviews. Latest Codex check used 3% of weekly window, no reset credits. Claude app earlier showed 23% of five-hour window with ~4h remaining; refresh rather than assume. On limit, save progress and wait for normal reset; no repeated calls, paid resets, purchases or bypasses. Continue useful work with available provider. Notify only meaningful milestones/failures/input needs. Stop refining when concrete quality criteria are met; no pointless endless churn.

## Product checkpoint, September 24
- Glove changes implemented: independent palm/back2 order choices, hostile summary text escaped, restored size/web compatibility, bounded restored text, stable back palette code explicitly labelled as partial, full design links plus specification download, private contact data excluded from sharing, honest draft/order status, conditional personalisation readiness, accessible labels/modal focus/Escape, readable starter cards and persistent mobile price.
- Deterministic browser assertions: state_check.mjs 9 cases passed; keyboard_check.mjs 7 checks passed; studio_check.mjs passed hostile text, colour independence, size/web, sharing/roundtrip/privacy, downloads, modal keyboard and eight steps at 360/390/768/1440. New conditional text UI changes also covered by final studio rerun. Visual quality still requires independent evaluation. Rendering engine/assets/catalogue values unchanged.
- Scott explicitly requested Claude build concurrently. Claude Opus 5.5 launched via /Users/scottprins/.local/bin/claude with builder prompt saved in this task's work/claude-bag-build.txt; live JSONL work/claude-bag-build.jsonl. It owns ONLY bag repo, feature/bag-studio-refinement, no push/deploy/merge. Astra owns glove. Read the bag BUILDER-HANDOFF.md when it finishes before reviewing; do not edit bag concurrently.
- Active glove local preview http://127.0.0.1:8765. Saved-state test ports 8793, keyboard8794. Claude told to use other ports for bag.
- No live shop changes. No clothing implementation yet. CCV research needs concrete integration deliverable.
