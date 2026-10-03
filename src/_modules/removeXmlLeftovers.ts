import type { HtmlnanoModule } from '../types';
import { decodeHTMLAttribute } from 'entities';

type AttrValue = void | boolean | string;
type Attrs = Record<string, AttrValue>;

// The only xmlns value that is meaningless (and thus removable) on <html> in an HTML document.
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

function findAttrEntry(attrs: Attrs, name: string): { name: string; value: AttrValue } | null {
    let entry: { name: string; value: AttrValue } | null = null;

    for (const [attrName, attrValue] of Object.entries(attrs)) {
        if (attrName.replace(/[A-Z]/g, char => char.toLowerCase()) === name) {
            // Removing the first duplicate could expose a different value to a browser.
            if (entry) return null;
            entry = { name: attrName, value: attrValue };
        }
    }

    return entry;
}

function decodeValue(value: AttrValue, alreadyDecoded: boolean): string | null {
    if (typeof value !== 'string') return null;
    return alreadyDecoded ? value : decodeHTMLAttribute(value);
}

function normalizeLanguage(value: AttrValue, alreadyDecoded: boolean): string | null {
    // Language values use ASCII case folding, without whitespace trimming.
    return decodeValue(value, alreadyDecoded)?.replace(/[A-Z]/g, char => char.toLowerCase()) ?? null;
}

/** Removes XHTML/XML leftovers that are meaningless in HTML documents */
const mod: HtmlnanoModule = {
    default: function removeXmlLeftovers(tree) {
        // XML namespace declarations and xml:lang remain significant in XML mode.
        if (tree.options?.xmlMode) return tree;

        const alreadyDecoded = tree.options?.decodeEntities === true;
        // A tree pass preserves unrelated attribute names and case variants of
        // duplicates, which the shared onAttrs walk would otherwise fold together.
        tree.walk((node) => {
            if (!node.attrs) return node;
            const attrsRecord = node.attrs as Attrs;

            // Remove xmlns="http://www.w3.org/1999/xhtml" from <html>.
            // The HTML parser ignores it — <html> is always in the HTML namespace.
            // Scoped strictly to the <html> tag so xmlns on <svg>/<math> is left untouched.
            if (node.tag?.toLowerCase() === 'html') {
                const xmlnsEntry = findAttrEntry(attrsRecord, 'xmlns');
                if (xmlnsEntry && decodeValue(xmlnsEntry.value, alreadyDecoded) === XHTML_NAMESPACE) {
                    delete attrsRecord[xmlnsEntry.name];
                }
            }

            // Remove xml:lang when an identical (case-insensitive) lang attribute is present
            // on the same element. Without a matching lang, xml:lang is left alone since it
            // may be the only language signal for XML tooling.
            const xmlLangEntry = findAttrEntry(attrsRecord, 'xml:lang');
            if (xmlLangEntry) {
                const langEntry = findAttrEntry(attrsRecord, 'lang');
                if (langEntry) {
                    const xmlLangValue = normalizeLanguage(xmlLangEntry.value, alreadyDecoded);
                    const langValue = normalizeLanguage(langEntry.value, alreadyDecoded);
                    if (xmlLangValue !== null && xmlLangValue === langValue) {
                        delete attrsRecord[xmlLangEntry.name];
                    }
                }
            }

            return node;
        });

        return tree;
    }
};
export default mod;
