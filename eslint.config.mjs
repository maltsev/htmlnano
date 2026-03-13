import globals from 'globals';

import gitignore from 'eslint-config-flat-gitignore';
import eslintPluginImportX, { createNodeResolver } from 'eslint-plugin-import-x';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
    {
        name: '.eslintignore', // migrated from .eslintignore
        ignores: [
            'src/_modules/example.ts',
            'test.mjs',
            '**/*.cjs',
            'bench/**',
            'vitest.config.mts'
        ]
    },
    gitignore({
        root: true
    }),
    {
        name: 'eslint env config',
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: false
                }
            },
            globals: {
                ...globals.es2025,
                ...globals.node,
                ...globals.mocha
            }
        }
    },
    eslint.configs.recommended,
    {
        ...eslintPluginImportX.flatConfigs.recommended,
        ...eslintPluginImportX.flatConfigs.typescript,
        settings: {
            ...eslintPluginImportX.flatConfigs.recommended.settings,
            ...eslintPluginImportX.flatConfigs.typescript.settings,
            'import-x/resolver-next': {
                node: createNodeResolver()
            }
        },
        name: 'eslint-import-x config'
    },
    ...tseslint.configs.recommendedTypeChecked.map((config) => {
        return {
            ...config,
            files: ['**/*.mts', '**/*.cts', '**/*.ts']
        };
    }),
    {
        name: 'typescript-only config',
        files: ['**/*.mts', '**/*.cts', '**/*.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        plugins: {
            'unused-imports': eslintPluginUnusedImports
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            // the maintainers of @typescript-eslint DOESN'T KNOW ANYTHING about TypeScript AT ALL
            // and basically @typescript-eslint is a joke anyway
            '@typescript-eslint/no-empty-object-type': [
                'error',
                {
                    allowInterfaces: 'with-single-extends', // interface Derived extends Base {}
                    allowObjectTypes: 'never',
                    allowWithName: 'Props$'
                }
            ], // {} is widely used with "& {}" approach

            '@typescript-eslint/no-require-imports': 'off',

            // replaced by unused-imports/no-unused-imports
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-vars': [
                'error',
                { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_', ignoreRestSiblings: true }
            ],
            'unused-imports/no-unused-imports': 'error',

            'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],

            // https://github.com/un-ts/eslint-plugin-import-x/blob/3abe5e49683e0f973232bb631814b935e1ca7091/src/config/typescript.ts#L32C1-L33C1
            'import-x/named': 'off', // TypeScript compilation already ensures that named imports exist in the referenced module
            'import-x/namespace': 'off',
            'import-x/default': 'off',

            'import-x/no-duplicates': 'off',

            'import-x/no-named-as-default-member': 'off', // import foo from 'foo';
            // typescript-eslint already supports this
            'import-x/no-deprecated': 'off',

            '@typescript-eslint/switch-exhaustiveness-check': ['error', { allowDefaultCaseForExhaustiveSwitch: true, considerDefaultExhaustiveForUnions: true }],
            '@typescript-eslint/parameter-properties': ['warn', { prefer: 'parameter-property' }],

            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/only-throw-error': ['error', { allowRethrowing: true, allowThrowingAny: true, allowThrowingUnknown: true }]
        }
    },
    {
        name: 'disable unused-vars on d.ts',
        files: ['**/*.d.ts'],
        rules: {
            'import-x/no-duplicates': 'off',
            'unused-imports/no-unused-vars': 'off'
        }
    },
    stylistic.configs.customize({
        indent: 4,
        quotes: 'single',
        commaDangle: 'never',
        semi: true,
        jsx: false,
        braceStyle: '1tbs',
        quoteProps: 'as-needed'
    }),
    {
        name: 'eslint stylistic config',
        rules: {
            'linebreak-style': [2, 'unix'],
            camelcase: [2, { properties: 'always' }],
            '@stylistic/no-mixed-operators': 'off', // TODO: temporary disable during migration
            // enforce spacing before and after
            // https://eslint.style/rules/js/comma-spacing
            '@stylistic/comma-spacing': ['error', { before: false, after: true }],
            // enforce one true comma style
            // https://eslint.style/rules/js/comma-style
            '@stylistic/comma-style': ['error', 'last', {
                exceptions: {
                    ArrayExpression: false,
                    ArrayPattern: false,
                    ArrowFunctionExpression: false,
                    CallExpression: false,
                    FunctionDeclaration: false,
                    FunctionExpression: false,
                    ImportDeclaration: false,
                    ObjectExpression: false,
                    ObjectPattern: false,
                    VariableDeclaration: false,
                    NewExpression: false
                }
            }]
        }
    },
    {
        name: 'disable no-tabs in test',
        files: ['test/**/*'],
        rules: {
            '@stylistic/no-tabs': 'off' // test fixtures
        }
    }
);
