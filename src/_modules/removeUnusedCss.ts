import type PostHTML from 'posthtml';
import { extractCssFromStyleNode, isCssStyleType, isStyleNode, optionalImport, stripCssCdata, wrapCssCdata } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLTreeLike } from '../types';
import type { Options as PurgeCSSOptions } from 'purgecss';

// These options must be set and shouldn't be overriden to ensure uncss doesn't look at linked stylesheets.
const uncssOptions = {
    ignoreSheets: [/\s*/],
    stylesheets: []
};

// uncss renders the HTML in jsdom with `runScripts: 'dangerously'` and offers no way to turn that off,
// so the scripts of the minified HTML are executed inside the build process.
let hasWarnedAboutUncss = false;

function warnAboutUncss(options: Partial<HtmlnanoOptions>) {
    // Warn only once per process, otherwise a document with many <style> tags would flood the output.
    if (hasWarnedAboutUncss || options.skipInternalWarnings) {
        return;
    }

    hasWarnedAboutUncss = true;
    console.warn('htmlnano\'s "removeUnusedCss" module with `tool: "uncss"` renders the HTML in jsdom with script execution enabled: every <script> of the minified HTML runs inside your build process, and it may read local files and send network requests. Use `tool: "purgeCSS"` for HTML you don\'t fully trust.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- uncss has no types
function processStyleNodeUnCSS(html: string, styleNode: PostHTML.Node, uncssOptions: object, uncss: any) {
    const css = extractCssFromStyleNode(styleNode)!;
    const { strippedCss, isCdataWrapped } = stripCssCdata(css);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- uncss no types
    return runUncss(html, strippedCss, uncssOptions, uncss).then((css) => {
        // uncss may have left some style tags empty
        if (css.trim().length === 0) {
            // @ts-expect-error -- explicitly remove the tag
            styleNode.tag = false;
            styleNode.content = [];
            return;
        }
        styleNode.content = [wrapCssCdata(css, isCdataWrapped)];
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- uncss callback uses untyped args
function runUncss(html: string, css: string, userOptions: object, uncss: (...args: any[]) => void) {
    if (typeof userOptions !== 'object') {
        userOptions = {};
    }

    const options: object = { ...userOptions, ...uncssOptions };

    return new Promise<string>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- we dont have uncss types
        (options as any).raw = css;
        uncss(html, options, (error: Error, output: string) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(output);
        });
    });
}

const purgeFromHtml = function (tree: PostHTMLTreeLike) {
    // content is not used as we can directly used the parsed HTML,
    // making the process faster
    const selectors: string[] = [];

    tree.walk((node) => {
        const classes = getSelectorTokens(node.attrs && node.attrs.class);
        const ids = getSelectorTokens(node.attrs && node.attrs.id);
        selectors.push(...classes, ...ids);
        if (node.tag) {
            selectors.push(node.tag);
        }
        return node;
    });

    return () => selectors;
};

function processStyleNodePurgeCSS(tree: PostHTMLTreeLike, styleNode: PostHTML.Node, purgecssOptions: object, purgecss: typeof import('purgecss'), extractor: () => string[]) {
    const css = extractCssFromStyleNode(styleNode)!;
    const { strippedCss, isCdataWrapped } = stripCssCdata(css);
    return runPurgecss(tree, strippedCss, purgecssOptions, purgecss, extractor)
        .then((css) => {
            if (css.trim().length === 0) {
                // @ts-expect-error -- explicitly remove the tag
                styleNode.tag = false;
                styleNode.content = [];
                return;
            }
            styleNode.content = [wrapCssCdata(css, isCdataWrapped)];
        });
}

function runPurgecss(tree: PostHTMLTreeLike, css: string, userOptions: Partial<PurgeCSSOptions>, purgecss: typeof import('purgecss'), extractor: () => string[]) {
    if (typeof userOptions !== 'object') {
        userOptions = {};
    }

    const options: PurgeCSSOptions = {
        ...userOptions,
        content: [{
            raw: tree.render(),
            extension: 'html'
        }],
        css: [{
            raw: css,
            // @ts-expect-error -- old purgecss options
            extension: 'css'
        }],
        extractors: [{
            extractor,
            extensions: ['html']
        }]
    };

    return new purgecss.PurgeCSS()
        .purge(options)
        .then((result) => {
            return result[0].css;
        });
}

export interface RemoveUnusedCssOptions {
    tool?: 'purgeCSS' | 'uncss';
    [key: string]: unknown;
}

/** Remove unused CSS */
const mod: HtmlnanoModule<RemoveUnusedCssOptions> = {
    async default(tree, options, userOptions) {
        const promises: Promise<unknown>[] = [];

        let html: string;
        let extractor: () => string[];

        const purgecss = await optionalImport<typeof import('purgecss')>('purgecss');
        const uncss = await optionalImport('uncss');

        const resolvedOptions = resolveUserOptions(userOptions);
        const tool = resolvedOptions.tool ?? 'purgeCSS';
        const toolOptions = stripToolOption(resolvedOptions);

        tree.walk((node) => {
            if (isStyleNode(node) && isCssStyleType(node)) {
                if (tool === 'purgeCSS') {
                    if (purgecss) {
                        extractor ??= purgeFromHtml(tree);
                        promises.push(processStyleNodePurgeCSS(tree, node, toolOptions, purgecss, extractor));
                    }
                } else if (tool === 'uncss') {
                    if (uncss) {
                        warnAboutUncss(options);
                        html ??= tree.render(tree);
                        promises.push(processStyleNodeUnCSS(html, node, toolOptions, uncss));
                    }
                }
            }
            return node;
        });

        return Promise.all(promises).then(() => tree);
    }
};

export default mod;

function getSelectorTokens(value: unknown) {
    if (typeof value !== 'string') {
        return [];
    }
    return value.split(/\s+/).filter(Boolean);
}

function resolveUserOptions(userOptions: RemoveUnusedCssOptions | true | null | undefined) {
    if (userOptions && typeof userOptions === 'object') {
        return userOptions;
    }
    return {};
}

function stripToolOption(options: RemoveUnusedCssOptions) {
    const { tool: _tool, ...rest } = options;
    return rest;
}
