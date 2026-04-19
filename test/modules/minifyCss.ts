import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';

describe('minifyCss', function () {
    this.timeout(3000);

    const options = {
        minifyCss: safePreset.minifyCss
    };
    const html = `<div><style>
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
            -moz-border-radius: 10px;
            border-radius: 10px;
        }
    </style></div>`;
    const svg = `<svg><style>
        <![CDATA[
            h1 {
                margin: 10px 10px 10px 10px;
                color: #ff0000;
                -moz-border-radius: 10px;
                border-radius: 10px;
            }
        ]]>
    </style></svg>`;

    it('should minify CSS inside <style>', () => {
        return init(
            html,
            '<div><style>h1{-moz-border-radius:10px;border-radius:10px;color:red;margin:10px}</style></div>',
            options
        );
    });

    it('should not minify CSS inside <style> + SRI', () => {
        const html = `<div><style integrity="example">
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
            -moz-border-radius: 10px;
            border-radius: 10px;
        }
    </style></div>`;
        return init(
            html,
            html,
            options
        );
    });

    it('should not minify style attributes when integrity is present', () => {
        const html = '<div integrity="example" style="color: #ff0000; margin: 10px 10px 10px 10px"></div>';
        return init(
            html,
            html,
            options
        );
    });

    it('should minify CSS inside style attribute', () => {
        return init(
            '<div style="color: #ff0000; margin: 10px 10px 10px 10px"></div>',
            '<div style="color:red;margin:10px"></div>',
            options
        );
    });

    it('should do nothing if style attribute is empty', () => {
        return init(
            '<div style=""></div>',
            '<div style=""></div>',
            options
        );
    });

    it('should pass options to cssnano', () => {
        return init(
            html,
            '<div><style>h1{-moz-border-radius:10px;border-radius:10px;color:#ff0000;margin:10px}</style></div>',
            {
                minifyCss: {
                    preset: ['default', {
                        colormin: false
                    }]
                }
            }
        );
    });

    it('should pass options to cssnano for style attributes', () => {
        return init(
            '<div style="color: #ff0000; margin: 10px 10px 10px 10px"></div>',
            '<div style="color:#ff0000;margin:10px"></div>',
            {
                minifyCss: {
                    preset: ['default', {
                        colormin: false
                    }]
                }
            }
        );
    });

    it('should not minify CSS inside HTML comments', () => {
        return init(
            '<div><!-- <style>h1 { color: red; }</style> --></div>',
            '<div><!-- <style>h1 { color: red; }</style> --></div>',
            options
        );
    });

    it('should ignore AMP boilerplate', () => {
        const amphtml = '<style amp-boilerplate="">\nh1{color:red}</style>';
        return init(
            amphtml,
            amphtml,
            options
        );
    });

    it('should skip non-css <style> types', () => {
        const html = '<style type="text/less">h1 { color: #ff0000; margin: 10px 10px 10px 10px; }</style>';
        return init(
            html,
            html,
            options
        );
    });

    it('should minify <style> with text/css type', () => {
        return init(
            '<style type="text/css; charset=utf-8">h1 { color: #ff0000; margin: 10px 10px 10px 10px; }</style>',
            '<style type="text/css; charset=utf-8">h1{color:red;margin:10px}</style>',
            options
        );
    });

    it('should keep CSS inside SVG wrapped in CDATA', () => {
        return init(
            svg,
            '<svg><style><![CDATA[h1{-moz-border-radius:10px;border-radius:10px;color:red;margin:10px}]]></style></svg>',
            options
        );
    });
});
