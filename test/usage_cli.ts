import { expect } from 'expect';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('[cli]', () => {
    const distDir = path.resolve(__dirname, '../dist');
    const bin = path.resolve(distDir, 'bin.js');

    const inputHtml = ' <div><!-- foo --><i>Hello</i> <i>world!</i></div> \n';
    const minifiedHtml = '<div><i>Hello</i> <i>world!</i></div>';
    const minifiedHtmlMax = '<div><i>Hello</i><i>world!</i></div>';

    it('reads from STDIN and prints to STDOUT', () => {
        const stdout = execFileSync(process.execPath, [bin], {
            input: inputHtml,
            encoding: 'utf8'
        });
        expect(stdout.trim()).toBe(minifiedHtml);
    });

    it('--preset max', () => {
        const stdout = execFileSync(process.execPath, [bin, '--preset', 'max'], {
            input: inputHtml,
            encoding: 'utf8'
        });
        expect(stdout.trim()).toBe(minifiedHtmlMax);
    });

    it('--preset invalid', () => {
        const res = spawnSync(process.execPath, [bin, '-p', 'invalid'], {
            input: inputHtml,
            encoding: 'utf8'
        });

        expect(res.error).toBeUndefined();
        expect(res.status).toBe(1);
        expect((res.stdout || '').trim()).toBe('');
        expect((res.stderr || '').trim()).toBe('Unknown preset: invalid. Available presets: safe, ampSafe, max');
    });

    it('specify config file', () => {
        const configFile = path.resolve(distDir, 'cli-config.tmp.json');
        try {
            fs.writeFileSync(
                configFile,
                JSON.stringify({
                    collapseWhitespace: 'all'
                }),
                'utf8'
            );

            const stdout = execFileSync(process.execPath, [bin, '-c', configFile], {
                input: inputHtml,
                encoding: 'utf8'
            });
            expect(stdout.trim()).toBe(minifiedHtmlMax);
        } finally {
            if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
        }
    });

    it('read from a file and print to a file', () => {
        const inFile = path.resolve(distDir, 'cli-input.tmp.html');
        const outFile = path.resolve(distDir, 'cli-output.tmp.html');

        try {
            fs.writeFileSync(inFile, inputHtml, 'utf8');

            const res = spawnSync(process.execPath, [bin, inFile, '-o', outFile], {
                encoding: 'utf8'
            });

            expect(res.error).toBeUndefined();
            expect(res.status).toBe(0);
            expect((res.stdout || '').trim()).toBe('');

            const written = fs.readFileSync(outFile, 'utf8').trim();
            expect(written).toBe(minifiedHtml);
        } finally {
            if (fs.existsSync(inFile)) fs.unlinkSync(inFile);
            if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
        }
    });
});
