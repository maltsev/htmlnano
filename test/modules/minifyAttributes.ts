import { init, initIdempotent } from '../htmlnano.ts';

describe('minifyAttributes', () => {
    const options = {
        minifyAttributes: true
    };

    context('<meta http-equiv="refresh" content=...>', () => {
        it('should preserve an explicit empty url', () => {
            return init(
                '<meta http-equiv="refresh" content="5; url=">',
                '<meta http-equiv="refresh" content="5; URL=">',
                options
            );
        });

        for (const url of ['url=https://evil.example/', 'UrL = //evil.example/', 'url=\'/next\'']) {
            it(`should preserve a URL that itself starts with a URL= prefix: ${url}`, () => {
                return initIdempotent(
                    `<meta http-equiv="refresh" content=" 0; url=${url}">`,
                    `<meta http-equiv="refresh" content="0; URL=${url}">`,
                    options
                );
            });
        }

        for (const content of ['0; url=&#117;rl=https://evil.example/', '0; url=&#39;/next&#39;', '0; url=/next?a=1&amp;b=2']) {
            it(`should preserve refresh content containing character references: ${content}`, () => {
                const html = `<meta http-equiv="refresh" content="${content}">`;
                return initIdempotent(html, html, options);
            });
        }

        it('should preserve non-ASCII whitespace in refresh URLs', () => {
            return initIdempotent(
                '<meta http-equiv="refresh" content=" 0; url=\u00a0/next\u00a0 ">',
                '<meta http-equiv="refresh" content="0; \u00a0/next\u00a0">',
                options
            );
        });

        for (const url of ['', '\'\'', '\'']) {
            it(`should preserve empty URL resolution against a base URL: ${url}`, () => {
                return initIdempotent(
                    `<base href="https://example.com/base/"><meta http-equiv="refresh" content=" 5; url=${url}">`,
                    `<base href="https://example.com/base/"><meta http-equiv="refresh" content="5; URL=${url}">`,
                    options
                );
            });
        }

        it('should still remove an empty separator without an explicit URL', () => {
            return init('<meta http-equiv="refresh" content=" 5; ">', '<meta http-equiv="refresh" content="5">', options);
        });

        it('should drop url= prefix', () => {
            return init(
                '<meta http-equiv="refresh" content="5; url=http://example.com/">',
                '<meta http-equiv="refresh" content="5; http://example.com/">',
                options
            );
        });

        it('should preserve quoted urls after URL=', () => {
            return init(
                '<meta http-equiv="refresh" content="5; url=\'/next path \'">',
                '<meta http-equiv="refresh" content="5; URL=\'/next path \'">',
                options
            );
        });

        it('should handle whitespace, commas, and case-insensitive url', () => {
            return init(
                '<meta http-equiv="REFRESH" content=" 10 , URL = /next ">',
                '<meta http-equiv="REFRESH" content="10, /next">',
                options
            );
        });

        it('should drop fractional time', () => {
            return init(
                '<meta http-equiv="refresh" content="5.9; url=/next">',
                '<meta http-equiv="refresh" content="5; /next">',
                options
            );
        });

        it('should skip non-refresh meta', () => {
            return init(
                '<meta http-equiv="content-type" content="5; url=http://example.com/">',
                '<meta http-equiv="content-type" content="5; url=http://example.com/">',
                options
            );
        });

        it('should skip non-meta tags', () => {
            return init(
                '<div http-equiv="refresh" content="5; url=http://example.com/"></div>',
                '<div http-equiv="refresh" content="5; url=http://example.com/"></div>',
                options
            );
        });

        it('should skip invalid refresh content', () => {
            return init(
                '<meta http-equiv="refresh" content="soon; url=/next">',
                '<meta http-equiv="refresh" content="soon; url=/next">',
                options
            );
        });

        it('should skip quoted urls without URL= prefix', () => {
            return init(
                '<meta http-equiv="refresh" content="5; \'/next\'">',
                '<meta http-equiv="refresh" content="5; \'/next\'">',
                options
            );
        });
    });

    context('<meta name="viewport" content=...>', () => {
        for (const content of ['width=&#49; 00', 'width=&#100; evice-width', 'width=1.0&#44; initial-scale=2.0']) {
            it(`should preserve encoded viewport content: ${content}`, () => {
                const html = `<meta name="viewport" content="${content}">`;
                return initIdempotent(html, html, options);
            });
        }

        for (const whitespace of ['\u00a0', '\u2003', '\ufeff', '\f', '\v']) {
            it(`should preserve significant viewport characters: U+${whitespace.charCodeAt(0).toString(16)}`, () => {
                return initIdempotent(
                    `<meta name="viewport" content=" ${whitespace}width${whitespace} = ${whitespace}device-width${whitespace} , initial-scale=1.0 ">`,
                    `<meta name="viewport" content="${whitespace}width${whitespace}=${whitespace}device-width${whitespace},initial-scale=1">`,
                    options
                );
            });
        }

        it('should normalize viewport grammar whitespace', () => {
            return initIdempotent(
                '<meta name="VIEWPORT" content="\twidth\n=\rdevice-width,\tinitial-scale\n=\r1.0\t">',
                '<meta name="VIEWPORT" content="width=device-width,initial-scale=1">',
                options
            );
        });

        it('should not apply viewport rewrites to refresh destinations', () => {
            return initIdempotent(
                '<meta name="viewport" http-equiv="refresh" content="0; url=/next?scale=1.0">',
                '<meta name="viewport" http-equiv="refresh" content="0; /next?scale=1.0">',
                options
            );
        });

        it('should remove spaces after commas and around "="', () => {
            return init(
                '<meta name="viewport" content="width = device-width, initial-scale = 1">',
                '<meta name="viewport" content="width=device-width,initial-scale=1">',
                options
            );
        });

        it('should drop redundant trailing .0', () => {
            return init(
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                '<meta name="viewport" content="width=device-width,initial-scale=1">',
                options
            );
        });

        it('should drop redundant trailing zero in fractions', () => {
            return init(
                '<meta name="viewport" content="maximum-scale=2.50">',
                '<meta name="viewport" content="maximum-scale=2.5">',
                options
            );
        });

        it('should handle semicolon-separated variant', () => {
            return init(
                '<meta name="viewport" content="width=device-width ; initial-scale=1.0">',
                '<meta name="viewport" content="width=device-width;initial-scale=1">',
                options
            );
        });

        it('should leave already-minimal content untouched', () => {
            return init(
                '<meta name="viewport" content="width=device-width,initial-scale=1">',
                '<meta name="viewport" content="width=device-width,initial-scale=1">',
                options
            );
        });

        it('should skip meta with other name values', () => {
            return init(
                '<meta name="description" content="initial-scale = 1.0">',
                '<meta name="description" content="initial-scale = 1.0">',
                options
            );
        });

        it('should allow disabling viewport minification', () => {
            return init(
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                {
                    minifyAttributes: {
                        metaContent: false,
                        redundantWhitespaces: false
                    }
                }
            );
        });
    });

    for (const metadata of ['name=" viewport "', 'name="\u00a0viewport\u00a0"', 'http-equiv=" refresh "']) {
        it(`should match metadata names without trimming: ${metadata}`, () => {
            const content = metadata.startsWith('name') ? ' width = device-width, initial-scale = 1.0 ' : ' 0; url=/next ';
            const html = `<meta ${metadata} content="${content}">`;
            return initIdempotent(html, html, options);
        });
    }

    context('redundantWhitespaces', () => {
        it('should preserve significant whitespace in safe mode', () => {
            return init(
                '<a class=" foo\u00a0bar " href=" \u00a0/page\u00a0 " style=" color:red\u00a0 "></a>',
                '<a class="foo\u00a0bar" href="\u00a0/page\u00a0" style="color:red\u00a0"></a>',
                options
            );
        });

        it('should collapse list-like and trim single-value attributes in safe mode', () => {
            return init(
                '<a class=" foo  bar " href="  https://example.com  " id=" foo  bar ">click</a>',
                '<a class="foo bar" href="https://example.com" id=" foo  bar ">click</a>',
                {
                    minifyAttributes: {
                        redundantWhitespaces: 'safe'
                    }
                }
            );
        });

        it('should trim other attributes in aggressive mode', () => {
            return init(
                '<div id="  foo  bar  " data-value="  keep  "></div>',
                '<div id="foo  bar" data-value="keep"></div>',
                {
                    minifyAttributes: {
                        redundantWhitespaces: 'aggressive'
                    }
                }
            );
        });

        it('should support the deprecated "agressive" alias', () => {
            return init(
                '<div id="  foo  bar  " data-value="  keep  "></div>',
                '<div id="foo  bar" data-value="keep"></div>',
                {
                    minifyAttributes: {
                        redundantWhitespaces: 'agressive'
                    }
                }
            );
        });
    });

    it('should allow disabling meta content minification', () => {
        return init(
            '<meta http-equiv="refresh" content="5; url=http://example.com/">',
            '<meta http-equiv="refresh" content="5; url=http://example.com/">',
            {
                minifyAttributes: {
                    metaContent: false,
                    redundantWhitespaces: false
                }
            }
        );
    });
});
