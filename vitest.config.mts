import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

// Strip the CommonJS module.exports assignment that breaks in ESM context
function stripModuleExports(): Plugin {
    return {
        name: 'strip-module-exports',
        transform(code, id) {
            if (id.includes('index') && code.includes('module.exports')) {
                return {
                    code: code.replace(
                        /if\s*\(\s*typeof\s+module\s*!==?\s*['"]undefined['"]\s*\)\s*\{[^}]*module\.exports[^}]*\}/g,
                        '/* module.exports stripped for ESM compatibility */'
                    ),
                    map: null,
                };
            }
        },
    };
}

export default defineConfig({
    plugins: [codspeedPlugin(), stripModuleExports()],
    test: {
        benchmark: {
            include: ['bench/**/*.bench.ts'],
        },
    },
});
