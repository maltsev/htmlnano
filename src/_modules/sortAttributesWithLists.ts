// class, rel, ping
import type { HtmlnanoModule, PostHTMLTreeLike, SortAttributesOption } from '../types';
import { isListAttribute } from './collapseAttributeWhitespace';
import {
    resolveSortType

} from './helpers/sortAttributesShared';

class ListAttributeTokenChain {
    /** <attr, frequency> */
    tokenCounts = new Map<string, number>();
    sortedTokens: string[] | null = null;

    addFromNodeAttrsArray(attrValuesArray: string[]) {
        attrValuesArray.forEach((attrValue) => {
            if (!attrValue) {
                return;
            }

            if (this.tokenCounts.has(attrValue)) {
                this.tokenCounts.set(attrValue, this.tokenCounts.get(attrValue)! + 1);
            } else {
                this.tokenCounts.set(attrValue, 1);
            }
        });
    }

    createSortOrder() {
        const nextSortOrder = [...this.tokenCounts.entries()];
        nextSortOrder.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

        this.sortedTokens = nextSortOrder.map(i => i[0]);
    }

    sortFromNodeAttrsArray(attrValuesArray: string[]) {
        const resultArray: string[] = [];
        const tokenCounts = new Map<string, number>();

        attrValuesArray.forEach((attrValue) => {
            if (!attrValue) {
                return;
            }

            tokenCounts.set(attrValue, (tokenCounts.get(attrValue) ?? 0) + 1);
        });

        if (!this.sortedTokens) {
            this.createSortOrder();
        }

        this.sortedTokens!.forEach((k) => {
            const count = tokenCounts.get(k);
            if (!count) {
                return;
            }

            for (let i = 0; i < count; i += 1) {
                resultArray.push(k);
            }
        });

        return resultArray;
    }
}

/** Sort values inside list-like attributes (e.g. class, rel) */
const mod: HtmlnanoModule<boolean | SortAttributesOption> = {
    default(tree, options, moduleOptions) {
        const sortType = resolveSortType(moduleOptions);

        if (sortType === 'alphabetical') {
            return sortAttributesWithListsInAlphabeticalOrder(tree);
        }

        if (sortType === 'frequency') {
            return sortAttributesWithListsByFrequency(tree);
        }

        // Invalid configuration
        return tree;
    }
};

export default mod;

const splitListAttributeValues = (attrValue: string) => attrValue.split(/\s+/).filter(Boolean);

function walkListAttributes(
    tree: PostHTMLTreeLike,
    walkFn: (nodeAttrs: Record<string, string | void>, attrName: string, attrValues: string) => void
) {
    tree.walk((node) => {
        if (!node.attrs) {
            return node;
        }

        const tagName = node.tag ? node.tag.toLowerCase() : undefined;

        Object.entries(node.attrs).forEach(([attrName, attrValues]) => {
            const attrNameLower = attrName.toLowerCase();
            if (!isListAttribute(attrNameLower, tagName) || typeof attrValues !== 'string') {
                return;
            }

            walkFn(node.attrs!, attrName, attrValues);
        });

        return node;
    });
}

function sortAttributesWithListsInAlphabeticalOrder(tree: PostHTMLTreeLike) {
    walkListAttributes(tree, (nodeAttrs, attrName, attrValues) => {
        const values = splitListAttributeValues(attrValues);
        if (values.length < 2) {
            return;
        }

        nodeAttrs[attrName] = values.sort((a, b) => {
            // @ts-expect-error -- deliberately use minus operator to sort things
            return typeof a.localeCompare === 'function' ? a.localeCompare(b) : a - b;
        }).join(' ');
    });

    return tree;
}

function sortAttributesWithListsByFrequency(tree: PostHTMLTreeLike) {
    const tokenChainObj: Record<string, ListAttributeTokenChain> = {};

    // Traverse through tree to get frequency
    walkListAttributes(tree, (_nodeAttrs, attrName, attrValues) => {
        const attrNameLower = attrName.toLowerCase();
        tokenChainObj[attrNameLower] = tokenChainObj[attrNameLower] || new ListAttributeTokenChain();
        tokenChainObj[attrNameLower].addFromNodeAttrsArray(splitListAttributeValues(attrValues));
    });

    // Traverse through tree again, this time sort the attribute values
    walkListAttributes(tree, (nodeAttrs, attrName, attrValues) => {
        const attrNameLower = attrName.toLowerCase();
        if (!tokenChainObj[attrNameLower]) {
            return;
        }

        nodeAttrs[attrName] = tokenChainObj[attrNameLower]
            .sortFromNodeAttrsArray(splitListAttributeValues(attrValues))
            .join(' ');
    });

    return tree;
}
