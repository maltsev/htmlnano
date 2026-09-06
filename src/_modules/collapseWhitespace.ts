import type PostHTML from 'posthtml';
import { isComment } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLNodeLike, PostHTMLTreeLike } from '../types';

const noWhitespaceCollapseElements = new Set([
    'script',
    'style',
    'pre',
    'textarea',
    'template'
]);

const noTrimWhitespacesArroundElements = new Set([
    // non-empty tags that will maintain whitespace around them
    'a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'button', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i', 'ins', 'kbd', 'label', 'mark', 'math', 'nobr', 'object', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'svg', 'textarea', 'time', 'tt', 'u', 'var',
    // self-closing tags that will maintain whitespace around them
    'comment', 'img', 'input', 'wbr'
]);

const noTrimWhitespacesInsideElements = new Set([
    // non-empty tags that will maintain whitespace within them
    'a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i', 'ins', 'kbd', 'label', 'mark', 'nobr', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'time', 'tt', 'u', 'var'
]);

/*
 * Matches an inline `white-space` declaration whose value preserves whitespace.
 * The property name is anchored with (^|;|\s) so that e.g. `white-space-collapse`
 * is NOT matched. `pre-line` collapses spaces but preserves newlines; we treat it
 * as fully protected here as the conservative choice (keep whitespace we could have
 * collapsed rather than risk breaking layout).
 */
const whitespacePreservingStylePattern = /(?:^|;|\s)white-space\s*:\s*(?:pre|pre-wrap|pre-line|break-spaces)/i;

const startsWithWhitespacePattern = /^\s/;
const endsWithWhitespacePattern = /\s$/;
// See https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace and https://infra.spec.whatwg.org/#ascii-whitespace
const multipleWhitespacePattern = /[\t\n\f\r ]+/g;
const NONE = '';
const SINGLE_SPACE = ' ';
const validOptions = ['all', 'aggressive', 'conservative'];

type CollapseType = 'all' | 'aggressive' | 'conservative';
interface ParentInfo {
    node: PostHTML.Node;
    prevNode: PostHTML.Node | string | undefined;
    nextNode: PostHTML.Node | string | undefined;
    /**
     * 'all' only: whether whitespace at the very start / end of this node's
     * content is rendered as a space separating two pieces of inline content.
     * `undefined` at the top level, where there is no parent element.
     */
    spaceBefore?: boolean;
    spaceAfter?: boolean;
}

/** Collapses redundant whitespaces */
function collapseWhitespace(tree: PostHTMLTreeLike, options: HtmlnanoOptions, collapseType: CollapseType, parent?: ParentInfo): PostHTMLTreeLike;
function collapseWhitespace(tree: Array<PostHTML.Node | string>, options: HtmlnanoOptions, collapseType: CollapseType, parent?: ParentInfo): Array<PostHTML.Node | string>;
function collapseWhitespace(tree: PostHTMLTreeLike | Array<PostHTML.Node | string>, options: HtmlnanoOptions, collapseType: CollapseType, parent?: ParentInfo) {
    collapseType = validOptions.includes(collapseType) ? collapseType : 'conservative';
    tree.forEach((node, index) => {
        const prevNode = tree[index - 1];
        const nextNode = tree[index + 1];

        if (typeof node === 'string') {
            if (collapseType === 'all') {
                node = collapseAllWhitespaces(node, tree, index, parent);
            } else {
                const parentNodeTag = parent?.node.tag;
                const isTopLevel = parentNodeTag == null || parentNodeTag === 'html' || parentNodeTag === 'head';
                const shouldTrim = (
                    isTopLevel
                    /*
                     * When collapseType is set to 'aggressive', and the tag is not inside 'noTrimWhitespacesInsideElements'.
                     * the first & last space inside the tag will be trimmed
                     */
                    || collapseType === 'aggressive'
                );

                node = collapseRedundantWhitespaces(node, collapseType, shouldTrim, parent, prevNode, nextNode);
            }
        } else if (node.tag) {
            const isAllowCollapseWhitespace = !noWhitespaceCollapseElements.has(node.tag)
                && !hasWhitespacePreservingStyle(node);
            if (isAllowCollapseWhitespace && node.content?.length) {
                /*
                 * Whitespace at the edges of an element's content is only rendered
                 * when the element itself is inline: a block box drops it. So the
                 * boundaries the children inherit are the element's own ones,
                 * closed off as soon as a non-inline element is reached.
                 */
                const isInlineContent = collapseType === 'all' && noTrimWhitespacesInsideElements.has(node.tag);

                node.content = collapseWhitespace(node.content, options, collapseType, {
                    node,
                    prevNode,
                    nextNode,
                    spaceBefore: isInlineContent && isRenderedSpaceBefore(tree, index, parent),
                    spaceAfter: isInlineContent && isRenderedSpaceAfter(tree, index, parent)
                });
            }
        }
        tree[index] = node;
    });

    return tree;
}

function collapseRedundantWhitespaces(
    text: string, collapseType: CollapseType, shouldTrim = false, parent: ParentInfo | undefined,
    prevNode: PostHTML.Node | string, nextNode: PostHTML.Node | string
) {
    if (!text || text.length === 0) {
        return NONE;
    }

    if (!isComment(text)) {
        text = text.replace(multipleWhitespacePattern, SINGLE_SPACE);
    }

    if (shouldTrim) {
        // top level, trim all ('all' is handled by collapseAllWhitespaces)
        if (collapseType === 'conservative') {
            return text.trim();
        }

        if (
            collapseType === 'aggressive'
            && text.trim().length === 0
            && (isTrimmableAroundNode(prevNode) || prevNode == null)
            && (isTrimmableAroundNode(nextNode) || nextNode == null)
            && !(isCommentNode(prevNode) && isCommentNode(nextNode))
        ) {
            return NONE;
        }

        if (
            typeof parent !== 'object'
            || !parent?.node.tag
            || !noTrimWhitespacesInsideElements.has(parent.node.tag)
        ) {
            if (
                // It is the first child node of the parent
                !prevNode
                // It is not the first child node, and prevNode not a text node, and prevNode is safe to trim around
                || (
                    typeof prevNode === 'object' && prevNode.tag && !noTrimWhitespacesArroundElements.has(prevNode.tag))
            ) {
                text = text.trimStart();
            } else {
                // previous node is a "no trim whitespaces arround element"
                if (
                // but previous node ends with a whitespace
                    typeof prevNode === 'object' && prevNode.content
                ) {
                    const prevNodeLastContent = prevNode.content[prevNode.content.length - 1];
                    if (
                        typeof prevNodeLastContent === 'string'
                        && endsWithWhitespacePattern.test(prevNodeLastContent)
                        && (
                            !nextNode // either the current node is the last child of the parent
                            || (
                            // or the next node starts with a white space
                                typeof nextNode === 'object' && nextNode.content && typeof nextNode.content[0] === 'string'
                                && !startsWithWhitespacePattern.test(nextNode.content[0])
                            )
                        )
                    ) {
                        text = text.trimStart();
                    }
                }
            }
            if (
                !nextNode
                || typeof nextNode === 'object' && nextNode.tag && !noTrimWhitespacesArroundElements.has(nextNode.tag)
            ) {
                text = text.trimEnd();
            }
        } else {
            // now it is a textNode inside a "no trim whitespaces inside elements" node
            if (
                !prevNode // it the textnode is the first child of the node
                && startsWithWhitespacePattern.test(text[0]) // it starts with white space
                && typeof parent?.prevNode === 'string' // the prev of the node is a textNode as well
                && endsWithWhitespacePattern.test(parent.prevNode[parent.prevNode.length - 1] ?? '') // that prev is ends with a white
            ) {
                text = text.trimStart();
            }
        }
    }

    return text;
}

/**
 * 'all' trims every text node, which is only lossless where the trimmed
 * whitespace isn't rendered. Between two pieces of inline content a whitespace
 * *is* rendered — it is what keeps the words apart — so exactly one space is
 * kept there, and nowhere else.
 */
function collapseAllWhitespaces(text: string, tree: ArrayLike<PostHTMLNodeLike>, index: number, parent: ParentInfo | undefined) {
    if (!text) {
        return NONE;
    }

    if (isComment(text)) {
        return text;
    }

    text = text.replace(multipleWhitespacePattern, SINGLE_SPACE);

    const keepSpaceBefore = startsWithWhitespacePattern.test(text) && isRenderedSpaceBefore(tree, index, parent);
    const keepSpaceAfter = endsWithWhitespacePattern.test(text) && isRenderedSpaceAfter(tree, index, parent);

    const trimmedText = text.trim();
    if (!trimmedText) {
        // A whitespace-only node is the separator itself, so one space is enough
        return keepSpaceBefore && keepSpaceAfter ? SINGLE_SPACE : NONE;
    }

    return (keepSpaceBefore ? SINGLE_SPACE : NONE) + trimmedText + (keepSpaceAfter ? SINGLE_SPACE : NONE);
}

/**
 * Whether a whitespace right before `tree[index]` would be rendered as a space
 * separating it from what comes before, i.e. whether inline content ends there.
 *
 * Comments render nothing, so they are looked through. A preceding text node
 * that already ends with a whitespace brings its own separator, and once the
 * siblings run out the answer is the one the parent element inherited.
 */
function isRenderedSpaceBefore(tree: ArrayLike<PostHTMLNodeLike>, index: number, parent: ParentInfo | undefined) {
    for (let i = index - 1; i >= 0; i--) {
        const sibling = tree[i];

        if (typeof sibling === 'string') {
            if (sibling === NONE || isComment(sibling)) continue;
            return !endsWithWhitespacePattern.test(sibling);
        }

        return isInlineNode(sibling) && !endsWithRenderedWhitespace(sibling);
    }

    return parent?.spaceBefore ?? false;
}

/**
 * Whether the last thing `node` renders is a whitespace, which then already
 * separates it from whatever follows: CSS collapses whitespace across an inline
 * boundary, so `<b>a </b><i> b</i>` renders like `<b>a </b><i>b</i>`.
 *
 * Only safe to ask about a node that has already been collapsed, which is why
 * `isRenderedSpaceAfter` has no mirror of this: the siblings after the current
 * index still carry their original whitespace. Elements whose content is not
 * collapsed at all (`<pre>`, `<textarea>`, an inline `white-space: pre`) answer
 * `false`, since a trailing space of theirs is their own text rather than a
 * separator.
 */
function endsWithRenderedWhitespace(node: PostHTML.Node): boolean {
    if (typeof node.tag === 'string' && noWhitespaceCollapseElements.has(node.tag)) {
        return false;
    }

    if (hasWhitespacePreservingStyle(node) || !node.content) {
        return false;
    }

    for (let i = node.content.length - 1; i >= 0; i--) {
        const child = node.content[i];

        if (typeof child === 'string') {
            if (child === NONE || isComment(child)) continue;
            return endsWithWhitespacePattern.test(child);
        }

        return endsWithRenderedWhitespace(child);
    }

    return false;
}

/**
 * The mirror image of `isRenderedSpaceBefore`. The nodes after `tree[index]`
 * haven't been collapsed yet: when the next one is a text node that starts with
 * a whitespace, it keeps that separator itself, so this one doesn't have to.
 */
function isRenderedSpaceAfter(tree: ArrayLike<PostHTMLNodeLike>, index: number, parent: ParentInfo | undefined) {
    for (let i = index + 1; i < tree.length; i++) {
        const sibling = tree[i];

        if (typeof sibling === 'string') {
            if (sibling === NONE || isComment(sibling)) continue;
            return !startsWithWhitespacePattern.test(sibling);
        }

        return isInlineNode(sibling);
    }

    return parent?.spaceAfter ?? false;
}

/*
 * A node another plugin left without a tag (posthtml-include builds those)
 * renders as its content only, whatever that content is, so it is treated as
 * inline content — keeping a space that isn't needed is the harmless mistake.
 */
function isInlineNode(node: PostHTML.Node) {
    if (typeof node.tag !== 'string') return true;
    return noTrimWhitespacesArroundElements.has(node.tag);
}

/*
 * Returns true when the node carries an inline `style` attribute that preserves
 * whitespace (white-space: pre / pre-wrap / pre-line / break-spaces). Such nodes,
 * together with their whole subtree, are treated like <pre> and skipped, because
 * the recursion into `node.content` is what collapses descendant whitespace.
 */
function hasWhitespacePreservingStyle(node: PostHTML.Node) {
    const style = node.attrs?.style;
    return typeof style === 'string' && whitespacePreservingStylePattern.test(style);
}

function isTrimmableAroundNode(node: PostHTML.Node | string | undefined) {
    if (!node) return true;
    if (typeof node === 'string') return isComment(node);
    return typeof node.tag === 'string' && !noTrimWhitespacesArroundElements.has(node.tag);
}

function isCommentNode(node: PostHTML.Node | string | undefined) {
    return typeof node === 'string' && isComment(node);
}

const mod: HtmlnanoModule<CollapseType> = {
    default: collapseWhitespace
};

export default mod;
