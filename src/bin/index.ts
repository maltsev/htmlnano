#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs';
import process from 'process';
import { process as processHtml, presets } from '../index.js';
import type { HtmlnanoPreset, HtmlnanoOptions } from '../types.js';

program
    .name('htmlnano')
    .description('Minify HTML with htmlnano')
    .argument('[input]', 'input file', '-')
    .option('-o, --output <file>', 'output file', '-')
    .option('-p, --preset <preset>', 'preset to use', 'safe')
    .option('-c, --config <file>', 'path to config file')
    .action(async (input: string | undefined, options: { output?: string; preset?: string; config?: string }) => {
        const { preset, output } = options;

        if (!preset || !(preset in presets)) {
            const available = Object.keys(presets).join(', ');
            process.stderr.write(`Unknown preset: ${preset}. Available presets: ${available}\n`);
            process.exitCode = 1;
            return;
        }

        const html = fs.readFileSync(input && input !== '-' ? input : 0, 'utf8');

        const key = preset as keyof typeof presets;
        const chosenPreset: HtmlnanoPreset = presets[key];

        const htmlnanoOptions: HtmlnanoOptions = {};
        if (options.config) {
            htmlnanoOptions.configPath = options.config;
        }

        const result = await processHtml(html, htmlnanoOptions, chosenPreset);

        if (output && output !== '-') {
            fs.writeFileSync(output, result.html);
        } else {
            process.stdout.write(result.html);
        }
    });

program.parse();
