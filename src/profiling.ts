import { performance } from 'node:perf_hooks';

export type HtmlnanoProfileMetadata = Record<string, string | number | boolean | undefined>;

export interface HtmlnanoProfileEntry {
    moduleName: string;
    phase: string;
    detail?: string;
    durationMs: number;
    metadata?: HtmlnanoProfileMetadata;
}

export interface HtmlnanoProfileSummaryEntry {
    moduleName: string;
    phase: string;
    detail?: string;
    calls: number;
    totalTimeMs: number;
    averageTimeMs: number;
    maxTimeMs: number;
}

export interface HtmlnanoProfiler {
    add(entry: HtmlnanoProfileEntry): void;
}

export interface HtmlnanoProfileCollector extends HtmlnanoProfiler {
    summarize(): HtmlnanoProfileSummaryEntry[];
}

type MutableProfileSummaryEntry = Omit<HtmlnanoProfileSummaryEntry, 'averageTimeMs'>;

export function createProfiler(): HtmlnanoProfileCollector {
    const summaryByKey = new Map<string, MutableProfileSummaryEntry>();

    return {
        add(entry) {
            const key = [entry.moduleName, entry.phase, entry.detail ?? ''].join('\u0000');
            const existing = summaryByKey.get(key);
            if (existing) {
                existing.calls += 1;
                existing.totalTimeMs += entry.durationMs;
                existing.maxTimeMs = Math.max(existing.maxTimeMs, entry.durationMs);
                return;
            }

            summaryByKey.set(key, {
                moduleName: entry.moduleName,
                phase: entry.phase,
                detail: entry.detail,
                calls: 1,
                totalTimeMs: entry.durationMs,
                maxTimeMs: entry.durationMs
            });
        },

        summarize() {
            return [...summaryByKey.values()]
                .map(entry => ({
                    ...entry,
                    averageTimeMs: entry.totalTimeMs / entry.calls
                }))
                .sort((left, right) => {
                    return right.totalTimeMs - left.totalTimeMs
                        || right.maxTimeMs - left.maxTimeMs
                        || left.moduleName.localeCompare(right.moduleName)
                        || left.phase.localeCompare(right.phase)
                        || (left.detail ?? '').localeCompare(right.detail ?? '');
                });
        }
    };
}

export function profileSync<T>(
    profiler: HtmlnanoProfiler | undefined,
    entry: Omit<HtmlnanoProfileEntry, 'durationMs'>,
    fn: () => T
): T {
    const start = performance.now();

    try {
        return fn();
    } finally {
        profiler?.add({
            ...entry,
            durationMs: performance.now() - start
        });
    }
}

export async function profileAsync<T>(
    profiler: HtmlnanoProfiler | undefined,
    entry: Omit<HtmlnanoProfileEntry, 'durationMs'>,
    fn: () => Promise<T> | T
): Promise<T> {
    const start = performance.now();

    try {
        return await fn();
    } finally {
        profiler?.add({
            ...entry,
            durationMs: performance.now() - start
        });
    }
}
