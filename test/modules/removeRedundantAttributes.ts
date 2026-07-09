import { init } from '../htmlnano.ts';
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
            '<form method=" GET "></form>',
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

    it('should remove type="text/css" from link[rel=stylesheet]', () => {
        return init(
            '<link rel="stylesheet" type="text/css" href="style.css">',
            '<link rel="stylesheet" href="style.css">',
            options
        );
    });

    it('should remove type="text/css" from link[rel~=stylesheet]', () => {
        return init(
            '<link rel="preload StyleSheet" type=" TEXT/CSS " href="style.css">',
            '<link rel="preload StyleSheet" href="style.css">',
            options
        );
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
            '<img src="example.com" loading=" EAGER " decoding=" AUTO "><iframe src="example.com" loading="Eager"></iframe>',
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

    it('shouldn\'t remove fetchpriority="high" from <img>, <link> & <script>', () => {
        return init(
            '<img src="example.com" fetchpriority="high"><link rel="preload" fetchpriority="high"><script fetchpriority="high"></script>',
            '<img src="example.com" fetchpriority="high"><link rel="preload" fetchpriority="high"><script fetchpriority="high"></script>',
            options
        );
    });
});
