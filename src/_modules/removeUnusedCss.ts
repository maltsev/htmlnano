import type PostHTML from 'posthtml';
import { decodeHTMLAttribute } from 'entities';
import { extractCssFromStyleNode, getTagName, isCssStyleType, isStyleNode, optionalImport, stripCssCdata, wrapCssCdata } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLTreeLike } from '../types';
import type { ExtractorResultDetailed, Options as PurgeCSSOptions } from 'purgecss';

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
        updateStyleNode(styleNode, css, isCdataWrapped);
    });
}

function updateStyleNode(styleNode: PostHTML.Node, css: string, isCdataWrapped: boolean): void {
    // Removing unused rules may have left the style tag empty.
    if (css.trim().length === 0) {
        // @ts-expect-error -- explicitly remove the tag
        styleNode.tag = false;
        styleNode.content = [];
        return;
    }
    styleNode.content = [wrapCssCdata(css, isCdataWrapped)];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- uncss callback uses untyped args
function runUncss(html: string, css: string, userOptions: object, uncss: (...args: any[]) => void) {
    // An empty CDATA wrapper yields an empty raw string, which uncss rejects.
    if (css.trim().length === 0) {
        return Promise.resolve('');
    }
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

function purgeFromHtml(tree: PostHTMLTreeLike): ExtractorResultDetailed {
    const classes = new Set<string>();
    const ids = new Set<string>();
    const tags = new Set<string>();
    const attributeNames = new Set<string>();

    if (!tree.options?.xmlMode) {
        // Browsers create these elements even when their tags are omitted.
        for (const tag of ['html', 'head', 'body']) {
            tags.add(tag);
        }
    }

    tree.walk((node) => {
        for (const [name, rawValue] of Object.entries(node.attrs ?? {})) {
            const attributeName = tree.options?.xmlMode ? name : name.toLowerCase();
            attributeNames.add(attributeName);
            if (typeof rawValue !== 'string') {
                continue;
            }
            const value = tree.options?.decodeEntities ? rawValue : decodeHTMLAttribute(rawValue);
            if (attributeName === 'class') {
                // HTML class tokens use ASCII whitespace, not JavaScript's broader \s.
                for (const className of value.split(/[\t\n\f\r ]+/).filter(Boolean)) {
                    classes.add(className);
                }
            } else if (attributeName === 'id') {
                // An ID is one value, including any whitespace in it.
                ids.add(value);
            }
        }
        if (node.tag) {
            tags.add(node.tag);
        }
        return node;
    });

    return {
        attributes: { names: [...attributeNames], values: [] },
        classes: [...classes],
        ids: [...ids],
        tags: [...tags],
        undetermined: []
    };
}

function processStyleNodePurgeCSS(tree: PostHTMLTreeLike, styleNode: PostHTML.Node, purgecssOptions: object, purgecss: typeof import('purgecss'), selectors: ExtractorResultDetailed) {
    const css = extractCssFromStyleNode(styleNode)!;
    const { strippedCss, isCdataWrapped } = stripCssCdata(css);
    return runPurgecss(tree, strippedCss, purgecssOptions, purgecss, selectors)
        .then((css) => {
            updateStyleNode(styleNode, css, isCdataWrapped);
        });
}

function runPurgecss(tree: PostHTMLTreeLike, css: string, userOptions: Partial<PurgeCSSOptions>, purgecss: typeof import('purgecss'), selectors: ExtractorResultDetailed) {
    if (typeof userOptions !== 'object') {
        userOptions = {};
    }

    const options: PurgeCSSOptions = {
        ...userOptions,
        // PurgeCSS does not reliably match case-insensitive attribute values.
        // Keep selectors for attributes present in the HTML, regardless of value.
        dynamicAttributes: [...(userOptions.dynamicAttributes ?? []), ...selectors.attributes.names],
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
            extractor: () => selectors,
            extensions: ['html']
        }]
    };

    return new purgecss.PurgeCSS()
        .purge(options)
        .then((result) => {
            return result[0].css;
        });
}

function resolvePurgecssOptions(tree: PostHTMLTreeLike, userOptions: Partial<PurgeCSSOptions>): Partial<PurgeCSSOptions> {
    if (!userOptions.keyframes && !userOptions.fontFace && !userOptions.variables) {
        return userOptions;
    }

    let styleCount = 0;
    let hasInlineStyles = false;
    tree.walk((node) => {
        // Include protected styles too: they can refer to definitions in another block.
        if (getTagName(node) === 'style' && isCssStyleType(node)) {
            styleCount += 1;
        }
        if (Object.entries(node.attrs ?? {}).some(([name, value]) => name.toLowerCase() === 'style' && typeof value === 'string' && value.trim())) {
            hasInlineStyles = true;
        }
        return node;
    });

    // Each style block is purged separately. Resource usage in another block or
    // a style attribute is invisible to PurgeCSS, so keep those definitions.
    if (styleCount > 1 || hasInlineStyles) {
        return { ...userOptions, keyframes: false, fontFace: false, variables: false };
    }
    return userOptions;
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
        let selectors: ExtractorResultDetailed;

        const purgecss = await optionalImport<typeof import('purgecss')>('purgecss');
        const uncss = await optionalImport('uncss');

        const resolvedOptions = resolveUserOptions(userOptions);
        const tool = resolvedOptions.tool ?? 'purgeCSS';
        const toolOptions = tool === 'purgeCSS'
            ? resolvePurgecssOptions(tree, stripToolOption(resolvedOptions))
            : stripToolOption(resolvedOptions);

        tree.walk((node) => {
            if (isStyleNode(node) && isCssStyleType(node)) {
                if (tool === 'purgeCSS') {
                    if (purgecss) {
                        selectors ??= purgeFromHtml(tree);
                        promises.push(processStyleNodePurgeCSS(tree, node, toolOptions, purgecss, selectors)
                            .catch(preserveInvalidCss));
                    }
                } else if (tool === 'uncss') {
                    if (uncss) {
                        warnAboutUncss(options);
                        html ??= tree.render(tree);
                        promises.push(processStyleNodeUnCSS(html, node, toolOptions, uncss)
                            .catch(preserveInvalidCss));
                    }
                }
            }
            return node;
        });

        return Promise.all(promises).then(() => tree);
    }
};

export default mod;

function preserveInvalidCss(error: unknown): void {
    // Both tools report malformed stylesheets as CssSyntaxError.
    // PurgeCSS's selector parser throws plain Errors. Match its error creation
    // frames, rather than visitor frames also present in tool/callback failures.
    // A failed parse must not replace the original style node's content.
    if (error instanceof Error && (error.name === 'CssSyntaxError'
        || /\bat (?:Root\._error|Parser\.error) \([^\n]*[/\\]postcss-selector-parser[/\\]/.test(error.stack ?? ''))) {
        return;
    }
    throw error;
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
