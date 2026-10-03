import type { HtmlnanoModule } from '../types';

type AttrValue = void | boolean | string;
type Attrs = Record<string, AttrValue>;

function normalizeAttrValue(value: AttrValue, trimWhitespace = false): string | null {
    if (typeof value !== 'string') return null;

    const normalized = trimWhitespace ? value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '') : value;
    return normalized.replace(/[A-Z]/g, char => char.toLowerCase());
};

function findAttrEntry(attrs: Attrs, name: string): { name: string; value: AttrValue } | null {
    const targetName = name.toLowerCase();

    for (const [attrName, attrValue] of Object.entries(attrs)) {
        if (attrName.toLowerCase() === targetName) {
            return { name: attrName, value: attrValue };
        }
    }

    return null;
};

function getNormalizedAttrValue(attrs: Attrs, name: string, trimWhitespace = false): string | null {
    const entry = findAttrEntry(attrs, name);
    return entry ? normalizeAttrValue(entry.value, trimWhitespace) : null;
};

function hasAttr(attrs: Attrs, name: string): boolean {
    return findAttrEntry(attrs, name) !== null;
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#JavaScript_types
export const redundantScriptTypes = new Set([
    'application/javascript',
    'application/ecmascript',
    'application/x-ecmascript',
    'application/x-javascript',
    'text/javascript',
    'text/ecmascript',
    'text/javascript1.0',
    'text/javascript1.1',
    'text/javascript1.2',
    'text/javascript1.3',
    'text/javascript1.4',
    'text/javascript1.5',
    'text/jscript',
    'text/livescript',
    'text/x-ecmascript',
    'text/x-javascript'
]);

// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#missing-value-default
const missingValueDefaultAttributes: Record<string, Record<string, string | ((attrs: Attrs) => boolean)>> = {
    html: {
        /**
         * The missing value default of "dir" is the undefined state, whose directionality
         * is inherited from the parent element — and "ltr" for an element without a parent.
         * https://html.spec.whatwg.org/multipage/dom.html#the-directionality
         *
         * So dropping dir="ltr" is only safe on the root element, which is what <html> is.
         */
        dir: 'ltr'
    },

    form: {
        method: 'get'
    },

    input: {
        type: 'text'
    },

    script: {
        language: 'javascript',
        // https://html.spec.whatwg.org/#fetch-priority-attributes
        fetchpriority: 'auto',
        type: (attrs) => {
            const typeValue = getNormalizedAttrValue(attrs, 'type', true);
            const languageEntry = findAttrEntry(attrs, 'language');
            const languageValue = languageEntry ? normalizeAttrValue(languageEntry.value) : null;
            // Without type, a nonempty language selects "text/" + language,
            // without whitespace trimming. Keep type if that would disable JS.
            const hasJavaScriptFallback = !languageEntry || languageValue === ''
                || (languageValue !== null && redundantScriptTypes.has(`text/${languageValue}`));
            return typeValue !== null && redundantScriptTypes.has(typeValue) && hasJavaScriptFallback;
        },
        // Remove attribute if the function returns true
        charset: (attrs) => {
            // The charset attribute only really makes sense on “external” SCRIPT elements:
            // http://perfectionkills.com/optimizing-html/#8_script_charset
            return !hasAttr(attrs, 'src');
        }
    },

    style: {
        media: attrs => getNormalizedAttrValue(attrs, 'media', true) === 'all',
        type: 'text/css'
    },

    link: {
        media: attrs => getNormalizedAttrValue(attrs, 'media', true) === 'all',
        // https://html.spec.whatwg.org/#fetch-priority-attributes
        fetchpriority: 'auto',
        type: (attrs) => {
            // https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet
            const relValue = getNormalizedAttrValue(attrs, 'rel');
            const typeValue = getNormalizedAttrValue(attrs, 'type');

            if (!relValue || !typeValue) {
                return false;
            }

            const relTokens = relValue.split(/[\t\n\f\r ]+/).filter(Boolean);
            const isRelStyleSheet = relTokens.includes('stylesheet');
            const isTypeTextCSS = typeValue === 'text/css';

            // Other relationships (e.g. preload as=script) can also use type
            // to suppress a fetch, even when stylesheet is present.
            return isRelStyleSheet && isTypeTextCSS
                && relTokens.every(token => token === 'stylesheet' || token === 'alternate');
        }
    },

    // See: https://html.spec.whatwg.org/#lazy-loading-attributes
    img: {
        loading: 'eager',
        // https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-decoding
        decoding: 'auto',
        // https://html.spec.whatwg.org/#fetch-priority-attributes
        fetchpriority: 'auto'
    },
    iframe: {
        loading: 'eager'
    },

    // https://html.spec.whatwg.org/multipage/media.html#htmltrackelement
    track: {
        kind: 'subtitles'
    },

    textarea: {
        // https://html.spec.whatwg.org/multipage/form-elements.html#dom-textarea-wrap
        wrap: 'soft'
    },

    area: {
        // https://html.spec.whatwg.org/multipage/image-maps.html#attr-area-shape
        shape: 'rect'
    }
};

const tagsHaveMissingValueDefaultAttributes = new Set(Object.keys(missingValueDefaultAttributes));

/** Removes redundant attributes */
const mod: HtmlnanoModule = {
    default(tree) {
        // Attribute handlers have no parent context. Walk parents before their
        // children to retain submit types on buttons directly inside select.
        const selectButtons = new WeakSet<object>();
        tree.walk((node) => {
            if (!node || typeof node !== 'object') return node;

            if (node.tag === 'select' && Array.isArray(node.content)) {
                for (const child of node.content) {
                    if (typeof child === 'object' && child !== null && child.tag === 'button') {
                        selectButtons.add(child);
                    }
                }
            }

            // The missing type defaults to Auto, which is a submit button only
            // outside select and when neither command attribute is present.
            // https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type
            if (node.tag === 'button' && node.attrs && !selectButtons.has(node)
                && !hasAttr(node.attrs, 'command') && !hasAttr(node.attrs, 'commandfor')) {
                const typeEntry = findAttrEntry(node.attrs, 'type');
                if (typeEntry && normalizeAttrValue(typeEntry.value) === 'submit') {
                    delete node.attrs[typeEntry.name];
                }
            }

            return node;
        });
        return tree;
    },
    onAttrs() {
        return (attrs, node) => {
            if (!node.tag) return attrs;

            const newAttrs = attrs;
            const attrsRecord = attrs as Attrs;

            if (tagsHaveMissingValueDefaultAttributes.has(node.tag)) {
                const tagRedundantAttributes = missingValueDefaultAttributes[node.tag];

                for (const redundantAttributeName of Object.keys(tagRedundantAttributes)) {
                    const tagRedundantAttributeValue = tagRedundantAttributes[redundantAttributeName];
                    let isRemove = false;

                    const attrEntry = findAttrEntry(attrsRecord, redundantAttributeName);

                    if (typeof tagRedundantAttributeValue === 'function') {
                        isRemove = tagRedundantAttributeValue(attrsRecord);
                    } else if (attrEntry) {
                        const normalizedValue = normalizeAttrValue(attrEntry.value);
                        isRemove = normalizedValue !== null && normalizedValue === tagRedundantAttributeValue;
                    }

                    if (isRemove && attrEntry) {
                        delete newAttrs[attrEntry.name];
                    }
                }
            }

            return newAttrs;
        };
    }
};
export default mod;
