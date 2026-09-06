import type PostHTML from 'posthtml';
import type { PostHTMLNodeLike } from './types';

const ampBoilerplateAttributes = [
    'amp-boilerplate',
    'amp4ads-boilerplate',
    'amp4email-boilerplate'
];

const cssCdataStart = '<![CDATA[';
const cssCdataEnd = ']]>';

/**
 * `key in object` walks the prototype chain, so names like `__proto__`,
 * `constructor` or `toString` pass a naive "is this a known name" test against
 * any lookup object. Membership tests must therefore check own properties only.
 *
 * `Object.hasOwn` isn't used because the compilation target is ES2019.
 */
export function hasOwn(object: object, key: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(object, key);
}

export function isAmpBoilerplate(node: PostHTML.Node) {
    if (!node.attrs) {
        return false;
    }
    for (const attr of ampBoilerplateAttributes) {
        if (hasOwn(node.attrs, attr)) {
            return true;
        }
    }
    return false;
}

export function isComment(content: PostHTMLNodeLike | null) {
    if (typeof content === 'string') {
        return content.trim().startsWith('<!--');
    }
    return false;
}

export function isConditionalComment(content: string) {
    const clean = (content || '').trim();
    return clean.startsWith('<!--[if') || clean === '<!--<![endif]-->';
}

export function isStyleNode(node: PostHTML.Node) {
    return node.tag === 'style' && !isAmpBoilerplate(node) && 'content' in node && node.content && node.content.length > 0;
}

export function extractCssFromStyleNode(node: PostHTML.Node) {
    return Array.isArray(node.content) ? (node.content as string[]).join(' ') : node.content;
}

export function stripCssCdata(css: string): { strippedCss: string; isCdataWrapped: boolean } {
    const trimmed = css.trim();
    if (!trimmed.startsWith(cssCdataStart) || !trimmed.endsWith(cssCdataEnd)) {
        return { strippedCss: css, isCdataWrapped: false };
    }

    const strippedCss = trimmed.slice(cssCdataStart.length, trimmed.length - cssCdataEnd.length);
    return { strippedCss, isCdataWrapped: true };
}

export function wrapCssCdata(css: string, isCdataWrapped: boolean): string {
    if (!isCdataWrapped) {
        return css;
    }
    return `${cssCdataStart}${css}${cssCdataEnd}`;
}

export function isCssStyleType(node: PostHTML.Node): boolean {
    if (!node.attrs || !('type' in node.attrs)) {
        return true;
    }

    const rawType = node.attrs.type;
    if (rawType === '') {
        return true;
    }

    if (typeof rawType !== 'string') {
        return false;
    }

    const normalizedType = rawType.trim().toLowerCase();
    return /^text\/css(?:$|\s*;)/.test(normalizedType);
}

export function normalizeMimeType(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }
    const [mimeType] = trimmed.split(';');
    return mimeType.trim().toLowerCase();
}

export function isEventHandler(attributeName: string) {
    return attributeName && attributeName.slice(0, 2).toLowerCase() === 'on' && attributeName.length >= 5;
}

export function extractTextContentFromNode(node: PostHTML.Node): string {
    if (!node.content) {
        return '';
    }
    if (!Array.isArray(node.content)) {
        return '';
    }

    let content = '';
    for (const child of node.content) {
        if (typeof child === 'string') {
            content += child;
        }
    }

    return content;
}

export async function optionalImport<Module = unknown, Default = Module>(moduleName: string) {
    try {
        const module = (await import(moduleName)) as Module & { default?: Default };
        return module.default || module;
    } catch (e) {
        if (typeof e === 'object' && e && 'code' in e && (e.code === 'MODULE_NOT_FOUND' || e.code === 'ERR_MODULE_NOT_FOUND')) {
            return null;
        }
        throw e;
    }
}
