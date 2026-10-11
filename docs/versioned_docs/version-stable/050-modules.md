# Modules

By default the modules should only perform safe transforms, see the module documentation below for details.
You can disable modules by passing `false` as option, and enable them by passing `true`.

The order in which the modules are documented is also the order in which they are applied.

## Attributes

<!-- include: ./_modules/normalizeAttributeValues.md -->

<!-- include: ./_modules/removeEmptyAttributes.md -->

<!-- include: ./_modules/collapseAttributeWhitespace.md -->

<!-- include: ./_modules/removeRedundantAttributes.md -->

<!-- include: ./_modules/removeXmlLeftovers.md -->

<!-- include: ./_modules/collapseBooleanAttributes.md -->

<!-- include: ./_modules/deduplicateAttributeValues.md -->

<!-- include: ./_modules/minifyAttributes.md -->

<!-- include: ./_modules/minifyUrls.md -->

<!-- include: ./_modules/sortAttributes.md -->

<!-- include: ./_modules/sortAttributesWithLists.md -->

## HTML Content

<!-- include: ./_modules/collapseWhitespace.md -->

<!-- include: ./_modules/minifyCharacterReferences.md -->

<!-- include: ./_modules/removeComments.md -->

<!-- include: ./_modules/removeEmptyElements.md -->

<!-- include: ./_modules/minifyConditionalComments.md -->

<!-- include: ./_modules/removeOptionalTags.md -->

<!-- include: ./_modules/normalizeDoctype.md -->

<!-- include: ./_modules/removeAttributeQuotes.md -->

## `<style>`, `<script>` and `<svg>` Tags
<!-- include: ./_modules/mergeStyles.md -->

<!-- include: ./_modules/mergeScripts.md -->

<!-- include: ./_modules/minifyCss.md -->

<!-- include: ./_modules/minifyJs.md -->

<!-- include: ./_modules/minifyJson.md -->

<!-- include: ./_modules/minifyHtmlTemplate.md -->

<!-- include: ./_modules/minifySvg.md -->

<!-- include: ./_modules/removeUnusedCss.md -->

## Miscellaneous

<!-- include: ./_modules/custom.md -->
