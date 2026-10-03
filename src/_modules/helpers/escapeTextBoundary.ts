import { decodeHTML, escapeText } from 'entities';

export function escapeTextBoundary(text: string): string {
    // Joining text across removed markup must not create a tag or extend a
    // character reference. Decode only the unfinished suffix, then escape it.
    return text.replace(/<$|&(?:#(?:[xX][\da-fA-F]*|\d*)|[a-zA-Z\d]*)$/, suffix =>
        escapeText(decodeHTML(suffix)).replace(/\r/g, '&#13;')
    );
}
