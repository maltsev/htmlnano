import { extractCssFromStyleNode, isCssStyleType, isStyleNode, optionalImport, stripCssCdata, wrapCssCdata } from '../helpers';
import type { Result, Root } from 'postcss';
import type { HtmlnanoModule } from '../types';
import type { Options as CssnanoOptions } from 'cssnano';
import { isCssSelectorParseError } from './helpers/isCssSelectorParseError';

// cssnano 7 and 8 ship CJS types (`export =`), while cssnano 9 is ESM and exposes
// the plugin factory as a `default` export. All three are in the peer dependency range.
type Cssnano = typeof import('cssnano') extends { default: infer Factory }
    ? Factory
    : typeof import('cssnano');

const postcssOptions = {
    // Prevent the following warning from being shown:
    // > Without `from` option PostCSS could generate wrong source map and will not find Browserslist config.
    // > Set it to CSS file path or to `undefined` to prevent this warning.
    from: undefined
};

type CssJob = {
    css: string;
    updates: Array<(css: string) => void>;
};

type InlineCssExcludedPluginOptions = {
    mergeRules?: false;
    minifySelectors?: false;
    minifyParams?: false;
    normalizeCharset?: false;
    uniqueSelectors?: false;
    normalizeUnicode?: false;
    reduceIdents?: false;
    zindex?: false;
};

const inlineCssExcludedPlugins = {
    mergeRules: false,
    minifySelectors: false,
    minifyParams: false,
    normalizeCharset: false,
    uniqueSelectors: false,
    normalizeUnicode: false,
    // The two plugins below ship with the `advanced` preset. Both rewrite identifiers
    // that are declared outside of the `style` attribute (`@keyframes`, `grid-template-areas`)
    // or that are only meaningful next to other elements (`z-index`), so a `style`
    // attribute never holds enough context to rewrite them safely.
    reduceIdents: false,
    zindex: false
} satisfies InlineCssExcludedPluginOptions;

/** Minify CSS with cssnano */
const mod: HtmlnanoModule<CssnanoOptions> = {
    async default(tree, _, cssnanoOptions) {
        const styleJobs = new Map<string, CssJob>();
        const inlineJobs = new Map<string, CssJob>();

        tree.walk((node) => {
            // Skip SRI, reasons are documented in "minifyJs" module
            if (node.attrs && 'integrity' in node.attrs) {
                return node;
            }

            if (isStyleNode(node) && isCssStyleType(node)) {
                const css = extractCssFromStyleNode(node);
                if (css && css.trim() !== '') {
                    const { strippedCss, isCdataWrapped } = stripCssCdata(css);
                    addCssJob(styleJobs, strippedCss, (minifiedCss) => {
                        node.content = [wrapCssCdata(minifiedCss, isCdataWrapped)];
                    }, `${isCdataWrapped}:${strippedCss}`);
                }
            } else if (typeof node.attrs?.style === 'string' && node.attrs.style.trim() !== '') {
                // A declaration list needs a temporary rule for cssnano to parse it.
                addCssJob(inlineJobs, `a{${node.attrs.style}}`, (minifiedCss) => {
                    node.attrs!.style = minifiedCss.substring(2, minifiedCss.length - 1);
                });
            }

            return node;
        });

        if (styleJobs.size === 0 && inlineJobs.size === 0) {
            return tree;
        }

        const [cssnano, postcss] = await Promise.all([
            optionalImport<Cssnano>('cssnano'),
            optionalImport<typeof import('postcss').default>('postcss')
        ]);

        if (!cssnano || !postcss) {
            return tree;
        }

        await Promise.all([
            processCssJobs(styleJobs, postcss, cssnano, cssnanoOptions),
            processCssJobs(inlineJobs, postcss, cssnano, getInlineCssnanoOptions(cssnanoOptions), canBatchInlineCss(cssnanoOptions))
        ]);
        return tree;
    }
};

export default mod;

export function getInlineCssnanoOptions(cssnanoOptions: CssnanoOptions | undefined): CssnanoOptions | undefined {
    if (!cssnanoOptions || typeof cssnanoOptions !== 'object') {
        return {
            preset: ['default', inlineCssExcludedPlugins]
        };
    }

    if (Array.isArray(cssnanoOptions.plugins)) {
        return cssnanoOptions;
    }

    const preset = cssnanoOptions.preset;

    if (preset === undefined) {
        return {
            ...cssnanoOptions,
            preset: ['default', inlineCssExcludedPlugins]
        };
    }

    if (typeof preset === 'string' || typeof preset === 'function') {
        return {
            ...cssnanoOptions,
            preset: [preset, inlineCssExcludedPlugins]
        };
    }

    if (Array.isArray(preset)) {
        const presetOptions = preset[1] as unknown;

        return {
            ...cssnanoOptions,
            preset: [preset[0], {
                ...inlineCssExcludedPlugins,
                ...(presetOptions && typeof presetOptions === 'object' ? presetOptions : {})
            }]
        };
    }

    // A preset given as `{ plugins: [...] }` carries no per-plugin options to override
    return cssnanoOptions;
}

function addCssJob(jobs: Map<string, CssJob>, css: string, update: (css: string) => void, key = css): void {
    const job = jobs.get(key);
    if (job) {
        job.updates.push(update);
    } else {
        jobs.set(key, { css, updates: [update] });
    }
}

function canBatchInlineCss(options: CssnanoOptions | undefined): boolean {
    // Custom plugins and per-plugin overrides can carry state across roots or expect
    // result.root to be a Root. Keep their existing, separate processing behavior.
    if (!options || typeof options !== 'object') return true;

    return Object.keys(options).every(key => key === 'preset')
        && (options.preset === undefined || options.preset === 'default');
}

async function processCssJobs(
    jobs: Map<string, CssJob>,
    postcss: typeof import('postcss').default,
    cssnano: Cssnano,
    cssnanoOptions: CssnanoOptions | undefined,
    batch = false
): Promise<void> {
    if (jobs.size === 0) return;

    // Parse each input before batching or running plugins. Browsers recover
    // from malformed CSS; leave those nodes unchanged and optimize the rest.
    const parsedJobs: Array<{ job: CssJob; root: Root }> = [];
    for (const job of jobs.values()) {
        try {
            parsedJobs.push({ job, root: postcss.parse(job.css, postcssOptions) });
        } catch (error) {
            if (!(error instanceof postcss.CssSyntaxError)) throw error;
        }
    }
    if (parsedJobs.length === 0) return;

    // cssnano 7 and 8 append custom plugins to the options' preset. Give each
    // processor its own config so stylesheet and inline plugins stay independent.
    const processorOptions = { ...cssnanoOptions };
    const preset = processorOptions.preset;
    if (preset && typeof preset === 'object' && !Array.isArray(preset)) {
        processorOptions.preset = { ...preset, plugins: [...preset.plugins] };
    }

    const processor = postcss([cssnano(processorOptions)]);

    if (batch && parsedJobs.length > 1) {
        const roots = parsedJobs.map(({ root }) => root);
        // Only batch declaration lists. Nested rules and at-rules can introduce
        // state shared between roots in some supported cssnano versions.
        const declarationLists = roots.every(root => root.nodes.length === 1
            && root.first?.type === 'rule' && root.first.selector === 'a'
            && root.first.nodes.every(node => node.type === 'decl' || node.type === 'comment'));

        if (declarationLists) {
            // A Document shares plugin preparation (including Browserslist/caniuse
            // checks), while Once/OnceExit still run on each independent Root.
            await processor.process(postcss.document({ nodes: roots }), postcssOptions);
            parsedJobs.forEach(({ job }, index) => {
                const css = roots[index].toString();
                job.updates.forEach(update => update(css));
            });
            return;
        }
    }

    await Promise.all(parsedJobs.map(async ({ job, root }) => {
        let result: Result;
        try {
            result = await processor.process(root, postcssOptions);
        } catch (error) {
            // PostCSS accepts some selectors that cssnano's plugins cannot
            // parse. Keep their original content, including cached duplicates.
            if (isCssSelectorParseError(error)) return;
            throw error;
        }
        job.updates.forEach(update => update(result.css));
    }));
}
