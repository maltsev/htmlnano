import type PostHTML from 'posthtml';
import { decodeHTMLAttribute } from 'entities';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import { extractTextContentFromNode } from '../helpers';
import { normalizeAttrsForKey } from './helpers/normalizeAttrsForKey';

function normalizeAsyncAttr(attrs: PostHTML.NodeAttributes) {
    if (attrs.async === '') {
        (attrs as Record<string, string | boolean>).async = true;
    }

    if (attrs.nomodule === '') {
        (attrs as Record<string, string | boolean>).nomodule = true;
    }
}

function getScriptType(attrs: PostHTML.NodeAttributes) {
    if ('type' in attrs) {
        const type = typeof attrs.type === 'string' ? attrs.type : '';
        // Only an actually empty type defaults to JavaScript. Whitespace alone
        // becomes a data block, and type takes precedence over language.
        return type === ''
            ? 'text/javascript'
            : type.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase();
    }

    return attrs.language ? `text/${attrs.language}`.toLowerCase() : 'text/javascript';
}

function normalizeScriptAttrs(attrs: PostHTML.NodeAttributes) {
    const normalized = Object.create(null) as PostHTML.NodeAttributes;

    for (const [name, value] of Object.entries(attrs)) {
        const normalizedName = name.replace(/[A-Z]/g, letter => letter.toLowerCase());
        // HTML keeps the first attribute when names differ only in ASCII case.
        if (!(normalizedName in normalized)) {
            normalized[normalizedName] = typeof value === 'string' ? decodeHTMLAttribute(value) : value;
        }
    }

    return normalized;
}

function isMergeableScriptType(type: string) {
    return type === 'text/javascript' || type === 'application/javascript';
}

const booleanAttrs = new Set(['async', 'defer', 'nomodule']);
const skippedAttrs = new Set(['src', 'integrity', 'type']);
const untouchedTags = new Set(['noscript', 'template', 'svg', 'math']);

function normalizeScriptAttrsForKey(attrs: PostHTML.NodeAttributes, scriptType: string) {
    return normalizeAttrsForKey(attrs, {
        baseAttrs: { type: scriptType },
        booleanAttrs,
        skippedAttrs
    });
}

function buildScriptKey(attrs: PostHTML.NodeAttributes, scriptType: string) {
    const normalizedAttrs = normalizeScriptAttrsForKey(attrs, scriptType);
    const keyObject: Record<string, string | boolean | number> = {
        ...normalizedAttrs
    };

    return JSON.stringify(Object.fromEntries(Object.entries(keyObject).sort()));
}

function needsScriptBoundary(scriptContent: string) {
    // Conservatively keep strict directives in their own Script evaluation.
    // Hashbangs are only valid at the beginning of a script. HTML escape
    // markers can combine across scripts and swallow the closing tag/markup.
    return /(['"])use strict\1/.test(scriptContent)
        || scriptContent.trimStart().startsWith('#!')
        || /<!--|<\/?script/i.test(scriptContent);
}

// Only sibling scripts separated by whitespace can share a merge group.
// Moving code across another script or markup changes execution order or the
// DOM available when it runs (including a meta CSP's position).
function mergeScriptsInScope(nodes: PostHTMLNodeLike[]) {
    let previousScript: PostHTML.Node | null = null;
    let previousIndex = -1;
    let previousKey: string | null = null;

    nodes.forEach((node, index) => {
        if (typeof node === 'string' && /^[\t\n\f\r ]*$/.test(node)) {
            return;
        }

        if (typeof node !== 'object' || (node.tag || '').toLowerCase() !== 'script') {
            previousScript = null;
            previousKey = null;

            // Inert and foreign content does not follow HTML script execution
            // rules. Leave its scripts untouched, including nested descendants.
            if (typeof node === 'object'
                && !untouchedTags.has((node.tag || '').toLowerCase())
                && Array.isArray(node.content)) {
                mergeScriptsInScope(node.content);
            }

            return;
        }

        normalizeAsyncAttr(node.attrs || {});
        const nodeAttrs = normalizeScriptAttrs(node.attrs || {});
        const scriptType = getScriptType(nodeAttrs);
        if ('src' in nodeAttrs || 'integrity' in nodeAttrs
            || !isMergeableScriptType(scriptType)
            || needsScriptBoundary(extractTextContentFromNode(node))) {
            previousScript = null;
            previousKey = null;
            return;
        }

        const scriptKey = buildScriptKey(nodeAttrs, scriptType);
        if (previousScript && previousKey === scriptKey) {
            let scriptContent = extractTextContentFromNode(previousScript).trim();
            if (scriptContent) {
                // A newline ends line comments, a semicolon prevents ASI from
                // joining expressions, and the final newline preserves leading
                // HTML close comments in the next script. No lexer is needed.
                scriptContent += '\n;\n';

                node.content = node.content || [];
                node.content.unshift(scriptContent);
            }

            nodes[previousIndex] = '';
        }

        previousScript = node;
        previousIndex = index;
        previousKey = scriptKey;
    });
}

/* Merge multiple <script> into one */
const mod: HtmlnanoModule = {
    default(tree) {
        mergeScriptsInScope(tree);
        return tree;
    }
};

export default mod;
