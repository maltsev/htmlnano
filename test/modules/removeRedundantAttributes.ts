import { init, initIdempotent } from '../htmlnano.ts';
import maxPreset from '../../dist/presets/max.mjs';

describe('removeRedundantAttributes', () => {
    const options = {
        removeRedundantAttributes: maxPreset.removeRedundantAttributes
    };

    it('should remove method="get" from <form>', () => {
        return init(
            '<form method="get"></form>',
            '<form></form>',
            options
        );
    });

    it('should remove method="GET" from <form>', () => {
        return init(
            '<form method="GET"></form>',
            '<form></form>',
            options
        );
    });

    it('should remove type="text" from <input>', () => {
        return init(
            '<input type="text">',
            '<input>',
            options
        );
    });

    it('should remove type="submit" from <button>', () => {
        return init(
            '<button type="submit">Button</button>',
            '<button>Button</button>',
            options
        );
    });

    it('should remove language="javascript" and type="text/javascript" from <script>', () => {
        return init(
            '<script language="javascript" type="text/javascript"></script>',
            '<script></script>',
            options
        );
    });

    it('should remove redundant type from <script>', () => {
        return init(
            '<script type="text/jscript"></script><script type="application/javascript"></script><script type="application/ecmascript"></script>',
            '<script></script><script></script><script></script>',
            options
        );
    });

    it('should remove redundant script attributes regardless of case', () => {
        return init(
            '<script type=" Text/JavaScript " language="JAVASCRIPT"></script>',
            '<script></script>',
            options
        );
    });

    it('shouldn\'t remove type=module from <script>', () => {
        return init(
            '<script type="module"></script>',
            '<script type="module"></script>',
            options
        );
    });

    it('should preserve script types and languages that keep content inert', () => {
        const html = '<script type="\u00a0text/javascript\u00a0">alert(1)</script><script type="\vtext/javascript">alert(2)</script><script language=" javascript ">alert(3)</script><script language="\u00a0javascript\u00a0">alert(4)</script>';
        return initIdempotent(html, html, options);
    });

    it('should keep a JavaScript type when language would disable the script', () => {
        const html = '<script type="text/javascript" language="vbscript">alert(1)</script><script type="application/javascript" language=" javascript ">alert(2)</script><script type="text/javascript" language="java&#115;cript">alert(3)</script>';
        return initIdempotent(html, html, options);
    });

    it('should remove script types when language also selects JavaScript', () => {
        return initIdempotent(
            '<script type="\tTEXT/JAVASCRIPT\f" language=""></script><script type="text/javascript" language="JScript"></script><script language="JAVASCRIPT"></script>',
            '<script language=""></script><script language="JScript"></script><script></script>',
            options
        );
    });

    it('should remove "charset" from <script> if it is an external script', () => {
        return init(
            '<script charset="UTF-8">alert();</script><script src="foo.js" charset="UTF-8"></script>',
            '<script>alert();</script><script src="foo.js" charset="UTF-8"></script>',
            options
        );
    });

    it('should keep "charset" when <script> has a src attribute', () => {
        return init(
            '<script src="" charset="utf-8"></script>',
            '<script src="" charset="utf-8"></script>',
            options
        );
    });

    it('should remove type="text/css" from <style>', () => {
        return init(
            '<style type="text/css"></style>',
            '<style></style>',
            options
        );
    });

    it('should preserve unsupported style types', () => {
        const html = '<style type=" text/css ">body{display:none}</style><style type="text/css; charset=utf-8">body{display:none}</style>';
        return initIdempotent(html, html, options);
    });

    it('should remove media="all" from <style> and <link>', () => {
        return init(
            '<style media="all"></style><link media="all">',
            '<style></style><link>',
            options
        );
    });

    it('should remove media="all" regardless of case', () => {
        return init(
            '<style media=" ALL "></style><link media="All">',
            '<style></style><link>',
            options
        );
    });

    it('should preserve media values containing non-ASCII whitespace', () => {
        const html = '<style media="\u00a0all\u00a0">body{display:none}</style><link rel="stylesheet" media="\u00a0all\u00a0" href="style.css">';
        return initIdempotent(html, html, options);
    });

    it('should remove type="text/css" from link[rel=stylesheet]', () => {
        return init(
            '<link rel="stylesheet" type="text/css" href="style.css">',
            '<link rel="stylesheet" href="style.css">',
            options
        );
    });

    it('should remove type="text/css" from link[rel~=stylesheet]', () => {
        return init(
            '<link rel=" alternate\tStyleSheet " type="TEXT/CSS" href="style.css">',
            '<link rel=" alternate\tStyleSheet " href="style.css">',
            options
        );
    });

    it('should preserve type when link has another resource relationship', () => {
        const html = '<link rel="preload stylesheet" as="script" type="text/css" href="script.js">';
        return initIdempotent(html, html, options);
    });

    it('should preserve type when stylesheet is not an ASCII-separated rel token', () => {
        const html = '<link rel="preload\u00a0stylesheet" type="text/css" href="style.css"><link rel="stylesheet" type=" text/css " href="style.css">';
        return initIdempotent(html, html, options);
    });

    it('shouldn\'t remove new type from link[rel=stylesheet]', () => {
        return init(
            '<link rel="stylesheet" type="text/example" href="style.css">',
            '<link rel="stylesheet" type="text/example" href="style.css">',
            options
        );
    });

    it('should remove loading="eager" from <img> & <iframe>', () => {
        return init(
            '<img src="example.com" loading="eager"><iframe src="example.com" loading="eager"></iframe>',
            '<img src="example.com"><iframe src="example.com"></iframe>',
            options
        );
    });

    it('should remove loading="eager" and decoding="auto" regardless of case', () => {
        return init(
            '<img src="example.com" loading="EAGER" decoding="AUTO"><iframe src="example.com" loading="Eager"></iframe>',
            '<img src="example.com"><iframe src="example.com"></iframe>',
            options
        );
    });

    it('shouldn\'t remove loading="lazy" from <img> & <iframe>', () => {
        return init(
            '<img src="example.com" loading="lazy"><iframe src="example.com" loading="lazy"></iframe>',
            '<img src="example.com" loading="lazy"><iframe src="example.com" loading="lazy"></iframe>',
            options
        );
    });

    it('should remove decoding="auto" from <img>', () => {
        return init(
            '<img src="example.com" decoding="auto">',
            '<img src="example.com">',
            options
        );
    });

    it('should remove kind="subtitles" from <track>', () => {
        return init(
            '<track kind="subtitles">',
            '<track>',
            options
        );
    });

    it('should preserve padded track kinds, whose invalid default is metadata', () => {
        const html = '<track kind=" subtitles "><track kind="\u00a0subtitles\u00a0">';
        return initIdempotent(html, html, options);
    });

    it('should remove wrap="soft" from <textarea>', () => {
        return init(
            '<textarea wrap="soft"></textarea>',
            '<textarea></textarea>',
            options
        );
    });

    it('should remove shape="rect" from <area>', () => {
        return init(
            '<area shape="rect" href="example.com">',
            '<area href="example.com">',
            options
        );
    });

    it('should remove fetchpriority="auto" from <img>, <link> & <script>', () => {
        return init(
            '<img src="example.com" fetchpriority="auto"><link rel="preload" fetchpriority="auto"><script fetchpriority="auto"></script>',
            '<img src="example.com"><link rel="preload"><script></script>',
            options
        );
    });

    it('should remove dir="ltr" from <html>', () => {
        return init(
            '<html dir="LTR" lang="en"><body>text</body></html>',
            '<html lang="en"><body>text</body></html>',
            options
        );
    });

    it('shouldn\'t remove dir="rtl" from <html>', () => {
        return init(
            '<html dir="rtl" lang="ar"><body>text</body></html>',
            '<html dir="rtl" lang="ar"><body>text</body></html>',
            options
        );
    });

    it('shouldn\'t remove dir="ltr" from other tags', () => {
        // Only the root element is guaranteed to have no ancestor overriding the direction
        return init(
            '<div dir="rtl"><p dir="ltr">text</p></div>',
            '<div dir="rtl"><p dir="ltr">text</p></div>',
            options
        );
    });

    it('shouldn\'t remove fetchpriority="high" from <img>, <link> & <script>', () => {
        return init(
            '<img src="example.com" fetchpriority="high"><link rel="preload" fetchpriority="high"><script fetchpriority="high"></script>',
            '<img src="example.com" fetchpriority="high"><link rel="preload" fetchpriority="high"><script fetchpriority="high"></script>',
            options
        );
    });
});
