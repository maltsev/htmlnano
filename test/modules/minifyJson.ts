import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';

describe('minifyJson', () => {
    const options = {
        minifyJson: safePreset.minifyJson
    };

    it('should minify JSON inside <script> tags with JSON mime type', () => {
        return init(
            `<script type="application/json">
                {
                    "test": 5
                }
             </script>
             <script type="application/ld+json">
                {
                    "test": 6
                }
             </script>`,

            `<script type="application/json">{"test":5}</script>
             <script type="application/ld+json">{"test":6}</script>`,
            options
        );
    });

    it('should minify JSON with mime parameters', () => {
        return init(
            `<script type="application/json; charset=utf-8">
                {
                    "test": 7
                }
             </script>`,

            '<script type="application/json; charset=utf-8">{"test":7}</script>',
            options
        );
    });

    it('should minify JSON with mixed case +json mime type', () => {
        return init(
            `<script type="Application/LD+JSON; charset=UTF-8">
                {
                    "test": 8
                }
             </script>`,

            '<script type="Application/LD+JSON; charset=UTF-8">{"test":8}</script>',
            options
        );
    });

    it('should skip JSON inside <script> tags with SRI', () => {
        const fixtures = `<script type="application/json" integrity="example">
                {
                    "test": 5
                }
             </script>
             <script type="application/ld+json" integrity="example">
                {
                    "test": 6
                }
             </script>`;

        return init(
            fixtures,
            fixtures,
            options
        );
    });

    it('should skip <script> tags with non-JSON mime type', () => {
        return init(
            '<script>{"test": 5}</script>',
            '<script>{"test": 5}</script>',
            options
        );
    });

    it('should skip <script> tags with JSON-like mime type suffixes', () => {
        return init(
            '<script type="application/jsonp">{"test": 9}</script>',
            '<script type="application/jsonp">{"test": 9}</script>',
            options
        );
    });

    it('should skip <script> tags with invalid JSON', () => {
        return init(
            '<script type="application/json">{test: 5}</script>',
            '<script type="application/json">{test: 5}</script>',
            options
        );
    });

    it('should keep `<` escaped so JSON payloads cannot terminate the <script> element', () => {
        return init(
            '<script type="application/json">{"c":"\\u003Cscript>alert(1)\\u003C\\u002Fscript>\\u003Cp>injected\\u003C\\u002Fp>"}</script>',
            '<script type="application/json">{"c":"\\u003Cscript>alert(1)\\u003C/script>\\u003Cp>injected\\u003C/p>"}</script>',
            options
        );
    });
});
