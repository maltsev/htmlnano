import type { HtmlnanoJsonAttributeRule, HtmlnanoMinifyJsonOptions, HtmlnanoOptions } from '../../dist/index.mjs';

export const rules: HtmlnanoJsonAttributeRule[] = [
    'data-current-styles',
    { name: 'data-current-context', tag: 'section' }
];
export const jsonOptions: HtmlnanoMinifyJsonOptions = { attributes: rules };
export const options: HtmlnanoOptions[] = [
    { minifyJson: true },
    { minifyJson: false },
    { minifyJson: {} },
    { minifyJson: jsonOptions }
];

export const invalidName: HtmlnanoJsonAttributeRule = {
    // @ts-expect-error Attribute names must be strings.
    name: 1
};
export const invalidTag: HtmlnanoJsonAttributeRule = {
    name: 'data-json',
    // @ts-expect-error Tag restrictions must be strings.
    tag: ['div']
};
export const invalidAttributes: HtmlnanoMinifyJsonOptions = {
    // @ts-expect-error Attribute selection requires a list.
    attributes: 'data-json'
};
