import { decodeHTMLAttribute } from 'entities';
import { Buffer } from 'node:buffer';
import { getTagName, normalizeMimeType } from '../helpers.js';
import type { HtmlnanoMinifyJsonOptions, HtmlnanoModule } from '../types.js';

const rNodeAttrsTypeJson = /(?:\/|\+)json$/i;

/** Remove JSON whitespace without reserializing numbers or object members. */
function minifyJson(content: string): string | null {
    try {
        // Validation alone may round numbers, but the parsed value is discarded.
        JSON.parse(content);
        // Match complete strings before whitespace to preserve their contents.
        return content.replace(/"(?:[^"\\]|\\[\s\S])*"|[\t\n\r ]+/g, (token) => {
            return token[0] === '"' ? JSON.stringify(JSON.parse(token)) : '';
        });
    } catch {
        return null;
    }
}

const mod: HtmlnanoModule<boolean | HtmlnanoMinifyJsonOptions> = {
    default(tree, _options, moduleOptions) {
        const attributes = typeof moduleOptions === 'object' ? moduleOptions.attributes : undefined;
        const autoDetect = typeof moduleOptions === 'object' && moduleOptions.autoDetect === true;
        if ((!attributes?.length && !autoDetect) || tree.options?.xmlMode) return tree;

        const attributeNames = new Set((attributes ?? []).map(name => name.toLowerCase()));

        tree.walk((node) => {
            if (!node.attrs) return node;

            for (const [name, value] of Object.entries(node.attrs)) {
                if (typeof value !== 'string') continue;

                const lowerName = name.toLowerCase();
                const explicitlySelected = attributeNames.has(lowerName);
                const detected = autoDetect && lowerName.startsWith('data-');
                if (!explicitlySelected && !detected) continue;

                const decoded = tree.options?.decodeEntities === true ? value : decodeHTMLAttribute(value);
                // Reject ordinary attribute data before attempting JSON parsing.
                if (!explicitlySelected && !/^[\t\n\r ]*(?:\{[\s\S]*\}|\[[\s\S]*\])[\t\n\r ]*$/.test(decoded)) continue;
                const minified = minifyJson(decoded);
                if (minified === null) continue;

                // JSON escapes protect ampersands and apostrophes regardless of
                // the HTML quote style. They also survive repeated processing
                // of template trees and PostHTML's eager &quot; decoding.
                let encoded = minified.replace(/&/g, '\\u0026').replace(/'/g, '\\u0027');
                if (tree.options?.replaceQuote === false
                    && tree.options.quoteStyle !== 0 && tree.options.quoteStyle !== 1) {
                    encoded = encoded.replace(/"/g, '&quot;');
                }
                if (!explicitlySelected) {
                    // Account for HTML escaping and quote selection before
                    // automatically rewriting a value. Explicit rules retain
                    // their existing behavior even when serialization grows.
                    const probe = { ...node, tag: 'div', attrs: { [name]: value }, content: [] };
                    const before = tree.render(probe, tree.options);
                    probe.attrs[name] = encoded;
                    const after = tree.render(probe, tree.options);
                    if (Buffer.byteLength(after) >= Buffer.byteLength(before)) continue;
                }
                node.attrs[name] = encoded;
            }
            return node;
        });
        return tree;
    },
    onContent() {
        return (content, node) => {
            if (getTagName(node) !== 'script') {
                return content;
            }

            // Skip SRI, reasons are documented in "minifyJs" module
            if (node.attrs && 'integrity' in node.attrs) {
                return content;
            }

            const nodeType = node.attrs && typeof node.attrs.type === 'string'
                ? normalizeMimeType(node.attrs.type)
                : undefined;

            if (nodeType && rNodeAttrsTypeJson.test(nodeType)) {
                const jsonContent = typeof content === 'string'
                    ? content
                    : Array.isArray(content) && content.every(item => typeof item === 'string')
                        ? content.join('')
                        : null;

                const minified = jsonContent === null ? null : minifyJson(jsonContent);
                if (minified !== null) {
                    // Prevent script breakout and comment/double-escaped states.
                    return [minified.replace(/</g, '\\u003C')];
                }
            }

            return content;
        };
    }
};

export default mod;
