import type PostHTML from 'posthtml';

export type PostHTMLNodeLike = PostHTML.Node | string;

export type PostHTMLTreeLike = [PostHTMLNodeLike] & PostHTML.NodeAPI & {
    options?: {
        quoteAllAttributes?: boolean | undefined;
        quoteStyle?: 0 | 1 | 2 | undefined;
        replaceQuote?: boolean | undefined;
    } | undefined;

    render(): string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- posthtml render options are untyped
    render(node: PostHTMLNodeLike | PostHTMLTreeLike, renderOptions?: any): string;
};

type MaybeArray<T> = T | Array<T>;

export type HtmlnanoTemplateRule = {
    tag: string;
    attrs?: Record<string, string | boolean | void>;
};
export type MinifyHtmlTemplateOptions = boolean | HtmlnanoTemplateRule[];
export type HtmlnanoMinifyCssOptions = object;
export type HtmlnanoMinifyJsOptions = object;
export type HtmlnanoMinifySvgOptions = object;
export type HtmlnanoPurgeCssPattern = string | RegExp;
export type HtmlnanoPurgeCssExtractorResultDetailed = {
    attributes: {
        names: string[];
        values: string[];
    };
    classes: string[];
    ids: string[];
    tags: string[];
    undetermined: string[];
};
export type HtmlnanoPurgeCssExtractorResult = HtmlnanoPurgeCssExtractorResultDetailed | string[];
export type HtmlnanoPurgeCssDefaultExtractor = (content: string) => HtmlnanoPurgeCssExtractorResult;
export type HtmlnanoPurgeCssSourceMapOptions = {
    absolute?: boolean;
    annotation?: boolean | string;
    from?: string;
    inline?: boolean;
    prev?: boolean | object | string;
    sourcesContent?: boolean;
    to?: string;
};
export type HtmlnanoPurgeCssSafelist = HtmlnanoPurgeCssPattern[] | {
    standard?: HtmlnanoPurgeCssPattern[];
    deep?: RegExp[];
    greedy?: RegExp[];
    variables?: HtmlnanoPurgeCssPattern[];
    keyframes?: HtmlnanoPurgeCssPattern[];
};
export interface HtmlnanoPurgeCssOptions {
    tool: 'purgeCSS';
    defaultExtractor?: HtmlnanoPurgeCssDefaultExtractor;
    fontFace?: boolean;
    keyframes?: boolean;
    output?: string;
    rejected?: boolean;
    rejectedCss?: boolean;
    sourceMap?: boolean | HtmlnanoPurgeCssSourceMapOptions;
    stdin?: boolean;
    stdout?: boolean;
    variables?: boolean;
    safelist?: HtmlnanoPurgeCssSafelist;
    blocklist?: HtmlnanoPurgeCssPattern[];
    skippedContentGlobs?: string[];
    dynamicAttributes?: string[];
}

export interface HtmlnanoOptions {
    skipConfigLoading?: boolean;
    configPath?: string;
    skipInternalWarnings?: boolean;
    collapseAttributeWhitespace?: boolean;
    collapseBooleanAttributes?: {
        amphtml?: boolean;
    };
    collapseWhitespace?: 'conservative' | 'all' | 'aggressive';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom options depend on consumer
    custom?: MaybeArray<(tree: PostHTMLTreeLike, options?: any) => (PostHTML.Node | PostHTMLTreeLike)>;
    deduplicateAttributeValues?: boolean;
    minifyUrls?: URL | string | false;
    mergeStyles?: boolean;
    mergeScripts?: boolean;
    minifyCss?: HtmlnanoMinifyCssOptions | boolean;
    minifyHtmlTemplate?: MinifyHtmlTemplateOptions;
    minifyConditionalComments?: boolean;
    minifyJs?: HtmlnanoMinifyJsOptions | boolean;
    minifyJson?: boolean;
    minifyAttributes?: boolean | {
        metaContent?: boolean;
        redundantWhitespaces?: 'safe' | 'agressive' | false;
    };
    minifySvg?: HtmlnanoMinifySvgOptions | boolean;
    normalizeAttributeValues?: boolean;
    removeAttributeQuotes?: boolean | {
        force?: boolean;
    };
    removeComments?: boolean | RegExp | ((comment: string) => boolean) | string;
    removeEmptyAttributes?: boolean;
    removeEmptyElements?: boolean | {
        removeWithAttributes?: boolean;
    };
    removeRedundantAttributes?: boolean;
    removeOptionalTags?: boolean;
    removeUnusedCss?: boolean
        | HtmlnanoPurgeCssOptions
        | {
            tool?: 'uncss';
            banner?: boolean;
            csspath?: string;
            htmlroot?: string;
            ignore?: (string | RegExp)[];
            inject?: string;
            jsdom?: object;
            media?: string[];
            report?: boolean;
            strictSSL?: boolean;
            timeout?: number;
            uncssrc?: string;
            userAgent?: string;
        };
    sortAttributes?: boolean | 'alphabetical' | 'frequency';
    sortAttributesWithLists?: boolean | 'alphabetical' | 'frequency';
}

export interface HtmlnanoPreset extends Omit<HtmlnanoOptions, 'skipConfigLoading' | 'configPath'> { }

export type HtmlnanoPredefinedPreset = 'safe' | 'ampSafe' | 'max';
export type HtmlnanoPredefinedPresets = Record<HtmlnanoPredefinedPreset, HtmlnanoPreset>;

export type HtmlnanoOptionsConfigFile = Omit<HtmlnanoOptions, 'skipConfigLoading' | 'configPath'> & {
    preset?: HtmlnanoPredefinedPreset;
};

export type HtmlnanoModuleAttrsHandler = (attrs: Record<string, string | boolean | void>, node: PostHTML.Node) => Record<string, string | boolean | void>;
export type HtmlnanoModuleContentHandler = (content: Array<PostHTMLNodeLike>, node: PostHTML.Node) => MaybeArray<PostHTMLNodeLike>;
export type HtmlnanoModuleNodeHandler = (node: PostHTMLNodeLike) => PostHTML.Node | string;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- match any functions deliberately
type OptionalOptions<T> = T extends boolean | string | Function | number | null | undefined
    ? T
    : T extends Array<infer Item>
        ? Array<Item>
        : T extends object
            ? Partial<T>
            : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- module options default to any
export type HtmlnanoModule<Options = any> = {
    onAttrs?: (options: Partial<HtmlnanoOptions>, moduleOptions: OptionalOptions<Options>) => HtmlnanoModuleAttrsHandler;
    onContent?: (options: Partial<HtmlnanoOptions>, moduleOptions: OptionalOptions<Options>) => HtmlnanoModuleContentHandler;
    onNode?: (options: Partial<HtmlnanoOptions>, moduleOptions: OptionalOptions<Options>) => HtmlnanoModuleNodeHandler;
    default?: (
        tree: PostHTMLTreeLike,
        options: Partial<HtmlnanoOptions>,
        moduleOptions: OptionalOptions<Options>
    ) => PostHTMLTreeLike | Promise<PostHTMLTreeLike>;
};
