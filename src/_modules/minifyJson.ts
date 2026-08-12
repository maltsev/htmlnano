import { normalizeMimeType } from '../helpers';
import type { HtmlnanoModule } from '../types';

const rNodeAttrsTypeJson = /(?:\/|\+)json$/i;

const mod: HtmlnanoModule = {
    onContent() {
        return (content, node) => {
            // Skip SRI, reasons are documented in "minifyJs" module
            if (node.attrs && 'integrity' in node.attrs) {
                return content;
            }

            const nodeType = node.attrs && typeof node.attrs.type === 'string'
                ? normalizeMimeType(node.attrs.type)
                : undefined;

            if (nodeType && rNodeAttrsTypeJson.test(nodeType)) {
                try {
                    const jsonContent = typeof content === 'string'
                        ? content
                        : Array.isArray(content) && content.every(item => typeof item === 'string')
                            ? content.join('')
                            : null;

                    if (jsonContent === null) {
                        return content;
                    }

                    // Re-escape `<` as `<` after stringifying. `JSON.stringify`
                    // emits `<` and `/` literally, so round-tripping a payload that
                    // relied on `<` escaping (e.g. Nuxt/Next.js/JSON-LD data
                    // containing markup) would otherwise produce a literal `</script>`
                    // that terminates the containing element and injects live DOM.
                    // `<` and `<` are the same character to a JSON parser, so the
                    // parsed value is unchanged and markup-free payloads are byte-identical.
                    return [JSON.stringify(JSON.parse(jsonContent)).replace(/</g, '\\u003C')];
                } catch {
                    // Invalid JSON
                }
            }

            return content;
        };
    }
};

export default mod;
