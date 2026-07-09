import { init } from '../htmlnano.ts';

describe('normalizeAttributeValues', () => {
    const options = {
        normalizeAttributeValues: true
    };

    it('default behavior', () => {
        return init(
            '<form id="FOo" method="GET"></form>',
            '<form id="FOo" method="get"></form>',
            options
        );
    });

    it('normalize invalid value default', () => {
        return Promise.all([
            // attribute on any tag
            init(
                '<img crossorigin="example">',
                '<img crossorigin="anonymous">',
                options
            ),
            // attribute on specific tag
            init(
                '<button type="example"></button><input type="example">',
                // button has invalid default value for submit
                // while input's invalid default value is ignored in out implementation
                '<button type="submit"></button><input type="example">',
                options
            ),
            // make sure case normalization is applied before invalid value default
            init(
                '<a referrerpolicy="uNSaFe-UrL"></a>',
                // should be lower case instead of invalid value default
                '<a referrerpolicy="unsafe-url"></a>',
                options
            )
        ]);
    });

    it('ignores case-insensitive attrs on other tags', () => {
        return init(
            '<a method="POST"></a><form method="POST"></form>',
            '<a method="POST"></a><form method="post"></form>',
            options
        );
    });

    it('defaults empty values for matching tags', () => {
        return init(
            '<img loading="">',
            '<img loading="eager">',
            options
        );
    });

    it('normalizes fetchpriority values', () => {
        return Promise.all([
            init(
                '<img fetchpriority="HIGH">',
                '<img fetchpriority="high">',
                options
            ),
            init(
                '<img fetchpriority="bogus">',
                '<img fetchpriority="auto">',
                options
            ),
            // unaffected on other tags
            init(
                '<iframe fetchpriority="HIGH"></iframe>',
                '<iframe fetchpriority="HIGH"></iframe>',
                options
            )
        ]);
    });

    it('normalizes casing and whitespace for invalid defaults', () => {
        return Promise.all([
            init(
                '<img loading="LAZY">',
                '<img loading="lazy">',
                options
            ),
            init(
                '<img loading="  LAZY  ">',
                '<img loading="lazy">',
                options
            ),
            init(
                '<a referrerpolicy="NO-REFERRER"></a>',
                '<a referrerpolicy="no-referrer"></a>',
                options
            ),
            init(
                '<form method="  GET  "></form>',
                '<form method="get"></form>',
                options
            )
        ]);
    });
});
