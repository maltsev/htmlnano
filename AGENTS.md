# AGENTS Guide for htmlnano

This repository is a modular TypeScript HTML minifier built on PostHTML.
Follow the notes below to run builds/tests and match the existing style.

## Repo Map
- `src/` core TypeScript sources
- `src/_modules/` individual minifier modules
- `src/presets/` preset definitions
- `src/bin/` CLI entry
- `test/` mocha tests and fixtures
- `docs/` Docusaurus site
- `dist/` build output (generated)

## Setup
`npm install`

## Build / Lint / Test
`npm run build`:
- Runs `rimraf dist` then `bunchee`, then `chmod +x dist/bin.js`.
- `npm run compile` is an alias for `npm run build`.

`npm run lint`:
- Uses `eslint --fix .` (auto-fixes where possible).

`npm test`:
- `pretest` runs lint + compile.
- `test` runs mocha with SWC/TypeScript:
  `mocha --timeout 5000 --require @swc-node/register --recursive --check-leaks --globals addresses 'test/**/*.ts'`.

## Run a Single Test
Use mocha directly so you can target a file or grep a test name.
```
npm run build && npx mocha --timeout 5000 --require @swc-node/register --recursive --check-leaks --globals addresses "test/modules/minifyCss.ts"
```

It's IMPORTANT to run `npm run build` first, because the tests use the code from `dist/`.
If you don't do that, you'll be testing outdated code.
You can only omit `npm run build` if you haven't changed the main code, only the tests.


## Docs Site Commands (in `docs/`)
`npm run build`

`npm run start`

## Code Style


### Formatting
- Rely on eslint doing formatting.
- Tabs are allowed in `test/**/*` (fixtures), otherwise avoid tabs.

### Imports
- Use ESM syntax everywhere.
- Use `import type` for type-only imports; keep type imports at the top-level
  when possible (`import-x/consistent-type-specifier-style: prefer-top-level`).
- Avoid unused imports; `_`-prefixed args/vars are allowed but should be rare.
- For local relative imports in TS, follow existing `.js` extension usage (required for ESM output).

### Naming
- `camelCase` for variables/properties (ESLint `camelcase` enforced).
- Use clear, descriptive module names that match preset keys.
- File names are lowercase with optional dashes or camel case.
- Use named function instead of constants (e.g., `function foob() { }` instead of `const foob = () => {}`).

### Types and TS Config
- `strict` and `strictNullChecks` are enabled.
- `noUnusedLocals` and `noImplicitReturns` are enabled.
- Target `es2018`, module `Preserve`, resolution `Bundler`.
- `.d.ts` files allow unused vars and duplicate imports.
- Prefer explicit types for public exports and module interfaces.

### Error Handling
- Throw `Error`/`TypeError` for invalid states (see `src/index.ts`).
- `@typescript-eslint/only-throw-error` is enabled but allows rethrowing.
- When optional dependencies are missing, warn and continue if the option
  `skipInternalWarnings` is set to `true`.

### Linting Rules to Note
- Unused imports are errors (`unused-imports/no-unused-imports`).
- `@typescript-eslint/no-explicit-any` is a warning (avoid unless needed).
- Exhaustive switch checks enforced.
- Namespace usage is allowed (`@typescript-eslint/no-namespace: off`).

## Project Conventions
- Modules live in `src/_modules/` and export a default `HtmlnanoModule`.
- Presets live in `src/presets/` and list enabled module keys.
- Add tests in `test/modules/` for new modules.
- Update docs for new modules or preset changes. `docs/versioned_docs/` contains the docs for the released version, so don't update them unless it also applies for the currently released version.
- Each module should handle only its own related minifications. For example, `mergeScripts` shouldn't care about white spaces between `<script>` tags as they'll be handled by `collapseWhitespaces`.
