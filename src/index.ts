import posthtml from 'posthtml';
import { cosmiconfigSync } from 'cosmiconfig';
import safePreset from './presets/safe.js';
import ampSafePreset from './presets/ampSafe.js';
import maxPreset from './presets/max.js';
import { createProfiler, profileAsync, profileSync } from './profiling.js';
import type { HtmlnanoModule, HtmlnanoModuleAttrsHandler, HtmlnanoModuleContentHandler, HtmlnanoModuleNodeHandler, HtmlnanoOptions, HtmlnanoOptionsConfigFile, HtmlnanoPredefinedPresets, HtmlnanoPreset, PostHTMLTreeLike } from './types';
import type PostHTML from 'posthtml';

export type * from './types';
export { createProfiler } from './profiling.js';

export const presets: HtmlnanoPredefinedPresets = {
    safe: safePreset,
    ampSafe: ampSafePreset,
    max: maxPreset
};

export function loadConfig(
    options?: HtmlnanoOptions,
    preset?: HtmlnanoPreset
): [Partial<HtmlnanoOptions>, HtmlnanoPreset] {
    const { skipConfigLoading = false, configPath, ...rest } = options || {};
    let restConfig: Partial<HtmlnanoOptions> = rest;

    if (!skipConfigLoading) {
        const explorer = cosmiconfigSync('htmlnano');
        const rc = configPath ? explorer.load(configPath) : explorer.search();
        if (rc) {
            const { preset: presetName } = rc.config as HtmlnanoOptionsConfigFile;
            if (presetName) {
                if (!preset && presetName in presets) {
                    preset = presets[presetName];
                }

                delete (rc.config as HtmlnanoOptionsConfigFile).preset;
            }

            restConfig = { ...(rc.config as Partial<HtmlnanoOptions>), ...restConfig };
        }
    }

    return [
        restConfig || {},
        preset || safePreset
    ];
}

const optionalDependencies = {
    minifyCss: ['cssnano', 'postcss'],
    minifyJs: ['terser'],
    minifyUrls: ['relateurl', 'srcset', 'terser'],
    minifySvg: ['svgo']
} satisfies Partial<Record<keyof HtmlnanoOptions, string[]>>;

/**
 * And the old mixing named export and default export again.
 *
 * TL; DR: our bundler has bundled our mixed default/named export module into a "exports" object,
 * and when dynamically importing a CommonJS module using "import" instead of "require", Node.js wraps
 * another layer of default around the "exports" object.
 *
 * The longer version:
 *
 * The bundler we are using outputs:
 *
 * ESM: export { [named], xxx as default }
 * CJS: exports.default = xxx; exports.[named] = ...; exports.__esModule = true;
 *
 * With ESM, the Module object looks like this:
 *
 * ```js
 * Module {
 *   default: xxx,
 *   [named]: ...,
 * }
 * ```
 *
 * With CJS, Node.js handles dynamic import differently. Node.js doesn't respect `__esModule`,
 * and will wrongly treat a CommonJS module as ESM, i.e. assign the "exports" object on its
 * own "default" on the "Module" object.
 *
 * Now we have:
 *
 * ```js
 * Module {
 *   // this is actually the "exports" inside among "exports.__esModule", "exports.[named]", and "exports.default"
 *   default: {
 *     __esModule: true,
 *     // This is the actual "exports.default"
 *     default: xxx
 *   }
 * }
 * ```
 */
const interop = <T>(imported: Promise<object>): Promise<HtmlnanoModule<T>> => imported.then((mod) => {
    let htmlnanoModule;
    while ('default' in mod) {
        htmlnanoModule = mod;
        mod = mod.default as object;
        // If we find any htmlnano module hook methods, we know this object is a htmlnano module, return directly
        if ('onAttrs' in mod || 'onContent' in mod || 'onNode' in mod) {
            return mod as HtmlnanoModule<T>;
        }
    }

    if (htmlnanoModule && typeof htmlnanoModule.default === 'function') {
        return htmlnanoModule as HtmlnanoModule<T>;
    }

    throw new TypeError('The imported module is not a valid htmlnano module');
});

const modules = {
    collapseAttributeWhitespace: () => interop(import('./_modules/collapseAttributeWhitespace')),
    collapseBooleanAttributes: () => interop(import('./_modules/collapseBooleanAttributes')),
    collapseWhitespace: () => interop(import('./_modules/collapseWhitespace')),
    custom: () => interop(import('./_modules/custom')),
    deduplicateAttributeValues: () => interop(import('./_modules/deduplicateAttributeValues')),
    // example: () => import('./_modules/example.mjs'),
    mergeScripts: () => interop(import('./_modules/mergeScripts')),
    mergeStyles: () => interop(import('./_modules/mergeStyles')),
    minifyConditionalComments: () => interop(import('./_modules/minifyConditionalComments')),
    minifyCss: () => interop(import('./_modules/minifyCss')),
    minifyHtmlTemplate: () => interop(import('./_modules/minifyHtmlTemplate')),
    minifyJs: () => interop(import('./_modules/minifyJs')),
    minifyJson: () => interop(import('./_modules/minifyJson')),
    minifyAttributes: () => interop(import('./_modules/minifyAttributes')),
    minifySvg: () => interop(import('./_modules/minifySvg')),
    minifyUrls: () => interop(import('./_modules/minifyUrls')),
    normalizeAttributeValues: () => interop(import('./_modules/normalizeAttributeValues')),
    removeAttributeQuotes: () => interop(import('./_modules/removeAttributeQuotes')),
    removeComments: () => interop(import('./_modules/removeComments')),
    removeEmptyAttributes: () => interop(import('./_modules/removeEmptyAttributes')),
    removeEmptyElements: () => interop(import('./_modules/removeEmptyElements')),
    removeOptionalTags: () => interop(import('./_modules/removeOptionalTags')),
    removeRedundantAttributes: () => interop(import('./_modules/removeRedundantAttributes')),
    removeUnusedCss: () => interop(import('./_modules/removeUnusedCss')),
    sortAttributes: () => interop(import('./_modules/sortAttributes')),
    sortAttributesWithLists: () => interop(import('./_modules/sortAttributesWithLists'))
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- module options vary per module
} satisfies Record<string, () => Promise<HtmlnanoModule<any>>>;

const loadedModules = new Map<string, Promise<HtmlnanoModule>>();
const optionalDependencyAvailability = new Map<string, Promise<boolean>>();

function getLoadedModule(moduleName: string) {
    let loadedModule = loadedModules.get(moduleName);
    if (!loadedModule) {
        loadedModule = moduleName in modules
            ? (modules[moduleName as keyof typeof modules]()) as Promise<HtmlnanoModule>
            : import(`./_modules/${moduleName}.mjs`) as Promise<HtmlnanoModule>;
        loadedModules.set(moduleName, loadedModule);
    }

    return loadedModule;
}

function isMissingDependencyError(error: unknown) {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && typeof error.code === 'string'
        && (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND');
}

function hasOptionalDependency(dependency: string) {
    let availability = optionalDependencyAvailability.get(dependency);
    if (!availability) {
        availability = import(dependency)
            .then(() => true)
            .catch((error: unknown) => {
                if (isMissingDependencyError(error)) {
                    return false;
                }

                optionalDependencyAvailability.delete(dependency);
                throw error;
            });
        optionalDependencyAvailability.set(dependency, availability);
    }

    return availability;
}

const htmlnano = Object.assign(function htmlnano(optionsRun: HtmlnanoOptions = {}, presetRun?: HtmlnanoPreset) {
    // eslint-disable-next-line prefer-const -- re-assign options
    let [options, preset] = loadConfig(optionsRun, presetRun);

    const minifier: PostHTML.Plugin<never> = async (_tree) => {
        const tree = (_tree as unknown) as PostHTMLTreeLike;
        const profiledAttrsHandlers: Array<{
            moduleName: string;
            handler: HtmlnanoModuleAttrsHandler;
        }> = [];
        const profiledContentsHandlers: Array<{
            moduleName: string;
            handler: HtmlnanoModuleContentHandler;
        }> = [];
        const profiledNodeHandlers: Array<{
            moduleName: string;
            handler: HtmlnanoModuleNodeHandler;
        }> = [];

        options = { ...preset, ...options };
        const profiler = options.profiling;
        let promise = Promise.resolve(tree);

        const nonModuleOptions = new Set(['skipInternalWarnings', 'profiling']);

        for (const [moduleName, moduleOptions] of Object.entries(options)) {
            if (nonModuleOptions.has(moduleName)) {
                continue;
            }
            if (!moduleOptions) {
                // The module is disabled
                continue;
            }

            if (!(moduleName in safePreset)) {
                throw new Error('Module "' + moduleName + '" is not defined');
            }

            if (moduleName in optionalDependencies) {
                const modules = optionalDependencies[moduleName as keyof typeof optionalDependencies];
                await profileAsync(profiler, {
                    moduleName,
                    phase: 'dependencies'
                }, async () => await Promise.all(modules.map(async (dependency) => {
                    const isAvailable = await hasOptionalDependency(dependency);
                    if (!isAvailable && !options.skipInternalWarnings) {
                        console.warn(`You have to install "${dependency}" in order to use htmlnano's "${moduleName}" module`);
                    }
                })));
            }

            const mod = await profileAsync(profiler, {
                moduleName,
                phase: 'load'
            }, async () => await getLoadedModule(moduleName));

            if (typeof mod.onAttrs === 'function') {
                const handler = profileSync(profiler, {
                    moduleName,
                    phase: 'init',
                    detail: 'onAttrs'
                }, () => mod.onAttrs!(options, moduleOptions as Partial<any>));
                profiledAttrsHandlers.push({
                    moduleName,
                    handler
                });
            }
            if (typeof mod.onContent === 'function') {
                const handler = profileSync(profiler, {
                    moduleName,
                    phase: 'init',
                    detail: 'onContent'
                }, () => mod.onContent!(options, moduleOptions as Partial<any>));
                profiledContentsHandlers.push({
                    moduleName,
                    handler
                });
            }
            if (typeof mod.onNode === 'function') {
                const handler = profileSync(profiler, {
                    moduleName,
                    phase: 'init',
                    detail: 'onNode'
                }, () => mod.onNode!(options, moduleOptions as Partial<any>));
                profiledNodeHandlers.push({
                    moduleName,
                    handler
                });
            }
            if (typeof mod.default === 'function') {
                promise = promise.then(async currentTree => await profileAsync(profiler, {
                    moduleName,
                    phase: 'transform'
                }, async () => await mod.default!(currentTree, options, moduleOptions as Partial<any>)));
            }
        }

        if (profiledAttrsHandlers.length + profiledContentsHandlers.length + profiledNodeHandlers.length === 0) {
            return promise;
        }

        return promise.then(tree => profileSync(profiler, {
            moduleName: 'core',
            phase: 'walk'
        }, () => {
            tree.walk((node) => {
                if (node) {
                    if (node.attrs && typeof node.attrs === 'object') {
                        const nodeAttrs = node.attrs;
                        // Convert all attrs' key to lower case
                        let newAttrsObj = profileSync(profiler, {
                            moduleName: 'core',
                            phase: 'normalize-attrs'
                        }, () => {
                            const normalizedAttrs: Record<string, string | boolean | void> = {};
                            Object.entries(nodeAttrs).forEach(([attrName, attrValue]) => {
                                normalizedAttrs[attrName.toLowerCase()] = attrValue;
                            });
                            return normalizedAttrs;
                        });

                        for (const { moduleName, handler } of profiledAttrsHandlers) {
                            newAttrsObj = profileSync(profiler, {
                                moduleName,
                                phase: 'handler',
                                detail: 'onAttrs'
                            }, () => handler(newAttrsObj, node));
                        }

                        node.attrs = newAttrsObj as PostHTML.NodeAttributes;
                    }

                    if (node.content) {
                        node.content = typeof node.content === 'string' ? [node.content] : node.content;

                        if (Array.isArray(node.content) && node.content.length > 0) {
                            for (const { moduleName, handler } of profiledContentsHandlers) {
                                const result = profileSync(profiler, {
                                    moduleName,
                                    phase: 'handler',
                                    detail: 'onContent'
                                }, () => handler(node.content ?? [], node));
                                node.content = Array.isArray(result) ? result : [result];
                            }
                        }
                    }

                    for (const { moduleName, handler } of profiledNodeHandlers) {
                        if (handler) {
                            node = profileSync(profiler, {
                                moduleName,
                                phase: 'handler',
                                detail: 'onNode'
                            }, () => handler(node) as PostHTML.Node);
                        }
                    }
                }

                return node;
            });

            return tree;
        }));
    };

    return minifier;
}, {
    createProfiler,
    presets,
    getRequiredOptionalDependencies,
    process,
    htmlMinimizerWebpackPluginMinify,
    loadConfig
});

export function getRequiredOptionalDependencies(optionsRun: HtmlnanoOptions, presetRun: HtmlnanoPreset) {
    const [options] = loadConfig(optionsRun, presetRun);

    const dependencies = Object.keys(options).flatMap((moduleName) => {
        if (moduleName in optionalDependencies) {
            return optionalDependencies[moduleName as keyof typeof optionalDependencies];
        }

        return [];
    });

    return [...new Set(dependencies)];
}

export function process(
    html: string,
    options?: HtmlnanoOptions,
    preset?: HtmlnanoPreset,
    postHtmlOptions?: PostHTML.Options
) {
    return posthtml([htmlnano(options, preset)])
        .process(html, postHtmlOptions);
}

// https://github.com/webpack-contrib/html-minimizer-webpack-plugin/blob/faca00f2219514bc671c5942685721f0b5dbaa70/src/utils.js#L74
export function htmlMinimizerWebpackPluginMinify(
    input: { [file: string]: string },
    minimizerOptions?: HtmlnanoOptions
) {
    const [[, code]] = Object.entries(input);
    return process(code, minimizerOptions, presets.safe)
        .then((result) => {
            return {
                code: result.html
            };
        });
}

export default htmlnano;

if (typeof module !== 'undefined') {
    module.exports = htmlnano;
}
