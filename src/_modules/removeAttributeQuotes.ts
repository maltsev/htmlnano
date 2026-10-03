// Specification: https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
// See also: https://github.com/posthtml/posthtml-render/pull/30
// See also: https://github.com/maltsev/htmlnano/issues/6#issuecomment-707105334

import type { HtmlnanoModule } from '../types';

type RemoveAttributeQuotesOptions = {
    force?: boolean;
};

/** Disable quoteAllAttributes while not overriding the configuration */
const mod: HtmlnanoModule<RemoveAttributeQuotesOptions> = {
    default: function removeAttributeQuotes(tree, _options, moduleOptions) {
        // XML requires quoted values, including empty ones. `force` only
        // overrides HTML rendering preferences, not the document syntax.
        if (tree.options?.xmlMode) return tree;

        tree.options ??= {};

        if (moduleOptions && typeof moduleOptions === 'object' && moduleOptions.force) {
            tree.options.quoteAllAttributes = false;
            return tree;
        }

        tree.options.quoteAllAttributes ??= false;

        return tree;
    }
};

export default mod;
