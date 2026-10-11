// Serialized markup must not be processed by hooks that expect text content.
export const serializedContentNodes = new WeakSet<object>();
