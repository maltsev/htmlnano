// Source: https://www.w3.org/TR/html4/sgml/dtd.html#events (Generic Attributes)
const safeToRemoveAttrs = new Set([
    'id',
    'class',
    'style',
    'title',
    'lang',
    'dir',
    'onclick',
    'ondblclick',
    'onmousedown',
    'onmouseup',
    'onmouseover',
    'onmousemove',
    'onmouseout',
    'onkeypress',
    'onkeydown',
    'onkeyup'
]);

const once = true;

function onattrs() {
    return (attrs) => {
        Object.entries(attrs).forEach(([attrName, attrValue]) => {
            if (!safeToRemoveAttrs.has(attrName)) {
                return;
            }

            if (attrValue === '' || (attrValue || '').match(/^\s+$/)) {
                delete attrs[attrName];
            }
        });

        return attrs;
    };
}

/** Removes empty attributes */
export {
    once,
    onattrs
};
