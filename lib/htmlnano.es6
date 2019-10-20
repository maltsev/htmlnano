import posthtml from 'posthtml';
import safePreset from './presets/safe';
import ampSafePreset from './presets/ampSafe';
import maxPreset from './presets/max';


function htmlnano(options = {}, preset = safePreset) {
    return function minifier(tree) {
        options = Object.assign({}, preset, options);
        let promise = Promise.resolve(tree);
        for (let moduleName of Object.keys(options)) {
            if (! options[moduleName]) {
                // The module is disabled
                continue;
            }

            if (safePreset[moduleName] === undefined) {
                throw new Error('Module "' + moduleName + '" is not defined');
            }

            let module = require('./modules/' + moduleName);
            promise = promise.then(tree => module.default(tree, options, options[moduleName]));
        }

        return promise;
    };
}


htmlnano.process = function (html, options, preset) {
    return posthtml([htmlnano(options, preset)]).process(html);
};

htmlnano.presets = {
    safe: safePreset,
    ampSafe: ampSafePreset,
    max: maxPreset,
};

export default htmlnano;
