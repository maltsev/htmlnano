import { isComment, isConditionalComment } from '../helpers';
import type { HtmlnanoModule, PostHTMLNodeLike } from '../types';
import { escapeTextBoundary } from './helpers/escapeTextBoundary';

const MATCH_EXCERPT_REGEXP = /^\s*more\b/i;
const MATCH_NOINDEX_REGEXP = /^\s*\/?\s*noindex\s*$/i;
const MATCH_SSE_REGEXP = /^\s*\/?\s*sse\s*$/i;

// Comment-looking content in these elements is literal text. Noscript must
// also work with scripting enabled, when browsers parse it as raw text.
const textElements = new Set([
    'script', 'style', 'textarea', 'title', 'xmp', 'iframe',
    'noembed', 'noframes', 'noscript'
]);

export type RemoveCommentsOptions = boolean | RegExp | ((comment: string) => boolean) | string;

/** Removes HTML comments */
const mod: HtmlnanoModule<RemoveCommentsOptions> = {
    default(tree, _, removeType) {
        removeType = normalizeRemoveType(removeType);
        let inPlaintext = false;

        function visit(nodes: PostHTMLNodeLike[]): void {
            let writeIndex = 0;
            let removedComment = false;

            for (const node of nodes) {
                if (!inPlaintext) {
                    if (isCommentToRemove(node, removeType)) {
                        removedComment = true;
                        continue;
                    }

                    if (node && typeof node === 'object') {
                        const tag = typeof node.tag === 'string' ? node.tag.toLowerCase() : '';
                        if (tag === 'plaintext') {
                            // Plaintext consumes the rest of the document, even
                            // beyond its apparent closing tag in PostHTML's tree.
                            inPlaintext = true;
                        } else if (!textElements.has(tag) && Array.isArray(node.content)) {
                            visit(node.content);
                        }
                    }
                }

                const previous = nodes[writeIndex - 1];
                if (removedComment && typeof previous === 'string' && typeof node === 'string') {
                    nodes[writeIndex - 1] = escapeTextBoundary(previous);
                }
                removedComment = false;
                nodes[writeIndex++] = node;
            }
            nodes.length = writeIndex;
        }

        visit(tree);
        return tree;
    }
};

export default mod;

function isCommentToRemove(text: PostHTMLNodeLike, removeType: Partial<RemoveCommentsOptions>): boolean {
    if (typeof text !== 'string') {
        return false;
    }

    if (!isComment(text)) {
        // Not HTML comment
        return false;
    }

    if (removeType === 'safe') {
        const commentBody = getCommentBody(text);

        // Preserve license comments "<!--! ... -->", the HTML analogue of the
        // "/*! ... */" comments kept by Terser/cssnano.
        if (commentBody && commentBody.startsWith('!')) {
            return false;
        }

        const isNoindex = commentBody ? MATCH_NOINDEX_REGEXP.test(commentBody) : false;
        // Don't remove noindex comments. It was used by some search engines in the past.
        if (isNoindex) {
            return false;
        }

        const isServerSideExclude = commentBody ? MATCH_SSE_REGEXP.test(commentBody) : false;
        // Don't remove sse comments.
        // See: https://support.cloudflare.com/hc/en-us/articles/200170036-What-does-Server-Side-Excludes-SSE-do-
        if (isServerSideExclude) {
            return false;
        }

        // https://en.wikipedia.org/wiki/Conditional_comment
        if (isConditionalComment(text)) {
            return false;
        }

        // Hexo: https://hexo.io/docs/tag-plugins#Post-Excerpt
        // Hugo: https://gohugo.io/content-management/summaries/#manual-summary-splitting
        // WordPress: https://wordpress.com/support/wordpress-editor/blocks/more-block/2/
        // Jekyll: https://jekyllrb.com/docs/posts/#post-excerpts
        const isCMSExcerptComment = commentBody ? MATCH_EXCERPT_REGEXP.test(commentBody) : false;
        if (isCMSExcerptComment) {
            return false;
        }
    }

    if (isMatcher(removeType)) {
        return isMatch(text, removeType);
    }

    return true;
}

function isMatch(input: string, matcher: Partial<RemoveCommentsOptions>): boolean {
    if (matcher instanceof RegExp) {
        // Each comment is an independent input, including with global/sticky flags.
        matcher.lastIndex = 0;
        return matcher.test(input);
    }

    if (typeof matcher === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- typescript incorrectly infers Partialled type
        return !!matcher(input);
    }

    return false;
}

function normalizeRemoveType(removeType: Partial<RemoveCommentsOptions>): Partial<RemoveCommentsOptions> {
    if (removeType instanceof RegExp) {
        // Keep matching state local rather than mutating the caller's regexp.
        return new RegExp(removeType.source, removeType.flags);
    }

    if (removeType === 'all' || removeType === 'safe' || isMatcher(removeType)) {
        return removeType;
    }

    if (typeof removeType === 'string') {
        const regexp = parseRegexString(removeType);
        if (regexp) {
            return regexp;
        }
    }

    return 'safe';
}

function isMatcher(matcher: Partial<RemoveCommentsOptions>) {
    if (matcher instanceof RegExp || typeof matcher === 'function') {
        return true;
    }

    return false;
}

function parseRegexString(value: string): RegExp | null {
    const literalMatch = value.match(/^\/([\s\S]+)\/([gimsuy]*)$/);
    if (literalMatch) {
        return tryCreateRegExp(literalMatch[1], literalMatch[2]);
    }

    return tryCreateRegExp(value);
}

function tryCreateRegExp(pattern: string, flags?: string): RegExp | null {
    try {
        return new RegExp(pattern, flags);
    } catch {
        return null;
    }
}

function getCommentBody(text: string): string | null {
    const trimmed = text.trim();
    const match = trimmed.match(/^<!--([\s\S]*?)-->$/);
    if (!match) {
        return null;
    }
    return match[1];
}
