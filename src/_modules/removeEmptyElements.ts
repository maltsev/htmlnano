import type PostHTML from 'posthtml';
import { isComment } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';

export type RemoveWithAttributesOption = boolean | 'presentational' | string[];

export interface RemoveEmptyElementsOptions {
    removeWithAttributes?: RemoveWithAttributesOption;
}

type RemoveEmptyElementsConfig = boolean | RemoveEmptyElementsOptions;

/**
 * `removeWithAttributes` after `presentational` has been expanded into the
 * attribute list it stands for: either "keep every element with attributes"
 * (`false`), "remove them all" (`true`), or "remove those whose attributes are
 * all in this list".
 */
interface NormalizedOptions {
    removeWithAttributes: boolean | string[];
}

const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
]);

/**
 * Attributes that only affect how an element looks, never what it means: an
 * element carrying nothing but those is safe to drop as far as meaning, forms
 * and assistive technologies are concerned. `aria-hidden` belongs here because
 * an element hidden from the accessibility tree contributes nothing to it once
 * it's empty. `class` is the exception that isn't purely visual — it doubles as
 * a script and behaviour hook — which is why `interactiveElements` below is
 * held back from this mode.
 */
const presentationalAttributes = ['class', 'style', 'aria-hidden'];

/**
 * Elements that keep doing their job while empty, so they are never removed no
 * matter what `removeWithAttributes` says.
 *
 * `<td>`, `<th>` and `<tr>` hold a position in the table grid: dropping an empty
 * cell shifts every following cell of the row into the wrong column, and dropping
 * an empty row shifts the rows below it. `<caption>` and `<colgroup>` are part of
 * the same structure. `<textarea>`, `<option>` and `<select>` are form controls
 * that are submitted and scripted while empty — an empty `<textarea>` is simply
 * one the user hasn't typed into yet. The rest render or are painted by something
 * other than their markup: `<canvas>` by scripts, `<iframe>` by a nested document,
 * `<audio>`/`<video>` by the resource of their `src`, `<slot>` by the light DOM
 * projected into it.
 */
const meaningfulWhenEmptyElements = new Set([
    'audio',
    'canvas',
    'caption',
    'colgroup',
    'iframe',
    'option',
    'select',
    'slot',
    'td',
    'textarea',
    'th',
    'tr',
    'video'
]);

/**
 * Elements the user can interact with, kept whenever the caller opted into
 * removing elements that still carry attributes. Their content is often drawn
 * by CSS alone — an icon `<button class="hamburger-menu"></button>`, an
 * `<a class="icon-link"></a>` — while a script binds behaviour through that
 * very class, so removing them breaks function rather than just looks. A truly
 * bare `<a></a>` is still removable under `removeWithAttributes: true`.
 */
const interactiveElements = new Set([
    'a',
    'button',
    'details',
    'label',
    'summary'
]);

function normalizeOptions(moduleOptions: Partial<RemoveEmptyElementsConfig>): NormalizedOptions {
    if (typeof moduleOptions === 'object' && moduleOptions) {
        const { removeWithAttributes } = moduleOptions;
        if (removeWithAttributes === 'presentational') {
            return { removeWithAttributes: presentationalAttributes };
        }

        if (Array.isArray(removeWithAttributes)) {
            return { removeWithAttributes: removeWithAttributes.map(attribute => attribute.toLowerCase()) };
        }

        return {
            removeWithAttributes: removeWithAttributes === true
        };
    }

    return {
        removeWithAttributes: false
    };
}

function hasAttributes(node: PostHTML.Node) {
    return !!node.attrs && Object.keys(node.attrs).length > 0;
}

function hasOnlyAllowedAttributes(node: PostHTML.Node, allowedAttributes: string[]) {
    return Object.keys(node.attrs || {})
        .every(attribute => allowedAttributes.includes(attribute.toLowerCase()));
}

function isCustomElement(tag: string) {
    return tag.includes('-');
}

function isIgnorableText(text: string) {
    return isComment(text) || text.trim() === '';
}

function isEmptyContent(content?: PostHTML.Node['content']) {
    if (!content) {
        return true;
    }

    const contentArray = Array.isArray(content) ? content : [content];
    if (contentArray.length === 0) {
        return true;
    }

    return contentArray.every(child => typeof child === 'string' && isIgnorableText(child));
}

function shouldRemoveNode(node: PostHTML.Node, options: NormalizedOptions) {
    if (!node.tag || typeof node.tag !== 'string') {
        return false;
    }

    const tag = node.tag.toLowerCase();
    if (voidElements.has(tag) || meaningfulWhenEmptyElements.has(tag)) {
        return false;
    }

    const { removeWithAttributes } = options;
    if (Array.isArray(removeWithAttributes)) {
        if (isCustomElement(tag) || interactiveElements.has(tag)) {
            return false;
        }

        if (!hasOnlyAllowedAttributes(node, removeWithAttributes)) {
            return false;
        }
    } else if (!removeWithAttributes && hasAttributes(node)) {
        return false;
    }

    return isEmptyContent(node.content);
}

function pruneNodes(nodes: PostHTMLNodeLike[], options: NormalizedOptions) {
    const result: PostHTMLNodeLike[] = [];

    for (const node of nodes) {
        if (typeof node === 'string') {
            result.push(node);
            continue;
        }

        if (node.content) {
            const contentArray = Array.isArray(node.content) ? node.content : [node.content];
            node.content = pruneNodes(contentArray, options);
        }

        if (shouldRemoveNode(node, options)) {
            continue;
        }

        result.push(node);
    }

    return result;
}

const mod: HtmlnanoModule<RemoveEmptyElementsConfig> = {
    default(tree, _options, moduleOptions) {
        const normalizedOptions = normalizeOptions(moduleOptions);
        const pruned = pruneNodes(tree, normalizedOptions);
        tree.splice(0, tree.length, ...pruned);
        return tree;
    }
};

export default mod;
