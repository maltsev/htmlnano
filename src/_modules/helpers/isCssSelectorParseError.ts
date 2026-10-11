/** Distinguish selector parse errors from configuration and visitor failures. */
export function isCssSelectorParseError(error: unknown): boolean {
    // postcss-selector-parser throws plain Errors. Its error creation frames
    // identify parse failures; visitor frames also occur in callback failures.
    return error instanceof Error
        && /\bat (?:Root\._error|Parser\.error) \([^\n]*[/\\]postcss-selector-parser[/\\]/.test(error.stack ?? '');
}
