import type { HtmlnanoModule, HtmlnanoOptions, PostHTMLTreeLike } from '../types';

type CustomModule = (tree: PostHTMLTreeLike, options: Partial<HtmlnanoOptions>) => PostHTMLTreeLike | Promise<PostHTMLTreeLike>;

/** Meta-module that runs custom modules */
const mod: HtmlnanoModule<CustomModule[]> = {
    default: async function custom(tree, options, customModules) {
        if (!customModules) {
            return tree;
        }

        if (!Array.isArray(customModules)) {
            customModules = [customModules];
        }

        for (const customModule of customModules) {
            if (customModule) {
                tree = await customModule(tree, options);
            }
        }

        return tree;
    }
};
export default mod;
