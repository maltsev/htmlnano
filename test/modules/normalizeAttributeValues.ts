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
            // CORS settings attribute
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

    it('should recognize encoded hidden states without trimming meaningful whitespace', () => {
        return init(
            '<div hidden="UNTIL&#45;FOUND"></div><div hidden=" until-found "></div><div hidden="&#32;until-found"></div>',
            '<div hidden="until-found"></div><div hidden="hidden"></div><div hidden="hidden"></div>',
            options
        );
    });

    it('normalizes casing without trimming enumerated values', () => {
        return Promise.all([
            init(
                '<img loading="LAZY">',
                '<img loading="lazy">',
                options
            ),
            init(
                '<img loading="  LAZY  ">',
                '<img loading="eager">',
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

    it('does not enable credentials or weaken a policy by trimming invalid values', () => {
        return init(
            '<img crossorigin=" use-credentials "><a referrerpolicy=" unsafe-url "></a>',
            '<img crossorigin="anonymous"><a referrerpolicy=""></a>',
            options
        );
    });

    it('recognizes decoded keywords and preserves encoded significant whitespace', () => {
        return init(
            '<a referrerpolicy="NO&#45;REFERRER"></a><img crossorigin="USE&#45;CREDENTIALS"><img loading="&#76;AZY"><a referrerpolicy="&Tab;NO-REFERRER"></a>',
            '<a referrerpolicy="no-referrer"></a><img crossorigin="use-credentials"><img loading="lazy"><a referrerpolicy=""></a>',
            options
        );
    });

    it('accepts every current referrer policy', () => {
        const policies = ['no-referrer', 'no-referrer-when-downgrade', 'same-origin', 'origin', 'strict-origin', 'origin-when-cross-origin', 'strict-origin-when-cross-origin', 'unsafe-url'];
        return Promise.all(policies.map(policy => init(
            `<a referrerpolicy="${policy.toUpperCase()}"></a>`,
            `<a referrerpolicy="${policy}"></a>`,
            options
        )));
    });

    it('ignores CORS and referrer policy attributes on unrelated elements', () => {
        const html = '<custom-fetch crossorigin="USE-CREDENTIALS" referrerpolicy="NO-REFERRER"></custom-fetch><div crossorigin="example" referrerpolicy="example"></div>';
        return init(html, html, options);
    });
});
