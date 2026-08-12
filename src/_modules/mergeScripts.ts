import type PostHTML from 'posthtml';
import type { HtmlnanoModule } from '../types';
import { extractTextContentFromNode } from '../helpers';
import { isIsolatedScope } from './helpers/isolatedScopes';
import { normalizeAttrsForKey } from './helpers/normalizeAttrsForKey';

type ScriptTracking = {
    mergedScriptNodes: WeakSet<PostHTML.Node>;
    removedScriptNodes: WeakSet<PostHTML.Node>;
};

function normalizeAsyncAttr(attrs: PostHTML.NodeAttributes) {
    if (!attrs) {
        return;
    }

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

function normalizeScriptAttrsForKey(attrs: PostHTML.NodeAttributes, scriptType: string) {
    return normalizeAttrsForKey(attrs, {
        baseAttrs: { type: scriptType },
        booleanAttrs,
        skippedAttrs
    });
}

function buildScriptKey(attrs: PostHTML.NodeAttributes, scriptType: string, scriptSrcIndex: number) {
    const normalizedAttrs = normalizeScriptAttrsForKey(attrs, scriptType);
    const keyObject: Record<string, string | boolean | number> = {
        index: scriptSrcIndex,
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

// A <script> inside <noscript> never executes, and a <script> inside <template>
// only executes once the template is cloned into the document. Neither belongs
// to the execution order of the surrounding document, so merging them with the
// regular scripts would make dead or deferred code run — collect them upfront
// to leave them alone.
function collectScriptNodes(node: PostHTML.Node, scriptNodes: WeakSet<PostHTML.Node>) {
    if (!Array.isArray(node.content)) {
        return;
    }

    for (const childNode of node.content) {
        if (typeof childNode !== 'object') {
            continue;
        }

        if (childNode.tag === 'script') {
            scriptNodes.add(childNode);
        }

        collectScriptNodes(childNode, scriptNodes);
    }
}

function mergeScriptNodes(
    scriptNodesIndex: Record<string, PostHTML.Node[]>,
    tracking: ScriptTracking
) {
    for (const scriptNodes of Object.values(scriptNodesIndex)) {
        if (scriptNodes.length < 2) {
            continue;
        }

        const lastScriptNode = scriptNodes.pop()!;
        tracking.mergedScriptNodes.add(lastScriptNode);

        scriptNodes.reverse().forEach((scriptNode) => {
            let scriptContent = extractTextContentFromNode(scriptNode).trim();

            if (!scriptContent) {
                tracking.removedScriptNodes.add(scriptNode);
                // @ts-expect-error -- remove node
                scriptNode.tag = false;
                scriptNode.content = [];
                return;
            }

            if (endsWithLineComment(scriptContent)) {
                scriptContent += '\n;';
            } else if (scriptContent.slice(-1) !== ';') {
                scriptContent += ';';
            }

            lastScriptNode.content = lastScriptNode.content || [];
            lastScriptNode.content.unshift(scriptContent);

            tracking.removedScriptNodes.add(scriptNode);
            // @ts-expect-error -- remove node
            scriptNode.tag = false;
            scriptNode.content = [];
        });
    }
}

/* Merge multiple <script> into one */
const mod: HtmlnanoModule = {
    default(tree) {
        const scriptNodesIndex: Record<string, PostHTML.Node[]> = {};
        const tracking: ScriptTracking = {
            mergedScriptNodes: new WeakSet<PostHTML.Node>(),
            removedScriptNodes: new WeakSet<PostHTML.Node>()
        };
        let scriptSrcIndex = 1;

        const isolatedScriptNodes = new WeakSet<PostHTML.Node>();
        tree.walk((node) => {
            if (isIsolatedScope(node)) {
                collectScriptNodes(node, isolatedScriptNodes);
            }

            return node;
        });

        tree.match({ tag: 'script' }, (node) => {
            // Scripts of an isolated scope don't run alongside the surrounding
            // ones, so they neither merge nor split the document's own scripts.
            if (isolatedScriptNodes.has(node)) {
                return node;
            }

            const nodeAttrs = node.attrs || {};
            normalizeAsyncAttr(nodeAttrs);
            if (
                'src' in nodeAttrs
                // Skip SRI, reasons are documented in "minifyJs" module
                || 'integrity' in nodeAttrs
            ) {
                scriptSrcIndex++;
                return node;
            }

            const scriptType = getScriptType(nodeAttrs);
            if (!isMergeableScriptType(scriptType)) {
                return node;
            }

            const scriptKey = buildScriptKey(nodeAttrs, scriptType, scriptSrcIndex);
            if (!scriptNodesIndex[scriptKey]) {
                scriptNodesIndex[scriptKey] = [];
            }

            scriptNodesIndex[scriptKey].push(node);
            return node;
        });

        mergeScriptNodes(scriptNodesIndex, tracking);
        return tree;
    }
};

export default mod;
