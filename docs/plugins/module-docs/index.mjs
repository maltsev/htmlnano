import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default function moduleDocs(context) {
    return {
        name: 'module-docs',
        configureWebpack() {
            return {
                module: {
                    rules: [{
                        test: /[/\\]050-modules\.md$/,
                        include: [
                            path.join(context.siteDir, 'docs'),
                            path.join(context.siteDir, 'versioned_docs')
                        ],
                        // Expand the page before MDX generates headings and the TOC.
                        enforce: 'pre',
                        use: [fileURLToPath(new URL('./loader.mjs', import.meta.url))]
                    }]
                }
            };
        }
    };
}
