import type PostHTML from 'posthtml';
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
    const type = attrs.type || 'text/javascript';

    return typeof type === 'string' ? type.toLowerCase() : 'text/javascript';
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

function endsWithLineComment(scriptContent: string) {
    const lastNewlineIndex = Math.max(
        scriptContent.lastIndexOf('\n'),
        scriptContent.lastIndexOf('\r')
    );
    const lastLine = lastNewlineIndex === -1
        ? scriptContent
        : scriptContent.slice(lastNewlineIndex + 1);

    return /\/\/.*$/.test(lastLine);
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

        if (typeof node !== 'object' || node.tag !== 'script') {
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

        const nodeAttrs = node.attrs || {};
        normalizeAsyncAttr(nodeAttrs);
        const scriptType = getScriptType(nodeAttrs);
        if ('src' in nodeAttrs || 'integrity' in nodeAttrs || !isMergeableScriptType(scriptType)) {
            previousScript = null;
            previousKey = null;
            return;
        }

        const scriptKey = buildScriptKey(nodeAttrs, scriptType);
        if (previousScript && previousKey === scriptKey) {
            let scriptContent = extractTextContentFromNode(previousScript).trim();
            if (scriptContent) {
                if (endsWithLineComment(scriptContent)) {
                    scriptContent += '\n;';
                } else if (scriptContent.slice(-1) !== ';') {
                    scriptContent += ';';
                }

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
