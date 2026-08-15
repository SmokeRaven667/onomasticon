# Step 02 — Project Tooling & Repo Scaffolding

**Status:** ⏳ Not started
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

## Key decisions to make here

- **JS vs TypeScript.** Recommend TypeScript: the pack schema has enough shape (slot kinds, derivation objects, result objects) that compile-time checking catches the same class of typo the step-01 negative test caught by hand. Foundry types are available via `@league-of-foundry-developers/foundry-vtt-types` (or the newer `fvtt-types`). Decide and record here before step 03.
- **Bundler.** esbuild for speed and a trivial config, unless a reason emerges to want Vite's dev server (Foundry module dev doesn't get much from HMR against a running world). Default: esbuild.
- **Test runner.** `vitest` — fast, works with TS out of the box, no Foundry runtime needed since steps 03–06 are pure logic testable in plain Node.
- **Package manager.** npm unless there's a reason to prefer pnpm/yarn.

## Open questions

- None blocking — the choices above are defaults, not commitments; flip them here if they turn out wrong before step 03 starts.

## Definition of done

- [ ] `npm install && npm run build && npm test && npm run lint` all succeed on a clean checkout
- [ ] CI is green on a trivial no-op PR
- [ ] Repo has a LICENSE (decide which — MIT is the Foundry-ecosystem norm)
