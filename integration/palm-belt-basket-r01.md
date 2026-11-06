# Independent palm / Back 2 and basket entry

Back 2 and palm now retain separate colours in edits, starters, drafts and design codes. Crocodile finish covers Back 1–9 and the belt. Existing nine-panel order snapshots keep their original exact memo wording. No renderer, trace, source artwork or lace geometry was changed.

The configurator has seven steps. Buyer name/telephone are collected at CCV checkout; personalization text is unchanged. The final primary action adds the reviewed fixed design to the SSK basket. Multiple fresh designs can be saved first and transferred together.

After CCV handoff, further designs cannot be appended safely through the available API. They stay saved separately and the UI offers the existing basket. Never replace CCV’s row collection: it can overwrite a simultaneous shop-cart edit. The documented row POST cannot carry the design memo.

GloveOrderDraft.bundle is an explicit private array field (1–6 IDs), with admin-only RLS unchanged. Cached clients retain protocol ccv-r03-01; apiBuild ccv-r04-03 identifies this implementation.

Validation: 160 Node tests, 20 package tests; independent source review passed 75 targeted tests. Browser selections, reload, separate navy/red fields and crocodile belt inspected. Real synthetic CCV baskets verified without identity, terms, final order or payment. A temporary collection-PUT experiment was rejected in review and removed from production source. An initial transient verification failure was reconciled only after the existing unpaid basket and exact specifications were verified.

Not tested: physical phones/tablets, payment completion, simultaneous manual shop checkout. No payment or actual order was placed.
