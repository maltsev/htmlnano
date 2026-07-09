import type PostHTML from 'posthtml';
import { extractTextContentFromNode, isAmpBoilerplate } from '../helpers';
import type { HtmlnanoModule } from '../types';
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

/* Merge multiple <style> into one */
const mod: HtmlnanoModule = {
    default(tree) {
        // Only merge <style> tags that form a contiguous run (in document
        // order) with no intervening stylesheet source between them. CSS rules
        // of equal specificity resolve by source order, so merging styles
        // across an intervening <link rel="stylesheet"> or a <style> with
        // different group attributes (type/media/...) could silently change
        // which rules win. We therefore keep at most one open merge group at a
        // time and flush it whenever such a source is encountered.
        let activeKey: string | null = null;
        let activeNode: PostHTML.Node | null = null;

        function flushGroup() {
            activeKey = null;
            activeNode = null;
        }

        tree.walk((node) => {
            if (typeof node !== 'object' || !node.tag) {
                return node;
            }

            // A stylesheet <link> contributes to the cascade at its position,
            // so it ends any open merge group.
            if (isStylesheetLink(node)) {
                flushGroup();
                return node;
            }

            if (node.tag !== 'style' || !node.content) {
                return node;
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
                flushGroup();
                return node;
            }

            // AMP boilerplate styles are left untouched and do not participate
            // in the mergeable cascade, so they don't break a group.
            if (isAmpBoilerplate(node)) {
                return node;
            }

            const styleKey = buildStyleKey(nodeAttrs);

            if (activeNode && activeKey === styleKey) {
                const styleContent = extractStyleTextContent(node);

                activeNode.content ??= [];
                activeNode.content.push(' ' + styleContent);
                return '' as unknown as PostHTML.Node; // Remove node
            }

            // A <style> with different group attributes is still a stylesheet
            // source at this position, so it ends the previous group before
            // starting a new one.
            node.content = node.content || [];
            activeKey = styleKey;
            activeNode = node;
            return node;
        });

        return tree;
    }
};

export default mod;
