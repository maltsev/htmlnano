import { decodeHTML, decodeHTMLAttribute, decodeHTMLStrict } from 'entities';
import { isComment } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import { canRenderApostrophe, isJsonLikeValue } from './helpers/attributeQuoting.js';
import type { RenderQuotingOptions } from './helpers/attributeQuoting.js';

export interface MinifyCharacterReferencesOptions {
    /**
     * Decode any named/numeric reference (except the syntactically required ones),
     * instead of restricting to the conservative typographic allowlist.
     */
    decodeAll?: boolean;
}

/**
 * Raw-text elements do not decode character references. Keep textarea content
 * conservatively too, even though browsers entity-decode its RCDATA content.
 * Noscript must work both with scripting enabled (raw text) and disabled.
 */
const rawTextElements = new Set([
    'script',
    'style',
    'xmp',
    'iframe',
    'noembed',
    'noframes',
    'noscript',
    'plaintext',
    'textarea'
]);

/**
 * Conservative allowlist of common, safe named references mapped to their
 * literal characters. These are typographic/symbol references whose decoded
 * form is a printable, non-syntax character and is shorter than the reference.
 *
 * With `decodeAll` every named reference of the HTML standard is resolved on
 * top of this list — see resolveReference().
 */
const namedReferences: Record<string, string> = {
    // Syntactically significant characters. Whether they may actually be
    // emitted depends on the surrounding context — see decodeReferences().
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    // Whitespace / spacing
    nbsp: ' ',
    ensp: ' ',
    emsp: ' ',
    thinsp: ' ',
    // Dashes
    ndash: '–',
    mdash: '—',
    // Quotes / punctuation
    lsquo: '‘',
    rsquo: '’',
    sbquo: '‚',
    ldquo: '“',
    rdquo: '”',
    bdquo: '„',
    lsaquo: '‹',
    rsaquo: '›',
    laquo: '«',
    raquo: '»',
    hellip: '…',
    middot: '·',
    bull: '•',
    dagger: '†',
    Dagger: '‡',
    prime: '′',
    Prime: '″',
    // Symbols
    copy: '©',
    reg: '®',
    trade: '™',
    deg: '°',
    plusmn: '±',
    times: '×',
    divide: '÷',
    frac12: '½',
    frac14: '¼',
    frac34: '¾',
    sup1: '¹',
    sup2: '²',
    sup3: '³',
    micro: 'µ',
    para: '¶',
    sect: '§',
    curren: '¤',
    cent: '¢',
    pound: '£',
    yen: '¥',
    euro: '€',
    // Arrows
    larr: '←',
    uarr: '↑',
    rarr: '→',
    darr: '↓',
    harr: '↔',
    // Math
    minus: '−',
    lowast: '∗',
    ne: '≠',
    le: '≤',
    ge: '≥',
    infin: '∞',
    sum: '∑',
    radic: '√',
    // Latin letters with diacritics (common ones)
    aacute: 'á',
    eacute: 'é',
    iacute: 'í',
    oacute: 'ó',
    uacute: 'ú',
    Aacute: 'Á',
    Eacute: 'É',
    Iacute: 'Í',
    Oacute: 'Ó',
    Uacute: 'Ú',
    agrave: 'à',
    egrave: 'è',
    ograve: 'ò',
    ntilde: 'ñ',
    Ntilde: 'Ñ',
    ccedil: 'ç',
    Ccedil: 'Ç',
    auml: 'ä',
    euml: 'ë',
    ouml: 'ö',
    uuml: 'ü',
    Auml: 'Ä',
    Ouml: 'Ö',
    Uuml: 'Ü',
    szlig: 'ß',
    // Greek (common)
    alpha: 'α',
    beta: 'β',
    gamma: 'γ',
    delta: 'δ',
    pi: 'π',
    sigma: 'σ',
    omega: 'ω',
    mu: 'μ'
};

/**
 * Characters that must never appear as the decoded output, because
 * posthtml-render does NOT re-escape text.
 *
 * In a text node "<" would open a tag. ">" and quotes are harmless there.
 * In an attribute value "<" and ">" are safe because posthtml-render always
 * quotes values containing them, but a double quote is not: it is either
 * re-encoded (making the decoding pointless) or it terminates the value.
 * A bare "&" is handled separately by isUnambiguousAmpersand(), and an
 * apostrophe by canRenderApostrophe().
 */
const forbiddenInText = new Set(['<']);
const forbiddenInAttribute = new Set(['"']);
const forbiddenInAttributeWithApostrophe = new Set(['"', '\'']);

// A single named, decimal, or hexadecimal character reference.
const referencePattern = /&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/**
 * Longest run of reference body characters that is still worth looking at when
 * checking for an ambiguous ampersand. The longest named reference is 31
 * characters, so anything beyond this is treated as "unknown" and blocks the
 * decoding instead of scanning the rest of a possibly huge text node.
 */
const ampersandLookaheadLimit = 64;

/**
 * Hooks have no access to the tree or its render options. Both receive the
 * same options object, so the tree pass uses it as a per-run key to share
 * quoting options and protection for content parsed differently by browsers.
 */
const runContexts = new WeakMap<object, {
    quoting: RenderQuotingOptions;
    protectedNodes: WeakMap<object, 'content' | 'all'>;
}>();

/** PostHTML may parse raw-text content as elements that the browser never sees. */
function collectProtectedNodes(content: PostHTMLNodeLike[]): WeakMap<object, 'content' | 'all'> {
    const protectedNodes = new WeakMap<object, 'content' | 'all'>();
    let inPlaintext = false;

    function visit(nodes: PostHTMLNodeLike[], protectedContent: boolean): void {
        for (const node of nodes) {
            if (!node || typeof node !== 'object') continue;

            if (protectedContent || inPlaintext) protectedNodes.set(node, 'all');
            const tag = typeof node.tag === 'string' ? node.tag.toLowerCase() : '';
            // Plaintext consumes everything to EOF, including its closing tag.
            // A spelling inside another raw-text element is just literal text.
            if (!protectedContent && tag === 'plaintext') inPlaintext = true;

            if (node.content) {
                visit(
                    Array.isArray(node.content) ? node.content : [node.content],
                    protectedContent || inPlaintext || rawTextElements.has(tag)
                );
            }
            // Ancestors may also contain text siblings after plaintext's
            // apparent closing tag. Preserve their text, but not their attrs.
            if (inPlaintext && !protectedNodes.has(node)) protectedNodes.set(node, 'content');
        }
    }

    visit(content, false);
    return protectedNodes;
}

type DecodeContext = {
    decodeAll: boolean;
    inAttribute: boolean;
    forbidden: Set<string>;
};

function isDecodableCodePoint(codePoint: number): boolean {
    // Reject out-of-range code points and surrogates.
    if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10FFFF) {
        return false;
    }
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
        return false;
    }
    // Literal carriage returns are normalized to line feeds before parsing,
    // whereas a carriage return emitted by a reference keeps its value.
    if (codePoint === 0x0D) {
        return false;
    }
    // C0/C1 controls (except common whitespace) are unsafe to emit literally.
    if (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0A && codePoint !== 0x0C) {
        return false;
    }
    if (codePoint >= 0x7F && codePoint <= 0x9F) {
        return false;
    }
    return true;
}

function isDecodableText(text: string): boolean {
    for (const character of text) {
        if (!isDecodableCodePoint(character.codePointAt(0)!)) {
            return false;
        }
    }
    return true;
}

/** Decodes the string the way a browser would decode it in the given context. */
function decodeLikeParser(text: string, inAttribute: boolean): string {
    // Input-stream normalization happens before character reference decoding.
    // A newly decoded LF must not combine with a preceding literal CR.
    const normalized = text.replace(/\r\n?/g, '\n');
    return inAttribute ? decodeHTMLAttribute(normalized) : decodeHTML(normalized);
}

function resolveReference(reference: string, decodeAll: boolean): string | null {
    // reference includes the leading "&" and trailing ";"
    const body = reference.slice(1, -1);

    if (body[0] === '#') {
        const isHex = body[1] === 'x' || body[1] === 'X';
        const digits = isHex ? body.slice(2) : body.slice(1);
        const codePoint = parseInt(digits, isHex ? 16 : 10);
        if (!isDecodableCodePoint(codePoint)) {
            return null;
        }
        return String.fromCodePoint(codePoint);
    }

    if (Object.prototype.hasOwnProperty.call(namedReferences, body)) {
        return namedReferences[body];
    }

    if (!decodeAll) {
        return null;
    }

    const decoded = decodeHTMLStrict(reference);
    if (decoded === reference || !isDecodableText(decoded)) {
        return null;
    }
    return decoded;
}

function isReferenceBodyCharacter(character: string): boolean {
    return (character >= '0' && character <= '9')
        || (character >= 'a' && character <= 'z')
        || (character >= 'A' && character <= 'Z')
        || character === '#';
}

/**
 * A bare "&" is only allowed when it is not an *ambiguous ampersand*, i.e.
 * when the characters that follow it cannot turn it into a character
 * reference. Named references without a trailing semicolon are still decoded
 * by browsers ("&copy" is "©"), so the whole run of reference body characters
 * is handed to the reference decoder instead of merely looking for a ";".
 *
 * https://html.spec.whatwg.org/multipage/syntax.html#syntax-ambiguous-ampersand
 */
function isUnambiguousAmpersand(text: string, index: number, inAttribute: boolean): boolean {
    let end = index;
    while (end < text.length && isReferenceBodyCharacter(text[end])) {
        if (end - index >= ampersandLookaheadLimit) {
            return false;
        }
        end++;
    }

    if (end === text.length && !inAttribute) {
        // The "&" would end up at the very end of a text node, and another
        // module may still drop the node that currently separates it from the
        // following text. An attribute value in contrast is always terminated
        // by its quote, by whitespace, or by the end of the tag.
        return false;
    }

    // ";" ends a reference, and "=" is what keeps a semicolon-less reference
    // undecoded inside an attribute value, so a single character of context
    // after the body is enough.
    const terminator = text[end];
    const probe = '&' + text.slice(index, end) + (terminator === ';' || terminator === '=' ? terminator : '');

    return decodeLikeParser(probe, inAttribute) === probe;
}

function decodeReferences(text: string, context: DecodeContext): string {
    if (text.indexOf('&') === -1) {
        return text;
    }

    const result = text.replace(referencePattern, (match: string, offset: number) => {
        const decoded = resolveReference(match, context.decodeAll);
        if (decoded === null) {
            return match;
        }

        // Never emit a character that would need re-escaping in this context.
        // This also blocks references that map to "<" (e.g. &lt; in text) and,
        // inside attributes, to a double quote (e.g. &quot;/&#34;).
        for (const character of decoded) {
            if (context.forbidden.has(character)) {
                return match;
            }
        }

        // The decoded output must be shorter than the reference to be worth it.
        if (decoded.length >= match.length) {
            return match;
        }

        if (decoded.indexOf('&') !== -1) {
            if (!isUnambiguousAmpersand(text, offset + match.length, context.inAttribute)) {
                return match;
            }
        }

        return decoded;
    });

    // Decoding can complete an existing reference even without emitting "&":
    // "&co&#112;y;" becomes "&copy;" and "&#6&#48;;" becomes "&#60;".
    // Check every changed result, including neighbours of decoded ampersands.
    if (result !== text && decodeLikeParser(result, context.inAttribute) !== decodeLikeParser(text, context.inAttribute)) {
        return text;
    }

    return result;
}

function decodeAttributeValue(
    value: string,
    quoting: RenderQuotingOptions,
    withApostrophe: DecodeContext,
    withoutApostrophe: DecodeContext
): string {
    // Nothing to decode, so skip the quoting checks below, which compact the
    // whole value with a regex.
    if (value.indexOf('&') === -1) {
        return value;
    }

    if (!canRenderApostrophe(value, quoting)) {
        return decodeReferences(value, withoutApostrophe);
    }

    const decoded = decodeReferences(value, withApostrophe);

    // Decoding may have turned the value into a JSON-ish one, which
    // posthtml-render would then single-quote.
    if (decoded !== value && decoded.indexOf('\'') !== -1 && isJsonLikeValue(decoded)) {
        return decodeReferences(value, withoutApostrophe);
    }

    return decoded;
}

const mod: HtmlnanoModule<MinifyCharacterReferencesOptions> = {
    default: function minifyCharacterReferences(tree, options) {
        runContexts.set(options, {
            quoting: tree.options ?? {},
            protectedNodes: collectProtectedNodes(tree)
        });
        return tree;
    },

    onContent(options, moduleOptions) {
        const context: DecodeContext = {
            decodeAll: moduleOptions?.decodeAll === true,
            inAttribute: false,
            forbidden: forbiddenInText
        };

        return (content, node) => {
            if (runContexts.get(options)?.protectedNodes.has(node)
                || node.tag && rawTextElements.has(node.tag.toLowerCase())) {
                return content;
            }

            return content.map((child: PostHTMLNodeLike) => {
                if (typeof child === 'string') {
                    // Browsers do not entity-decode comment data, and decoding
                    // `--&gt;` there would terminate the comment early.
                    if (isComment(child)) {
                        return child;
                    }
                    return decodeReferences(child, context);
                }
                return child;
            });
        };
    },

    onAttrs(options, moduleOptions) {
        const decodeAll = moduleOptions?.decodeAll === true;
        const withApostrophe: DecodeContext = {
            decodeAll,
            inAttribute: true,
            forbidden: forbiddenInAttribute
        };
        const withoutApostrophe: DecodeContext = {
            decodeAll,
            inAttribute: true,
            forbidden: forbiddenInAttributeWithApostrophe
        };

        return (attrs, node) => {
            const runContext = runContexts.get(options);
            if (runContext?.protectedNodes.get(node) === 'all') return attrs;
            const quoting = runContext?.quoting ?? {};
            const newAttrs: Record<string, string | boolean | void> = {};
            for (const [name, value] of Object.entries(attrs)) {
                newAttrs[name] = typeof value === 'string'
                    ? decodeAttributeValue(value, quoting, withApostrophe, withoutApostrophe)
                    : value;
            }
            return newAttrs;
        };
    }
};

export default mod;
