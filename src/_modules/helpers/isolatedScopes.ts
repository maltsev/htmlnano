import type { PostHTMLNodeLike } from '../../types';

// <noscript> content applies only when scripting is disabled, and <template>
// content is inert until it's cloned into the document. Both therefore form a
// scope of their own: <style>/<script> inside them must never be merged with
// the ones outside (in either direction), because that changes whether — and
// when — they apply.
const isolatedScopeTags = new Set(['noscript', 'template']);

export function isIsolatedScope(node: PostHTMLNodeLike) {
    return typeof node === 'object'
        && typeof node.tag === 'string'
        && isolatedScopeTags.has(node.tag);
}
