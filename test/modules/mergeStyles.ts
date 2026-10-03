import { init } from '../htmlnano.ts';
import maxPreset from '../../dist/presets/max.mjs';

describe('mergeStyles', () => {
    const options = {
        mergeStyles: maxPreset.mergeStyles
    };

    it('should merge multiple contiguous <style> with the same "type" and "media" into one', () => {
        return init(
            '<style>h1 { color: red }</style>'
            + '<div>hello</div>'
            + '<style>div { font-size: 20px }</style>'
            + '<style media="print">div { color: blue }</style>'
            + '<style type="text/css" media="print">a {}</style>',

            '<style>h1 { color: red } div { font-size: 20px }</style>'
            + '<div>hello</div>'
            + '<style media="print">div { color: blue } a {}</style>',

            options
        );
    });

    it('should not merge <style> tags separated by a differing <style> (source order)', () => {
        return init(
            '<style>h1 { color: red }</style>'
            + '<style media="print">div { color: blue }</style>'
            + '<style>div { font-size: 20px }</style>',

            '<style>h1 { color: red }</style>'
            + '<style media="print">div { color: blue }</style>'
            + '<style>div { font-size: 20px }</style>',

            options
        );
    });

    it('should not merge <style> tags across a <link rel="stylesheet"> (source order)', () => {
        return init(
            '<style>p { color: red }</style>'
            + '<link rel="stylesheet" href="theme.css">'
            + '<style>p { color: green }</style>',

            '<style>p { color: red }</style>'
            + '<link rel="stylesheet" href="theme.css">'
            + '<style>p { color: green }</style>',

            options
        );
    });

    it('should merge <style> tags across a <link rel="preload"> (not a stylesheet source)', () => {
        return init(
            '<style>p { color: red }</style>'
            + '<link rel="preload" href="theme.css" as="style">'
            + '<style>p { color: green }</style>',

            '<style>p { color: red } p { color: green }</style>'
            + '<link rel="preload" href="theme.css" as="style">',

            options
        );
    });

    it('should start a new group after a media-mismatched <style> between matching ones', () => {
        return init(
            '<style>a { color: red }</style>'
            + '<style>b { color: red }</style>'
            + '<style media="print">c { color: blue }</style>'
            + '<style>d { color: green }</style>'
            + '<style>e { color: green }</style>',

            '<style>a { color: red } b { color: red }</style>'
            + '<style media="print">c { color: blue }</style>'
            + '<style>d { color: green } e { color: green }</style>',

            options
        );
    });

    it('should not merge <style> inside <noscript> with the ones outside', () => {
        return init(
            '<style>h1 { color: red }</style>'
            + '<style>div { color: blue }</style>'
            + '<noscript>'
            + '<style>h1 { color: green }</style>'
            + '<style>div { color: black }</style>'
            + '</noscript>',

            '<style>h1 { color: red } div { color: blue }</style>'
            + '<noscript>'
            + '<style>h1 { color: green } div { color: black }</style>'
            + '</noscript>',

            options
        );
    });

    it('should not move a <style> into a preceding <noscript>', () => {
        const html = '<noscript><style>h1 { color: green }</style></noscript>'
            + '<style>h1 { color: red }</style>';
        return init(
            html, html, options
        );
    });

    it('should not merge <style> tags across a <noscript> (source order)', () => {
        const html = '<style>h1 { color: red }</style>'
            + '<noscript><style>h1 { color: green }</style></noscript>'
            + '<style>h1 { color: blue }</style>';
        return init(
            html, html, options
        );
    });

    it('should not merge <style> inside <template> with the ones outside', () => {
        const html = '<style>h1 { color: red }</style>'
            + '<template><style>h1 { color: green }</style></template>';
        return init(
            html, html, options
        );
    });

    it('should merge <style> tags across a <template> (its content is inert)', () => {
        return init(
            '<style>h1 { color: red }</style>'
            + '<template><style>h1 { color: green }</style></template>'
            + '<style>div { color: blue }</style>',

            '<style>h1 { color: red } div { color: blue }</style>'
            + '<template><style>h1 { color: green }</style></template>',

            options
        );
    });

    it('should merge <style> inside <template> with each other', () => {
        return init(
            '<template>'
            + '<style>h1 { color: red }</style>'
            + '<style>div { color: blue }</style>'
            + '</template>',

            '<template>'
            + '<style>h1 { color: red } div { color: blue }</style>'
            + '</template>',

            options
        );
    });

    it('should skip <style> with the "scoped" attribute', () => {
        const html = `<style>h1 { color: red }</style>
                      <div></div>
                      <style scoped="scoped">div { color: blue }</style>`;
        return init(
            html, html, options
        );
    });

    it('should skip <style> with SRI', () => {
        const html = `<style>h1 { color: red }</style>
                      <div></div>
                      <style integrity="example">div { color: blue }</style>`;
        return init(
            html, html, options
        );
    });

    it('should merge default and explicit type/media styles', () => {
        return init(
            '<style>h1 { color: red }</style>'
            + '<style type="text/css" media="all">div { color: blue }</style>',

            '<style>h1 { color: red } div { color: blue }</style>',

            options
        );
    });

    it('should merge styles with equivalent media spacing', () => {
        return init(
            '<style media="screen and (min-width: 600px)">h1 { color: red }</style>'
            + '<style media="screen   and (min-width: 600px)">div { color: blue }</style>',

            '<style media="screen and (min-width: 600px)">h1 { color: red } div { color: blue }</style>',

            options
        );
    });

    it('should not merge styles with different nonce values', () => {
        return init(
            '<style nonce="abc">h1 { color: red }</style>'
            + '<style>div { color: blue }</style>',

            '<style nonce="abc">h1 { color: red }</style>'
            + '<style>div { color: blue }</style>',

            options
        );
    });

    it('should respect the first case-insensitive duplicate nonce', () => {
        const html = '<style nonce="trusted" NONCE="untrusted">a { color: red }</style>'
            + '<style NONCE="untrusted" nonce="trusted">b { color: blue }</style>';
        return init(html, html, options);
    });

    it('should match attribute names and decoded values using HTML semantics', () => {
        return init(
            '<style NoNcE="trus&#116;ed" TYPE="TEXT/CSS">a {}</style>'
            + '<style nonce="trusted">b {}</style>',
            '<style NoNcE="trus&#116;ed" TYPE="TEXT/CSS">a {} b {}</style>',
            options
        );
    });

    for (const attrs of ['SCOPED=""', 'INTEGRITY="hash"', 'type="text/plain"', 'type=" text/css "', 'type="&#32;"', 'type="text/css; charset=utf-8"']) {
        it(`should leave styles with ${attrs} separate`, () => {
            const html = `<style ${attrs}>a {}</style><style ${attrs}>b {}</style>`;
            return init(html, html, options);
        });
    }

    for (const [first, second] of [
        ['(--Theme)', '(--theme)'],
        ['(foo: &quot;A&quot;)', '(foo: &quot;a&quot;)'],
        ['(foo: &quot;a  b&quot;)', '(foo: &quot;a b&quot;)'],
        ['screen\u00a0and (color)', 'screen and (color)'],
        ['(foo: \\41)', '(foo: \\41 )']
    ]) {
        it(`should preserve distinct media queries ${first} and ${second}`, () => {
            const html = `<style media="${first}">a {}</style><style media="${second}">b {}</style>`;
            return init(html, html, options);
        });
    }

    it('should not merge amp-custom and non-amp-custom styles', () => {
        return init(
            '<style amp-custom>h1 { color: red }</style>'
            + '<style>div { color: blue }</style>',

            '<style amp-custom="">h1 { color: red }</style>'
            + '<style>div { color: blue }</style>',

            options
        );
    });

    it('should preserve amp-custom', () => {
        return init(
            '<style amp-custom>h1 { color: red }</style>'
            + '<div>hello</div>'
            + '<style amp-custom>div { color: blue }</style>',

            '<style amp-custom="">h1 { color: red } div { color: blue }</style>'
            + '<div>hello</div>',

            options
        );
    });

    it('should ignore AMP boilerplate', () => {
        const html = `<style>h1 { color: red }</style>
                      <div></div>
                      <style amp-boilerplate="">div { color: blue }</style>`;
        return init(
            html, html, options
        );
    });

    it('should ignore amp4ads and amp4email boilerplate', () => {
        return init(
            '<style>h1 { color: red }</style>'
            + '<style amp4ads-boilerplate="">div { color: blue }</style>'
            + '<style>p { color: green }</style>'
            + '<style amp4email-boilerplate="">span { color: black }</style>',

            '<style>h1 { color: red }</style>'
            + '<style amp4ads-boilerplate="">div { color: blue }</style>'
            + '<style>p { color: green }</style>'
            + '<style amp4email-boilerplate="">span { color: black }</style>',

            options
        );
    });

    for (const barrier of [
        '<link REL="alternate StyleSheet" href="theme.css">',
        '<LINK rel="style&#115;heet" href="theme.css">',
        '<style AMP-BOILERPLATE="">a { color: green }</style>',
        '<meta HTTP-EQUIV="Content-Security-Polic&#121;" content="style-src \'none\'">',
        '<script>document.write(\'<style>a { color: green }</style>\')</script>',
        '<base href="https://example.com/">',
        '<NOSCRIPT><style>a { color: green }</style></NOSCRIPT>',
        '<svg><style>a { color: green }</style></svg>',
        '<MATH><style>a { color: green }</style></MATH>'
    ]) {
        it(`should preserve style positions around ${barrier}`, () => {
            const html = '<style>a { color: red }</style>' + barrier
                + '<style>a { color: blue }</style>';
            return init(html, html, options);
        });
    }

    it('should handle style and template tags regardless of case', () => {
        return init(
            '<STYLE>a {}</STYLE><TEMPLATE><STYLE>b {}</STYLE><style>c {}</style></TEMPLATE><style>d {}</style>',
            '<STYLE>a {} d {}</STYLE><TEMPLATE><STYLE>b {} c {}</STYLE></TEMPLATE>',
            options
        );
    });

    for (const tag of ['svg', 'SVG', 'math', 'MATH']) {
        it(`should leave styles within <${tag}> untouched`, () => {
            const html = `<${tag}><style>a {}</style><style>b {}</style></${tag}>`;
            return init(html, html, options);
        });
    }
});
