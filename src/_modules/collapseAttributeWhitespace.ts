import { isEventHandler } from '../helpers';
import type { HtmlnanoModule } from '../types';

export const attributesWithLists = new Map<string, Set<string>>([
    ['class', new Set()],
    ['dropzone', new Set()],
    ['rel', new Set()], // a, area, link
    ['ping', new Set()], // a, area
    ['sandbox', new Set()], // iframe
    /**
     * https://github.com/maltsev/htmlnano/issues/180
     * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-sizes
     *
     * "sizes" of <img> should not be modified, while "sizes" of <link> is a list of tokens.
     */
    ['sizes', new Set(['link'])],
    ['headers', new Set()] // td, th
]);

export function isListAttribute(attrName: string, tagName?: string) {
    const attrKey = attrName.toLowerCase();
    const tagSet = attributesWithLists.get(attrKey);
    if (!tagSet) {
        return false;
    }
    if (tagSet.size === 0) {
        return true;
    }
    if (!tagName) {
        return false;
    }
    return tagSet.has(tagName.toLowerCase());
}

/** empty set means the attribute is alwasy trimmable */
export const attributesWithSingleValue = new Map<string, Set<string>>([
    ['accept', new Set(['input'])],
    ['action', new Set(['form'])],
    ['accesskey', new Set()],
    ['accept-charset', new Set(['form'])],
    ['cite', new Set(['blockquote', 'del', 'ins', 'q'])],
    ['cols', new Set(['textarea'])],
    ['colspan', new Set(['td', 'th'])],
    ['data', new Set(['object'])],
    ['dropzone', new Set()],
    ['formaction', new Set(['button', 'input'])],
    ['height', new Set(['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'])],
    ['high', new Set(['meter'])],
    ['href', new Set(['a', 'area', 'base', 'link'])],
    ['itemid', new Set()],
    ['low', new Set(['meter'])],
    ['manifest', new Set(['html'])],
    ['max', new Set(['meter', 'progress'])],
    ['maxlength', new Set(['input', 'textarea'])],
    ['media', new Set(['source'])],
    ['min', new Set(['meter'])],
    ['minlength', new Set(['input', 'textarea'])],
    ['optimum', new Set(['meter'])],
    ['ping', new Set(['a', 'area'])],
    ['poster', new Set(['video'])],
    ['profile', new Set(['head'])],
    ['rows', new Set(['textarea'])],
    ['rowspan', new Set(['td', 'th'])],
    ['size', new Set(['input', 'select'])],
    ['span', new Set(['col', 'colgroup'])],
    ['src', new Set([
        'audio',
        'embed',
        'iframe',
        'img',
        'input',
        'script',
        'source',
        'track',
        'video'
    ])],
    ['start', new Set(['ol'])],
    ['step', new Set(['input'])],
    ['style', new Set()],
    ['tabindex', new Set()],
    ['usemap', new Set(['img', 'object'])],
    ['value', new Set(['li', 'meter', 'progress'])],
    ['width', new Set(['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'])]
]);

export function isSingleValueAttribute(attrName: string, tagName?: string) {
    const attrKey = attrName.toLowerCase();
    const tagSet = attributesWithSingleValue.get(attrKey);
    if (!tagSet) {
        return false;
    }
    if (!tagName) {
        return false;
    }
    if (tagSet.size === 0) {
        return true;
    }

    return tagSet.has(tagName.toLowerCase());
}

/**
 * Attributes holding a srcset, i.e. a comma-separated list of image candidate strings.
 * https://html.spec.whatwg.org/multipage/images.html#srcset-attributes
 */
export const attributesWithSrcset = new Map<string, Set<string>>([
    ['srcset', new Set(['img', 'source'])],
    ['imagesrcset', new Set(['link'])]
]);

export function isSrcsetAttribute(attrName: string, tagName?: string) {
    const tagSet = attributesWithSrcset.get(attrName.toLowerCase());
    if (!tagSet || !tagName) {
        return false;
    }

    return tagSet.has(tagName.toLowerCase());
}

interface SrcsetCandidate {
    url: string;
    descriptors: string[];
}

/** A srcset is split on ASCII whitespace only: anything else belongs to the URL */
const ASCII_WHITESPACE_REGEXP = /[\t\n\f\r ]/;

function isWhitespace(char: string | undefined) {
    return char !== undefined && ASCII_WHITESPACE_REGEXP.test(char);
}

/**
 * Splits a srcset into image candidates, following
 * https://html.spec.whatwg.org/multipage/images.html#parsing-a-srcset-attribute
 *
 * Returns null when there is nothing to parse, so that the attribute is left as is.
 */
function parseSrcset(srcset: string): SrcsetCandidate[] | null {
    const candidates: SrcsetCandidate[] = [];
    let position = 0;

    while (position < srcset.length) {
        // Splitting loop: whitespaces and commas separate the candidates
        while (position < srcset.length && (isWhitespace(srcset[position]) || srcset[position] === ',')) {
            position += 1;
        }

        const urlStart = position;
        while (position < srcset.length && !isWhitespace(srcset[position])) {
            position += 1;
        }

        const url = srcset.slice(urlStart, position);
        if (!url) {
            break;
        }

        // An URL ending with a comma has no descriptors: the comma is the separator
        if (url.endsWith(',')) {
            candidates.push({ url: url.replace(/,+$/, ''), descriptors: [] });
            continue;
        }

        candidates.push({ url, descriptors: [] });
        const { descriptors } = candidates[candidates.length - 1];

        // Descriptor tokenizer: descriptors are separated by whitespaces,
        // and the candidate ends at the first comma outside of parentheses
        let currentDescriptor = '';
        let state: 'inDescriptor' | 'inParens' | 'afterDescriptor' = 'inDescriptor';

        while (position <= srcset.length) {
            const char: string | undefined = srcset[position];
            position += 1;

            if (state === 'inParens') {
                if (char === undefined) {
                    break;
                }

                currentDescriptor += char;
                if (char === ')') {
                    state = 'inDescriptor';
                }

                continue;
            }

            if (state === 'afterDescriptor') {
                if (char === undefined) {
                    break;
                }

                if (!isWhitespace(char)) {
                    // Reconsume the character as the start of the next descriptor
                    state = 'inDescriptor';
                    position -= 1;
                }

                continue;
            }

            if (char === undefined || char === ',') {
                if (currentDescriptor) {
                    descriptors.push(currentDescriptor);
                }

                break;
            }

            if (isWhitespace(char)) {
                if (currentDescriptor) {
                    descriptors.push(currentDescriptor);
                    currentDescriptor = '';
                }

                state = 'afterDescriptor';
                continue;
            }

            currentDescriptor += char;
            if (char === '(') {
                state = 'inParens';
            }
        }
    }

    return candidates.length > 0 ? candidates : null;
}

function stringifySrcset(candidates: SrcsetCandidate[]) {
    return candidates
        .map(({ url, descriptors }) => (descriptors.length > 0 ? `${url} ${descriptors.join(' ')}` : url))
        .reduce((srcset, candidate, index) => {
            /**
             * The URL of a candidate is parsed as a sequence of non-whitespace characters,
             * so a candidate without descriptors would swallow both the comma and the next URL
             * unless a whitespace keeps them apart.
             */
            const separator = candidates[index - 1].descriptors.length > 0 ? ',' : ', ';
            return srcset + separator + candidate;
        });
}

/** Collapse whitespaces inside list-like attributes (e.g. class, rel) */
const mod: HtmlnanoModule = {
    onAttrs() {
        return (attrs, node) => {
            const newAttrs = attrs;

            const tagName = node.tag ? node.tag.toLowerCase() : undefined;

            Object.entries(attrs).forEach(([attrName, attrValue]) => {
                if (typeof attrValue !== 'string') return;

                const attrNameLower = attrName.toLowerCase();

                if (isListAttribute(attrNameLower, tagName)) {
                    newAttrs[attrName] = attrValue.replace(/\s+/g, ' ').trim();
                    return;
                }

                if (isSrcsetAttribute(attrNameLower, tagName)) {
                    const candidates = parseSrcset(attrValue);
                    if (candidates) {
                        newAttrs[attrName] = stringifySrcset(candidates);
                    }

                    return;
                }

                if (isEventHandler(attrName)) {
                    newAttrs[attrName] = attrValue.trim();
                } else if (isSingleValueAttribute(attrNameLower, tagName)) {
                    newAttrs[attrName] = attrValue.trim();
                }
            });

            return newAttrs;
        };
    }
};

export default mod;
