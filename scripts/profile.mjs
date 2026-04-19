import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { createProfiler, presets, process as processHtml } from '../dist/index.mjs';

const args = process.argv.slice(2);
const files = [];

let presetName = 'safe';
let iterations = 3;
let warmupRuns = 1;
let topEntries = 10;

for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === '--preset') {
        presetName = args[++index] ?? presetName;
        continue;
    }

    if (arg === '--iterations') {
        iterations = Number.parseInt(args[++index] ?? '', 10) || iterations;
        continue;
    }

    if (arg === '--warmup') {
        warmupRuns = Number.parseInt(args[++index] ?? '', 10) || warmupRuns;
        continue;
    }

    if (arg === '--top') {
        topEntries = Number.parseInt(args[++index] ?? '', 10) || topEntries;
        continue;
    }

    files.push(arg);
}

if (!(presetName in presets)) {
    printUsage(`Unknown preset "${presetName}".`);
}

if (files.length === 0) {
    printUsage('Expected at least one HTML file.');
}

const preset = presets[presetName];

for (const file of files) {
    const html = await readFile(file, 'utf8');

    for (let index = 0; index < warmupRuns; index++) {
        await processHtml(html, { skipConfigLoading: true }, preset);
    }

    const profiler = createProfiler();
    let minifiedHtml = '';
    let totalDurationMs = 0;

    for (let index = 0; index < iterations; index++) {
        const start = performance.now();
        const result = await processHtml(html, {
            skipConfigLoading: true,
            profiling: profiler
        }, preset);
        totalDurationMs += performance.now() - start;
        minifiedHtml = result.html;
    }

    const summary = profiler.summarize();
    const topLevelPhases = summary
        .filter(entry => ['dependencies', 'load', 'transform', 'walk', 'normalize-attrs'].includes(entry.phase))
        .slice(0, topEntries);
    const subOperations = summary
        .filter(entry => !['dependencies', 'load', 'transform', 'walk', 'normalize-attrs'].includes(entry.phase))
        .filter(entry => entry.totalTimeMs > 0)
        .slice(0, topEntries);
    const counters = summary
        .filter(entry => entry.totalTimeMs === 0)
        .sort((left, right) => right.calls - left.calls || left.moduleName.localeCompare(right.moduleName))
        .slice(0, topEntries);

    process.stdout.write(`\n# ${file}\n`);
    process.stdout.write(`Preset: ${presetName}\n`);
    process.stdout.write(`Iterations: ${iterations} measured, ${warmupRuns} warmup\n`);
    process.stdout.write(`Source size: ${formatBytes(html.length)}\n`);
    process.stdout.write(`Minified size: ${formatBytes(minifiedHtml.length)}\n`);
    process.stdout.write(`Average total time: ${(totalDurationMs / iterations).toFixed(2)} ms\n`);

    printTable('Slowest top-level phases', topLevelPhases);
    printTable('Hot sub-operations', subOperations);
    printTable('Counters', counters);
    process.stdout.write('\nNote: sub-operation totals are cumulative and may exceed the end-to-end runtime when work runs in parallel.\n');
}

function formatBytes(size) {
    return `${(size / 1024).toFixed(1)} KiB`;
}

function formatMs(durationMs) {
    return durationMs.toFixed(2);
}

function printTable(title, entries) {
    process.stdout.write(`\n${title}\n`);

    if (entries.length === 0) {
        process.stdout.write('(no entries)\n');
        return;
    }

    const rows = [
        ['module', 'phase', 'detail', 'calls', 'total ms', 'avg/call ms', 'max ms'],
        ...entries.map(entry => [
            entry.moduleName,
            entry.phase,
            entry.detail ?? '',
            String(entry.calls),
            formatMs(entry.totalTimeMs),
            formatMs(entry.averageTimeMs),
            formatMs(entry.maxTimeMs)
        ])
    ];
    const widths = rows[0].map((_, columnIndex) => {
        return Math.max(...rows.map(row => row[columnIndex].length));
    });

    rows.forEach((row, rowIndex) => {
        const line = row
            .map((cell, columnIndex) => cell.padEnd(widths[columnIndex]))
            .join('  ')
            .trimEnd();
        process.stdout.write(`${line}\n`);
        if (rowIndex === 0) {
            process.stdout.write(`${widths.map(width => '-'.repeat(width)).join('  ')}\n`);
        }
    });
}

function printUsage(message) {
    if (message) {
        process.stderr.write(`${message}\n\n`);
    }

    process.stderr.write('Usage: node scripts/profile.mjs [--preset safe|max|ampSafe] [--iterations N] [--warmup N] [--top N] <file ...>\n');
    process.exit(1);
}
