import type PostHTML from 'posthtml';
import { isComment } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike, PostHTMLTreeLike } from '../types';

const startWithWhitespacePattern = /^\s/;

/**
 * `closeAs` is understood by posthtml-render: together with the
 * `closingSingleTag: 'closeAs'` render option it makes the renderer emit the
 * start tag and the content of a node, but no end tag. That is the only way to
 * omit an end tag on its own, since `tag = false` always drops both tags.
 */
type OptionalTagNode = PostHTML.Node & {
    optionalTagName?: string;
    closeAs?: 'default';
};

const optionalStartTags = new Set(['html', 'head', 'body', 'colgroup', 'tbody']);
const optionalEndTags = new Set([
    'html', 'head', 'body',
    'li', 'dt', 'dd', 'p', 'rt', 'rp', 'optgroup', 'option',
    'caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
]);

const bodyStartTagCantBeOmittedWithFirstChildTags = new Set(['meta', 'link', 'script', 'style', 'template']);
const tbodyStartTagCantBeOmittedWithPrecededTags = new Set(['tbody', 'thead', 'tfoot']);
const tableSectionEndTagFollowedByTags = new Set(['tbody', 'tfoot']);
const cellEndTagFollowedByTags = new Set(['td', 'th']);
const rubyEndTagFollowedByTags = new Set(['rt', 'rp']);
/*
 * The specification also lists "search" here, but the element is recent enough
 * that parsers which don't know it yet treat it as an unknown inline element and
 * keep it inside the "p" element instead of closing it. Omitting "</p>" before it
 * would change the DOM on those parsers, so "search" is deliberately left out.
 *
 * "table" is listed separately because it only closes an open "p" element in
 * no-quirks mode, see `pEndTagFollowedByTagsInNoQuirksMode`.
 */
const pEndTagFollowedByTags = new Set([
    'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
    'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
    'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'ul'
]);
const pEndTagFollowedByTagsInNoQuirksMode = new Set(['table']);
// Only the plain HTML5 doctype is guaranteed to put the document into no-quirks mode
const noQuirksDoctypePattern = /^<!doctype\s+html\s*>$/i;
const pEndTagForbiddenParentTags = new Set([
    // Listed by the specification
    'a', 'audio', 'del', 'ins', 'map', 'noscript', 'video',
    /*
     * Not listed by the specification, but "</button>" goes through the generic
     * end tag rule in widely used parsers (parse5 before v6 and everything built
     * on it, such as jsdom). There a still open "p" makes the end tag be ignored,
     * and the button keeps swallowing the markup that follows it.
     */
    'button',
    /*
     * A "p" element is not allowed content in any of these, so the parser puts it
     * somewhere else than where the source nests it and the rule below wouldn't
     * describe the resulting DOM at all.
     */
    'html', 'head', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup',
    'select', 'optgroup', 'datalist', 'frameset',
    /*
     * The specification allows it and browsers parse "</p></td></tr>" correctly,
     * but htmlparser2 — the parser htmlnano itself runs on — keeps the "p" open
     * and nests the following "tr" inside it. Omitting the end tag here would
     * make any downstream htmlparser2 based tool, including a second htmlnano
     * pass, see a different tree. This is a parser compatibility restriction,
     * not a specification one, and it costs about four bytes per affected cell.
     */
    'td', 'th',
    // Raw text elements, whose content is text rather than markup
    'iframe', 'noembed', 'noframes', 'plaintext', 'script', 'style', 'textarea', 'title', 'xmp'
]);

/**
 * Parents a "no more content in the parent element" end tag omission is allowed
 * under, following the content model of each element.
 */
const lastChildEndTagParentTags: Record<string, Set<string> | undefined> = {
    li: new Set(['ul', 'ol', 'menu']),
    dd: new Set(['dl', 'div']),
    rt: new Set(['ruby', 'rtc']),
    rp: new Set(['ruby', 'rtc']),
    optgroup: new Set(['select']),
    option: new Set(['select', 'optgroup', 'datalist']),
    tbody: new Set(['table']),
    tfoot: new Set(['table']),
    tr: new Set(['table', 'thead', 'tbody', 'tfoot']),
    td: new Set(['tr']),
    th: new Set(['tr'])
};

/**
 * The "special" element category of the HTML parser, see
 * https://html.spec.whatwg.org/multipage/parsing.html#special
 *
 * It decides what happens to an element that is still open when the end tag of
 * its parent arrives. The end tag of a special element always closes whatever is
 * below it ("generate implied end tags" / "pop until popped"), while the generic
 * "any other end tag" rule stops at — and ignores itself for — a special element,
 * and the adoption agency algorithm re-parents one out of a formatting element.
 * So dropping the end tag of a special element is only safe when its parent is
 * special too; otherwise the markup would parse into a different DOM.
 */
const htmlSpecialTags = new Set([
    'address', 'applet', 'area', 'article', 'aside', 'base', 'basefont', 'bgsound',
    'blockquote', 'body', 'br', 'button', 'caption', 'center', 'col', 'colgroup',
    'dd', 'details', 'dir', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption',
    'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'iframe', 'img', 'input',
    'keygen', 'li', 'link', 'listing', 'main', 'marquee', 'menu', 'meta', 'nav',
    'noembed', 'noframes', 'noscript', 'object', 'ol', 'p', 'param', 'plaintext',
    'pre', 'script', 'search', 'section', 'select', 'source', 'style', 'summary',
    'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title',
    'tr', 'track', 'ul', 'wbr', 'xmp'
]);

/**
 * Inside SVG and MathML the HTML end tag omission rules don't apply: foreign
 * content is parsed with XML-ish rules, so every end tag has to stay.
 */
const foreignContentTags = new Set(['svg', 'math']);

interface OmissionContext {
    /** Nodes whose end tag is not rendered anymore. */
    endTagOmittedNodes: WeakSet<PostHTML.Node>;
    /** Whether the render options allow omitting an end tag on its own. */
    canOmitEndTagAlone: boolean;
    /** Whether the document is parsed in no-quirks mode. */
    isNoQuirksMode: boolean;
    /** Set once an end tag has actually been omitted on its own. */
    usedCloseAs: boolean;
}

function isEmptyTextNode(node: PostHTMLNodeLike) {
    if (typeof node === 'string' && node.trim() === '') {
        return true;
    }

    return false;
}

function isEmptyNode(node: PostHTML.Node) {
    if (!node.content) {
        return true;
    }

    if (node.content.length) {
        return !node.content.filter(n => typeof n === 'string' && isEmptyTextNode(n) ? false : true).length;
    }

    return true;
}

/** Empty strings are dropped by posthtml-render, so they can't separate two nodes. */
function isRenderedNode(node: PostHTMLNodeLike | undefined) {
    if (node === undefined || node === null) return false;
    if (typeof node === 'string') return node.length > 0;
    return true;
}

function getFirstRenderedChild(node: PostHTML.Node): PostHTMLNodeLike | null {
    if (!node.content) return null;

    for (const childNode of node.content) {
        if (isRenderedNode(childNode)) return childNode;
    }

    return null;
}

function getPrevRenderedNode(nodes: PostHTMLNodeLike[], currentNodeIndex: number): PostHTMLNodeLike | null {
    for (let i = currentNodeIndex - 1; i >= 0; i--) {
        if (isRenderedNode(nodes[i])) return nodes[i];
    }

    return null;
}

function getNextRenderedNode(nodes: PostHTMLNodeLike[], currentNodeIndex: number): PostHTMLNodeLike | null {
    for (let i = currentNodeIndex + 1; i < nodes.length; i++) {
        if (isRenderedNode(nodes[i])) return nodes[i];
    }

    return null;
}

function omitTag(node: PostHTML.Node) {
    const optionalTagNode = node as OptionalTagNode;
    optionalTagNode.optionalTagName = typeof node.tag === 'string' ? node.tag : undefined;
    // @ts-expect-error -- deliberately set tag to false
    node.tag = false;
}

function getNodeTagName(node: PostHTML.Node) {
    if (node.tag) return node.tag;
    const optionalTagNode = node as OptionalTagNode;
    return optionalTagNode.optionalTagName || false;
}

function getTagNameOf(node: PostHTMLNodeLike | null) {
    if (node === null || typeof node === 'string') return false;
    return getNodeTagName(node);
}

/**
 * Whether the end tag of the last child of `parent` may be omitted at all.
 *
 * The specification phrases these rules as "if there is no more content in the
 * parent element", which assumes the element sits in a parent that is allowed to
 * contain it. Real world markup doesn't always do that (`<span><p>…</p></span>`,
 * `<p><li>…</li></p>`), and there the parser builds a DOM that doesn't match the
 * nesting of the source at all. Requiring one of the parents the content model
 * allows keeps the omission meaningful in exactly the cases the specification
 * talks about.
 */
function canOmitLastChildEndTag(tagName: string, parent: PostHTML.Node | null) {
    if (!parent) return false;

    const allowedParentTags = lastChildEndTagParentTags[tagName];
    if (!allowedParentTags) return false;

    const parentTagName = getNodeTagName(parent);
    if (typeof parentTagName !== 'string') return false;

    return allowedParentTags.has(parentTagName);
}

/**
 * A "p" element's end tag may be omitted when it is the last content of its parent,
 * unless that parent is one of the elements listed in the specification or an
 * autonomous custom element.
 */
function isParentAllowingLastChildPEndTagOmission(parent: PostHTML.Node | null) {
    if (!parent) return false;

    const parentTagName = getNodeTagName(parent);
    if (typeof parentTagName !== 'string') return false;
    // Autonomous custom elements always contain a "-" in their name
    if (parentTagName.includes('-')) return false;
    if (pEndTagForbiddenParentTags.has(parentTagName)) return false;

    /*
     * A "p" element may appear almost anywhere, so instead of a list of allowed
     * parents we require the parent's end tag to be one that actually closes the
     * still open "p": only the end tag of a special element does that. The generic
     * "any other end tag" rule ignores itself when it meets a special element like
     * "p" (`<span><p>x</span>` leaves the span open), and the adoption agency
     * algorithm re-parents it out of a formatting element (`<em><p>x</em>`).
     */
    return htmlSpecialTags.has(parentTagName);
}

/**
 * Specification: https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
 *
 * Unlike start tags, end tags may be omitted even when the element has attributes.
 * `parent` is `null` at the top level of the tree, where the parent element is
 * unknown, so the "no more content in the parent element" rules can't be applied.
 */
function canOmitEndTag(
    tagName: string,
    nextNode: PostHTMLNodeLike | null,
    parent: PostHTML.Node | null,
    context: OmissionContext
) {
    const isLastInParent = nextNode === null;
    const nextTagName = getTagNameOf(nextNode);
    const isNextComment = typeof nextNode === 'string' && isComment(nextNode);
    const isNextWhitespaceOrComment = typeof nextNode === 'string'
        && (startWithWhitespacePattern.test(nextNode) || isComment(nextNode));

    switch (tagName) {
        /** An "html" element's end tag may be omitted if it is not IMMEDIATELY followed by a comment. */
        /** A "body" element's end tag may be omitted if it is not IMMEDIATELY followed by a comment. */
        case 'html':
        case 'body':
            return !isNextComment;

        /** A "head", "caption" or "colgroup" element's end tag may be omitted if it is not IMMEDIATELY followed by ASCII whitespace or a comment. */
        case 'head':
        case 'caption':
        case 'colgroup':
            return !isNextWhitespaceOrComment;

        /** A "li" element's end tag may be omitted if it is IMMEDIATELY followed by another "li" element, or if there is no more content in the parent element. */
        case 'li':
            return nextTagName === 'li' || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** A "dt" element's end tag may be omitted if it is IMMEDIATELY followed by another "dt" element or a "dd" element. */
        case 'dt':
            return nextTagName === 'dt' || nextTagName === 'dd';

        /** A "dd" element's end tag may be omitted if it is IMMEDIATELY followed by another "dd" element or a "dt" element, or if there is no more content in the parent element. */
        case 'dd':
            return nextTagName === 'dd' || nextTagName === 'dt' || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** A "p" element's end tag may be omitted if it is IMMEDIATELY followed by one of the listed elements, or if there is no more content in a parent element that allows it. */
        case 'p':
            return (typeof nextTagName === 'string' && pEndTagFollowedByTags.has(nextTagName))
                || (context.isNoQuirksMode && typeof nextTagName === 'string' && pEndTagFollowedByTagsInNoQuirksMode.has(nextTagName))
                || (isLastInParent && isParentAllowingLastChildPEndTagOmission(parent));

        /** An "rt" or "rp" element's end tag may be omitted if it is IMMEDIATELY followed by an "rt" or "rp" element, or if there is no more content in the parent element. */
        case 'rt':
        case 'rp':
            return (typeof nextTagName === 'string' && rubyEndTagFollowedByTags.has(nextTagName))
                || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** An "optgroup" element's end tag may be omitted if it is IMMEDIATELY followed by another "optgroup" element, or if there is no more content in the parent element. */
        case 'optgroup':
            return nextTagName === 'optgroup' || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** An "option" element's end tag may be omitted if it is IMMEDIATELY followed by another "option" element or an "optgroup" element, or if there is no more content in the parent element. */
        case 'option':
            return nextTagName === 'option' || nextTagName === 'optgroup' || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** A "thead" element's end tag may be omitted if it is IMMEDIATELY followed by a "tbody" or "tfoot" element. */
        case 'thead':
            return typeof nextTagName === 'string' && tableSectionEndTagFollowedByTags.has(nextTagName);

        /** A "tbody" element's end tag may be omitted if it is IMMEDIATELY followed by a "tbody" or "tfoot" element, or if there is no more content in the parent element. */
        case 'tbody':
            return (typeof nextTagName === 'string' && tableSectionEndTagFollowedByTags.has(nextTagName))
                || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** A "tfoot" element's end tag may be omitted if there is no more content in the parent element. */
        case 'tfoot':
            return isLastInParent && canOmitLastChildEndTag(tagName, parent);

        /** A "tr" element's end tag may be omitted if it is IMMEDIATELY followed by another "tr" element, or if there is no more content in the parent element. */
        case 'tr':
            return nextTagName === 'tr' || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        /** A "td" or "th" element's end tag may be omitted if it is IMMEDIATELY followed by a "td" or "th" element, or if there is no more content in the parent element. */
        case 'td':
        case 'th':
            return (typeof nextTagName === 'string' && cellEndTagFollowedByTags.has(nextTagName))
                || (isLastInParent && canOmitLastChildEndTag(tagName, parent));

        default:
            return false;
    }
}

/**
 * Specification: https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
 *
 * A start tag may never be omitted when the element carries attributes, since
 * there would be nowhere left to put them.
 */
function canOmitStartTag(
    node: PostHTML.Node,
    tagName: string,
    prevNode: PostHTMLNodeLike | null,
    isPrevEndTagOmitted: boolean
) {
    if (node.attrs && Object.keys(node.attrs).length) return false;

    const firstChildNode = getFirstRenderedChild(node);
    const firstChildTagName = getTagNameOf(firstChildNode);
    const prevTagName = getTagNameOf(prevNode);

    switch (tagName) {
        /** An "html" element's start tag may be omitted if the first thing inside it is not a comment. */
        case 'html':
            return !(typeof firstChildNode === 'string' && isComment(firstChildNode));

        /** A "head" element's start tag may be omitted if the element is empty, or if the first thing inside it is an element. */
        case 'head':
            return isEmptyNode(node) || firstChildTagName !== false;

        /**
         * A "body" element's start tag may be omitted if the element is empty, or if the first thing inside it
         * is not ASCII whitespace or a comment, except if the first thing inside it is
         * a "meta", "link", "script", "style", or "template" element.
         */
        case 'body': {
            if (isEmptyNode(node)) return true;

            if (typeof firstChildNode === 'string') {
                return !(startWithWhitespacePattern.test(firstChildNode) || isComment(firstChildNode));
            }

            return !(typeof firstChildTagName === 'string' && bodyStartTagCantBeOmittedWithFirstChildTags.has(firstChildTagName));
        }

        /**
         * A "colgroup" element's start tag may be omitted if the first thing inside it is a "col" element,
         * and if it is not IMMEDIATELY preceded by another "colgroup" element whose end tag has been omitted.
         */
        case 'colgroup':
            if (firstChildTagName !== 'col') return false;
            return !(prevTagName === 'colgroup' && isPrevEndTagOmitted);

        /**
         * A "tbody" element's start tag may be omitted if the first thing inside it is a "tr" element,
         * and if it is not IMMEDIATELY preceded by a "tbody", "thead" or "tfoot" element whose end tag has been omitted.
         */
        case 'tbody':
            if (firstChildTagName !== 'tr') return false;
            return !(
                typeof prevTagName === 'string'
                && tbodyStartTagCantBeOmittedWithPrecededTags.has(prevTagName)
                && isPrevEndTagOmitted
            );

        default:
            return false;
    }
}

function removeOptionalTagsFrom(nodes: PostHTMLNodeLike[], parent: PostHTML.Node | null, context: OmissionContext) {
    nodes.forEach((node, index) => {
        if (typeof node === 'string') return;

        const tagName = node.tag;

        /*
         * A node without a tag renders as its content only. posthtml-include and
         * similar plugins build those to splice a parsed document into the tree,
         * so it has no tags of its own to omit while the elements below it do —
         * the traversal must not stop here. The node is passed on as the parent,
         * where its missing tag name blocks every "no more content in the parent
         * element" rule: what its content really ends up nested in is unknown.
         */
        if (typeof tagName !== 'string') {
            if (node.content && node.content.length) {
                removeOptionalTagsFrom(node.content, node, context);
            }

            return;
        }

        const prevNode = getPrevRenderedNode(nodes, index);
        const nextNode = getNextRenderedNode(nodes, index);
        const isPrevEndTagOmitted = prevNode !== null
            && typeof prevNode !== 'string'
            && context.endTagOmittedNodes.has(prevNode);

        const isEndTagOmittable = optionalEndTags.has(tagName) && canOmitEndTag(tagName, nextNode, parent, context);
        const isStartTagOmittable = optionalStartTags.has(tagName)
            && canOmitStartTag(node, tagName, prevNode, isPrevEndTagOmitted);

        if (isStartTagOmittable && isEndTagOmittable) {
            omitTag(node);
            context.endTagOmittedNodes.add(node);
        } else if (isEndTagOmittable && context.canOmitEndTagAlone) {
            (node as OptionalTagNode).closeAs = 'default';
            context.usedCloseAs = true;
            context.endTagOmittedNodes.add(node);
        }

        if (node.content && node.content.length && !foreignContentTags.has(tagName)) {
            removeOptionalTagsFrom(node.content, node, context);
        }
    });
}

/**
 * Some omissions are only valid in no-quirks mode, which requires a doctype.
 * A tree without one is either quirks mode or a fragment of an unknown document,
 * so both are treated as "not no-quirks".
 */
function isNoQuirksDocument(tree: PostHTMLTreeLike) {
    for (const node of tree) {
        if (typeof node !== 'string') continue;
        if (noQuirksDoctypePattern.test(node.trim())) return true;
    }

    return false;
}

function removeOptionalTags(tree: PostHTMLTreeLike) {
    tree.options ??= {};

    /*
     * posthtml-render can only skip a single end tag when it renders with
     * `closingSingleTag: 'closeAs'`. When the consumer already asked for another
     * void-element style we must not override it, so we fall back to omitting
     * pairs of tags only.
     */
    const { closingSingleTag } = tree.options;
    const context: OmissionContext = {
        endTagOmittedNodes: new WeakSet(),
        canOmitEndTagAlone: closingSingleTag === undefined || closingSingleTag === 'closeAs',
        isNoQuirksMode: isNoQuirksDocument(tree),
        usedCloseAs: false
    };

    removeOptionalTagsFrom(tree, null, context);

    if (context.usedCloseAs) {
        /*
         * This has to mutate rather than replace `tree.options`, even though the
         * object is the one the caller passed to `posthtml().process()`: posthtml
         * rebuilds the tree after every plugin (`[].concat(tree)`) and then copies
         * its own `options` back onto it, so a replacement is dropped before the
         * renderer ever sees it.
         *
         * The setting therefore stays on a reused options object, which is
         * harmless: `closeAs` renders exactly like the default for every node
         * without a `closeAs` property, so only the nodes marked below are
         * affected.
         */
        tree.options.closingSingleTag = 'closeAs';
    }

    return tree;
}

// Specification https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
/** Remove optional tag in the DOM */
const mod: HtmlnanoModule = {
    default: removeOptionalTags
};

export default mod;
