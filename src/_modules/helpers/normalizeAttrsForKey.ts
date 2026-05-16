import type PostHTML from 'posthtml';

type NormalizeAttrsForKeyConfig = {
    baseAttrs?: Record<string, string | boolean>;
    booleanAttrs: Set<string>;
    skippedAttrs: Set<string>;
};

export function normalizeAttrsForKey(
    attrs: PostHTML.NodeAttributes,
    config: NormalizeAttrsForKeyConfig
) {
    const normalized: Record<string, string | boolean> = { ...config.baseAttrs };

    for (const [key, value] of Object.entries(attrs || {})) {
        if (config.skippedAttrs.has(key) || value === undefined) {
            continue;
        }

        if (config.booleanAttrs.has(key)) {
            normalized[key] = true;
            continue;
        }

        normalized[key] = value;
    }

    return normalized;
}
