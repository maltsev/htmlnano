import { extractCssFromStyleNode, isCssStyleType, isStyleNode, optionalImport, stripCssCdata, wrapCssCdata } from '../helpers';
import type {} from 'postcss';
import type { HtmlnanoModule } from '../types';
import type PostHTML from 'posthtml';
import type { Options as CssnanoOptions } from 'cssnano';

const postcssOptions = {
    // Prevent the following warning from being shown:
    // > Without `from` option PostCSS could generate wrong source map and will not find Browserslist config.
    // > Set it to CSS file path or to `undefined` to prevent this warning.
    from: undefined
};

type CssProcessor = {
    process: (css: string, options: typeof postcssOptions) => Promise<{
        css: string;
        toString(): string;
    }>;
};

/** Minify CSS with cssnano */
const mod: HtmlnanoModule<CssnanoOptions> = {
    async default(tree, _, cssnanoOptions) {
        const cssnano = await optionalImport<typeof import('cssnano')>('cssnano');
        const postcss = await optionalImport<typeof import('postcss').default>('postcss');

        if (!cssnano || !postcss) {
            return tree;
        }

        const processor = postcss([cssnano(cssnanoOptions)]);
        const minifiedCssCache = new Map<string, Promise<string>>();
        const promises: Promise<void>[] = [];

        let p: Promise<void> | undefined;

        tree.walk((node) => {
        // Skip SRI, reasons are documented in "minifyJs" module
            if (node.attrs && 'integrity' in node.attrs) {
                return node;
            }

            if (isStyleNode(node) && isCssStyleType(node)) {
                p = processStyleNode(node, processor, minifiedCssCache);
                if (p) {
                    promises.push(p);
                }
            } else if (node.attrs && node.attrs.style) {
                p = processStyleAttr(node, processor, minifiedCssCache);
                if (p) {
                    promises.push(p);
                }
            }

            return node;
        });

        return Promise.all(promises).then(() => tree);
    }
};

export default mod;

function processStyleNode(
    styleNode: PostHTML.Node,
    processor: CssProcessor,
    minifiedCssCache: Map<string, Promise<string>>
) {
    let css = extractCssFromStyleNode(styleNode);
    if (!css || css.trim() === '') return;

    // Improve performance by avoiding calling stripCssCdata again and again
    const { strippedCss, isCdataWrapped } = stripCssCdata(css);
    css = strippedCss;

    return processCss(
        processor,
        minifiedCssCache,
        `${isCdataWrapped ? 'style-cdata:' : 'style:'}${css}`,
        css,
        isCdataWrapped
    ).then((minifiedCss) => {
        styleNode.content = [wrapCssCdata(minifiedCss, isCdataWrapped)];
    });
}

function processStyleAttr(
    node: PostHTML.Node,
    processor: CssProcessor,
    minifiedCssCache: Map<string, Promise<string>>
) {
    // CSS "color: red;" is invalid. Therefore it should be wrapped inside some selector:
    // a{color: red;}
    const wrapperStart = 'a{';
    const wrapperEnd = '}';

    if (!node.attrs || !node.attrs.style || typeof node.attrs.style !== 'string') {
        return;
    }

    if (node.attrs.style.trim() === '') {
        return;
    }

    const wrappedStyle = wrapperStart + (node.attrs.style || '') + wrapperEnd;

    return processCss(
        processor,
        minifiedCssCache,
        `attr:${wrappedStyle}`,
        wrappedStyle
    ).then((minifiedCss) => {
        // Remove wrapperStart at the start and wrapperEnd at the end of minifiedCss
        node.attrs!.style = minifiedCss.substring(
            wrapperStart.length,
            minifiedCss.length - wrapperEnd.length
        );
    });
}

function processCss(
    processor: CssProcessor,
    minifiedCssCache: Map<string, Promise<string>>,
    cacheKey: string,
    css: string,
    useToString = false
) {
    let minifiedCss = minifiedCssCache.get(cacheKey);
    if (!minifiedCss) {
        minifiedCss = processor.process(css, postcssOptions)
            .then(result => useToString ? result.toString() : result.css)
            .catch((error) => {
                minifiedCssCache.delete(cacheKey);
                throw error;
            });
        minifiedCssCache.set(cacheKey, minifiedCss);
    }

    return minifiedCss;
}
