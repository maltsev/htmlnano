import { readFileSync } from 'node:fs';
import path from 'node:path';

export default function moduleDocsLoader(source) {
    return source.replace(
        /^<!-- include: (.+?) -->\r?\n?/gm,
        (_match, relativePath) => {
            const filePath = path.resolve(path.dirname(this.resourcePath), relativePath);
            // Let webpack rebuild the parent page when a partial changes.
            this.addDependency(filePath);
            return readFileSync(filePath, 'utf8').trimEnd() + '\n';
        }
    );
}
