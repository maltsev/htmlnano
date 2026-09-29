import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLTreeLike } from '../types';

const rDoctype = /^<!doctype\s/i;
const rHtml5Doctype = /^<!doctype[ \t\n\f\r]+html[ \t\n\f\r]*>$/i;
const shortDoctype = '<!doctype html>';

/**
 * Normalize doctypes to the short HTML5 form `<!doctype html>`.
 *
 * posthtml-parser emits the doctype as a raw string node at the top level of
 * the tree, so we only need to inspect top-level string nodes.
 *
 * The `html5` mode only canonicalizes doctypes that are already the short
 * HTML5 form. The boolean mode also rewrites legacy doctypes for backward
 * compatibility.
 */
function normalizeDoctype(
    tree: PostHTMLTreeLike,
    _options: Partial<HtmlnanoOptions>,
    moduleOptions: NonNullable<HtmlnanoOptions['normalizeDoctype']>
): PostHTMLTreeLike {
    const doctypePattern = moduleOptions === 'html5' ? rHtml5Doctype : rDoctype;

    tree.forEach((node, index) => {
        if (typeof node !== 'string') {
            return;
        }

        if (doctypePattern.test(node) && node !== shortDoctype) {
            tree[index] = shortDoctype;
        }
    });

    return tree;
}

const mod: HtmlnanoModule<NonNullable<HtmlnanoOptions['normalizeDoctype']>> = {
    default: normalizeDoctype
};

export default mod;
