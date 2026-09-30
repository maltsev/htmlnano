import {
    defaultTreeAdapter,
    html,
    parse,
    parseFragment
} from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';

type Namespace = 'html' | 'mathml' | 'svg';

export type DomParseOptions
    = | { kind: 'document' }
        | {
            kind: 'fragment';
            context?: {
                tagName: string;
                namespace?: Namespace;
            };
        };

export type SafePresetName = 'ampSafe' | 'safe';

type NormalizedAttribute = {
    name: string;
    namespace: string | null;
    prefix: string | null;
    value: string;
};

type NormalizedNode = {
    type: string;
    attributes?: NormalizedAttribute[];
    children?: NormalizedNode[];
    mode?: string;
    name?: string;
    namespace?: string;
    publicId?: string;
    systemId?: string;
    value?: string;
};

const ASCII_WHITESPACE = /[\t\n\f\r ]+/g;
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);
const PROTECTED_TEXT_ELEMENTS = new Set(['pre', 'textarea']);
// Default HTML block boundaries do not render adjacent collapsed whitespace.
// Unknown/custom and foreign elements are deliberately excluded: their text
// boundaries cannot be assumed to behave like HTML blocks.
const BLOCK_ELEMENTS = new Set([
    'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'center',
    'dd', 'details', 'dialog', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
    'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head',
    'header', 'hgroup', 'hr', 'html', 'li', 'main', 'menu', 'nav', 'ol', 'p',
    'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);
const SVG_CONTAINER_ELEMENTS = new Set(['svg', 'g', 'defs', 'symbol', 'clipPath', 'mask', 'marker', 'pattern']);

// These values are states rather than meaningful strings. htmlnano is allowed
// to serialize them in their shortest form, and parse5 exposes that spelling as
// the attribute value, so canonicalize the state before comparing attributes.
// null denotes a global HTML boolean attribute. Element-specific attributes
// remain ordinary strings on custom elements and in SVG/MathML namespaces.
const BOOLEAN_ATTRIBUTES = new Map<string, Set<string> | null>([
    ['allowfullscreen', new Set(['iframe'])],
    ['allowpaymentrequest', new Set(['iframe'])],
    ['async', new Set(['script'])],
    ['autofocus', null],
    ['autoplay', new Set(['audio', 'video'])],
    ['checked', new Set(['input'])],
    ['compact', new Set(['dir', 'dl', 'menu', 'ol', 'ul'])],
    ['controls', new Set(['audio', 'video'])],
    ['declare', new Set(['object'])],
    ['default', new Set(['track'])],
    ['defer', new Set(['script'])],
    ['disabled', new Set(['button', 'fieldset', 'input', 'link', 'optgroup', 'option', 'select', 'textarea'])],
    ['formnovalidate', new Set(['button', 'input'])],
    ['hidden', null],
    ['inert', null],
    ['ismap', new Set(['img'])],
    ['itemscope', null],
    ['loop', new Set(['audio', 'marquee', 'video'])],
    ['multiple', new Set(['input', 'select'])],
    ['muted', new Set(['audio', 'video'])],
    ['nohref', new Set(['area'])],
    ['nomodule', new Set(['script'])],
    ['noresize', new Set(['frame'])],
    ['noshade', new Set(['hr'])],
    ['novalidate', new Set(['form'])],
    ['nowrap', new Set(['td', 'th'])],
    ['open', new Set(['details', 'dialog'])],
    ['pauseonexit', new Set(['track'])],
    ['playsinline', new Set(['video'])],
    ['readonly', new Set(['input', 'textarea'])],
    ['required', new Set(['input', 'select', 'textarea'])],
    ['reversed', new Set(['ol'])],
    ['scoped', new Set(['style'])],
    ['seamless', new Set(['iframe'])],
    ['selected', new Set(['option'])],
    ['shadowrootclonable', new Set(['template'])],
    ['shadowrootdelegatesfocus', new Set(['template'])],
    ['shadowrootserializable', new Set(['template'])],
    ['truespeed', new Set(['marquee'])],
    ['typemustmatch', new Set(['object'])]
]);

const AMP_BOOLEAN_ATTRIBUTES = new Set([
    '⚡', 'amp', '⚡4ads', 'amp4ads', '⚡4email', 'amp4email',
    'amp-boilerplate', 'amp-custom', 'amp-keyframes', 'animate', 'arrows',
    'data-block-on-consent', 'data-enable-refresh', 'fallback', 'first',
    'fullscreen', 'inline', 'lightbox', 'noloading', 'placeholder', 'resizable',
    'second', 'standalone', 'submit-error', 'submit-success', 'submitting'
]);

const LIST_ATTRIBUTES = new Set([
    'class', 'dropzone', 'headers', 'ping', 'rel', 'sandbox'
]);
const CASE_INSENSITIVE_LIST_ATTRIBUTES = new Set([
    'dropzone', 'rel', 'sandbox', 'sizes'
]);

const CASE_INSENSITIVE_ATTRIBUTES = new Map<string, Set<string> | null>([
    ['autocomplete', new Set(['form'])],
    ['charset', new Set(['meta', 'script'])],
    ['contenteditable', null],
    ['crossorigin', new Set(['audio', 'img', 'link', 'script', 'video'])],
    ['dir', null],
    ['draggable', null],
    ['dropzone', null],
    ['fetchpriority', new Set(['img', 'link', 'script'])],
    ['formmethod', new Set(['button', 'input'])],
    ['inputmode', new Set(['input', 'textarea'])],
    ['kind', new Set(['track'])],
    ['method', new Set(['form'])],
    ['preload', new Set(['audio', 'video'])],
    ['referrerpolicy', null],
    ['sandbox', new Set(['iframe'])],
    ['scope', new Set(['th'])],
    ['shape', new Set(['area'])],
    ['sizes', new Set(['link'])],
    ['spellcheck', null],
    ['step', new Set(['input'])],
    ['translate', null],
    ['type', new Set([
        'a', 'button', 'embed', 'input', 'link', 'menu', 'menuitem', 'object',
        'script', 'source', 'style'
    ])],
    ['wrap', new Set(['textarea'])]
]);

// Empty values in this table have the same element state as a missing value in
// the safe preset's compatibility contract. Keep this list aligned with
// removeEmptyAttributes; attributes outside it are compared normally.
const REMOVABLE_EMPTY_ATTRIBUTES = new Map<string, Set<string> | null>([
    ['id', null], ['class', null], ['style', null], ['title', null], ['lang', null],
    ['dir', null], ['abbr', new Set(['th'])], ['accept', new Set(['input'])],
    ['accept-charset', new Set(['form'])], ['charset', new Set(['meta', 'script'])],
    ['action', new Set(['form'])], ['cols', new Set(['textarea'])],
    ['colspan', new Set(['td', 'th'])], ['coords', new Set(['area'])],
    ['dirname', new Set(['input', 'textarea'])], ['dropzone', null],
    ['headers', new Set(['td', 'th'])],
    ['form', new Set(['button', 'fieldset', 'input', 'keygen', 'object', 'output', 'select', 'textarea'])],
    ['formaction', new Set(['button', 'input'])],
    ['height', new Set(['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'])],
    ['href', new Set(['link'])], ['list', new Set(['input'])],
    ['name', new Set(['button', 'fieldset', 'form', 'input', 'keygen', 'map', 'meta', 'output', 'param', 'select', 'slot', 'textarea'])],
    ['placeholder', new Set(['input', 'textarea'])], ['rel', new Set(['a', 'area', 'link'])],
    ['rows', new Set(['textarea'])], ['src', new Set(['audio', 'embed', 'iframe', 'img', 'input', 'script', 'source', 'track', 'video'])],
    ['tabindex', null], ['type', new Set(['a', 'button', 'embed', 'input', 'link', 'menu', 'menuitem', 'object', 'ol', 'script', 'source', 'style'])],
    ['value', new Set(['button', 'input', 'li'])],
    ['width', new Set(['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'])]
]);

const NAMESPACES: Record<Namespace, html.NS> = {
    html: html.NS.HTML,
    mathml: html.NS.MATHML,
    svg: html.NS.SVG
};

/**
 * Assert equivalence at the safe presets' browser-compatibility boundary.
 *
 * parse5 never executes scripts. The comparison deliberately ignores source
 * locations and parent pointers, canonicalizes documented safe reductions,
 * and retains everything capable of changing the parsed tree: document mode,
 * node kind, namespace, tag name, attribute set, preserved content and order.
 */
export function assertSafeDomEquivalent(
    source: string,
    output: string,
    preset: SafePresetName,
    parseOptions: DomParseOptions
): void {
    const sourceDom = normalizeRoot(parseHtml(source, parseOptions), preset);
    const outputDom = normalizeRoot(parseHtml(output, parseOptions), preset);
    const difference = findDifference(sourceDom, outputDom, '$');

    if (difference) {
        const parseDescription = parseOptions.kind === 'document'
            ? 'document'
            : `fragment in <${parseOptions.context?.tagName ?? 'div'}>`;
        throw new Error(
            `DOM mismatch for ${preset} (${parseDescription}) at ${difference.path}\n`
            + `source: ${formatValue(difference.source)}\n`
            + `output: ${formatValue(difference.output)}`
        );
    }
}

function parseHtml(
    source: string,
    options: DomParseOptions
): DefaultTreeAdapterTypes.Document | DefaultTreeAdapterTypes.DocumentFragment {
    if (options.kind === 'document') {
        return parse(source);
    }

    const context = options.context;
    if (!context) {
        return parseFragment(source);
    }

    const element = defaultTreeAdapter.createElement(
        context.tagName,
        NAMESPACES[context.namespace ?? 'html'],
        []
    );
    return parseFragment(element, source);
}

function normalizeRoot(
    node: DefaultTreeAdapterTypes.Document | DefaultTreeAdapterTypes.DocumentFragment,
    preset: SafePresetName
): NormalizedNode {
    return {
        type: node.nodeName,
        ...('mode' in node ? { mode: node.mode } : {}),
        children: normalizeChildren(node.childNodes, preset)
    };
}

function normalizeChildren(
    nodes: DefaultTreeAdapterTypes.ChildNode[],
    preset: SafePresetName,
    parent?: DefaultTreeAdapterTypes.Element
): NormalizedNode[] {
    const normalized: NormalizedNode[] = [];

    for (const node of nodes) {
        const next = normalizeNode(node, preset);
        if (!next) continue;

        // Removing a comment can make its neighboring text nodes adjacent.
        // Coalesce them just as the browser DOM would after comment removal.
        const previous = normalized[normalized.length - 1];
        if (next.type === '#text' && previous?.type === '#text') {
            previous.value = `${previous.value ?? ''}${next.value ?? ''}`;
        } else {
            normalized.push(next);
        }
    }

    if (parent && (RAW_TEXT_ELEMENTS.has(parent.tagName) || PROTECTED_TEXT_ELEMENTS.has(parent.tagName))) {
        return normalized;
    }

    // Normalize after comment removal and text coalescing, so spaces separated
    // by a removed comment collapse just like adjacent spaces in the browser.
    return normalized.filter((node, index) => {
        if (node.type !== '#text') return true;

        let value = (node.value ?? '').replace(ASCII_WHITESPACE, ' ');
        if (value === ' ' && parent && (
            parent.namespaceURI === html.NS.HTML && parent.tagName === 'head'
            || parent.namespaceURI === html.NS.SVG && SVG_CONTAINER_ELEMENTS.has(parent.tagName)
        )) return false;
        const previous = adjacentContentNode(normalized, index, -1);
        const next = adjacentContentNode(normalized, index, 1);
        const parentIsBlock = parent?.namespaceURI === html.NS.HTML && BLOCK_ELEMENTS.has(parent.tagName);

        if (isBlockNode(previous) || !previous && parentIsBlock) value = value.replace(/^ /, '');
        if (isBlockNode(next) || !next && parentIsBlock) value = value.replace(/ $/, '');

        node.value = value;
        return value !== '';
    });
}

function adjacentContentNode(nodes: NormalizedNode[], index: number, direction: -1 | 1): NormalizedNode | undefined {
    for (let i = index + direction; i >= 0 && i < nodes.length; i += direction) {
        const node = nodes[i];
        if (node.type !== '#comment' && node.type !== '#documentType') return node;
    }
    return undefined;
}

function isBlockNode(node: NormalizedNode | undefined): boolean {
    return node?.type === 'element' && node.namespace === html.NS.HTML && BLOCK_ELEMENTS.has(node.name ?? '');
}

function normalizeNode(
    node: DefaultTreeAdapterTypes.ChildNode,
    preset: SafePresetName
): NormalizedNode | null {
    if (defaultTreeAdapter.isTextNode(node)) {
        const parent = node.parentNode;
        const parentName = parent && defaultTreeAdapter.isElementNode(parent)
            ? parent.tagName
            : '';

        if (RAW_TEXT_ELEMENTS.has(parentName)) {
            // CSS, JavaScript, JSON and HTML-template source are independently
            // minified. Their execution is intentionally outside this parser-only
            // harness; node presence and position remain covered.
            return { type: '#text', value: '<minified raw text>' };
        }

        if (PROTECTED_TEXT_ELEMENTS.has(parentName)) {
            return { type: '#text', value: node.value };
        }

        return { type: '#text', value: node.value };
    }

    if (defaultTreeAdapter.isCommentNode(node)) {
        return isPreservedComment(node.data)
            ? { type: '#comment', value: node.data }
            : null;
    }

    if (defaultTreeAdapter.isDocumentTypeNode(node)) {
        return {
            type: '#documentType',
            name: node.name,
            publicId: node.publicId,
            systemId: node.systemId
        };
    }

    const children = node.tagName === 'template'
        ? normalizeChildren((node as DefaultTreeAdapterTypes.Template).content.childNodes, preset, node)
        : normalizeChildren(node.childNodes, preset, node);

    return {
        type: 'element',
        name: node.tagName,
        namespace: node.namespaceURI,
        attributes: normalizeAttributes(node, preset),
        children
    };
}

function normalizeAttributes(
    element: DefaultTreeAdapterTypes.Element,
    preset: SafePresetName
): NormalizedAttribute[] {
    return element.attrs
        .filter(attribute => !isRemovableEmptyAttribute(element.tagName, attribute.name, attribute.value))
        .map(attribute => ({
            name: attribute.name,
            namespace: attribute.namespace ?? null,
            prefix: attribute.prefix ?? null,
            value: normalizeAttributeValue(element, attribute.name, attribute.value, preset)
        }))
        .sort((left, right) => attributeKey(left).localeCompare(attributeKey(right)));
}

function normalizeAttributeValue(
    element: DefaultTreeAdapterTypes.Element,
    name: string,
    value: string,
    preset: SafePresetName
): string {
    const lowerName = name.toLowerCase();

    const booleanTags = BOOLEAN_ATTRIBUTES.get(lowerName);
    if (element.namespaceURI === html.NS.HTML && (booleanTags === null || booleanTags?.has(element.tagName))) {
        if (lowerName === 'hidden' && value.toLowerCase() === 'until-found') return 'until-found';
        return '<present>';
    }

    if (
        preset === 'ampSafe'
        && element.namespaceURI === html.NS.HTML
        && AMP_BOOLEAN_ATTRIBUTES.has(lowerName)
        && (value === '' || value.toLowerCase() === lowerName || value.toLowerCase() === 'true')
    ) {
        return '<present>';
    }

    if (lowerName === 'crossorigin' && (value === '' || value.toLowerCase() === 'anonymous')) {
        return 'anonymous';
    }
    if (lowerName === 'popover' && (value === '' || value.toLowerCase() === 'auto')) {
        return 'auto';
    }
    if (lowerName === 'preload' && (element.tagName === 'audio' || element.tagName === 'video')) {
        return value === '' || value.toLowerCase() === 'auto' ? 'auto' : value;
    }

    if (lowerName === 'style' || lowerName.startsWith('on')) {
        return '<minified inline code>';
    }

    if (element.namespaceURI === html.NS.SVG && lowerName === 'd') {
        return '<minified path data>';
    }

    if (isMetaViewportContent(element, lowerName)) {
        return normalizeViewport(value);
    }

    if (isListAttribute(element.tagName, lowerName)) {
        const caseInsensitive = CASE_INSENSITIVE_LIST_ATTRIBUTES.has(lowerName);
        const seen = new Set<string>();
        const tokens: string[] = [];
        for (const token of value.split(ASCII_WHITESPACE).filter(Boolean)) {
            const key = caseInsensitive ? token.toLowerCase() : token;
            if (!seen.has(key)) {
                seen.add(key);
                tokens.push(caseInsensitive ? key : token);
            }
        }
        return tokens.sort((left, right) => left.localeCompare(right)).join(' ');
    }

    const tags = CASE_INSENSITIVE_ATTRIBUTES.get(lowerName);
    if (tags === null || tags?.has(element.tagName)) {
        return value.trim().toLowerCase();
    }

    return value;
}

function isListAttribute(tagName: string, attributeName: string): boolean {
    return LIST_ATTRIBUTES.has(attributeName)
        || attributeName === 'sizes' && tagName === 'link';
}

function isMetaViewportContent(element: DefaultTreeAdapterTypes.Element, attributeName: string): boolean {
    if (element.tagName !== 'meta' || attributeName !== 'content') return false;
    return element.attrs.some(attribute => (
        attribute.name.toLowerCase() === 'name'
        && attribute.value.trim().toLowerCase() === 'viewport'
    ));
}

function normalizeViewport(value: string): string {
    return value
        .trim()
        .split(/([,;])/)
        .map((part) => {
            if (part === ',' || part === ';') return part;
            const [key, rawValue, ...rest] = part.trim().split('=');
            if (rawValue === undefined || rest.length) return part.trim();
            const number = Number(rawValue.trim());
            const normalizedValue = Number.isFinite(number) ? String(number) : rawValue.trim();
            return `${key.trim()}=${normalizedValue}`;
        })
        .join('');
}

function isRemovableEmptyAttribute(tagName: string, name: string, value: string): boolean {
    if (value.trim() !== '') return false;
    if (name.toLowerCase().startsWith('on')) return true;
    const tags = REMOVABLE_EMPTY_ATTRIBUTES.get(name.toLowerCase());
    return tags === null || tags?.has(tagName) === true;
}

function isPreservedComment(value: string): boolean {
    const body = value.trim();
    return body.startsWith('!')
        || /^\/?\s*(?:noindex|sse)\s*$/i.test(body)
        || /^\[if\b|\[endif\]$/i.test(body)
        || /^more\b/i.test(body)
        || /^\[if\b[\s\S]*<!\[endif\]$/i.test(body);
}

function attributeKey(attribute: NormalizedAttribute): string {
    return `${attribute.namespace ?? ''}\u0000${attribute.prefix ?? ''}\u0000${attribute.name}\u0000${attribute.value}`;
}

type Difference = {
    path: string;
    source: unknown;
    output: unknown;
};

function findDifference(source: unknown, output: unknown, path: string): Difference | null {
    if (Object.is(source, output)) return null;

    if (
        source === null || output === null
        || typeof source !== 'object' || typeof output !== 'object'
    ) {
        return { path, source, output };
    }

    if (Array.isArray(source) || Array.isArray(output)) {
        if (!Array.isArray(source) || !Array.isArray(output)) {
            return { path, source, output };
        }
        const sourceArray = source as unknown[];
        const outputArray = output as unknown[];
        if (sourceArray.length !== outputArray.length) {
            return {
                path: `${path}.length`,
                source: sourceArray.map(summarizeArrayItem),
                output: outputArray.map(summarizeArrayItem)
            };
        }
        for (let index = 0; index < sourceArray.length; index++) {
            const item = sourceArray[index];
            const difference = findDifference(item, outputArray[index], `${path}[${index}]${arrayItemLabel(item)}`);
            if (difference) return difference;
        }
        return null;
    }

    const sourceRecord = source as Record<string, unknown>;
    const outputRecord = output as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(sourceRecord), ...Object.keys(outputRecord)])].sort();
    for (const key of keys) {
        if (!(key in sourceRecord) || !(key in outputRecord)) {
            return { path: `${path}.${key}`, source: sourceRecord[key], output: outputRecord[key] };
        }
        const difference = findDifference(sourceRecord[key], outputRecord[key], `${path}.${key}`);
        if (difference) return difference;
    }
    return null;
}

function arrayItemLabel(value: unknown): string {
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    const label = typeof record.name === 'string' ? record.name : record.type;
    return typeof label === 'string' ? `<${label}>` : '';
}

function summarizeArrayItem(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    return {
        type: record.type,
        ...typeof record.name === 'string' ? { name: record.name } : {}
    };
}

function formatValue(value: unknown): string {
    const formatted = JSON.stringify(value);
    if (formatted === undefined) return String(value);
    return formatted.length <= 240 ? formatted : `${formatted.slice(0, 237)}...`;
}
