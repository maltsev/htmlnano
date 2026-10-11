import { getTagName, optionalImport } from '../helpers';
import { decodeHTMLStrict, decodeXML } from 'entities';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import type { Config as SvgoConfig, PluginConfig } from 'svgo';
import { serializedContentNodes } from './helpers/serializedContent.js';

// Inline SVG IDs and definitions can be referenced by other SVGs, HTML, CSS, or JS.
// Optimizing one SVG at a time cannot determine whether they are unused or hidden.
const inlineSvgOverrides = {
    cleanupIds: false,
    removeUselessDefs: false,
    removeHiddenElems: false,
    // Inlining a local rule must not remove IDs/classes used elsewhere in the page.
    inlineStyles: { removeMatchedSelectors: false }
} as const;

// These HTML start tags make browsers leave foreign content, even when
// PostHTML represents them as SVG descendants.
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
const htmlBreakoutTags = new Set([
    'b', 'big', 'blockquote', 'body', 'br', 'center', 'code', 'dd', 'div', 'dl',
    'dt', 'em', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'i',
    'img', 'li', 'listing', 'menu', 'meta', 'nobr', 'ol', 'p', 'pre', 'ruby', 's',
    'small', 'span', 'strong', 'strike', 'sub', 'sup', 'table', 'tt', 'u', 'ul', 'var'
]);

/** Minify SVG with SVGO */
const mod: HtmlnanoModule<SvgoConfig> = {
    async default(tree, options, svgoOptions) {
        const svgo = await optionalImport<typeof import('svgo')>('svgo');

        if (!svgo) return tree;

        const resolvedSvgoOptions = resolveSvgoOptions(svgoOptions);
        const svgoOptionsWithDefaults = applySvgoDefaults(resolvedSvgoOptions);

        tree.match({ tag: 'svg' }, (node) => {
            // SVGO parses/serializes XML, which can corrupt embedded HTML and
            // turn escaped raw-text content into executable markup.
            if (containsHtmlContent(node)) return node;

            const svgStr = tree.render(node, { closingSingleTag: 'slash', quoteAllAttributes: true });
            if (hasUnsafeNumericReferences(svgStr)) return node;

            try {
                const result = svgo.optimize(svgStr, svgoOptionsWithDefaults);
                // @ts-expect-error -- remove this node
                node.tag = false;
                node.attrs = {};
                // result.data is a string, we need to cast it to an array
                node.content = [result.data];
                serializedContentNodes.add(node);
                return node;
            } catch (error) {
                const isSvgoParserError = Boolean(
                    error
                    && typeof error === 'object'
                    && 'name' in error
                    && error.name === 'SvgoParserError'
                );
                if (!isSvgoParserError) {
                    if (!options.skipInternalWarnings) {
                        console.error('htmlnano fails to minify the svg:');
                        console.error(error);
                    }
                    let fallbackSvgStr: string;
                    try {
                        fallbackSvgStr = svgo.optimize(svgStr, { plugins: [] }).data;
                    } catch {
                        fallbackSvgStr = svgStr;
                    }
                    // @ts-expect-error -- remove this node
                    node.tag = false;
                    node.attrs = {};
                    node.content = [fallbackSvgStr];
                    serializedContentNodes.add(node);
                }
                // We return the node as-is
                return node;
            }
        });

        return tree;
    }
};

export default mod;

function hasUnsafeNumericReferences(svg: string): boolean {
    for (const [reference] of svg.matchAll(/&#(?:[xX][\da-fA-F]+|\d+);/g)) {
        const xmlValue = decodeXML(reference);
        // HTML remaps some XML code points (notably C1 controls). A literal CR
        // is normalized to LF by HTML parsing, unlike a CR character reference.
        if (xmlValue !== decodeHTMLStrict(reference) || xmlValue === '\r') return true;
    }
    return false;
}

function containsHtmlContent(node: PostHTMLNodeLike): boolean {
    if (!node || typeof node !== 'object') return false;

    const tag = getTagName(node);
    if (tag === 'foreignobject' || tag && htmlBreakoutTags.has(tag)) return true;
    if (tag === 'font' && Object.keys(node.attrs ?? {}).some(name => (
        ['color', 'face', 'size'].includes(name.toLowerCase())
    ))) return true;

    const content = Array.isArray(node.content) ? node.content : [node.content];
    // SVG title/desc are also HTML integration points. PostHTML parses title
    // markup as a string, so checking only for child nodes would miss it.
    if ((tag === 'title' || tag === 'desc') && content.some(child => (
        typeof child === 'string' ? child.includes('<') : child && typeof child === 'object'
    ))) return true;

    return content.some(child => child && containsHtmlContent(child));
}

function resolveSvgoOptions(svgoOptions: SvgoConfig | true | null | undefined): SvgoConfig {
    if (!svgoOptions || svgoOptions === true) {
        return {};
    }
    return svgoOptions;
}

function applySvgoDefaults(svgoOptions: SvgoConfig): SvgoConfig {
    return {
        ...svgoOptions,
        multipass: svgoOptions.multipass ?? true,
        plugins: (svgoOptions.plugins ?? ['preset-default']).map(applyInlineSvgDefaults)
    };
}

function applyInlineSvgDefaults(plugin: PluginConfig): PluginConfig {
    if (plugin === 'preset-default') {
        return {
            name: plugin,
            params: { overrides: inlineSvgOverrides }
        };
    }
    if (typeof plugin !== 'object' || plugin === null || plugin.name !== 'preset-default' || 'fn' in plugin) {
        return plugin;
    }

    return {
        ...plugin,
        params: {
            ...plugin.params,
            overrides: {
                ...inlineSvgOverrides,
                ...plugin.params?.overrides
            }
        }
    };
}
