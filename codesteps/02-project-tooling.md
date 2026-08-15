# Step 02 — Project Tooling & Repo Scaffolding

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** [01](01-pack-and-lexicon-schema.md)

## Goal

Get a buildable, testable, lintable repo in place before writing engine code, so steps 03+ have somewhere real to live instead of accumulating loose files.

## Deliverables

- `package.json` with build/test/lint scripts
- Language decision (see below) and its config file(s)
- Bundler config producing a single `dist/onomasticon.js` for Foundry to load
- Lint + format config
- Test runner config
- `.gitignore`
- `LICENSE`
- GitHub Actions CI: lint + test + build on every push/PR

## Key decisions

- **TypeScript**, decided over plain JS. The pack schema has enough shape (slot kinds, derivation objects, result objects) that compile-time checking catches the same class of typo the step-01 negative test caught by hand. Foundry types (e.g. `@league-of-foundry-developers/foundry-vtt-types` or `fvtt-types`) are deferred to step 07, when code actually touches the Foundry runtime — no reason to pull them in for pure-logic steps 03–06.
- **esbuild** as the bundler — fast, trivial config (`esbuild.config.mjs`), bundles `src/index.ts` to `dist/onomasticon.js` as ESM. No dev-server needed since Foundry module dev doesn't benefit much from HMR against a running world.
- **vitest** as the test runner — fast, native TS support, no Foundry runtime required since steps 03–06 are pure logic.
- **npm** as the package manager.
- **ESLint (flat config) + typescript-eslint + Prettier**, with `eslint-config-prettier` disabling stylistic rules ESLint would otherwise fight Prettier over.
- **MIT license.**
- A placeholder `src/index.ts` (exporting a version constant) plus a matching test exist solely to give the pipeline something real to build/lint/test — actual engine code starts in step 03.

## Open questions

- None.

## Definition of done

- [x] `npm install && npm run build && npm test && npm run lint && npm run typecheck && npm run format` all succeed on a clean checkout
- [ ] CI is green on a trivial no-op PR (workflow added; first real run happens once this lands on `main`)
- [x] Repo has a LICENSE (MIT)
