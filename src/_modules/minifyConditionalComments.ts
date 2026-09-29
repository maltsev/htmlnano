import { process as processHtml } from '../index.js';
import { isConditionalComment } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLNodeLike, PostHTMLTreeLike } from '../types';

// Spec: https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/ms537512(v=vs.85)
const CONDITIONAL_COMMENT_HIDDEN_REGEXP = /(<!--\[if\s+?[^<>[\]]+?]>)([\s\S]*?)(<!\[endif\]-->)/gm;
const CONDITIONAL_COMMENT_REVEALED_REGEXP = /(<!--\[if\s+?[^<>[\]]+?\]><!-->)([\s\S]*?)(<!--<!\[endif\]-->)/gm;
const CONDITIONAL_COMMENT_START_REGEXP = /<!--\[if\s/i;

async function minifyConditionalComments(tree: PostHTMLTreeLike, htmlnanoOptions: Partial<HtmlnanoOptions>): Promise<PostHTMLTreeLike>;
async function minifyConditionalComments(tree: PostHTMLNodeLike[], htmlnanoOptions: Partial<HtmlnanoOptions>): Promise<PostHTMLNodeLike[]>;
async function minifyConditionalComments(tree: PostHTMLTreeLike | PostHTMLNodeLike[], htmlnanoOptions: Partial<HtmlnanoOptions>) {
    // forEach, tree.walk, tree.match just don't support Promise.
    for (let i = 0, len = tree.length; i < len; i++) {
        const node = tree[i];

        if (typeof node === 'string') {
            if (isConditionalComment(node)) {
                tree[i] = (await minifyContentInsideConditionalComments(node, htmlnanoOptions)) as PostHTMLNodeLike;
            }
        } else if (node.content && node.content.length) {
            node.content = await minifyConditionalComments(node.content, htmlnanoOptions);
        }
    }

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

function collectConditionalCommentMatches(text: string, regexp: RegExp): ConditionalCommentMatch[] {
    const matches: ConditionalCommentMatch[] = [];
    regexp.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regexp.exec(text)) !== null) {
        matches.push({
            start: match.index,
            end: match.index + match[0].length,
            open: match[1],
            content: match[2],
            close: match[3]
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
    const matches = [
        ...collectConditionalCommentMatches(text, CONDITIONAL_COMMENT_HIDDEN_REGEXP),
        ...collectConditionalCommentMatches(text, CONDITIONAL_COMMENT_REVEALED_REGEXP)
    ].sort((a, b) => a.start - b.start);

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

        result += match.open + minified + match.close;
        lastIndex = match.end;
    }

    result += text.slice(lastIndex);
    return result;
}
