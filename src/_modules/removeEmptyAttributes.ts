import { decodeHTMLAttribute } from 'entities';
import { getTagName, hasOwn, isEventHandler } from '../helpers';
import type { HtmlnanoModule } from '../types';

// Empty title/lang override inheritance; form/formaction/headers/pattern and
// resource URLs also have different behavior when present but empty. In
// particular, removing a script's src can enable its ignored inline body.
const safeToRemoveAttrs: Record<string, string[] | null> = {
    id: null,
    class: null,
    style: null,
    dir: null,
    abbr: ['th'],
    accept: ['input'],
    'accept-charset': ['form'],
    charset: ['script'],
    action: ['form'],
    cols: ['textarea'],
    colspan: ['td', 'th'],
    coords: ['area'],
    dirname: ['input', 'textarea'],
    dropzone: null,
    height: ['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'],
    high: ['meter'],
    list: ['input'],
    low: ['meter'],
    max: ['meter', 'progress'],
    maxlength: ['input', 'textarea'],
    menu: ['button'],
    min: ['meter'],
    minlength: ['input', 'textarea'],
    name: [
        'button',
        'fieldset',
        'input',
        'keygen',
        'output',
        'select',
        'textarea',
        'form',
        'map',
        'meta',
        'param',
        'slot'
    ],
    ping: ['a', 'area'],
    placeholder: ['input', 'textarea'],
    poster: ['video'],
    rel: ['a', 'area', 'link'],
    rows: ['textarea'],
    rowspan: ['td', 'th'],
    size: ['input', 'select'],
    span: ['col', 'colgroup'],
    start: ['ol'],
    tabindex: null,
    type: [
        'a',
        'button',
        'script',
        'style',
        'input',
        'menu',
        'menuitem',
        'ol'
    ],
    value: ['button', 'input', 'li'],
    width: ['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video']
};

// Only these attributes treat ASCII whitespace as an empty value. Free text,
// identifiers, URLs and MIME types can give whitespace its own meaning.
const whitespaceOnlyAttrs = new Set([
    'class', 'style', 'dir', 'accept', 'accept-charset', 'charset', 'cols',
    'colspan', 'coords', 'dropzone', 'height', 'high', 'low', 'max', 'maxlength',
    'min', 'minlength', 'ping', 'rel', 'rows', 'rowspan', 'size', 'span', 'start',
    'tabindex', 'width'
]);

// Checkbox/radio default to "on"; submit/reset buttons have default labels.
const inputTypesWithValueDefaults = new Set(['checkbox', 'radio', 'submit', 'reset']);

const mod: HtmlnanoModule = {
    onAttrs() {
        return (attrs, node) => {
            const newAttrs = { ...attrs };
            const tagName = getTagName(node);
            Object.entries(attrs).forEach(([attrName, attrValue]) => {
                const normalizedAttrName = attrName.toLowerCase();
                // <bdi> defaults to auto only when dir is absent. A script's
                // empty type overrides legacy language; whitespace-only type
                // disables script/style processing and must always be kept.
                if (
                    (normalizedAttrName === 'dir' && tagName === 'bdi')
                    || (normalizedAttrName === 'type' && tagName === 'script' && hasOwn(attrs, 'language'))
                    || (normalizedAttrName === 'dropzone' && tagName.includes('-'))
                ) return;

                if (
                    normalizedAttrName === 'value'
                    && tagName === 'input'
                    && typeof attrs.type === 'string'
                    && inputTypesWithValueDefaults.has(decodeHTMLAttribute(attrs.type).toLowerCase())
                ) return;

                const safeAttr = hasOwn(safeToRemoveAttrs, normalizedAttrName)
                    ? safeToRemoveAttrs[normalizedAttrName]
                    : undefined;
                const eventHandler = isEventHandler(attrName, tagName);
                if (
                    eventHandler
                    || (
                        safeAttr !== undefined
                        && (safeAttr === null || (tagName && safeAttr.includes(tagName)))
                    )
                ) {
                    if (attrValue === null || attrValue === undefined) {
                        delete newAttrs[attrName];
                    } else if (
                        typeof attrValue === 'string'
                        && (
                            attrValue === ''
                            || (eventHandler && attrValue.trim() === '')
                            || (whitespaceOnlyAttrs.has(normalizedAttrName) && /^[\t\n\f\r ]*$/.test(attrValue))
                        )
                    ) {
                        delete newAttrs[attrName];
                    }
                }
            });

            return newAttrs;
        };
    }
};
export default mod;
