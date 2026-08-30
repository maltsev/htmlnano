import type { HtmlnanoModule, PostHTMLTreeLike, SortAttributesOption } from '../types';
import {
    resolveSortType

} from './helpers/sortAttributesShared';

class AttributeTokenChain {
    /** <attr, frequency> */
    freqData = new Map<string, number>();
    sortOrder: string[] | null = null;

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

        this.sortOrder = _sortOrder.map(i => i[0]);
    }

    sortFromNodeAttrs(nodeAttrs: Record<string, string | void>) {
        const newAttrs: Record<string, string | void> = {};

        // Convert node.attrs attrName into lower case while preserving originals.
        const loweredNodeAttrs: Record<string, { name: string; value: string | void }> = {};
        Object.entries(nodeAttrs).forEach(([attrName, attrValue]) => {
            const attrNameLower = attrName.toLowerCase();
            if (!loweredNodeAttrs[attrNameLower]) {
                loweredNodeAttrs[attrNameLower] = { name: attrName, value: attrValue };
            }
        });

        if (!this.sortOrder) {
            this.createSortOrder();
        }

        const seen = new Set<string>();

        this.sortOrder!.forEach((attrNameLower) => {
            // The attrName inside "sortOrder" has been lowered
            const originalAttr = loweredNodeAttrs[attrNameLower];
            if (originalAttr != null) {
                newAttrs[originalAttr.name] = originalAttr.value;
                seen.add(attrNameLower);
            }
        });

        Object.entries(loweredNodeAttrs).forEach(([attrNameLower, originalAttr]) => {
            if (!seen.has(attrNameLower)) {
                newAttrs[originalAttr.name] = originalAttr.value;
            }
        });

        return newAttrs;
    }
}

/** Sort attibutes */
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

        node.attrs = Object.fromEntries(
            Object.entries(node.attrs).sort(([attrA], [attrB]) => attrA.localeCompare(attrB))
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
