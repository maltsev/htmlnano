import type PostHTML from 'posthtml';
import { decodeHTMLAttribute } from 'entities';
import { extractTextContentFromNode, isEventHandler, optionalImport } from '../helpers';
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
            const nodeAttrs = normalizeScriptAttrs(node.attrs || {}, tree.options?.decodeEntities === true);

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

            if (node.tag?.toLowerCase() === 'script' && !('src' in nodeAttrs)) {
                const mimeType = getScriptType(nodeAttrs);
                if (redundantScriptTypes.has(mimeType) || mimeType === 'module') {
                    const scriptTerserOptions = resolveScriptTerserOptions(terserOptions, mimeType);
                    p = processScriptNode(node, scriptTerserOptions, terser);
                    if (p) {
                        promises.push(p);
                    }
                }
            }

            if (node.attrs) {
                promises.push(...processNodeWithOnAttrs(node, terserOptions, terser, tree.options?.decodeEntities === true));
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

function normalizeScriptAttrs(attrs: PostHTML.NodeAttributes, decoded: boolean) {
    const normalized = Object.create(null) as PostHTML.NodeAttributes;
    for (const [name, value] of Object.entries(attrs)) {
        const normalizedName = name.toLowerCase();
        if (!(normalizedName in normalized)) {
            normalized[normalizedName] = typeof value === 'string' && !decoded ? decodeHTMLAttribute(value) : value;
        }
    }
    return normalized;
}

function getScriptType(attrs: PostHTML.NodeAttributes) {
    if ('type' in attrs) {
        const type = typeof attrs.type === 'string' ? attrs.type : '';
        return type === '' ? 'text/javascript' : type.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase();
    }
    return attrs.language ? `text/${attrs.language}`.toLowerCase() : 'text/javascript';
}

function stripCdata(js: string) {
    // Recognize only boundary comments, never markers inside strings or
    // template literals. Line wrappers must end at the line boundary.
    const leftStrippedJs = js.replace(/^\/\/[\t ]*<!\[CDATA\[[\t ]*(?:\r\n?|\n)/, '').replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, '');
    if (leftStrippedJs === js) {
        return js;
    }

    const strippedJs = leftStrippedJs.replace(/(?:^|[\r\n])[\t ]*\/\/[\t ]*\]\]>$/, '').replace(/\/\*\s*\]\]>\s*\*\/$/, '');
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

    // Handler bodies have implicit parameters (event, arguments, and the
    // window.onerror parameters). Treating their declarations as ordinary
    // function locals can rename them or fold them to undefined.
    const resolved: MinifyOptions = {
        ...terserOptions,
        module: false,
        toplevel: false,
        enclose: false,
        parse: { ...terserOptions.parse, ['bare_returns']: true, shebang: false },
        compress: terserOptions.compress === false
            ? false
            : {
                    ...(typeof terserOptions.compress === 'object' ? terserOptions.compress : {}),
                    module: false,
                    toplevel: false
                },
        mangle: terserOptions.mangle === false
            ? false
            : {
                    ...(typeof terserOptions.mangle === 'object' ? terserOptions.mangle : {}),
                    module: false,
                    toplevel: false
                }
    };

    if (outputHasQuoteStyle || formatHasQuoteStyle) {
        return resolved;
    }

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

            if (hasDoubleQuote && isEventHandler(attrName, node.tag || undefined)) {
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

function processScriptNode(scriptNode: PostHTML.Node, terserOptions: MinifyOptions, terser: typeof import('terser')) {
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

    return terser
        .minify(js, terserOptions)
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

function processNodeWithOnAttrs(node: PostHTML.Node, terserOptions: MinifyOptions, terser: typeof import('terser'), decoded = false) {
    const onAttrTerserOptions = resolveOnAttrTerserOptions(terserOptions);

    const promises: Promise<void>[] = [];
    if (!node.attrs) {
        return promises;
    }

    for (const attrName in node.attrs) {
        if (!isEventHandler(attrName, node.tag || undefined)) {
            continue;
        }

        const attrValue = node.attrs[attrName];
        if (typeof attrValue !== 'string') {
            continue;
        }

        const js = decoded ? attrValue : decodeHTMLAttribute(attrValue);
        const promise = terser
            .minify(js, onAttrTerserOptions)
            .then(({ code }) => {
                if (code !== undefined) {
                    // Encode ampersands so newly printed character references
                    // cannot become quotes or executable code in the browser.
                    node.attrs![attrName] = code.replace(/&/g, '&amp;');
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
