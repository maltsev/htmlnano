import { init } from '../htmlnano.ts';

describe('minifyAttributes', () => {
    const options = {
        minifyAttributes: true
    };

    context('<meta http-equiv="refresh" content=...>', () => {
        it('should remove empty url', () => {
            return init(
                '<meta http-equiv="refresh" content="5; url=">',
                '<meta http-equiv="refresh" content="5">',
                options
            );
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

    context('redundantWhitespaces', () => {
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
