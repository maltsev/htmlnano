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
 * Attributes that only affect how an element looks, never what it means:
 * an element carrying nothing but those is safe to drop as far as scripts,
 * assistive technologies and forms are concerned — it can only be missed
 * visually. `aria-hidden` belongs here because an element hidden from the
 * accessibility tree contributes nothing to it once it's empty.
 */
const presentationalAttributes = ['class', 'style', 'aria-hidden'];

/**
 * Elements that keep doing their job while empty, so they must survive even
 * when all they carry are presentational attributes: `<canvas>` is painted by
 * scripts, `<slot>` projects light DOM into a shadow tree, `<iframe>` renders a
 * nested document. Custom elements (any tag with a dash) are excluded as well —
 * they build their own content once the element definition is upgraded.
 */
const nonEmptyWhenEmptyElements = new Set([
    'canvas',
    'iframe',
    'slot'
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
    if (voidElements.has(tag)) {
        return false;
    }

    const { removeWithAttributes } = options;
    if (Array.isArray(removeWithAttributes)) {
        if (nonEmptyWhenEmptyElements.has(tag) || isCustomElement(tag)) {
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
