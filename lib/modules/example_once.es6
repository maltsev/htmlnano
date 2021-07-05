/**
 * Example "once" module
 */

// It is a "once" module
const once = true;

/**
 * Modify attributes of node. Optional.
 *
 * @param {object} options - Options that were passed to htmlnano
 * @param moduleOptions — Module options. For most modules this is just "true" (indication that the module was enabled)
 */
function onattrs(options, moduleOptions) {
    return (attrs, node) => {
        // You can modify "attrs" based on "node"

        return attrs; // ... then return the modified attrs
    };
}

/**
 * Modify content of node. Optional.
 *
 * @param {object} options - Options that were passed to htmlnano
 * @param moduleOptions — Module options. For most modules this is just "true" (indication that the module was enabled)
 */
function oncontent(options, moduleOptions) {
    return (content, node) => {
        // Same goes the "content"

        return content; // ... return modified content here
    };
}

/**
 * It is possible to modify entire ndde as well. Optional.
 * @param {object} options - Options that were passed to htmlnano
 * @param moduleOptions — Module options. For most modules this is just "true" (indication that the module was enabled)
 */
function onnode(options, moduleOptions) {
    return (node) => {
        return node; // ... return new node here
    };
}

export {
    // This marks the module is a "once" module
    once,
    onattrs,
    oncontent,
    onnode
}
