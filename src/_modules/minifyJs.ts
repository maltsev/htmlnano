import type PostHTML from 'posthtml';
import { extractTextContentFromNode, isEventHandler, normalizeMimeType, optionalImport } from '../helpers';
import type { HtmlnanoModule, PostHTMLTreeLike } from '../types';
import { redundantScriptTypes } from './removeRedundantAttributes.js';

import type { MinifyOptions } from 'terser';

/** Minify JS with Terser */
const mod: HtmlnanoModule<MinifyOptions> = {
    async default(tree, _, terserOptions) {
        const terser = await optionalImport<typeof import('terser')>('terser');

        if (!terser) return tree;

        const promises: Promise<void>[] = [];

        let p: Promise<void> | undefined;

        tree.walk((node) => {
            const nodeAttrs = node.attrs || {};

            /**
         * Skip SRI
         *
         * If the input <script /> has an SRI attribute, it means that the original <script /> could be trusted,
         * and should not be altered anymore.
         *
         * htmlnano is exactly an MITM that SRI is designed to protect from. If htmlnano or its dependencies get
         * compromised and introduces malicious code, then it is up to the original SRI to protect the end user.
         *
         * So htmlnano will simply skip <script /> that has SRI.
         * If developers do trust htmlnano, they should generate SRI after htmlnano modify the <script />.
         */
            if ('integrity' in nodeAttrs) {
                return node;
            }

            if (node.tag && node.tag === 'script') {
                const rawMimeType = typeof nodeAttrs.type === 'string' ? normalizeMimeType(nodeAttrs.type) : undefined;
                const mimeType = rawMimeType || 'text/javascript';
                if (redundantScriptTypes.has(mimeType) || mimeType === 'module') {
                    const scriptTerserOptions = resolveScriptTerserOptions(terserOptions, mimeType);
                    p = processScriptNode(node, scriptTerserOptions, terser);
                    if (p) {
                        promises.push(p);
                    }
                }
            }

            if (node.attrs) {
                promises.push(...processNodeWithOnAttrs(node, terserOptions, terser));
            }

            return node;
        });

        return Promise.all(promises).then(() => {
            applySmartQuoteOptions(tree);
            return tree;
        });
    }
};

export default mod;

function stripCdata(js: string) {
    const leftStrippedJs = js.replace(/\/\/\s*<!\[CDATA\[/, '').replace(/\/\*\s*<!\[CDATA\[\s*\*\//, '');
    if (leftStrippedJs === js) {
        return js;
    }

    const strippedJs = leftStrippedJs.replace(/\/\/\s*\]\]>/, '').replace(/\/\*\s*\]\]>\s*\*\//, '');
    return leftStrippedJs === strippedJs ? js : strippedJs;
}

function resolveScriptTerserOptions(terserOptions: MinifyOptions, mimeType: string) {
    if (mimeType !== 'module' || terserOptions.module !== undefined) {
        return terserOptions;
    }

    return {
        ...terserOptions,
        module: true,
        toplevel: terserOptions.toplevel ?? false,
        compress: terserOptions.compress ?? false,
        mangle: terserOptions.mangle ?? false
    };
}

function resolveOnAttrTerserOptions(terserOptions: MinifyOptions) {
    const output = terserOptions.output;
    const format = terserOptions.format;

    const outputHasQuoteStyle = !!(output && typeof output === 'object' && 'quote_style' in output);
    const formatHasQuoteStyle = !!(format && typeof format === 'object' && 'quote_style' in format);

    if (outputHasQuoteStyle || formatHasQuoteStyle) {
        return terserOptions;
    }

    const resolved: MinifyOptions = { ...terserOptions };

    if (format && typeof format === 'object') {
        resolved.format = { ...format, ['quote_style']: 3 };
    }

    if (output && typeof output === 'object') {
        resolved.output = { ...output, ['quote_style']: 3 };
    }

    if (!format && !output) {
        resolved.output = { ['quote_style']: 3 };
    }

    return resolved;
}

function applySmartQuoteOptions(tree: PostHTMLTreeLike) {
    const quoteState = analyzeTreeQuotes(tree);
    if (!quoteState.needsSmartQuotes || quoteState.hasMixedQuotes) {
        return;
    }

    tree.options ??= {};
    tree.options.quoteStyle ??= 0;
    tree.options.replaceQuote ??= false;
}

function analyzeTreeQuotes(tree: PostHTMLTreeLike) {
    let needsSmartQuotes = false;
    let hasMixedQuotes = false;

    tree.walk((node) => {
        if (!node || !node.attrs) {
            return node;
        }

        for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            if (typeof attrValue !== 'string') {
                continue;
            }

            const hasDoubleQuote = attrValue.includes('"');
            const hasSingleQuote = attrValue.includes('\'');

            if (hasDoubleQuote && isEventHandler(attrName)) {
                needsSmartQuotes = true;
            }

            if (hasDoubleQuote && hasSingleQuote) {
                hasMixedQuotes = true;
            }

            if (needsSmartQuotes && hasMixedQuotes) {
                return node;
            }
        }

        return node;
    });

    return {
        needsSmartQuotes,
        hasMixedQuotes
    };
}

function processScriptNode(
    scriptNode: PostHTML.Node,
    terserOptions: MinifyOptions,
    terser: typeof import('terser')
) {
    let js = extractTextContentFromNode(scriptNode).trim();
    if (!js.length) {
        return;
    }

    // Improve performance by avoiding calling stripCdata again and again
    let isCdataWrapped = false;
    if (js.includes('CDATA')) {
        const strippedJs = stripCdata(js);
        isCdataWrapped = js !== strippedJs;
        js = strippedJs;
    }

    return terser.minify(js, terserOptions)
        .then((result) => {
            if ('error' in result) {
                throw new Error(result.error as string);
            }

            if (result.code === undefined) {
                return;
            }

            let content = result.code;
            if (isCdataWrapped) {
                content = '/*<![CDATA[*/' + content + '/*]]>*/';
            }

            scriptNode.content = [content];
        });
}

function processNodeWithOnAttrs(
    node: PostHTML.Node,
    terserOptions: MinifyOptions,
    terser: typeof import('terser')
) {
    const jsWrapperStart = 'a=function(){';
    const jsWrapperEnd = '};a();';

    const onAttrTerserOptions = resolveOnAttrTerserOptions(terserOptions);

    const promises: Promise<void>[] = [];
    if (!node.attrs) {
        return promises;
    }

    for (const attrName in node.attrs) {
        if (!isEventHandler(attrName)) {
            continue;
        }

        const attrValue = node.attrs[attrName];
        if (typeof attrValue !== 'string') {
            continue;
        }

        // For example onclick="return false" is valid,
        // but "return false;" is invalid (error: 'return' outside of function)
        // Therefore the attribute's code should be wrapped inside function:
        // "function _(){return false;}"
        const wrappedJs = jsWrapperStart + node.attrs[attrName] + jsWrapperEnd;
        const promise = terser.minify(wrappedJs, onAttrTerserOptions)
            .then(({ code }) => {
                if (code) {
                    const minifiedJs = code.substring(
                        jsWrapperStart.length,
                        code.length - jsWrapperEnd.length
                    );
                    node.attrs![attrName] = minifiedJs;
                }
            })
            .catch((error: unknown) => {
                // Skip invalid inline handler code and preserve the original value.
                if (isTerserParseError(error)) {
                    return;
                }

                throw error;
            });
        promises.push(promise);
    }

    return promises;
}

function isTerserParseError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    return error.name === 'SyntaxError' || error.message.includes('JS_Parse_Error');
}
