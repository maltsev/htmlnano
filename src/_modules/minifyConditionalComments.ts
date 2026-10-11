import { process as processHtml } from '../index.js';
import { getTagName, isConditionalComment } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLNodeLike, PostHTMLTreeLike } from '../types';

// Spec: https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/ms537512(v=vs.85)
const CONDITIONAL_COMMENT_OPEN_REGEXP = /<!--\[if\s+[^<>\s[\]][^<>[\]]*]>(<!-->)?/g;
const CONDITIONAL_COMMENT_START_REGEXP = /<!(?:--)?\[if\s/i;

// These elements contain literal text, not conditional comments. Noscript must
// also be safe with scripting enabled, when browsers treat it as raw text.
const textElements = new Set([
    'script', 'style', 'textarea', 'title', 'xmp', 'iframe',
    'noembed', 'noframes', 'noscript'
]);

async function minifyConditionalComments(tree: PostHTMLTreeLike, htmlnanoOptions: Partial<HtmlnanoOptions>): Promise<PostHTMLTreeLike> {
    let inPlaintext = false;

    async function visit(nodes: PostHTMLNodeLike[]): Promise<void> {
        // forEach, tree.walk, tree.match just don't support Promise.
        for (let i = 0; i < nodes.length; i++) {
            // Plaintext consumes everything to EOF, even beyond its apparent
            // closing tag and ancestors in PostHTML's tree.
            if (inPlaintext) return;
            const node = nodes[i];

            if (typeof node === 'string') {
                if (isConditionalComment(node)) {
                    nodes[i] = await minifyContentInsideConditionalComments(node, htmlnanoOptions);
                }
            } else if (node) {
                const tag = getTagName(node);
                if (tag === 'plaintext') {
                    inPlaintext = true;
                    return;
                }
                if (textElements.has(tag)) continue;
                if (node.content && node.content.length) {
                    await visit(node.content);
                }
            }
        }
    }

    await visit(tree);
    return tree;
}

/** Minify content inside conditional comments */
const mod: HtmlnanoModule = {
    default: minifyConditionalComments
};

export default mod;

type ConditionalCommentMatch = {
    start: number;
    end: number;
    open: string;
    content: string;
    close: string;
};

function collectConditionalCommentMatches(text: string): ConditionalCommentMatch[] {
    const matches: ConditionalCommentMatch[] = [];
    const regexp = CONDITIONAL_COMMENT_OPEN_REGEXP;
    regexp.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regexp.exec(text)) !== null) {
        const contentStart = regexp.lastIndex;
        const close = match[1] ? '<!--<![endif]-->' : '<![endif]-->';
        // Searching once avoids rescanning the suffix for every opener when a
        // malformed or deeply nested comment has no matching closing marker.
        const contentEnd = text.indexOf(close, contentStart);
        if (contentEnd === -1) break;

        regexp.lastIndex = contentEnd + close.length;
        matches.push({
            start: match.index,
            end: regexp.lastIndex,
            open: match[0],
            content: text.slice(contentStart, contentEnd),
            close
        });
    }

    return matches;
}

function hasHtmlOpeningWithoutClosing(content: string) {
    return /<html\b/i.test(content) && !/<\/html>/i.test(content);
}

function hasUnclosedQuotedAttribute(content: string) {
    let isInsideTag = false;
    let quote: '"' | '\'' | null = null;

    for (let i = 0; i < content.length; i++) {
        const character = content[i];

        if (!isInsideTag) {
            if (character === '<' && /[A-Za-z!?/]/.test(content[i + 1] ?? '')) {
                isInsideTag = true;
            }
            continue;
        }

        if (quote) {
            if (character === quote) {
                quote = null;
            }
            continue;
        }

        if (character === '"' || character === '\'') {
            quote = character;
        } else if (character === '>') {
            isInsideTag = false;
        }
    }

    return quote !== null;
}

function shouldPreserveContent(content: string) {
    // The regular expressions deliberately handle only flat wrappers. Passing a
    // partial nested match back through htmlnano can move an inner closing marker.
    // Likewise, PostHTML may discard a tag whose quoted attribute never closes.
    return CONDITIONAL_COMMENT_START_REGEXP.test(content) || hasUnclosedQuotedAttribute(content);
}

async function minifyContentInsideConditionalComments(text: string, htmlnanoOptions: Partial<HtmlnanoOptions>) {
    const matches = collectConditionalCommentMatches(text);

    if (!matches.length) {
        return Promise.resolve(text);
    }

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
        result += text.slice(lastIndex, match.start);

        if (shouldPreserveContent(match.content)) {
            result += text.slice(match.start, match.end);
            lastIndex = match.end;
            continue;
        }

        const processed = await processHtml(match.content, htmlnanoOptions, {}, {});
        let minified = processed.html;

        if (hasHtmlOpeningWithoutClosing(match.content) && /<\/html>/i.test(minified)) {
            minified = minified.replace(/<\/html>/i, '');
        }

        // Hidden content is still an HTML comment in other browsers. Decoding
        // references (even in attributes) must not expose it as active markup.
        if (!match.open.endsWith('<!-->') && /--!?>/.test(minified)) {
            result += text.slice(match.start, match.end);
        } else {
            result += match.open + minified + match.close;
        }
        lastIndex = match.end;
    }

    result += text.slice(lastIndex);
    return result;
}
