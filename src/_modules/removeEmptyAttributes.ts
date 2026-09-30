import { isEventHandler } from '../helpers';
import type { HtmlnanoModule } from '../types';

const safeToRemoveAttrs: Record<string, string[] | null> = {
    id: null,
    class: null,
    style: null,
    title: null,
    lang: null,
    dir: null,
    abbr: ['th'],
    accept: ['input'],
    'accept-charset': ['form'],
    charset: ['meta', 'script'],
    action: ['form'],
    cols: ['textarea'],
    colspan: ['td', 'th'],
    coords: ['area'],
    dirname: ['input', 'textarea'],
    dropzone: null,
    headers: ['td', 'th'],
    form: [
        'button',
        'fieldset',
        'input',
        'keygen',
        'object',
        'output',
        'select',
        'textarea'
    ],
    formaction: ['button', 'input'],
    height: ['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'],
    high: ['meter'],
    href: ['link'],
    list: ['input'],
    low: ['meter'],
    manifest: ['html'],
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
    pattern: ['input'],
    ping: ['a', 'area'],
    placeholder: ['input', 'textarea'],
    poster: ['video'],
    rel: ['a', 'area', 'link'],
    rows: ['textarea'],
    rowspan: ['td', 'th'],
    size: ['input', 'select'],
    span: ['col', 'colgroup'],
    src: [
        'audio',
        'embed',
        'iframe',
        'img',
        'input',
        'script',
        'source',
        'track',
        'video'
    ],
    start: ['ol'],
    tabindex: null,
    type: [
        'a',
        'link',
        'button',
        'embed',
        'object',
        'script',
        'source',
        'style',
        'input',
        'menu',
        'menuitem',
        'ol'
    ],
    value: ['button', 'input', 'li'],
    width: ['canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video']
};

const mod: HtmlnanoModule = {
    onAttrs() {
        return (attrs, node) => {
            const newAttrs = { ...attrs };
            const tagName = typeof node.tag === 'string' ? node.tag.toLowerCase() : '';
            Object.entries(attrs).forEach(([attrName, attrValue]) => {
                const normalizedAttrName = attrName.toLowerCase();
                const safeAttr = safeToRemoveAttrs[normalizedAttrName];
                if (
                    isEventHandler(attrName, tagName)
                    || (
                        safeAttr !== undefined
                        && (safeAttr === null || (tagName && safeAttr.includes(tagName)))
                    )
                ) {
                    if (attrValue === null || attrValue === undefined) {
                        delete newAttrs[attrName];
                    } else if (typeof attrValue === 'string' && attrValue.trim() === '') {
                        delete newAttrs[attrName];
                    }
                }
            });

            return newAttrs;
        };
    }
};
export default mod;
