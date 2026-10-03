import type RelateUrl from 'relateurl';
import type PostHTML from 'posthtml';
import { decodeHTMLAttribute } from 'entities';
import { optionalImport } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions } from '../types';

const tagsHasHrefAttributes = new Set([
    'a',
    'area',
    'link',
    'base'
]);

const attributesOfImgTagHasUriValues = new Set([
    'src',
    'longdesc',
    'usemap'
]);

const attributesOfObjectTagHasUriValues = new Set([
    'classid',
    'codebase',
    'data',
    'usemap'
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
        || tag === 'input' && attr === 'usemap'
        || tag === 'head' && attr === 'profile'
        || tag === 'script' && attr === 'for'
        || tagsHasSrcAttributes.has(tag) && attr === 'src'
    );
};

const isSrcsetAttribute = (tag: string, attr: string) => {
    return (
        tag === 'source' && attr === 'srcset'
        || tag === 'img' && attr === 'srcset'
        || tag === 'link' && attr === 'imagesrcset'
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

const isLinkRelCanonical = ({ tag, attrs }: PostHTML.Node) => {
    if (tag?.toLowerCase() !== 'link' || !attrs) return false;

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
            if (node.tag?.toLowerCase() === 'base' && node.attrs
                && Object.keys(node.attrs).some(name => name.toLowerCase() === 'href')) {
                hasBaseHref = true;
            }
            return node;
        });

        tree.walk((node) => {
            if (!node.attrs) return node;

            if (!node.tag) return node;

            const tag = node.tag.toLowerCase();
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

                    const javascriptMatch = getJavaScriptUrlMatch(attrValue);
                    if (javascriptMatch) {
                        promises.push(minifyJavaScriptUrl(node, attrName, javascriptMatch, terser));
                        continue;
                    }

                    if (relateUrlInstance) {
                        const value = decoded ? attrValue : decodeHTMLAttribute(attrValue);
                        const related = relateUrlValue(relateUrlInstance, value, urlBase);
                        if (related !== value) node.attrs[attrName] = related.replace(/&/g, '&amp;');
                    }

                    continue;
                }

                if (isSrcsetAttribute(tag, attrNameLower)) {
                    if (srcset && typeof attrValue === 'string') {
                        try {
                            const parsedSrcset = srcset.parseSrcset(attrValue, { strict: true });

                            node.attrs[attrName] = srcset.stringifySrcset(parsedSrcset.map((item) => {
                                if (relateUrlInstance) {
                                    // @ts-expect-error -- not actually readonly
                                    item.url = relateUrlValue(relateUrlInstance, item.url, urlBase);
                                }

                                return item;
                            }));
                        } catch {
                        // srcset will throw an Error for invalid srcset.
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

const jsWrapperStart = 'function a(){';
const jsWrapperEnd = '}a();';
const javascriptUrlRegex = /^(\s*)(javascript:)([\s\S]*)$/i;

function getJavaScriptUrlMatch(url: string): JavaScriptUrlMatch | null {
    const match = javascriptUrlRegex.exec(url);
    if (!match) return null;

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

    const result = jsWrapperStart + match.code + jsWrapperEnd;

    return terser
        .minify(result, {}) // Default Option is good enough
        .then(({ code }) => {
            if (!code) return;
            const minifiedJs = code.substring(
                jsWrapperStart.length,
                code.length - jsWrapperEnd.length
            );
            node.attrs![attrName] = match.leadingWhitespace + JAVASCRIPT_URL_PROTOCOL + minifiedJs;
        })
        .catch(() => undefined);
}
