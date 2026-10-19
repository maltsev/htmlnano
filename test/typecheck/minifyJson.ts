import type { HtmlnanoMinifyJsonOptions, HtmlnanoOptions } from '../../dist/index.mjs';

export const attributes: string[] = [
    'data-current-styles',
    'data-current-context'
];
export const jsonOptions: HtmlnanoMinifyJsonOptions = { attributes };
export const options: HtmlnanoOptions[] = [
    { minifyJson: true },
    { minifyJson: false },
    { minifyJson: {} },
    { minifyJson: { autoDetect: true } },
    { minifyJson: { autoDetect: false, attributes } },
    { minifyJson: jsonOptions }
];

export const invalidRegexp: HtmlnanoMinifyJsonOptions = {
    // @ts-expect-error Attribute names must be strings, not regular expressions.
    attributes: [/^data-/]
};
export const invalidRuleObject: HtmlnanoMinifyJsonOptions = {
    // @ts-expect-error Attribute names must be strings, not rule objects.
    attributes: [{ name: 'data-json', tag: 'div' }]
};
export const invalidAttributes: HtmlnanoMinifyJsonOptions = {
    // @ts-expect-error Attribute selection requires a list.
    attributes: 'data-json'
};
export const invalidAutoDetect: HtmlnanoMinifyJsonOptions = {
    // @ts-expect-error Automatic detection requires a boolean.
    autoDetect: 'data-*'
};
