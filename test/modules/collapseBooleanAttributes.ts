import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import ampSafePreset from '../../dist/presets/ampSafe.mjs';

describe('collapseBooleanAttributes', () => {
    const options = {
        collapseBooleanAttributes: safePreset.collapseBooleanAttributes
    };

    it('should collapse a boolean attribute with value', () => {
        return init(
            '<button disabled="disabled">click</button>',
            '<button disabled>click</button>',
            options
        );
    });

    it('should collapse a boolean attribute with empty value', () => {
        return init(
            '<script defer=""></script>',
            '<script defer></script>',
            options
        );
    });

    it('should collapse a boolean attribute with false value', () => {
        return init(
            '<input checked="false">',
            '<input checked>',
            options
        );
    });

    // https://html.spec.whatwg.org/#a-quick-introduction-to-html
    // The value, along with the "=" character, can be omitted altogether if the value is the empty string.
    // it('should not collapse non boolean attribute', () => {
    //     return init(
    //         '<a href="">link</a>',
    //         '<a href="">link</a>',
    //         options
    //     );
    // });

    it('should collapse AMP boolean attributes with empty value', () => {
        const optionsWithAmp = {
            collapseBooleanAttributes: ampSafePreset.collapseBooleanAttributes
        };

        return init(
            '<script defer=""></script>'
            + '<style amp-custom=""></style>'
            + '<amp-accordion expanded="true"></amp-accordion>'
            + '<amp-video preload="metadata"></amp-video>',

            '<script defer></script>'
            + '<style amp-custom></style>'
            + '<amp-accordion expanded></amp-accordion>'
            + '<amp-video preload="metadata"></amp-video>',

            optionsWithAmp
        );
    });

    it('should not collapse A-Frame visible attribute', () => {
        return init(
            '<a-entity visible="false"></a-entity>',
            '<a-entity visible="false"></a-entity>',
            options
        );
    });

    it('should not collapse empty A-Frame visible attribute', () => {
        return init(
            '<a-entity visible=""></a-entity>',
            '<a-entity visible=""></a-entity>',
            options
        );
    });

    it('should collapse crossorigin=anonymous attribute', () => {
        return init(
            '<script src="example-framework.js" crossorigin="anonymous"></script>',
            '<script src="example-framework.js" crossorigin></script>',
            options
        );
    });

    it('should collapse crossorigin case-insensitively', () => {
        return init(
            '<script src="example-framework.js" crossorigin="Anonymous"></script>',
            '<script src="example-framework.js" crossorigin></script>',
            options
        );
    });

    it('should collapse crossorigin="" attribute', () => {
        return init(
            '<script src="example-framework.js" crossorigin=""></script>',
            '<script src="example-framework.js" crossorigin></script>',
            options
        );
    });

    it('should not collapse crossorigin="use-credentials" attribute', () => {
        return init(
            '<script src="example-framework.js" crossorigin="use-credentials"></script>',
            '<script src="example-framework.js" crossorigin="use-credentials"></script>',
            options
        );
    });

    it('should remove preload="auto" from <audio> & <video>', () => {
        return init(
            '<audio src="example.com" preload="auto"></audio><video src="example.com" preload="auto"></video>',
            '<audio src="example.com" preload></audio><video src="example.com" preload></video>',
            options
        );
    });

    it('should remove preload="AUTO" from <audio> & <video>', () => {
        return init(
            '<audio src="example.com" preload="AUTO"></audio><video src="example.com" preload="AUTO"></video>',
            '<audio src="example.com" preload></audio><video src="example.com" preload></video>',
            options
        );
    });

    it('should not remove preload="metadata" from <audio> & <video>', () => {
        return init(
            '<audio src="example.com" preload="metadata"></audio><video src="example.com" preload="metadata"></video>',
            '<audio src="example.com" preload="metadata"></audio><video src="example.com" preload="metadata"></video>',
            options
        );
    });

    it('should collapse declarative shadow DOM template booleans', () => {
        return init(
            '<template shadowrootclonable="" shadowrootdelegatesfocus="true" shadowrootserializable="shadowrootserializable"></template>',
            '<template shadowrootclonable shadowrootdelegatesfocus shadowrootserializable></template>',
            options
        );
    });

    it('should not collapse shadowrootmode', () => {
        return init(
            '<template shadowrootmode="open"></template>',
            '<template shadowrootmode="open"></template>',
            options
        );
    });

    it('should collapse popover="auto" to bare popover', () => {
        return init(
            '<div popover="auto"></div>',
            '<div popover></div>',
            options
        );
    });

    it('should collapse popover="AUTO" case-insensitively', () => {
        return init(
            '<div popover="AUTO"></div>',
            '<div popover></div>',
            options
        );
    });

    it('should not collapse popover="manual"', () => {
        return init(
            '<div popover="manual"></div>',
            '<div popover="manual"></div>',
            options
        );
    });

    it('should not collapse popover="hint"', () => {
        return init(
            '<div popover="hint"></div>',
            '<div popover="hint"></div>',
            options
        );
    });

    it('should not collapse hidden="until-found"', () => {
        return init(
            '<div hidden="until-found"></div>',
            '<div hidden="until-found"></div>',
            options
        );
    });

    it('should collapse hidden="hidden"', () => {
        return init(
            '<div hidden="hidden"></div>',
            '<div hidden></div>',
            options
        );
    });
});
