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

    it('multiple files to --output-dir preserving nested structure', () => {
        const workDir = fs.mkdtempSync(path.join(distDir, 'cli-multi-'));
        const outDir = path.join(workDir, 'out');
        try {
            const aFile = path.join(workDir, 'a.html');
            const nestedDir = path.join(workDir, 'nested');
            const bFile = path.join(nestedDir, 'b.html');
            fs.mkdirSync(nestedDir, { recursive: true });
            fs.writeFileSync(aFile, inputHtml, 'utf8');
            fs.writeFileSync(bFile, inputHtml, 'utf8');

            const res = spawnSync(process.execPath, [bin, aFile, bFile, '--output-dir', outDir], {
                encoding: 'utf8'
            });

            expect(res.error).toBeUndefined();
            expect(res.status).toBe(0);
            expect((res.stdout || '').trim()).toBe('');
            expect(res.stderr).toContain('->');

            expect(fs.readFileSync(path.join(outDir, 'a.html'), 'utf8').trim()).toBe(minifiedHtml);
            expect(fs.readFileSync(path.join(outDir, 'nested', 'b.html'), 'utf8').trim()).toBe(minifiedHtml);
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    });

    it('glob pattern (quoted, expanded by the CLI)', () => {
        const workDir = fs.mkdtempSync(path.join(distDir, 'cli-glob-'));
        const outDir = path.join(workDir, 'out');
        try {
            fs.writeFileSync(path.join(workDir, 'a.html'), inputHtml, 'utf8');
            fs.writeFileSync(path.join(workDir, 'b.html'), inputHtml, 'utf8');

            const res = spawnSync(
                process.execPath,
                [bin, path.join(workDir, '*.html'), '--output-dir', outDir],
                { encoding: 'utf8' }
            );

            expect(res.error).toBeUndefined();
            expect(res.status).toBe(0);
            expect(fs.readFileSync(path.join(outDir, 'a.html'), 'utf8').trim()).toBe(minifiedHtml);
            expect(fs.readFileSync(path.join(outDir, 'b.html'), 'utf8').trim()).toBe(minifiedHtml);
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    });

    it('--in-place rewrites each input file', () => {
        const workDir = fs.mkdtempSync(path.join(distDir, 'cli-inplace-'));
        try {
            const aFile = path.join(workDir, 'a.html');
            const bFile = path.join(workDir, 'b.html');
            fs.writeFileSync(aFile, inputHtml, 'utf8');
            fs.writeFileSync(bFile, inputHtml, 'utf8');

            const res = spawnSync(process.execPath, [bin, aFile, bFile, '--in-place'], {
                encoding: 'utf8'
            });

            expect(res.error).toBeUndefined();
            expect(res.status).toBe(0);
            expect(fs.readFileSync(aFile, 'utf8').trim()).toBe(minifiedHtml);
            expect(fs.readFileSync(bFile, 'utf8').trim()).toBe(minifiedHtml);
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    });

    it('error: multiple inputs without --output-dir/--in-place', () => {
        const workDir = fs.mkdtempSync(path.join(distDir, 'cli-err-'));
        try {
            const aFile = path.join(workDir, 'a.html');
            const bFile = path.join(workDir, 'b.html');
            fs.writeFileSync(aFile, inputHtml, 'utf8');
            fs.writeFileSync(bFile, inputHtml, 'utf8');

            const res = spawnSync(process.execPath, [bin, aFile, bFile], {
                encoding: 'utf8'
            });

            expect(res.error).toBeUndefined();
            expect(res.status).toBe(1);
            expect(res.stderr).toContain('Multiple input files require');
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    });

    it('error: glob matching nothing', () => {
        const res = spawnSync(process.execPath, [bin, 'does-not-exist-*.html', '--output-dir', 'out'], {
            encoding: 'utf8'
        });

        expect(res.error).toBeUndefined();
        expect(res.status).toBe(1);
        expect(res.stderr).toContain('No files matched the pattern');
    });

    it('error: nonexistent input file', () => {
        const res = spawnSync(process.execPath, [bin, 'no-such-file.html'], {
            encoding: 'utf8'
        });

        expect(res.error).toBeUndefined();
        expect(res.status).toBe(1);
        expect(res.stderr).toContain('does not exist');
    });

    it('error: --in-place combined with --output', () => {
        const workDir = fs.mkdtempSync(path.join(distDir, 'cli-excl-'));
        try {
            const aFile = path.join(workDir, 'a.html');
            fs.writeFileSync(aFile, inputHtml, 'utf8');

            const res = spawnSync(process.execPath, [bin, aFile, '--in-place', '-o', 'out.html'], {
                encoding: 'utf8'
            });

            expect(res.error).toBeUndefined();
            expect(res.status).toBe(1);
            expect(res.stderr).toContain('cannot be combined');
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    });
});
