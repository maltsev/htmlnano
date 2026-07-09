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
 * The syntactically required references (&amp;, &lt;, &gt;, &quot;, &apos;)
 * are intentionally NOT listed here — see decodeReferences() for details.
 */
const namedReferences: Record<string, string> = {
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
 * posthtml-render does NOT re-escape text, so emitting them would create
 * broken or exploitable HTML (a stray "&"/"<"/">" or, inside an attribute
 * value, a quote that closes the attribute). Guarding on the decoded output
 * also prevents "&amp;lt;" from ever collapsing into "&lt;".
 */
const forbiddenInText = new Set(['&', '<', '>']);
const forbiddenInAttr = new Set(['&', '<', '>', '"', '\'']);

// A single named, decimal, or hexadecimal character reference.
const referencePattern = /&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

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

    if (decodeAll) {
        // Only decode names we can map without an external dependency.
        if (Object.prototype.hasOwnProperty.call(namedReferences, body)) {
            return namedReferences[body];
        }
        return null;
    }

    if (Object.prototype.hasOwnProperty.call(namedReferences, body)) {
        return namedReferences[body];
    }

    return null;
}

function decodeReferences(text: string, inAttribute: boolean, decodeAll: boolean): string {
    if (text.indexOf('&') === -1) {
        return text;
    }

    const forbidden = inAttribute ? forbiddenInAttr : forbiddenInText;

    return text.replace(referencePattern, (match) => {
        const decoded = resolveReference(match, decodeAll);
        if (decoded === null) {
            return match;
        }

        // Never emit a character that would need re-escaping in this context.
        // This also blocks references that map to "&"/"<"/">" (e.g. &amp;),
        // and, inside attributes, to quotes (e.g. &quot;/&apos;/&#39;).
        for (const char of decoded) {
            if (forbidden.has(char)) {
                return match;
            }
        }

        // The decoded output must be shorter than the reference to be worth it.
        if (decoded.length >= match.length) {
            return match;
        }

        return decoded;
    });
}

const mod: HtmlnanoModule<MinifyCharacterReferencesOptions> = {
    onContent(_options, moduleOptions) {
        const decodeAll = moduleOptions?.decodeAll === true;

        return (content, node) => {
            // Browsers do not entity-decode raw-text element content.
            if (node.tag && rawTextElements.has(node.tag)) {
                return content;
            }

            return content.map((child: PostHTMLNodeLike) => {
                if (typeof child === 'string') {
                    return decodeReferences(child, false, decodeAll);
                }
                return child;
            });
        };
    },

    onAttrs(_options, moduleOptions) {
        const decodeAll = moduleOptions?.decodeAll === true;

        return (attrs) => {
            const newAttrs: Record<string, string | boolean | void> = {};
            for (const [name, value] of Object.entries(attrs)) {
                newAttrs[name] = typeof value === 'string'
                    ? decodeReferences(value, true, decodeAll)
                    : value;
            }
            return newAttrs;
        };
    }
};

export default mod;
