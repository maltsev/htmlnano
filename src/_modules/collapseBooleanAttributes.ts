// Source: https://github.com/kangax/html-minifier/issues/63
// https://html.spec.whatwg.org/#boolean-attribute

import type { HtmlnanoModule } from '../types';

// https://html.spec.whatwg.org/#attributes-1
const htmlBooleanAttributes = new Set([
    'allowfullscreen',
    'allowpaymentrequest',
    'allowtransparency',
    'async',
    'autofocus',
    'autoplay',
    'checked',
    'compact',
    'controls',
    'declare',
    'default',
    'defaultchecked',
    'defaultmuted',
    'defaultselected',
    'defer',
    'disabled',
    'enabled',
    'formnovalidate',
    'hidden',
    'indeterminate',
    'inert',
    'ismap',
    'itemscope',
    'loop',
    'multiple',
    'muted',
    'nohref',
    'nomodule',
    'noresize',
    'noshade',
    'novalidate',
    'nowrap',
    'open',
    'pauseonexit',
    'playsinline',
    'readonly',
    'required',
    'reversed',
    'scoped',
    'seamless',
    'selected',
    'shadowrootclonable',
    'shadowrootdelegatesfocus',
    'shadowrootserializable',
    'sortable',
    'truespeed',
    'typemustmatch',
    'visible'
]);

const amphtmlBooleanAttributes = new Set([
    '⚡',
    'amp',
    '⚡4ads',
    'amp4ads',
    '⚡4email',
    'amp4email',

    'amp-custom',
    'amp-boilerplate',
    'amp4ads-boilerplate',
    'amp4email-boilerplate',

    'allow-blocked-ranges',
    'amp-access-hide',
    'amp-access-template',
    'amp-keyframes',
    'animate',
    'arrows',
    'data-block-on-consent',
    'data-enable-refresh',
    'data-multi-size',
    'date-template',
    'disable-double-tap',
    'disable-session-states',
    'disableremoteplayback',
    'dots',
    'expand-single-section',
    'expanded',
    'fallback',
    'first',
    'fullscreen',
    'inline',
    'lightbox',
    'noaudio',
    'noautoplay',
    'noloading',
    'once',
    'open-after-clear',
    'open-after-select',
    'open-button',
    'placeholder',
    'preload',
    'reset-on-refresh',
    'reset-on-resize',
    'resizable',
    'rotate-to-fullscreen',
    'second',
    'standalone',
    'stereo',
    'submit-error',
    'submit-success',
    'submitting',
    'subscriptions-actions',
    'subscriptions-dialog'
]);

const missingValueDefaultEmptyStringAttributes: Record<string, Record<string, string>> = {
    // https://html.spec.whatwg.org/#attr-media-preload
    audio: {
        preload: 'auto'
    },
    video: {
        preload: 'auto'
    }
};

const tagsHasMissingValueDefaultEmptyStringAttributes = new Set(Object.keys(missingValueDefaultEmptyStringAttributes));

export interface CollapseBooleanAttributesOptions {
    amphtml: boolean;
}

const mod: HtmlnanoModule<CollapseBooleanAttributesOptions> = {
    onAttrs(options, moduleOptions) {
        return (attrs, node) => {
            if (!node.tag) return attrs;

            const newAttrs = attrs;
            const tagName = node.tag.toLowerCase();

            if (tagsHasMissingValueDefaultEmptyStringAttributes.has(tagName)) {
                const tagAttributesCanBeReplacedWithEmptyString = missingValueDefaultEmptyStringAttributes[tagName];

                for (const attributeName of Object.keys(tagAttributesCanBeReplacedWithEmptyString)) {
                    if (
                        attributeName in attrs
                        && typeof attrs[attributeName] === 'string'
                        && attrs[attributeName].toLowerCase() === tagAttributesCanBeReplacedWithEmptyString[attributeName]
                    ) {
                        attrs[attributeName] = true;
                    }
                }
            }

            for (const attrName of Object.keys(attrs)) {
                const attrNameLower = attrName.toLowerCase();

                if (attrNameLower === 'visible' && tagName.startsWith('a-')) {
                    continue;
                }

                if (htmlBooleanAttributes.has(attrNameLower)) {
                    // https://html.spec.whatwg.org/#the-hidden-attribute
                    // "until-found" is a distinct state and must not be collapsed to bare "hidden".
                    if (
                        attrNameLower === 'hidden'
                        && typeof newAttrs[attrName] === 'string'
                        && (newAttrs[attrName]).toLowerCase() === 'until-found'
                    ) {
                        continue;
                    }

                    newAttrs[attrName] = true;
                    continue;
                }

                // Fast path optimization.
                // The rest of tranformations are only for string type attrValue.
                const attrValue = newAttrs[attrName];
                if (typeof attrValue !== 'string') continue;
                const attrValueLower = attrValue.toLowerCase();

                if (
                    moduleOptions.amphtml
                    && amphtmlBooleanAttributes.has(attrNameLower)
                    && (attrValue === '' || attrValueLower === 'true' || attrValueLower === attrNameLower)
                ) {
                    newAttrs[attrName] = true;
                    continue;
                }

                // https://html.spec.whatwg.org/#a-quick-introduction-to-html
                // The value, along with the "=" character, can be omitted altogether if the value is the empty string.
                if (attrValue === '') {
                    newAttrs[attrName] = true;
                    continue;
                }

                // collapse crossorigin attributes
                // Specification: https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes
                if (attrNameLower === 'crossorigin' && attrValueLower === 'anonymous') {
                    newAttrs[attrName] = true;
                    continue;
                }

                // collapse popover="auto" to bare popover
                // The empty string and "auto" map to the same state.
                // Specification: https://html.spec.whatwg.org/multipage/popover.html#attr-popover
                if (attrNameLower === 'popover' && attrValueLower === 'auto') {
                    newAttrs[attrName] = true;
                }
            }

            return newAttrs;
        };
    }
};

export default mod;
