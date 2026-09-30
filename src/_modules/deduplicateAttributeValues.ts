import type { HtmlnanoModule } from '../types';
import { isListAttribute } from './collapseAttributeWhitespace';

const caseInsensitiveListAttributes = new Set([
    'rel',
    'sandbox',
    'dropzone',
    'sizes'
]);

function getDeduplicationKey(attrNameLower: string, attrValue: string) {
    if (!caseInsensitiveListAttributes.has(attrNameLower)) {
        return attrValue;
    }

    return attrValue.toLowerCase();
}

/** Deduplicate values inside list-like attributes (e.g. class, rel) */
const mod: HtmlnanoModule = {
    onAttrs() {
        return (attrs, node) => {
            const newAttrs = attrs;
            const tagName = node.tag ? node.tag.toLowerCase() : undefined;

            Object.keys(attrs).forEach((attrName) => {
                const attrNameLower = attrName.toLowerCase();
                if (!isListAttribute(attrNameLower, tagName)) {
                    return;
                }

                if (typeof attrs[attrName] !== 'string') {
                    return;
                }

                const attrValues = attrs[attrName].split(/[\t\n\f\r ]/);
                const uniqueAttrValues = new Set<string>();
                const deduplicatedAttrValues: string[] = [];

                attrValues.forEach((attrValue) => {
                    if (!attrValue) {
                        // Keep whitespaces
                        deduplicatedAttrValues.push('');
                        return;
                    }

                    const deduplicationKey = getDeduplicationKey(attrNameLower, attrValue);
                    if (uniqueAttrValues.has(deduplicationKey)) {
                        return;
                    }

                    deduplicatedAttrValues.push(attrValue);
                    uniqueAttrValues.add(deduplicationKey);
                });

                newAttrs[attrName] = deduplicatedAttrValues.join(' ');
            });

            return newAttrs;
        };
    }
};

export default mod;
