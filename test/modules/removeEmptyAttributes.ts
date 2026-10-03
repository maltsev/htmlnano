import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';

describe('removeEmptyAttributes', () => {
    const options = {
        removeEmptyAttributes: safePreset.removeEmptyAttributes
    };

    it('should preserve attributes named after inherited object properties', () => {
        const html = '<div constructor="" __definegetter__=" " __lookupgetter__="data"></div>';
        return init(html, html, options);
    });

    it('should remove empty attributes', () => {
        return init(
            '<div ID="" class="" style title="" lang="en" dir="" alt=""></div>',
            '<div lang="en" alt=""></div>', // alt is not a safe to remove attribute
            options
        );
    });

    it('should remove attributes that contains only white spaces', () => {
        return init(
            '<div id="   " title="	"></div>',
            '<div></div>',
            options
        );
    });

    it('should remove empty event handler attributes', () => {
        return init(
            '<button onclick="" onfocus="   "></button>',
            '<button></button>',
            options
        );
    });

    it('should remove empty tag-specific attributes on matching tags', () => {
        return init(
            '<textarea cols=""></textarea>',
            '<textarea></textarea>',
            options
        );
    });

    it('should keep empty tag-specific attributes on non-matching tags', () => {
        return init(
            '<div cols=""></div>',
            '<div cols=""></div>',
            options
        );
    });

    it('should remove empty minlength and maxlength on supported tags', () => {
        return init(
            '<input minlength="" maxlength=" "><textarea minlength="\t" maxlength=""></textarea>',
            '<input><textarea></textarea>',
            options
        );
    });
});
