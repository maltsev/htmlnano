import { decodeHTML, decodeHTMLAttribute, decodeHTMLStrict } from 'entities';
import { isComment } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';

export interface MinifyCharacterReferencesOptions {
    /**
     * Decode any named/numeric reference (except the syntactically required ones),
     * instead of restricting to the conservative typographic allowlist.
     */
    decodeAll?: boolean;
}

/**
 * Tags whose content is not entity-decoded by browsers, so a literal
 * "&mdash;" inside them is NOT a character reference and must be left alone.
 * See how collapseWhitespace treats these protected elements.
 */
const rawTextElements = new Set([
    'script',
    'style',
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

/** Options of posthtml-render that decide the attribute quote character. */
type RenderQuotingOptions = {
    quoteStyle?: 0 | 1 | 2 | undefined;
    replaceQuote?: boolean | undefined;
};

/**
 * onAttrs() has no access to the tree, and therefore none to the render
 * options. Both hooks of a module are called with the very same options
 * object, so the tree pass below uses it as a per-run key to hand them over.
 */
const renderQuotingOptions = new WeakMap<object, RenderQuotingOptions>();

type DecodeContext = {
    decodeAll: boolean;
    inAttribute: boolean;
    forbidden: Set<string>;
};

function isDecodableCodePoint(codePoint: number): boolean {
    // Reject out-of-range, surrogates, and noncharacters.
    if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10FFFF) {
        return false;
    }
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
        return false;
    }
    // C0/C1 controls (except common whitespace) are unsafe to emit literally.
    if (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0A && codePoint !== 0x0C && codePoint !== 0x0D) {
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
    return inAttribute ? decodeHTMLAttribute(text) : decodeHTML(text);
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

    let decodedAmpersand = false;

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
            decodedAmpersand = true;
        }

        return decoded;
    });

    // The lookahead above sees the original text, while the neighbours of a
    // decoded "&" may themselves have been decoded ("&amp;no&#116;;" would
    // become "&not;"). Verify that the result still means exactly the same.
    if (decodedAmpersand && decodeLikeParser(result, context.inAttribute) !== decodeLikeParser(text, context.inAttribute)) {
        return text;
    }

    return result;
}

/**
 * posthtml-render single-quotes JSON-ish attribute values, so an apostrophe
 * would terminate them. This mirrors the "is-json" check it uses.
 */
function isJsonLikeValue(value: string): boolean {
    const compacted = value.replace(/\s/g, '');
    if (/^\{.*\}$/.test(compacted)) {
        return /"(.*?)":/.test(compacted);
    }
    return /^\[.*\]$/.test(compacted);
}

/** Whether posthtml-render is guaranteed to double-quote the given value. */
function canRenderApostrophe(value: string, quoting: RenderQuotingOptions): boolean {
    // quoteStyle 1 is "always single quotes".
    if (quoting.quoteStyle === 1) {
        return false;
    }
    // quoteStyle 0 is "single quotes for values containing a double quote",
    // which only happens when the double quotes are not replaced beforehand.
    if (quoting.quoteStyle === 0 && quoting.replaceQuote === false && value.indexOf('"') !== -1) {
        return false;
    }
    return !isJsonLikeValue(value);
}

function decodeAttributeValue(
    value: string,
    quoting: RenderQuotingOptions,
    withApostrophe: DecodeContext,
    withoutApostrophe: DecodeContext
): string {
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
        renderQuotingOptions.set(options, tree.options ?? {});
        return tree;
    },

    onContent(_options, moduleOptions) {
        const context: DecodeContext = {
            decodeAll: moduleOptions?.decodeAll === true,
            inAttribute: false,
            forbidden: forbiddenInText
        };

        return (content, node) => {
            // Browsers do not entity-decode raw-text element content.
            if (node.tag && rawTextElements.has(node.tag)) {
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

        return (attrs) => {
            const quoting = renderQuotingOptions.get(options) ?? {};
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
