import type { HtmlnanoModule, PostHTMLTreeLike, SortAttributesOption } from '../types.js';
import { resolveSortType } from './helpers/sortAttributesShared.js';

class AttributeTokenChain {
    /** <attr, frequency> */
    freqData = new Map<string, number>();
    sortOrder: Map<string, number> | null = null;

    addFromNodeAttrs(nodeAttrs: Record<string, string | void>) {
        Object.keys(nodeAttrs).forEach((attrName) => {
            const attrNameLower = attrName.toLowerCase();

            if (this.freqData.has(attrNameLower)) {
                this.freqData.set(attrNameLower, this.freqData.get(attrNameLower)! + 1);
            } else {
                this.freqData.set(attrNameLower, 1);
            }
        });
    }

    createSortOrder() {
        const _sortOrder = [...this.freqData.entries()];
        _sortOrder.sort((a, b) => {
            const freqDiff = b[1] - a[1];
            if (freqDiff !== 0) return freqDiff;

            return a[0].localeCompare(b[0]);
        });

        this.sortOrder = new Map(_sortOrder.map(([attrName], index) => [attrName, index]));
    }

    sortFromNodeAttrs(nodeAttrs: Record<string, string | void>) {
        if (!this.sortOrder) {
            this.createSortOrder();
        }

        const sortOrder = this.sortOrder!;
        // Stable sorting preserves case variants and their original relative order.
        // Object.fromEntries also safely creates own properties such as __proto__.
        return Object.fromEntries(
            Object.entries(nodeAttrs).sort(([attrA], [attrB]) =>
                sortOrder.get(attrA.toLowerCase())! - sortOrder.get(attrB.toLowerCase())!
            )
        );
    }
}

/** Sort attributes */
const mod: HtmlnanoModule<boolean | SortAttributesOption> = {
    default(tree, options, moduleOptions) {
        const sortType = resolveSortType(moduleOptions);

        if (sortType === 'alphabetical') {
            return sortAttributesInAlphabeticalOrder(tree);
        }

        if (sortType === 'frequency') {
            return sortAttributesByFrequency(tree);
        }

        // Invalid configuration
        return tree;
    }
};

export default mod;

function sortAttributesInAlphabeticalOrder(tree: PostHTMLTreeLike) {
    tree.walk((node) => {
        if (!node.attrs) {
            return node;
        }

        // Case variants must compare equally: HTML keeps the first duplicate.
        node.attrs = Object.fromEntries(
            Object.entries(node.attrs).sort(([attrA], [attrB]) =>
                attrA.toLowerCase().localeCompare(attrB.toLowerCase())
            )
        );

        return node;
    });

    return tree;
}

function sortAttributesByFrequency(tree: PostHTMLTreeLike) {
    const tokenchain = new AttributeTokenChain();

    // Traverse through tree to get frequency
    tree.walk((node) => {
        if (!node.attrs) {
            return node;
        }

        tokenchain.addFromNodeAttrs(node.attrs);

        return node;
    });

    // Traverse through tree again, this time sort the attributes
    tree.walk((node) => {
        if (!node.attrs) {
            return node;
        }

        node.attrs = tokenchain.sortFromNodeAttrs(node.attrs);

        return node;
    });

    return tree;
}
