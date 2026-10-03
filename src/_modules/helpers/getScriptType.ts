import type PostHTML from 'posthtml';

export function getScriptType(attrs: PostHTML.NodeAttributes): string {
    if ('type' in attrs) {
        const type = typeof attrs.type === 'string' ? attrs.type : '';
        // Only an actually empty type defaults to JavaScript. Whitespace alone
        // becomes a data block, and type takes precedence over language.
        return type === ''
            ? 'text/javascript'
            : type.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase();
    }

    return attrs.language ? `text/${attrs.language}`.toLowerCase() : 'text/javascript';
}
