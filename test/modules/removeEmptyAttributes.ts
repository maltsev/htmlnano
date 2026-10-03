import { init, initIdempotent } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';

describe('removeEmptyAttributes', () => {
    const options = {
        removeEmptyAttributes: safePreset.removeEmptyAttributes
    };

    it('should preserve attributes named after inherited object properties', () => {
        const html = '<div constructor="" __definegetter__=" " __lookupgetter__="data"></div>';
        return init(html, html, options);
    });

    it('should remove empty attributes', () => {
        return init(
            '<div ID="" class="" style title="" lang="en" dir="" alt=""></div>',
            '<div title="" lang="en" alt=""></div>',
            options
        );
    });

    it('should remove whitespace-only token lists, styles and invalid numbers', () => {
        return init(
            '<div class=" \t" style="\n "></div><textarea cols=" \t" rows="\n"></textarea>',
            '<div></div><textarea></textarea>',
            options
        );
    });

    it('should preserve empty attributes that override inherited values', () => {
        const html = '<div title="Tooltip" lang="en"><span title="" lang=""></span></div>'
            + '<bdi dir="">text</bdi><bdi dir=" ">text</bdi>';
        return init(html, html, options);
    });

    it('should preserve meaningful whitespace and non-ASCII whitespace', () => {
        const html = '<div id=" " title="\t" class="\u00a0" style="\u00a0"></div>'
            + '<input name=" " placeholder=" " value=" "><button value=" "></button>'
            + '<slot name=" "></slot><link rel="\u00a0">';
        return init(html, html, options);
    });

    it('should preserve empty form owners, action overrides and validation patterns', () => {
        const html = '<form action="/submit"><input form="" pattern="" value="text">'
            + '<button formaction="">Submit</button><input type="submit" formaction=""></form>';
        return init(html, html, options);
    });

    it('should preserve empty input values with type-dependent defaults', () => {
        const html = '<input type="checkbox" name="check" value="">'
            + '<input type="RADIO" name="radio" value=""><input type="submit" value=""><input type="reset" value="">'
            + '<input type="check&#98;ox" value="">';
        return init(html, html, options);
    });

    it('should preserve empty headers that suppress automatic table header association', () => {
        const html = '<table><tr><th headers="">Heading</th><td headers="">Data</td></tr></table>';
        return init(html, html, options);
    });

    it('should preserve resource attributes whose presence changes loading', () => {
        const html = '<script src="">alert(1)</script><script src>alert(2)</script><audio src=""><source src="audio.ogg"></audio>'
            + '<video src=" "></video><link rel="stylesheet" href="">'
            + '<meta charset="" http-equiv="content-type" content="text/html; charset=windows-1251">';
        return init(html, html.replace('<script src>', '<script src="">'), options);
    });

    it('should preserve whitespace-only URLs that can resolve against a base URL', () => {
        const html = '<base href="https://example.com/other"><form action=" "></form>'
            + '<iframe src=" "></iframe><img src=" "><video poster=" "></video>';
        return init(html, html, options);
    });

    it('should preserve types that disable script, style or resource processing', () => {
        const html = '<script type=" ">alert(1)</script><script type="" language="vbscript">alert(2)</script>'
            + '<style type="\t">body{display:none}</style><link rel="stylesheet" href="style.css" type="">'
            + '<video><source src="video.mp4" type=""></video>';
        return init(html, html, options);
    });

    it('should still remove empty text defaults and unambiguous script and style types', () => {
        return init(
            '<form action=""><input name="" placeholder="" dirname="" value=""><button value="" type=""></button></form>'
            + '<slot name=""></slot><script type="">run()</script><style type="">p{color:red}</style>',
            '<form><input><button></button></form><slot></slot><script>run()</script><style>p{color:red}</style>',
            options
        );
    });

    it('should keep inert scripts and styles inert across safe preset passes', () => {
        return initIdempotent(
            '<script src="">alert(1)</script><script type=" ">alert(2)</script>'
            + '<script type="&#32;">alert(3)</script><style type=" ">body{display:none}</style>',
            '<script src>alert(1)</script><script type=" ">alert(2)</script>'
            + '<script type=" ">alert(3)</script><style type=" ">body{display:none}</style>',
            { ...safePreset, skipConfigLoading: true }
        );
    });

    it('should remove empty event handler attributes', () => {
        return init(
            '<button OnClick="" onfocus="   " onblur="\u00a0" onstate=""></button>'
            + '<div onmessage=""></div><body onmessage=" "></body><my-widget dropzone=""></my-widget>',
            '<button onstate=""></button><div onmessage=""></div><body></body><my-widget dropzone=""></my-widget>',
            options
        );
    });

    it('should remove empty tag-specific attributes on matching tags', () => {
        return init(
            '<textarea cols=""></textarea>',
            '<textarea></textarea>',
            options
        );
    });

    it('should keep empty tag-specific attributes on non-matching tags', () => {
        return init(
            '<div cols=""></div>',
            '<div cols=""></div>',
            options
        );
    });

    it('should remove empty minlength and maxlength on supported tags', () => {
        return init(
            '<input minlength="" maxlength=" "><textarea minlength="\t" maxlength=""></textarea>',
            '<input><textarea></textarea>',
            options
        );
    });
});
