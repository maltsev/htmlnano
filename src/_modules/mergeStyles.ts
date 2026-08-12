import type PostHTML from 'posthtml';
import { extractTextContentFromNode, isAmpBoilerplate } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import { isIsolatedScope } from './helpers/isolatedScopes';
import { normalizeAttrsForKey } from './helpers/normalizeAttrsForKey';

const booleanAttrs = new Set(['amp-custom', 'disabled']);
const skippedAttrs = new Set(['type', 'media']);

function normalizeStyleType(attrs: PostHTML.NodeAttributes) {
    if (!attrs || typeof attrs.type !== 'string') {
        return 'text/css';
    }

    const type = attrs.type.trim();
    return type ? type.toLowerCase() : 'text/css';
}

function normalizeStyleMedia(attrs: PostHTML.NodeAttributes) {
    if (!attrs || typeof attrs.media !== 'string') {
        return 'all';
    }

    const media = attrs.media.trim();
    return media ? media.replace(/\s+/g, ' ').toLowerCase() : 'all';
}

function normalizeStyleAttrsForKey(attrs: PostHTML.NodeAttributes) {
    return normalizeAttrsForKey(attrs, {
        booleanAttrs,
        skippedAttrs
    });
}

function buildStyleKey(attrs: PostHTML.NodeAttributes) {
    const keyObject: Record<string, string | boolean> = {
        type: normalizeStyleType(attrs),
        media: normalizeStyleMedia(attrs),
        ...normalizeStyleAttrsForKey(attrs)
    };

    return JSON.stringify(Object.fromEntries(Object.entries(keyObject).sort()));
}

function extractStyleTextContent(node: PostHTML.Node) {
    if (typeof node.content === 'string') {
        return node.content;
    }

    return extractTextContentFromNode(node);
}

// A <link rel="stylesheet"> pulls in external CSS at its position in the
// document, so it participates in the cascade. Other rel values (e.g.
// "preload") do not apply styles and must not break a merge group.
function isStylesheetLink(node: PostHTML.Node) {
    if (node.tag !== 'link' || !node.attrs || typeof node.attrs.rel !== 'string') {
        return false;
    }

    return node.attrs.rel
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .includes('stylesheet');
}

// The <style> tags currently open for merging. Only <style> tags that form a
// contiguous run (in document order) with no intervening stylesheet source
// between them may be merged. CSS rules of equal specificity resolve by source
// order, so merging styles across an intervening <link rel="stylesheet"> or a
// <style> with different group attributes (type/media/...) could silently
// change which rules win. We therefore keep at most one open merge group at a
// time and flush it whenever such a source is encountered.
type MergeGroup = {
    key: string | null;
    node: PostHTML.Node | null;
};

function flushGroup(group: MergeGroup) {
    group.key = null;
    group.node = null;
}

function mergeStylesInScope(nodes: Array<PostHTMLNodeLike>, group: MergeGroup) {
    nodes.forEach((node, index) => {
        if (typeof node !== 'object' || !node.tag) {
            return;
        }

        // <noscript> and <template> hold their own cascade, so their styles are
        // merged among themselves and never with the surrounding document.
        if (isIsolatedScope(node)) {
            // With scripting disabled the styles inside <noscript> do apply, at
            // this very position, so an open group can't reach past it.
            // <template> content never applies to the current document, so it
            // doesn't interrupt anything.
            if (node.tag === 'noscript') {
                flushGroup(group);
            }

            if (Array.isArray(node.content)) {
                mergeStylesInScope(node.content, { key: null, node: null });
            }

            return;
        }

        // A stylesheet <link> contributes to the cascade at its position,
        // so it ends any open merge group.
        if (isStylesheetLink(node)) {
            flushGroup(group);
            return;
        }

        if (node.tag !== 'style' || !node.content) {
            if (Array.isArray(node.content)) {
                mergeStylesInScope(node.content, group);
            }

            return;
        }

        const nodeAttrs = node.attrs || {};
        // Skip <style scoped></style>
        // https://developer.mozilla.org/en/docs/Web/HTML/Element/style
        //
        // Also skip SRI, reasons are documented in "minifyJs" module
        //
        // These styles are excluded from merging, but they still apply to
        // the cascade, so they end any open merge group.
        if ('scoped' in nodeAttrs || 'integrity' in nodeAttrs) {
            flushGroup(group);
            return;
        }

        // AMP boilerplate styles are left untouched and do not participate
        // in the mergeable cascade, so they don't break a group.
        if (isAmpBoilerplate(node)) {
            return;
        }

        const styleKey = buildStyleKey(nodeAttrs);

        if (group.node && group.key === styleKey) {
            const styleContent = extractStyleTextContent(node);

            group.node.content ??= [];
            group.node.content.push(' ' + styleContent);
            nodes[index] = ''; // Remove node
            return;
        }

        // A <style> with different group attributes is still a stylesheet
        // source at this position, so it ends the previous group before
        // starting a new one.
        node.content = node.content || [];
        group.key = styleKey;
        group.node = node;
    });
}

/* Merge multiple <style> into one */
const mod: HtmlnanoModule = {
    default(tree) {
        mergeStylesInScope(tree, { key: null, node: null });

        return tree;
    }
};

export default mod;
