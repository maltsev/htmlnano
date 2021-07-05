import { attributesWithLists } from './collapseAttributeWhitespace';

const once = true;

function onattrs() {
    return (attrs, node) => {
        Object.keys(attrs).forEach(attrName => {
            if (! attributesWithLists.has(attrName)) {
                return;
            }

            const attrValues = node.attrs[attrName].split(/\s/);
            const uniqeAttrValues = new Set();
            const deduplicatedAttrValues = [];
            attrValues.forEach((attrValue) => {
                if (! attrValue) {
                    // Keep whitespaces
                    deduplicatedAttrValues.push('');
                    return;
                }

                if (uniqeAttrValues.has(attrValue)) {
                    return;
                }

                deduplicatedAttrValues.push(attrValue);
                uniqeAttrValues.add(attrValue);
            });

            attrs[attrName] = deduplicatedAttrValues.join(' ');
        });

        return attrs;
    };
}

/** Deduplicate values inside list-like attributes (e.g. class, rel) */
export {
    once,
    onattrs
};
