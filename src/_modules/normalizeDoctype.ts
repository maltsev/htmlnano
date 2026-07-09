import type { HtmlnanoModule, PostHTMLTreeLike } from '../types';

const rDoctype = /^<!doctype\s/i;
const shortDoctype = '<!doctype html>';

/**
 * Normalize legacy doctypes (e.g. XHTML 1.0 / HTML 4.01 with PUBLIC/SYSTEM
 * identifiers) to the short HTML5 form `<!doctype html>`.
 *
 * posthtml-parser emits the doctype as a raw string node at the top level of
 * the tree, so we only need to inspect top-level string nodes.
 *
 * This is a max-only module: rewriting a legacy PUBLIC doctype can subtly
 * change rendering (e.g. almost-standards vs. full standards mode), so it is
 * not enabled in the safe preset. XML declarations (`<?xml ...?>`) are left
 * untouched.
 */
function normalizeDoctype(tree: PostHTMLTreeLike): PostHTMLTreeLike {
    tree.forEach((node, index) => {
        if (typeof node !== 'string') {
            return;
        }

        if (rDoctype.test(node) && node !== shortDoctype) {
            tree[index] = shortDoctype;
        }
    });

    return tree;
}

const mod: HtmlnanoModule = {
    default: normalizeDoctype
};

export default mod;
