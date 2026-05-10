# Agent Guide — ep_reference

Reference content from other Pads.

## Tech stack

* Etherpad plugin framework (hooks declared in `ep.json`)
* EJS templates rendered server-side via `eejsBlock_*` hooks
* `ep_plugin_helpers` for shared boilerplate

## Project structure

```
ep_reference/
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE.md
├── ep.json
├── index.js
├── package.json
├── static/
│   ├── css/
│   ├── js/
│   ├── tests/
├── templates/
│   ├── reference.ejs
```

## Helpers used

* `padToggle` (client sub-path) from `ep_plugin_helpers`
* `padToggle` (server) from `ep_plugin_helpers`


## Helpers NOT used

_To be audited in the helpers-adoption sweep (Phase 4)._


## Running tests locally

`ep_reference` runs inside Etherpad's test harness. From an etherpad checkout that has installed this plugin via `pnpm run plugins i --path ../ep_reference`:

```bash
# Backend (Mocha) — harness boots its own server
pnpm --filter ep_etherpad-lite run test

# Playwright — needs `pnpm run dev` in a second terminal
pnpm --filter ep_etherpad-lite run test-ui
```

## Standing rules for agent edits

* PRs target `main`. Linear commits, no merge commits.
* Every bug fix includes a regression test in the same commit.
* All user-facing strings in `locales/`. No hardcoded English in templates.
* No hardcoded `aria-label` on icon-only controls — etherpad's html10n auto-populates `aria-label` from the localized string when (a) the element has a `data-l10n-id` and (b) no author-supplied `aria-label` is present. Adding a hardcoded English `aria-label` blocks that and leaves it untranslated. (See `etherpad-lite/src/static/js/vendors/html10n.ts:665-678`.)
* No nested interactive elements (no `<button>` inside `<a>`).
* LLM/Agent contributions are explicitly welcomed by maintainers.

## Quick reference: hooks declared in `ep.json`

* Server: `loadSettings`, `clientVars`, `eejsBlock_body`, `eejsBlock_mySettings`, `eejsBlock_padSettings`, `eejsBlock_dd_help`
* Client: `postAceInit`, `handleClientMessage_CUSTOM`, `handleClientMessage_CLIENT_MESSAGE`, `aceInitialized`, `aceAttribsToClasses`, `aceDomLineProcessLineAttributes`, `aceRegisterBlockElements`, `aceEditorCSS`, `aceCreateDomLine`, `aceGetFilterStack`, `aceRegisterLineAttributes`

When adding a hook, register it in both `ep.json` *and* the matching `exports.<hook> = ...` in the JS file.
