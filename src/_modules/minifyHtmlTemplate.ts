import type PostHTML from 'posthtml';
import posthtml from 'posthtml';
import { hasOwn, normalizeMimeType } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, HtmlnanoTemplateRule, MinifyHtmlTemplateOptions, PostHTMLNodeLike, PostHTMLTreeLike } from '../types';

type NormalizedRule = {
    tag: string;
    attrs?: Record<string, string | boolean>;
};

const textElements = new Set([
    'script', 'style', 'textarea', 'title', 'xmp', 'iframe',
    'noembed', 'noframes', 'noscript', 'plaintext'
]);

export const defaultRules: HtmlnanoTemplateRule[] = [
    { tag: 'script', attrs: { type: 'text/html' } },
    { tag: 'script', attrs: { type: 'text/template' } },
    { tag: 'script', attrs: { type: 'text/x-template' } },
    { tag: 'script', attrs: { type: 'text/x-handlebars-template' } },
    { tag: 'script', attrs: { type: 'text/x-handlebars' } },
    { tag: 'script', attrs: { type: 'text/x-mustache-template' } },
    { tag: 'script', attrs: { type: 'text/x-underscore-template' } },
    { tag: 'script', attrs: { type: 'text/x-jsrender' } },
    { tag: 'script', attrs: { type: 'text/x-jquery-tmpl' } },
    { tag: 'script', attrs: { type: 'text/x-kendo-template' } },
    { tag: 'script', attrs: { type: 'text/ng-template' } },
    { tag: 'template' }
];

const mod: HtmlnanoModule<MinifyHtmlTemplateOptions> = {
    async default(tree, options, moduleOptions) {
        const rules = resolveTemplateRules(moduleOptions);
        if (!rules.length) {
            return tree;
        }

        const { default: htmlnano, process: processHtml } = await import('../index.js');

        const innerOptions: HtmlnanoOptions = {
            ...options,
            minifyHtmlTemplate: false,
            skipConfigLoading: true
        };

        const promises: Promise<void>[] = [];
        let inPlaintext = false;

        function visit(nodes: PostHTMLNodeLike[], minify = true): void {
            for (const node of nodes) {
                if (inPlaintext) return;
                if (!node || typeof node === 'string') continue;
                const tag = node.tag?.toLowerCase() ?? '';
                // Plaintext consumes the rest of the document, even beyond
                // the closing tag that PostHTML may put in its tree.
                if (tag === 'plaintext') {
                    inPlaintext = true;
                    return;
                }

                const attrs = normalizeNodeAttrs(node);
                if (!minify || !matchesTemplateRule(node, attrs, rules)) {
                    if (!textElements.has(tag) && node.content) {
                        visit(typeof node.content === 'string' ? [node.content] : node.content, minify);
                    }
                    continue;
                }

                const content = typeof node.content === 'string' ? [node.content] : node.content;
                const isTextElement = textElements.has(tag);
                // Scan native template subtrees for plaintext without scheduling
                // their nested templates for a second, concurrent inner run.
                if (!isTextElement && content) visit(content, false);

                if (hasOwn(attrs, 'integrity')) {
                    continue;
                }

                if (tag === 'script' && hasOwn(attrs, 'src')) {
                    continue;
                }

                if (!content?.some(child => typeof child !== 'string' || child.trim().length > 0)) {
                    continue;
                }

                const promise = (isTextElement
                    ? processHtml(collectNodeContent(tree, node), innerOptions, {}, { ...tree.options, skipParse: false })
                    // @ts-expect-error -- PostHTML supports trees with skipParse, but its types accept only strings
                    : posthtml([htmlnano(innerOptions, {})]).process(content, { ...tree.options, skipParse: true }))
                    .then((result) => {
                        if (isTextElement && hasUnsafeTextContent(tag, result.html)) {
                            return;
                        }
                        // Keep parsed HTML as nodes so later content handlers do
                        // not interpret serialized attribute values as text.
                        node.content = isTextElement
                            ? [result.html]
                            : [...result.tree as unknown as PostHTMLNodeLike[]];
                    });

                promises.push(promise);
            }
        }

        visit(tree);

        return Promise.all(promises).then(() => tree);
    }
};

export default mod;

function hasUnsafeTextContent(tag: string, html: string): boolean {
    // Text-only elements ignore HTML attribute quotes. Decoding a reference
    // there can close the container. The tag comes from textElements, whose
    // names contain no regular expression metacharacters.
    if (new RegExp(`</${tag}(?=[\\t\\n\\f\\r />])`, 'i').test(html)) {
        return true;
    }
    // Script data can also enter the double-escaped state and swallow its
    // closing tag, along with the following document content.
    return tag === 'script' && /<!--[\s\S]*<script(?=[\t\n\f\r />])/i.test(html);
}

function resolveTemplateRules(moduleOptions: MinifyHtmlTemplateOptions | undefined): NormalizedRule[] {
    if (!moduleOptions || moduleOptions === true) {
        return normalizeRules(defaultRules);
    }

    if (Array.isArray(moduleOptions)) {
        return normalizeRules(moduleOptions);
    }

    return normalizeRules(defaultRules);
}

function normalizeRules(rules: HtmlnanoTemplateRule[]): NormalizedRule[] {
    const normalized: NormalizedRule[] = [];

    for (const rule of rules) {
        const resolved = normalizeRule(rule);
        if (resolved) {
            normalized.push(resolved);
        }
    }

    return normalized;
}

function normalizeRule(rule: HtmlnanoTemplateRule): NormalizedRule | null {
    if (rule && typeof rule === 'object') {
        if (typeof rule.tag !== 'string' || !rule.tag.trim()) {
            return null;
        }

        const attrs: Record<string, string | boolean> = {};

        if (rule.attrs && typeof rule.attrs === 'object') {
            for (const [name, value] of Object.entries(rule.attrs)) {
                if (typeof name !== 'string' || !name.trim()) {
                    continue;
                }
                attrs[name.toLowerCase()] = value ?? true;
            }
        }

        return {
            tag: rule.tag.toLowerCase(),
            attrs: Object.keys(attrs).length ? attrs : undefined
        };
    }

    return null;
}

function matchesTemplateRule(node: PostHTML.Node, attrs: Record<string, string | boolean | void>, rules: NormalizedRule[]): boolean {
    const tag = node.tag?.toLowerCase();
    if (!tag) {
        return false;
    }

    for (const rule of rules) {
        if (tag !== rule.tag) {
            continue;
        }

        if (!rule.attrs) {
            return true;
        }

        let match = true;

        for (const [attrName, ruleValue] of Object.entries(rule.attrs)) {
            if (!hasOwn(attrs, attrName)) {
                match = false;
                break;
            }

            if (ruleValue === true) {
                continue;
            }

            const nodeValue = normalizeAttrValue(attrName, attrs[attrName]);
            const normalizedRuleValue = normalizeAttrValue(attrName, ruleValue);
            if (nodeValue !== normalizedRuleValue) {
                match = false;
                break;
            }
        }

        if (match) {
            return true;
        }
    }

    return false;
}

function normalizeNodeAttrs(node: PostHTML.Node): Record<string, string | boolean | void> {
    if (!node.attrs) {
        return {};
    }

    const normalized: Record<string, string | boolean | void> = {};
    for (const [key, value] of Object.entries(node.attrs)) {
        normalized[key.toLowerCase()] = value;
    }

    return normalized;
}

function normalizeAttrValue(attrName: string, value: string | boolean | void): string | boolean | void {
    if (typeof value !== 'string') {
        return value;
    }

    if (attrName === 'type') {
        return normalizeMimeType(value);
    }

    return value;
}

function collectNodeContent(tree: PostHTMLTreeLike, node: PostHTML.Node) {
    if (!node.content) {
        return '';
    }

    const content = typeof node.content === 'string' ? [node.content] : node.content;
    let html = '';

    for (const child of content) {
        if (typeof child === 'string') {
            html += child;
        } else {
            html += tree.render(child, tree.options);
        }
    }

    return html;
}
