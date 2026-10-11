import { getTagName } from '../helpers';
import { decodeHTMLAttribute } from 'entities';
import type { HtmlnanoModule } from '../types';
import { collapseAttributeWhitespace } from './collapseAttributeWhitespace';

const asciiWhitespace = new Set(['\t', '\n', '\f', '\r', ' ']);

type RedundantWhitespaceMode = 'safe' | 'aggressive' | false;

type MinifyAttributesOptions = {
    metaContent?: boolean;
    /** `'agressive'` is a deprecated alias for `'aggressive'`. */
    redundantWhitespaces?: RedundantWhitespaceMode | 'agressive';
};

type NormalizedOptions = {
    metaContent: boolean;
    redundantWhitespaces: RedundantWhitespaceMode;
};

const defaultOptions: NormalizedOptions = {
    metaContent: true,
    redundantWhitespaces: 'safe'
};

function isAsciiWhitespace(char: string) {
    return asciiWhitespace.has(char);
}

function isAsciiDigit(char: string) {
    return char >= '0' && char <= '9';
}

function skipAsciiWhitespace(input: string, start: number) {
    let pos = start;
    while (pos < input.length && isAsciiWhitespace(input[pos])) {
        pos += 1;
    }
    return pos;
}

function minifyMetaRefreshValue(value: string): string | null {
    // References can hide URL prefixes, quotes, and delimiters. Leave their
    // source spelling intact rather than parsing a different value than HTML.
    if (decodeHTMLAttribute(value) !== value) return null;

    const input = value;
    let pos = skipAsciiWhitespace(input, 0);

    const timeStart = pos;
    while (pos < input.length && isAsciiDigit(input[pos])) {
        pos += 1;
    }
    if (pos === timeStart) return null;

    const time = input.slice(timeStart, pos);

    while (pos < input.length) {
        const ch = input[pos];
        if (isAsciiDigit(ch) || ch === '.') {
            pos += 1;
            continue;
        }
        break;
    }

    pos = skipAsciiWhitespace(input, pos);
    if (pos >= input.length) return time;

    const separator = input[pos];
    if (separator !== ';' && separator !== ',') return null;
    pos += 1;

    pos = skipAsciiWhitespace(input, pos);
    if (pos >= input.length) return time;

    let hasUrlPrefix = false;
    if (input[pos] === 'u' || input[pos] === 'U') {
        if (pos + 2 < input.length) {
            const maybeUrl = input.slice(pos, pos + 3);
            if (maybeUrl.toLowerCase() === 'url') {
                let prefixPos = skipAsciiWhitespace(input, pos + 3);
                if (prefixPos < input.length && input[prefixPos] === '=') {
                    prefixPos = skipAsciiWhitespace(input, prefixPos + 1);
                    hasUrlPrefix = true;
                    pos = prefixPos;
                }
            }
        }
    }

    if (pos >= input.length) return hasUrlPrefix ? `${time}${separator} URL=` : time;

    const firstUrlChar = input[pos];
    if (firstUrlChar === '"' || firstUrlChar === '\'') {
        if (!hasUrlPrefix) return null;

        const quote = firstUrlChar;
        const urlStart = pos + 1;
        const quoteIndex = input.indexOf(quote, urlStart);
        const url = quoteIndex === -1 ? input.slice(urlStart) : input.slice(urlStart, quoteIndex);

        const closingQuote = quoteIndex === -1 ? '' : quote;

        return `${time}${separator} URL=${quote}${url}${closingQuote}`;
    }

    const url = input.slice(pos).replace(/[\t\n\f\r ]+$/, '');
    // Dropping the outer prefix must not make the URL itself become a prefix
    // on the next parse (or on a second minification pass).
    const prefix = hasUrlPrefix && /^url[\t\n\f\r ]*=/i.test(url) ? 'URL=' : '';

    return `${time}${separator} ${prefix}${url}`;
}

function minifyViewportNumber(value: string): string {
    // Only strip a redundant trailing ".0"/".00"/"0" fraction when the result
    // parses to the same number, e.g. "1.0" -> "1", "2.50" -> "2.5".
    if (!/^[+-]?(?:\d+\.\d+|\.\d+|\d+\.)$/.test(value)) {
        return value;
    }

    const trimmed = value.replace(/\.?0+$/, '');
    const normalized = trimmed === '' || trimmed === '+' || trimmed === '-' ? value : trimmed;

    return Number(normalized) === Number(value) ? normalized : value;
}

function minifyMetaViewportValue(value: string): string {
    // A reference's semicolon is not a viewport separator. Splitting on it can
    // join tokens when whitespace is removed (e.g. "&#49; 00" becomes "100").
    if (decodeHTMLAttribute(value) !== value) return value;

    // Viewport content is a comma/semicolon-separated list of key=value pairs.
    // We normalize whitespace around separators and "=", and strip redundant
    // trailing zeros in numeric values. The author's separator characters are
    // preserved to stay conservative.
    return value
        .split(/([,;])/)
        .map((part) => {
            if (part === ',' || part === ';') return part;

            const trimmed = trimViewportWhitespace(part);
            if (trimmed === '') return trimmed;

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) return trimmed;

            const key = trimViewportWhitespace(trimmed.slice(0, eqIndex));
            const rawValue = trimViewportWhitespace(trimmed.slice(eqIndex + 1));

            return `${key}=${minifyViewportNumber(rawValue)}`;
        })
        .join('');
}

function trimViewportWhitespace(value: string): string {
    // The viewport grammar excludes form feed and Unicode whitespace.
    // https://drafts.csswg.org/css-viewport/#parsing-algorithm
    return value.replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, '');
}

function isMetaViewport(attrs: Record<string, string | boolean | void>, tagName?: string): boolean {
    if (!tagName || tagName.toLowerCase() !== 'meta') return false;

    const name = attrs.name;
    if (typeof name !== 'string') return false;

    return name.toLowerCase() === 'viewport';
}

function isMetaRefresh(attrs: Record<string, string | boolean | void>, tagName?: string): boolean {
    if (!tagName || tagName.toLowerCase() !== 'meta') return false;

    const httpEquiv = attrs['http-equiv'];
    if (typeof httpEquiv !== 'string') return false;

    return httpEquiv.toLowerCase() === 'refresh';
}

function normalizeOptions(moduleOptions: Partial<MinifyAttributesOptions> | boolean): NormalizedOptions {
    if (moduleOptions && typeof moduleOptions === 'object') {
        let redundantWhitespaces: RedundantWhitespaceMode = defaultOptions.redundantWhitespaces;

        if (moduleOptions.redundantWhitespaces === 'agressive') {
            // Deprecated alias for 'aggressive'.
            redundantWhitespaces = 'aggressive';
        } else if (
            moduleOptions.redundantWhitespaces === 'safe'
            || moduleOptions.redundantWhitespaces === 'aggressive'
            || moduleOptions.redundantWhitespaces === false
        ) {
            redundantWhitespaces = moduleOptions.redundantWhitespaces;
        }

        return {
            metaContent: moduleOptions.metaContent !== false,
            redundantWhitespaces
        };
    }

    return defaultOptions;
}

function minifyAttributeWhitespace(
    mode: RedundantWhitespaceMode,
    attrName: string,
    attrValue: string,
    tagName?: string
): string | null {
    if (!mode) {
        return null;
    }

    const collapsed = collapseAttributeWhitespace(attrName, attrValue, tagName);
    if (collapsed !== attrValue) {
        return collapsed;
    }

    if (mode === 'aggressive') {
        const trimmed = attrValue.trim();
        return trimmed === attrValue ? null : trimmed;
    }

    return null;
}

const mod: HtmlnanoModule<MinifyAttributesOptions> = {
    onAttrs(_options, moduleOptions) {
        const normalizedOptions = normalizeOptions(moduleOptions);

        return (attrs, node) => {
            const tagName = getTagName(node) || undefined;

            if (normalizedOptions.metaContent && isMetaRefresh(attrs, tagName)) {
                const content = attrs.content;
                if (typeof content === 'string') {
                    const minified = minifyMetaRefreshValue(content);
                    if (minified !== null && minified !== content) {
                        attrs.content = minified;
                    }
                }
            } else if (normalizedOptions.metaContent && isMetaViewport(attrs, tagName)) {
                const content = attrs.content;
                if (typeof content === 'string') {
                    const minified = minifyMetaViewportValue(content);
                    if (minified !== content) {
                        attrs.content = minified;
                    }
                }
            }

            if (normalizedOptions.redundantWhitespaces) {
                Object.entries(attrs).forEach(([attrName, attrValue]) => {
                    if (typeof attrValue !== 'string') return;

                    const minified = minifyAttributeWhitespace(
                        normalizedOptions.redundantWhitespaces,
                        attrName,
                        attrValue,
                        tagName
                    );
                    if (minified !== null) {
                        attrs[attrName] = minified;
                    }
                });
            }

            return attrs;
        };
    }
};

export default mod;
