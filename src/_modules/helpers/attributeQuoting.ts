/** Options of posthtml-render that decide the attribute quote character. */
export type RenderQuotingOptions = {
    quoteStyle?: 0 | 1 | 2 | undefined;
    replaceQuote?: boolean | undefined;
};

/** Conservatively identify values that posthtml-render may single-quote as JSON. */
export function isJsonLikeValue(value: string): boolean {
    const compacted = value.replace(/\s/g, '');
    if (/^\{.*\}$/.test(compacted)) {
        return /"(.*?)":/.test(compacted);
    }
    return /^\[.*\]$/.test(compacted);
}

/** Whether posthtml-render is guaranteed to double-quote the given value. */
export function canRenderApostrophe(value: string, quoting: RenderQuotingOptions): boolean {
    if (quoting.quoteStyle === 1) {
        return false;
    }
    // Smart quotes select single quotes when double quotes are left literal.
    if (quoting.quoteStyle === 0 && quoting.replaceQuote === false && value.indexOf('"') !== -1) {
        return false;
    }
    return !isJsonLikeValue(value);
}
