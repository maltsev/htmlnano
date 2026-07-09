import { init } from '../htmlnano.ts';

describe('normalizeDoctype', () => {
    const options = {
        normalizeDoctype: true
    };

    it('should normalize XHTML 1.0 Strict doctype', () => {
        return init(
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html></html>',
            '<!doctype html><html></html>',
            options
        );
    });

    it('should normalize XHTML 1.0 Transitional doctype', () => {
        return init(
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html></html>',
            '<!doctype html><html></html>',
            options
        );
    });

    it('should normalize HTML 4.01 Strict doctype', () => {
        return init(
            '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html></html>',
            '<!doctype html><html></html>',
            options
        );
    });

    it('should lowercase an already-short uppercase doctype', () => {
        return init(
            '<!DOCTYPE html><html></html>',
            '<!doctype html><html></html>',
            options
        );
    });

    it('should leave an already-short lowercase doctype unchanged', () => {
        return init(
            '<!doctype html><html></html>',
            '<!doctype html><html></html>',
            options
        );
    });

    it('should normalize a doctype with extra whitespace', () => {
        return init(
            '<!DOCTYPE   html   PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">',
            '<!doctype html>',
            options
        );
    });

    it('should leave a document without a doctype unchanged', () => {
        return init(
            '<html><head></head><body>foo</body></html>',
            '<html><head></head><body>foo</body></html>',
            options
        );
    });

    it('should preserve content after the doctype exactly', () => {
        return init(
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n<html><head></head><body>  Hello <b>World</b>  </body></html>',
            '<!doctype html>\n<html><head></head><body>  Hello <b>World</b>  </body></html>',
            options
        );
    });

    it('should not treat an XML declaration as a doctype (posthtml drops the XML declaration itself)', () => {
        // The module leaves `<?xml ...?>` alone; posthtml's own renderer does
        // not emit the XML declaration, so only the doctype gets normalized.
        return init(
            '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html></html>',
            '\n<!doctype html><html></html>',
            options
        );
    });

    it('should do nothing when the module is disabled', () => {
        const legacy = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html></html>';
        return init(
            legacy,
            legacy,
            { normalizeDoctype: false }
        );
    });
});
