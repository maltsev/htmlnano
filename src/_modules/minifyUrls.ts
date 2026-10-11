import type RelateUrl from 'relateurl';
import type PostHTML from 'posthtml';
import { decodeHTMLAttribute } from 'entities';
import { getTagName, optionalImport } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions } from '../types';
import { isSrcsetAttribute, parseSrcset } from './collapseAttributeWhitespace.js';

const tagsHasHrefAttributes = new Set([
    'a',
    'area',
    'link',
    'base'
]);

const attributesOfImgTagHasUriValues = new Set([
    'src',
    'longdesc'
]);

const attributesOfObjectTagHasUriValues = new Set([
    'classid',
    'codebase',
    'data'
]);

const tagsHasCiteAttributes = new Set([
    'blockquote',
    'q',
    'ins',
    'del'
]);

const tagsHasSrcAttributes = new Set([
    'audio',
    'embed',
    'iframe',
    'img',
    'input',
    'script',
    'track',
    'video',
    /**
     * https://html.spec.whatwg.org/#attr-source-src
     *
     * Although most of browsers recommend not to use "src" in <source>,
     * but technically it does comply with HTML Standard.
     */
    'source'
]);

const isUriTypeAttribute = (tag: string, attr: string) => {
    return (
        tagsHasHrefAttributes.has(tag) && attr === 'href'
        || tag === 'img' && attributesOfImgTagHasUriValues.has(attr)
        || tag === 'object' && attributesOfObjectTagHasUriValues.has(attr)
        || tagsHasCiteAttributes.has(tag) && attr === 'cite'
        || tag === 'form' && attr === 'action'
        || tag === 'head' && attr === 'profile'
        || tagsHasSrcAttributes.has(tag) && attr === 'src'
    );
};

type MinifyUrlsOptions = HtmlnanoOptions['minifyUrls'] | Partial<URL> | undefined;

const processModuleOptions = (options: MinifyUrlsOptions) => {
    // The stable relateurl (0.2.7) works with string base URLs, so normalize a
    // URL instance into a string. (relateurl@1.0.0-alpha switched to the WHATWG
    // URL API; revisit this once/if that reaches a stable release.)
    if (typeof options === 'string') return options;
    if (options instanceof URL) return options.toString();

    return false;
};

const isLinkRelCanonical = (node: PostHTML.Node) => {
    const { attrs } = node;
    if (getTagName(node) !== 'link' || !attrs) return false;

    for (const [attrName, attrValue] of Object.entries(attrs)) {
        if (attrName.toLowerCase() === 'rel' && typeof attrValue === 'string'
            && decodeHTMLAttribute(attrValue).toLowerCase().split(/[\t\n\f\r ]+/).includes('canonical')) return true;
    }

    return false;
};

const JAVASCRIPT_URL_PROTOCOL = 'javascript:';

/** Convert absolute url into relative url */
const mod: HtmlnanoModule<HtmlnanoOptions['minifyUrls']> = {
    async default(tree, options, moduleOptions) {
        const RelateUrl = await optionalImport<typeof import('relateurl')>('relateurl');
        const srcset = await optionalImport<typeof import('srcset')>('srcset');
        const terser = await optionalImport<typeof import('terser')>('terser');

        const promises: Promise<unknown>[] = [];

        const urlBase = processModuleOptions(moduleOptions);

        // Invalid configuration, return tree directly
        if (!urlBase) return tree;

        // Keep the instance local to this run and retain explicit index resources.
        const relateUrlInstance = RelateUrl ? new RelateUrl(urlBase, { removeDirectoryIndexes: false }) : null;
        const decoded = tree.options?.decodeEntities === true;
        let hasBaseHref = false;
        tree.walk((node) => {
            if (getTagName(node) === 'base' && node.attrs
                && Object.keys(node.attrs).some(name => name.toLowerCase() === 'href')) {
                hasBaseHref = true;
            }
            return node;
        });

        tree.walk((node) => {
            if (!node.attrs) return node;

            const tag = getTagName(node);
            if (!tag) return node;
            // A document's <base> can override the configured URL. Preserve its
            // URLs rather than resolving against the wrong base (including <base> itself).
            if (hasBaseHref) return node;

            // Prevent link[rel=canonical] being processed
            // Can't be excluded by isUriTypeAttribute()
            if (isLinkRelCanonical(node)) return node;

            for (const [attrName, attrValue] of Object.entries(node.attrs)) {
                const attrNameLower = attrName.toLowerCase();

                if (isUriTypeAttribute(tag, attrNameLower)) {
                    if (typeof attrValue !== 'string') continue;

                    const value = decoded ? attrValue : decodeHTMLAttribute(attrValue);
                    const javascriptMatch = getJavaScriptUrlMatch(value);
                    if (javascriptMatch) {
                        promises.push(minifyJavaScriptUrl(node, attrName, javascriptMatch, terser));
                        continue;
                    }

                    if (relateUrlInstance) {
                        const related = relateUrlValue(relateUrlInstance, value, urlBase);
                        if (related !== value) node.attrs[attrName] = related.replace(/&/g, '&amp;');
                    }

                    continue;
                }

                if (isSrcsetAttribute(attrNameLower, tag)) {
                    if (srcset && typeof attrValue === 'string') {
                        try {
                            const value = decoded ? attrValue : decodeHTMLAttribute(attrValue);
                            const candidates = parseSrcset(value);
                            const parsedSrcset = srcset.parseSrcset(value, { strict: true });
                            const roundTripped = parseSrcset(srcset.stringifySrcset(parsedSrcset));
                            // The dependency's loose tokenizer can skip short URLs or
                            // reinterpret descriptors. Only use it when both parsers agree.
                            if (!candidates || !roundTripped || candidates.length !== roundTripped.length
                                || candidates.some((candidate, index) => candidate.url !== roundTripped[index].url
                                    || candidate.descriptors.join(' ') !== roundTripped[index].descriptors.join(' '))) {
                                continue;
                            }

                            const related = srcset.stringifySrcset(parsedSrcset.map(item => ({
                                ...item,
                                url: relateUrlInstance ? relateUrlValue(relateUrlInstance, item.url, urlBase) : item.url
                            })));
                            if (related !== value) node.attrs[attrName] = related.replace(/&/g, '&amp;');
                        } catch {
                            // Invalid srcset values are left unchanged.
                        }
                    }

                    continue;
                }
            }

            return node;
        });

        if (promises.length > 0) return Promise.all(promises).then(() => tree);
        return Promise.resolve(tree);
    }
};

export default mod;

type JavaScriptUrlMatch = {
    leadingWhitespace: string;
    code: string;
};

const javascriptUrlRegex = /^([\t\n\f\r ]*)(javascript:)([\s\S]*)$/i;

function getJavaScriptUrlMatch(url: string): JavaScriptUrlMatch | null {
    const match = javascriptUrlRegex.exec(url);
    // Browsers remove tabs and newlines during URL parsing, even inside JS
    // strings. Leave such inputs intact rather than minifying different code.
    if (!match || /[\t\n\r]/.test(match[3])) return null;

    return {
        leadingWhitespace: match[1],
        code: match[3]
    };
}

function relateUrlValue(relateUrl: RelateUrl, value: string, base: string) {
    if (!value.trim() || /^[\t\n\f\r ]*[#?]/.test(value)) return value;

    try {
        const original = new URL(value, base);
        if (original.protocol !== 'http:' && original.protocol !== 'https:') return value;

        let related = relateUrl.relate(value);
        // Empty src/srcset URLs have special behavior before URL resolution.
        // Use an explicit directory reference if it still resolves identically.
        if (!related) related = './';
        // A colon in the first path segment becomes a scheme after shortening.
        // In particular, /javascript:... must never become executable code.
        if (/^[a-z][a-z0-9+.-]*:/i.test(related) && !/^https?:/i.test(related)) {
            related = './' + related;
        }

        // relateurl uses a legacy URL parser and can change queries, repeated
        // slashes, or URL delimiters. Only accept a browser-equivalent result.
        return new URL(related, base).href === original.href ? related : value;
    } catch {
        return value;
    }
}

function minifyJavaScriptUrl(
    node: PostHTML.Node,
    attrName: string,
    match: JavaScriptUrlMatch,
    terser: typeof import('terser') | null
) {
    if (!terser) return Promise.resolve();

    let source: string;
    try {
        // JavaScript URLs are percent-decoded before being evaluated.
        source = decodeURIComponent(match.code);
    } catch {
        return Promise.resolve();
    }

    return terser
        .minify(source, {
            // URL scripts run at global scope, and their completion value can
            // replace the document. Avoid optimizations that discard that value.
            compress: { defaults: false, booleans: true },
            mangle: false,
            parse: { shebang: false }
        })
        .then(({ code }) => {
            if (code === undefined) return;
            // Protect literal percent signs from URL decoding, line breaks from
            // URL parsing, and ampersands from HTML character-reference decoding.
            const encoded = code.replace(/%/g, '%25')
                .replace(/\t/g, '%09').replace(/\n/g, '%0A').replace(/\r/g, '%0D')
                .replace(/&/g, '%26');
            node.attrs![attrName] = match.leadingWhitespace + JAVASCRIPT_URL_PROTOCOL + encoded;
        })
        .catch(() => undefined);
}
