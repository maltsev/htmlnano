import type RelateUrl from 'relateurl';
import type PostHTML from 'posthtml';
import { optionalImport } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions } from '../types';

// Adopts from https://github.com/kangax/html-minifier/blob/51ce10f4daedb1de483ffbcccecc41be1c873da2/src/htmlminifier.js#L209-L221
const tagsHaveUriValuesForAttributes = new Set([
    'a',
    'area',
    'link',
    'base',
    'object',
    'blockquote',
    'q',
    'del',
    'ins',
    'form',
    'input',
    'head',
    'audio',
    'embed',
    'iframe',
    'img',
    'script',
    'track',
    'video'
]);

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
    // Return false early for non-"link" tag
    if (tag !== 'link' || !attrs) return false;

    for (const [attrName, attrValue] of Object.entries(attrs)) {
        if (attrName.toLowerCase() === 'rel' && attrValue === 'canonical') return true;
    }

    return false;
};

const JAVASCRIPT_URL_PROTOCOL = 'javascript:';

let relateUrlInstance: RelateUrl;
let STORED_URL_BASE: string;

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

        /** Bring up a reusable RelateUrl instances (only once)
     *
     * STORED_URL_BASE is used to invalidate RelateUrl instances,
     * avoiding require.cache acrossing multiple htmlnano instance with different configuration,
     * e.g. unit tests cases.
     */
        if (!relateUrlInstance || STORED_URL_BASE !== urlBase) {
            if (RelateUrl) {
                relateUrlInstance = new RelateUrl(urlBase);
            }
            STORED_URL_BASE = urlBase;
        }

        tree.walk((node) => {
            if (!node.attrs) return node;

            if (!node.tag) return node;

            if (!tagsHaveUriValuesForAttributes.has(node.tag)) return node;

            // Prevent link[rel=canonical] being processed
            // Can't be excluded by isUriTypeAttribute()
            if (isLinkRelCanonical(node)) return node;

            for (const [attrName, attrValue] of Object.entries(node.attrs)) {
                const attrNameLower = attrName.toLowerCase();

                if (isUriTypeAttribute(node.tag, attrNameLower)) {
                    if (typeof attrValue !== 'string') continue;

                    const javascriptMatch = getJavaScriptUrlMatch(attrValue);
                    if (javascriptMatch) {
                        promises.push(minifyJavaScriptUrl(node, attrName, javascriptMatch, terser));
                        continue;
                    }

                    if (relateUrlInstance) {
                        node.attrs[attrName] = relateUrlValue(relateUrlInstance, attrValue);
                    }

                    continue;
                }

                if (isSrcsetAttribute(node.tag, attrNameLower)) {
                    if (srcset && typeof attrValue === 'string') {
                        try {
                            const parsedSrcset = srcset.parseSrcset(attrValue, { strict: true });

                            node.attrs[attrName] = srcset.stringifySrcset(parsedSrcset.map((item) => {
                                if (relateUrlInstance) {
                                    // @ts-expect-error -- not actually readonly
                                    item.url = relateUrlValue(relateUrlInstance, item.url);
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

function getUrlScheme(value: string) {
    const match = /^[a-z][a-z0-9+.-]*:/i.exec(value);
    if (!match) return null;

    return match[0].slice(0, -1).toLowerCase();
}

function shouldRelateUrlValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('#') || trimmed.startsWith('?')) return false;

    const scheme = getUrlScheme(trimmed);
    if (scheme) return scheme === 'http' || scheme === 'https';

    return true;
}

function relateUrlValue(relateUrl: RelateUrl, value: string) {
    if (!shouldRelateUrlValue(value)) return value;

    // relateUrl#relate is wrapped in try...catch because attrValue might not be
    // a valid URL, and relateurl can throw for malformed input.
    try {
        return relateUrl.relate(value);
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
