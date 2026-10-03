import { normalizeMimeType } from '../helpers';
import type { HtmlnanoModule } from '../types';

const rNodeAttrsTypeJson = /(?:\/|\+)json$/i;

const mod: HtmlnanoModule = {
    onContent() {
        return (content, node) => {
            if (typeof node.tag !== 'string' || node.tag.toLowerCase() !== 'script') {
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
                try {
                    const jsonContent = typeof content === 'string'
                        ? content
                        : Array.isArray(content) && content.every(item => typeof item === 'string')
                            ? content.join('')
                            : null;

                    if (jsonContent === null) {
                        return content;
                    }

                    // Validate without serializing the parsed value: round-tripping
                    // numbers can lose precision, overflow to null or erase -0,
                    // and round-tripping objects drops duplicate keys.
                    JSON.parse(jsonContent);

                    // Match complete strings before whitespace so their contents
                    // stay intact. Only strings can safely be round-tripped to
                    // shorten unnecessary escapes. Escape `<` to prevent script
                    // breakout and HTML's comment/double-escaped script states.
                    const minified = jsonContent.replace(/"(?:[^"\\]|\\[\s\S])*"|[\t\n\r ]+/g, (token) => {
                        return token[0] === '"' ? JSON.stringify(JSON.parse(token)) : '';
                    });
                    return [minified.replace(/</g, '\\u003C')];
                } catch {
                    // Invalid JSON
                }
            }

            return content;
        };
    }
};

export default mod;
