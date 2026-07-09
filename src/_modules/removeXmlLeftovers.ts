import type { HtmlnanoModule } from '../types';

type AttrValue = void | boolean | string;
type Attrs = Record<string, AttrValue>;

// The only xmlns value that is meaningless (and thus removable) on <html> in an HTML document.
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

function findAttrEntry(attrs: Attrs, name: string): { name: string; value: AttrValue } | null {
    const targetName = name.toLowerCase();

    for (const [attrName, attrValue] of Object.entries(attrs)) {
        if (attrName.toLowerCase() === targetName) {
            return { name: attrName, value: attrValue };
        }
    }

    return null;
}

function normalizeValue(value: AttrValue): string | null {
    return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

/** Removes XHTML/XML leftovers that are meaningless in HTML documents */
const mod: HtmlnanoModule = {
    onAttrs() {
        return (attrs, node) => {
            const attrsRecord = attrs as Attrs;

            // Remove xmlns="http://www.w3.org/1999/xhtml" from <html>.
            // The HTML parser ignores it — <html> is always in the HTML namespace.
            // Scoped strictly to the <html> tag so xmlns on <svg>/<math> is left untouched.
            if (node.tag === 'html') {
                const xmlnsEntry = findAttrEntry(attrsRecord, 'xmlns');
                if (xmlnsEntry && normalizeValue(xmlnsEntry.value) === XHTML_NAMESPACE) {
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
                    const xmlLangValue = normalizeValue(xmlLangEntry.value);
                    const langValue = normalizeValue(langEntry.value);
                    if (xmlLangValue !== null && xmlLangValue === langValue) {
                        delete attrsRecord[xmlLangEntry.name];
                    }
                }
            }

            return attrsRecord;
        };
    }
};
export default mod;
