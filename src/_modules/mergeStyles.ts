import type PostHTML from 'posthtml';
import { decodeHTMLAttribute } from 'entities';
import { extractTextContentFromNode, getTagName, isAmpBoilerplate } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import { isIsolatedScope } from './helpers/isolatedScopes';
import { normalizeAttrsForKey } from './helpers/normalizeAttrsForKey';

const booleanAttrs = new Set(['amp-custom', 'disabled']);
const skippedAttrs = new Set(['type', 'media']);

function normalizeStyleType(attrs: PostHTML.NodeAttributes) {
    if (!attrs || typeof attrs.type !== 'string') {
        return 'text/css';
    }

    return attrs.type === '' ? 'text/css' : attrs.type.replace(/[A-Z]/g, letter => letter.toLowerCase());
}

function normalizeStyleMedia(attrs: PostHTML.NodeAttributes) {
    if (!attrs || typeof attrs.media !== 'string') {
        return 'all';
    }

    const media = attrs.media.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
    // Strings, escapes and custom identifiers can be case/whitespace sensitive.
    if (/["'\\]|--/.test(media)) {
        return media;
    }

    return media ? media.replace(/[\t\n\f\r ]+/g, ' ').replace(/[A-Z]/g, letter => letter.toLowerCase()) : 'all';
}

function normalizeStyleAttrs(attrs: PostHTML.NodeAttributes) {
    const normalized = new Map<string, PostHTML.NodeAttributes[string]>();
    for (const [name, value] of Object.entries(attrs)) {
        const lowerName = name.replace(/[A-Z]/g, letter => letter.toLowerCase());
        // HTML ignores later attributes with the same ASCII case-insensitive name.
        if (!normalized.has(lowerName)) {
            normalized.set(lowerName, typeof value === 'string' ? decodeHTMLAttribute(value) : value);
        }
    }

    return Object.fromEntries(normalized);
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

function needsStyleBoundary(css: string) {
    // Consume complete comments/strings or a single character. Stop on the
    // first unfinished token, so malformed input cannot trigger repeated scans.
    const tokens = /\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\\r\n\f])*"|'(?:\\[\s\S]|[^'\\\r\n\f])*'|[\s\S]/g;
    const brackets: string[] = [];
    let pendingRule = false;
    let atRule = false;
    let match: RegExpExecArray | null;
    while ((match = tokens.exec(css)) !== null) {
        const token = match[0];
        if (token.length > 1 && token.startsWith('/*')) {
            continue;
        }

        // Strings remain a token, so a trailing string isn't an empty sheet.
        const char = token.length > 1 ? 'x' : token;
        // Imports have position restrictions; namespaces affect the whole
        // sheet. Keep escapes outside strings and legacy wrappers separate
        // rather than implementing a full tokenizer (escaped at-rules included).
        if (token.length === 1 && (/^["'\\]$/.test(char)
            || /^(?:\/\*|@(?:import|namespace)\b|<!--|-->)/i.test(css.slice(match.index, match.index + 12)))) {
            return true;
        }

        if (/[\t\n\f\r ]/.test(char)) {
            continue;
        }

        if (!pendingRule && brackets.length === 0) {
            pendingRule = true;
            atRule = char === '@';
        }

        if ('([{'.includes(char)) {
            brackets.push(char);
        } else if (')]}'.includes(char)) {
            if (brackets.pop() !== '([{'.charAt(')]}'.indexOf(char))) {
                return true;
            }

            if (brackets.length === 0 && char === '}') {
                pendingRule = false;
            }
        } else if (char === ';' && brackets.length === 0) {
            // A semicolon terminates an at-rule, but not a qualified-rule
            // prelude: "a;" could still consume the next sheet's first block.
            if (!atRule) {
                return true;
            }

            pendingRule = false;
        }
    }

    // CSS repairs unfinished constructs at EOF. Concatenating another sheet
    // removes that EOF and lets the unfinished construct swallow its rules.
    return pendingRule || brackets.length !== 0;
}

// A <link rel="stylesheet"> pulls in external CSS at its position in the
// document, so it participates in the cascade. Other rel values (e.g.
// "preload") do not apply styles and must not break a merge group.
function isStylesheetLink(attrs: PostHTML.NodeAttributes) {
    return typeof attrs.rel === 'string' && attrs.rel
        .replace(/[A-Z]/g, letter => letter.toLowerCase())
        .split(/[\t\n\f\r ]+/)
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

        const tag = getTagName(node);
        const nodeAttrs = normalizeStyleAttrs(node.attrs || {});
        // Moving CSS before a CSP changes its authorization. Scripts can
        // inspect or insert styles, and <base> changes relative URL resolution.
        // Foreign content has different parsing/namespace rules; leave it alone.
        if (tag === 'script' || tag === 'base' || tag === 'svg' || tag === 'math'
            || (tag === 'meta' && typeof nodeAttrs['http-equiv'] === 'string'
                && nodeAttrs['http-equiv'].toLowerCase() === 'content-security-policy')) {
            flushGroup(group);
            return;
        }

        // <noscript> and <template> hold their own cascade, so their styles are
        // merged among themselves and never with the surrounding document.
        if (isIsolatedScope(node)) {
            // With scripting disabled the styles inside <noscript> do apply, at
            // this very position, so an open group can't reach past it.
            // <template> content never applies to the current document, so it
            // doesn't interrupt anything.
            if (tag === 'noscript') {
                flushGroup(group);
            }

            if (Array.isArray(node.content)) {
                mergeStylesInScope(node.content, { key: null, node: null });
            }

            return;
        }

        // A stylesheet <link> contributes to the cascade at its position,
        // so it ends any open merge group.
        if (tag === 'link' && isStylesheetLink(nodeAttrs)) {
            flushGroup(group);
            return;
        }

        if (tag !== 'style' || !node.content) {
            if (Array.isArray(node.content)) {
                mergeStylesInScope(node.content, group);
            }

            return;
        }

        // Skip <style scoped></style>
        // https://developer.mozilla.org/en/docs/Web/HTML/Element/style
        //
        // Also skip SRI, reasons are documented in "minifyJs" module
        //
        // These styles are excluded from merging, but they still apply to
        // the cascade, so they end any open merge group.
        if ('scoped' in nodeAttrs || 'integrity' in nodeAttrs || normalizeStyleType(nodeAttrs) !== 'text/css') {
            flushGroup(group);
            return;
        }

        // AMP boilerplate is still CSS and participates in source order.
        if (isAmpBoilerplate({ ...node, attrs: nodeAttrs })) {
            flushGroup(group);
            return;
        }

        const styleContent = extractStyleTextContent(node);
        if (needsStyleBoundary(styleContent)) {
            flushGroup(group);
            return;
        }

        const styleKey = buildStyleKey(nodeAttrs);

        if (group.node && group.key === styleKey) {
            // PostHTML plugins can also supply text as a string, not an array.
            if (!Array.isArray(group.node.content)) {
                group.node.content = [extractStyleTextContent(group.node)];
            }

            group.node.content.push(' ' + styleContent);
            nodes[index] = ''; // Remove node
            return;
        }

        // A <style> with different group attributes is still a stylesheet
        // source at this position, so it ends the previous group before
        // starting a new one.
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
