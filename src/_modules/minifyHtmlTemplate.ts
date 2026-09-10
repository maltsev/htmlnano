import type PostHTML from 'posthtml';
import { hasOwn, normalizeMimeType } from '../helpers';
import type { HtmlnanoModule, HtmlnanoOptions, HtmlnanoTemplateRule, MinifyHtmlTemplateOptions, PostHTMLTreeLike } from '../types';

type NormalizedRule = {
    tag: string;
    attrs?: Record<string, string | boolean>;
};

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

        const { process: processHtml } = await import('../index.js');

        const innerOptions: HtmlnanoOptions = {
            ...options,
            minifyHtmlTemplate: false,
            skipConfigLoading: true
        };

        const promises: Promise<void>[] = [];

        tree.walk((node) => {
            if (!node.tag) {
                return node;
            }

            if (!matchesTemplateRule(node, rules)) {
                return node;
            }

            if (node.attrs && 'integrity' in node.attrs) {
                return node;
            }

            if (node.tag === 'script' && node.attrs && 'src' in node.attrs) {
                return node;
            }

            const rawContent = collectNodeContent(tree, node);
            if (rawContent.trim().length === 0) {
                return node;
            }

            const promise = processHtml(rawContent, innerOptions, {}, {})
                .then((result) => {
                    node.content = [result.html];
                });

            promises.push(promise);

            return node;
        });

        return Promise.all(promises).then(() => tree);
    }
};

export default mod;

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

function matchesTemplateRule(node: PostHTML.Node, rules: NormalizedRule[]): boolean {
    const tag = node.tag?.toLowerCase();
    if (!tag) {
        return false;
    }

    const attrs = normalizeNodeAttrs(node);

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
            html += tree.render(child);
        }
    }

    return html;
}
