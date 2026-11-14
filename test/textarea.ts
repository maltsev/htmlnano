import { expect } from 'expect';
import posthtml from 'posthtml';
import htmlnano, { parser, presets } from '../dist/index.mjs';

describe('textarea parsing', () => {
    const inputs = [
        '<textarea><b>x</textarea>',
        '<textarea><a href="x">y</a></textarea>',
        '<textarea><div class="a  b"></div></textarea>',
        '<textarea><input disabled="disabled"></textarea>',
        '<textarea><input></textarea>',
        '<textarea><input autofocus onfocus="alert(1)"></textarea>',
        '<textarea><!-- literal --><script> alert(1) </script></textarea>',
        '<textarea>\n  <b>x\n\t </textarea>',
        '<textarea>&lt;input&gt;&amp;copy;&#10;  </textarea>',
        '<TEXTAREA><input disabled="disabled"></TEXTAREA>',
        '<textarea><textarea>nested</textarea>',
        '<textarea></textareax><input></textarea>',
        '<textarea><input></textarea><textarea><b>x</textarea>'
    ];

    for (const plugin of [false, true]) {
        context(plugin ? 'PostHTML plugin' : 'JavaScript API', () => {
            for (const [name, preset] of Object.entries({ disabled: {}, ...presets })) {
                for (const input of inputs) {
                    it(`preserves literal content with ${name}: ${JSON.stringify(input)}`, async () => {
                        const options = { skipConfigLoading: true };
                        async function run(html: string): Promise<string> {
                            const result = plugin
                                ? await posthtml([htmlnano(options, preset)]).process(html, { parser })
                                : await htmlnano.process(html, options, preset);
                            return result.html;
                        }

                        const output = await run(input);
                        expect(output).toBe(input);
                        expect(await run(output)).toBe(output);
                    });
                }
            }
        });
    }

    it('continues minifying textarea attributes and surrounding markup', async () => {
        const input = '<textarea class="a  b" disabled="disabled"><input disabled="disabled"></textarea>'
            + '<input disabled="disabled"><!-- remove -->';
        const expected = '<textarea class="a b" disabled><input disabled="disabled"></textarea><input disabled>';

        expect((await htmlnano.process(input)).html).toBe(expected);
        expect((await posthtml([htmlnano()]).process(input, { parser: htmlnano.parser })).html).toBe(expected);
    });

    it('uses a caller-supplied parser', async () => {
        const options = { parser: customParser };
        function customParser(html: string) {
            expect(html).toBe('<textarea><input></textarea>');
            return [{ tag: 'p', content: ['custom parser'] }];
        }

        const result = await htmlnano.process('<textarea><input></textarea>', {}, {}, options);
        expect(result.html).toBe('<p>custom parser</p>');
        expect(options.parser).toBe(customParser);
    });

    it('passes XML options to the parser', async () => {
        const input = '<textarea><div class="a  b"></div></textarea>';
        const result = await htmlnano.process(input, { collapseAttributeWhitespace: true }, {}, { xmlMode: true } as posthtml.Options);
        expect(result.html).toBe('<textarea><div class="a b"></div></textarea>');
    });
});
