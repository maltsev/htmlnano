// Specification: https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
// See also: https://github.com/posthtml/posthtml-render/pull/30
// See also: https://github.com/maltsev/htmlnano/issues/6#issuecomment-707105334

import type { HtmlnanoModule } from '../types';
import { canRenderApostrophe } from './helpers/attributeQuoting.js';

type RemoveAttributeQuotesOptions = {
    force?: boolean;
};

/** Remove optional HTML quotes and escape delimiters in required quoted values. */
const mod: HtmlnanoModule<RemoveAttributeQuotesOptions> = {
    default: function removeAttributeQuotes(tree, _options, moduleOptions) {
        // XML requires quoted values, including empty ones. `force` only
        // overrides HTML rendering preferences, not the document syntax.
        if (tree.options?.xmlMode) return tree;

        tree.options ??= {};

        if (moduleOptions && typeof moduleOptions === 'object' && moduleOptions.force) {
            tree.options.quoteAllAttributes = false;
        } else {
            tree.options.quoteAllAttributes ??= false;
        }

        const quoting = tree.options;
        tree.walk((node) => {
            if (!node.attrs) return node;

            for (const [name, value] of Object.entries(node.attrs)) {
                if (typeof value !== 'string') continue;
                let escaped = value;

                // The renderer escapes double quotes by default, but never
                // apostrophes in single-quoted values (including JSON).
                if (value.includes('\'') && !canRenderApostrophe(value, quoting)) {
                    escaped = escaped.replace(/'/g, '&#39;');
                }
                if (quoting.replaceQuote === false && quoting.quoteStyle !== 0 && quoting.quoteStyle !== 1) {
                    escaped = escaped.replace(/"/g, '&quot;');
                }
                node.attrs[name] = escaped;
            }
            return node;
        });

        return tree;
    }
};

export default mod;
