#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { globSync } from 'tinyglobby';
import { process as processHtml, presets } from '../index.js';
import type { HtmlnanoPreset, HtmlnanoOptions } from '../types.js';

interface CliOptions {
    output?: string;
    outputDir?: string;
    inPlace?: boolean;
    preset?: string;
    config?: string;
}

function fail(message: string): never {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}

// Expand the positional inputs into a concrete list of files.
// Glob patterns are expanded by the CLI itself so that shells that don't
// expand globs (e.g. Windows) behave the same as POSIX shells.
function resolveInputs(inputs: string[]): string[] {
    const resolved: string[] = [];
    const seen = new Set<string>();

    for (const rawInput of inputs) {
        const isGlob = /[*?[\]{}]/.test(rawInput);

        if (isGlob) {
            const matches = globSync(rawInput, { absolute: false });
            if (matches.length === 0) {
                fail(`No files matched the pattern: ${rawInput}`);
            }
            for (const match of matches) {
                addInput(match);
            }
        } else {
            if (!fs.existsSync(rawInput)) {
                fail(`Input file does not exist: ${rawInput}`);
            }
            addInput(rawInput);
        }
    }

    return resolved;

    function addInput(file: string): void {
        const key = path.resolve(file);
        if (!seen.has(key)) {
            seen.add(key);
            resolved.push(file);
        }
    }
}

// The base directory used to preserve the relative structure when writing to
// --output-dir. It is the deepest common parent directory of all inputs, so
// e.g. inputs `pages/a.html` and `pages/nested/b.html` are written under
// <outputDir>/a.html and <outputDir>/nested/b.html.
function commonBaseDir(files: string[]): string {
    const dirs = files.map(file => path.resolve(path.dirname(file)).split(path.sep));
    let common = dirs[0];

    for (const parts of dirs.slice(1)) {
        const next: string[] = [];
        for (let i = 0; i < Math.min(common.length, parts.length); i++) {
            if (common[i] === parts[i]) {
                next.push(common[i]);
            } else {
                break;
            }
        }
        common = next;
    }

    return common.join(path.sep) || path.sep;
}

async function minify(html: string, options: CliOptions, chosenPreset: HtmlnanoPreset): Promise<string> {
    const htmlnanoOptions: HtmlnanoOptions = {};
    if (options.config) {
        htmlnanoOptions.configPath = options.config;
    }
    const result = await processHtml(html, htmlnanoOptions, chosenPreset);
    return result.html;
}

// Emit a single result either to the -o/--output file or to STDOUT.
function emitSingle(minified: string, output: string | undefined): void {
    if (output !== undefined && output !== '-') {
        fs.writeFileSync(output, minified);
    } else {
        process.stdout.write(minified);
    }
}

program
    .name('htmlnano')
    .description('Minify HTML with htmlnano')
    .argument('[inputs...]', 'input files or glob patterns (use "-" or omit for STDIN)')
    .option('-o, --output <file>', 'output file (single input only)', '-')
    .option('-d, --output-dir <dir>', 'write each input into <dir>, preserving relative structure')
    .option('--in-place', 'rewrite each input file in place')
    .option('-p, --preset <preset>', 'preset to use', 'safe')
    .option('-c, --config <file>', 'path to config file')
    .action(async (inputs: string[], options: CliOptions) => {
        const { preset } = options;

        if (!preset || !(preset in presets)) {
            const available = Object.keys(presets).join(', ');
            fail(`Unknown preset: ${preset}. Available presets: ${available}`);
        }

        const chosenPreset: HtmlnanoPreset = presets[preset as keyof typeof presets];

        const outputDirSet = options.outputDir !== undefined;
        const outputSet = options.output !== undefined && options.output !== '-';

        if (options.inPlace && (outputSet || outputDirSet)) {
            fail('--in-place cannot be combined with -o/--output or -d/--output-dir');
        }
        if (outputSet && outputDirSet) {
            fail('-o/--output cannot be combined with -d/--output-dir');
        }

        // STDIN mode: no inputs or the explicit "-" placeholder.
        const positionals = inputs.filter(input => input !== '-');
        const stdinMode = positionals.length === 0;

        if (stdinMode) {
            if (outputDirSet || options.inPlace) {
                fail('--output-dir and --in-place require at least one input file');
            }
            const html = fs.readFileSync(0, 'utf8');
            emitSingle(await minify(html, options, chosenPreset), options.output);
            return;
        }

        const files = resolveInputs(positionals);

        // Single input keeps the original -o/STDOUT behaviour for backwards compat.
        if (files.length === 1 && !outputDirSet && !options.inPlace) {
            const html = fs.readFileSync(files[0], 'utf8');
            emitSingle(await minify(html, options, chosenPreset), options.output);
            return;
        }

        // Multiple inputs require an explicit destination strategy.
        if (!outputDirSet && !options.inPlace) {
            fail('Multiple input files require --output-dir <dir> or --in-place');
        }

        const base = outputDirSet ? commonBaseDir(files) : '';

        for (const file of files) {
            const html = fs.readFileSync(file, 'utf8');
            const minified = await minify(html, options, chosenPreset);

            let destination: string;
            if (options.inPlace) {
                destination = file;
            } else {
                const relative = path.relative(base, path.resolve(file));
                destination = path.join(options.outputDir as string, relative);
                fs.mkdirSync(path.dirname(destination), { recursive: true });
            }

            fs.writeFileSync(destination, minified);
            process.stderr.write(`${file} -> ${destination}\n`);
        }
    });

program.parse();
