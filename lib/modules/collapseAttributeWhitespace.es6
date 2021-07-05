export const attributesWithLists = new Set([
    'class',
    'rel',
    'ping',
]);

const once = true;

function onattrs() {
    return (attrs) => {
        Object.entries(attrs).forEach(([attrName, attrValue]) => {
            if (! attributesWithLists.has(attrName)) {
                return;
            }

            attrs[attrName] = attrValue.replace(/\s+/g, ' ').trim();
        });

        return attrs;
    };
}

/** Collapse whitespaces inside list-like attributes (e.g. class, rel) */
export {
    once, // It is a "once" module
    onattrs
};
