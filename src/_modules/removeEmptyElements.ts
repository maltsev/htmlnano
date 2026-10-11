import type PostHTML from 'posthtml';
import { getTagName, isComment, isConditionalComment } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import { escapeTextBoundary } from './helpers/escapeTextBoundary';

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

// PostHTML can parse apparent child elements inside browser text-only content.
// Noscript must preserve its literal content when scripting is enabled, too.
const textElements = new Set([
    'script', 'style', 'textarea', 'title', 'xmp', 'iframe',
    'noembed', 'noframes', 'noscript'
]);

// Empty SVG and MathML nodes can draw shapes or hold an operand position.
// Their content does not follow HTML's rules for removable empty elements.
const foreignContentElements = new Set(['svg', 'math']);

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
 * `<audio>`/`<video>`/`<object>` by an external resource, `<slot>` by the light DOM
 * projected into it.
 */
const meaningfulWhenEmptyElements = new Set([
    'audio',
    'canvas',
    'caption',
    'colgroup',
    'iframe',
    'object',
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

function isEmptyContent(content: PostHTML.Node['content'], ignoreComments: boolean) {
    if (!content) {
        return true;
    }

    const contentArray = Array.isArray(content) ? content : [content];
    if (contentArray.length === 0) {
        return true;
    }

    return contentArray.every(child => typeof child === 'string'
        && (child === '' || ignoreComments && isComment(child) && !isConditionalComment(child.toLowerCase())));
}

function shouldRemoveNode(node: PostHTML.Node, options: NormalizedOptions) {
    const tag = getTagName(node);
    if (!tag) {
        return false;
    }

    if (voidElements.has(tag) || meaningfulWhenEmptyElements.has(tag)) {
        return false;
    }

    // External scripts execute even with no inline content, in every mode.
    if (tag === 'script' && Object.keys(node.attrs || {}).some(attribute => attribute.toLowerCase() === 'src')) {
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

    return isEmptyContent(node.content, !textElements.has(tag));
}

function pruneNodes(nodes: PostHTMLNodeLike[], options: NormalizedOptions, state: { inPlaintext: boolean }) {
    const result: PostHTMLNodeLike[] = [];
    let removedElement = false;

    for (const node of nodes) {
        if (state.inPlaintext) {
            result.push(node);
            continue;
        }

        if (typeof node === 'string') {
            const previous = result[result.length - 1];
            if (removedElement && typeof previous === 'string') {
                result[result.length - 1] = escapeTextBoundary(previous);
            }
            removedElement = false;
            result.push(node);
            continue;
        }

        const tag = getTagName(node);
        if (tag === 'plaintext' || foreignContentElements.has(tag)) {
            // Plaintext consumes everything to EOF, including apparent closing
            // tags and ancestor siblings in PostHTML's tree.
            if (tag === 'plaintext') state.inPlaintext = true;
            removedElement = false;
            result.push(node);
            continue;
        }

        if (node.content && !textElements.has(tag)) {
            const contentArray = Array.isArray(node.content) ? node.content : [node.content];
            node.content = pruneNodes(contentArray, options, state);
        }

        if (shouldRemoveNode(node, options)) {
            removedElement = true;
            continue;
        }

        removedElement = false;
        result.push(node);
    }

    return result;
}

const mod: HtmlnanoModule<RemoveEmptyElementsConfig> = {
    default(tree, _options, moduleOptions) {
        const normalizedOptions = normalizeOptions(moduleOptions);
        const pruned = pruneNodes(tree, normalizedOptions, { inPlaintext: false });
        tree.splice(0, tree.length, ...pruned);
        return tree;
    }
};

export default mod;
