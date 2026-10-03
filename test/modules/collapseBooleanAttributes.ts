import { init, initIdempotent } from '../htmlnano.ts';
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

    for (const [name, ampOptions] of [
        ['module', { collapseBooleanAttributes: ampSafePreset.collapseBooleanAttributes }],
        ['ampSafe', ampSafePreset]
    ] as const) {
        for (const value of ['true', 'TRUE', 'placeholder']) {
            it(`${name} preserves native placeholder text "${value}" in AMP mode`, () => {
                return initIdempotent(
                    `<input placeholder="${value}"><textarea placeholder="${value}"></textarea>`,
                    name === 'module'
                        ? `<input placeholder="${value}"><textarea placeholder="${value}"></textarea>`
                        : `<input placeholder=${value}><textarea placeholder=${value}></textarea>`,
                    ampOptions
                );
            });
        }

        for (const value of ['true', 'TRUE', 'lightbox']) {
            it(`${name} preserves AMP lightbox group "${value}"`, () => {
                return initIdempotent(
                    `<amp-img lightbox="${value}"></amp-img>`,
                    name === 'module' ? `<amp-img lightbox="${value}"></amp-img>` : `<amp-img lightbox=${value}></amp-img>`,
                    ampOptions
                );
            });
        }

        for (const value of ['_auto_reject', '_till_accepted', '_till_responded']) {
            it(`${name} preserves the AMP consent policy "${value}"`, () => {
                return initIdempotent(
                    `<amp-analytics data-block-on-consent="${value}"></amp-analytics>`,
                    name === 'module'
                        ? `<amp-analytics data-block-on-consent="${value}"></amp-analytics>`
                        : `<amp-analytics data-block-on-consent=${value}></amp-analytics>`,
                    ampOptions
                );
            });
        }
    }

    it('should still collapse AMP placeholder markers and empty native placeholders', () => {
        return initIdempotent(
            '<div placeholder="true"></div><input placeholder=""><textarea placeholder=""></textarea>',
            '<div placeholder></div><input placeholder><textarea placeholder></textarea>',
            { collapseBooleanAttributes: ampSafePreset.collapseBooleanAttributes }
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

    for (const [name, preset] of [['safe', safePreset], ['ampSafe', ampSafePreset]] as const) {
        it(`${name} preserves custom element attribute values`, () => {
            const input = '<my-widget enabled="enabled" disabled="false" checked="checked" crossorigin="anonymous" visible="false"></my-widget>';
            const expected = '<my-widget enabled=enabled disabled=false checked=checked crossorigin=anonymous visible=false></my-widget>';
            return initIdempotent(input, expected, preset);
        });
    }

    it('still collapses global HTML states on custom elements', () => {
        return initIdempotent(
            '<my-widget hidden="hidden" inert="inert" itemscope="itemscope" autofocus="autofocus" popover="auto"></my-widget>',
            '<my-widget hidden inert itemscope autofocus popover></my-widget>',
            safePreset
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

    it('should preserve case variants and encoded credentialed CORS values', () => {
        const input = '<script crossorigin="USE-CREDENTIALS"></script><img crossorigin="use&#45;credentials">';
        return initIdempotent(input, input, options);
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

    for (const value of ['UNTIL-FOUND', '&#117;ntil-found', 'until&#45;found', 'until&#45found', '&#x55;NTIL-found']) {
        it(`should preserve the until-found state in hidden="${value}"`, () => {
            const input = `<div hidden="${value}"></div><my-widget hidden="${value}"></my-widget>`;
            return initIdempotent(input, input, options);
        });

        for (const [name, preset] of [['safe', safePreset], ['ampSafe', ampSafePreset]] as const) {
            it(`${name} preserves the until-found state in hidden="${value}"`, () => {
                return initIdempotent(
                    `<div hidden="${value}"></div>`,
                    '<div hidden=until-found></div>',
                    preset
                );
            });
        }
    }

    for (const value of [' until-found ', '&#32;until-found', 'until-found&#x20;', '\u00a0until-found', 'until&hyphen;found']) {
        it(`should collapse the hidden state in hidden="${value}" with an invalid keyword`, () => {
            return initIdempotent(`<div hidden="${value}"></div>`, '<div hidden></div>', safePreset);
        });
    }

    it('should collapse hidden="hidden"', () => {
        return init(
            '<div hidden="hidden"></div>',
            '<div hidden></div>',
            options
        );
    });
});
