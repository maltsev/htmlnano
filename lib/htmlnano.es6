import posthtml from 'posthtml';
import safePreset from './presets/safe';
import ampSafePreset from './presets/ampSafe';
import maxPreset from './presets/max';


function htmlnano(options = {}, preset = safePreset) {
    return function minifier(tree) {
        const attrsHandlers = [];
        const contentsHandlers = [];

        options = { ...preset, ...options };
        let promise = Promise.resolve(tree);

        for (const [moduleName, moduleOptions] of Object.entries(options)) {
            if (!moduleOptions) {
                // The module is disabled
                continue;
            }

            if (safePreset[moduleName] === undefined) {
                throw new Error('Module "' + moduleName + '" is not defined');
            }

            const module = require('./modules/' + moduleName);

            if (module.once) {
                // It is a "once" version of htmlnano module
                if (module.onattrs) {
                    attrsHandlers.push(module.onattrs(options, moduleOptions));
                }
                if (module.oncontent) {
                    contentsHandlers.push(module.oncontent(options, moduleOptions));
                }
            } else {
                // It is a traditional htmlnano module
                promise = promise.then(tree => module.default(tree, options, moduleOptions));
            }
        }

        if (attrsHandlers.length + contentsHandlers.length > 0) {
            promise = promise.then(tree => {
                tree.walk(node => {
                    for (const handler of attrsHandlers) {
                        node.attrs = handler(node.attrs, node);
                    }
                    for (const handler of contentsHandlers) {
                        node.content = handler(node.content, node);
                    }

                    return node;
                });

                return tree;
            });
        }

        return promise;
    };
}


htmlnano.process = function (html, options, preset, postHtmlOptions) {
    return posthtml([htmlnano(options, preset)])
        .process(html, postHtmlOptions);
};

htmlnano.presets = {
    safe: safePreset,
    ampSafe: ampSafePreset,
    max: maxPreset,
};

export default htmlnano;
