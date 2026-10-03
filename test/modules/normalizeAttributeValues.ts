import { init, initIdempotent } from '../htmlnano.ts';

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
                // Buttons use the Auto state; input defaults are not rewritten.
                '<button type=""></button><input type="example">',
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
                '<form method="  get  "></form>',
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

    it('preserves invalid padded keywords', () => {
        return init(
            '<form method=" POST "></form><input type=" HIDDEN " step=" ANY "><div contenteditable=" TRUE " draggable=" TRUE "></div>',
            '<form method=" post "></form><input type=" hidden " step=" any "><div contenteditable=" true " draggable=" true "></div>',
            options
        );
    });

    it('normalizes sandbox tokens without granting permissions to invalid Unicode tokens', () => {
        return initIdempotent(
            '<iframe sandbox=" \tALLOW-SCRIPTS ALLOW-POINTER-LOCK \u00a0ALLOW-SAME-ORIGIN\u00a0 \t"></iframe>',
            '<iframe sandbox="allow-scripts allow-pointer-locK \u00a0allow-same-origin\u00a0"></iframe>',
            { ...options, collapseAttributeWhitespace: true, deduplicateAttributeValues: true }
        );
    });

    it('preserves character reference spelling in case-insensitive values', () => {
        const html = '<iframe sandbox="ALLOW-SCRIPTS&Tab;ALLOW-SAME-ORIGIN &Amp;"></iframe><script type="TEXT&sol;JAVASCRIPT"></script>';
        return initIdempotent(html, html, options);
    });

    it('preserves inactive script types and only trims ASCII whitespace from nonempty types', () => {
        return initIdempotent(
            '<script type=" \t ">alert(1)</script><script type="\u00a0MODULE\u00a0">alert(2)</script><script type=" MODULE "></script>',
            '<script type=" \t ">alert(1)</script><script type="\u00a0module\u00a0">alert(2)</script><script type="module"></script>',
            options
        );
    });

    it('preserves MIME parameters and continues normalizing plain MIME types', () => {
        return initIdempotent(
            '<object type="multipart/form-data; boundary=CaseSensitive"></object><link type="TEXT/CSS"><style type=" TEXT/CSS "></style><input step="ANY">',
            '<object type="multipart/form-data; boundary=CaseSensitive"></object><link type="text/css"><style type=" text/css "></style><input step="any">',
            options
        );
    });

    it('keeps invalid and empty button types in the Auto state', () => {
        return initIdempotent(
            '<button type="invalid" command="show-modal" commandfor="dialog">Open</button><button type=""></button><button type></button>',
            '<button type="" command="show-modal" commandfor="dialog">Open</button><button type=""></button><button type=""></button>',
            options
        );
    });

    it('preserves inherited autocapitalization for empty values', () => {
        return initIdempotent(
            '<form autocapitalize="OFF"><input autocapitalize=""><textarea autocapitalize></textarea><input autocapitalize="invalid"><input autocapitalize=" OFF "></form>',
            '<form autocapitalize="off"><input autocapitalize=""><textarea autocapitalize=""></textarea><input autocapitalize="sentences"><input autocapitalize="sentences"></form>',
            options
        );
    });
});
