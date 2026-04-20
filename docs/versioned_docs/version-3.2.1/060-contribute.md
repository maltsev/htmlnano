# Contribute

Since the minifier is modular, it's easy to add new modules:

1. Create a file inside `src/_modules/` with a module that performs one minification task. For a template, check [`src/_modules/example.ts`](https://github.com/maltsev/htmlnano/blob/master/src/_modules/example.ts).

2. Add the module to one or more presets in [`src/presets/`](https://github.com/maltsev/htmlnano/tree/master/src/presets). Use `safe`, `ampSafe`, and/or `max` based on risk.

3. Add unit tests in `test/modules/` (TypeScript).

4. Document the module in `docs/docs/050-modules.md`.

5. Run `npm run lint` and `npm run build`, then open a pull request.

Other types of contribution (bug fixes, documentation improvements, etc.) are also welcome.
Would like to contribute, but don't have any ideas what to do? Check out [our issues](https://github.com/maltsev/htmlnano/labels/help%20wanted).
