# Base44 static hosting

Live site: https://ssk-glove-configurator-da8db964.base44.app/
App ID: `6acecad7d76f2c87da8db964` (SSK Glove Configurator, Scott's Workspace).
GitHub holds the source. This app uses CLI static hosting; a GitHub push alone does
not update Base44, and Base44 builder chat is not the source-editing workflow.

## Build and verify

```sh
node --test scripts/test_glove_loading.mjs
python3 scripts/build-base44.py
```

The build starts from the existing Pages package and retains all four views'
registered assets, catalog badges, flags, reference images and design-system files.
It copies images byte for byte: palm insert SHA checks must continue to match.
The public folder is `_base44`; `_base44-manifest.json` records every served hash
outside that folder. Missing dependencies and archives at or above 50 MB fail the
build before replacing the previous Base44 output. Never substitute the entire
source tree: raw photos, traces and diagnostic assets do not belong in hosting.

Install the Base44 CLI locally (`npm install --no-save base44`) if it is not already
available. Authenticate with `npx base44 whoami`, then link this checkout to the
existing app with `npx base44 link` if `base44/.app.jsonc` is absent. Confirm the app
ID above; do not create another app. Keep that local link out of Git.

After independent review, publish only the static site:

```sh
npx base44 site deploy --no-build --yes
```

This does not require entities, functions, agents, a backend deploy or AI builder
credits. Check the hosted changed files against the manifest and open the four
H-web views after release. Preserve the last reviewed package for rollback.

## Existing designs and hosts

Drafts are saved per browser origin. Keep GitHub Pages available so existing
visitors can copy a design link and open it in the new site's saved-design field.
Shared links exclude name and phone. Do not clear saved designs during migration
or testing. Existing Vercel deployments were retained; deploying on Base44 does
not free their storage. GitHub Pages remains an automatically published fallback.
