### sortAttributes
Sort attributes inside elements.

The module won't impact the plain-text size of the output.
However it will improve the compression ratio of gzip/brotli used in HTTP compression.

#### Options

- `alphabetical`: Default option. Sort attributes in alphabetical order.
- `frequency`: Sort attributes by frequency across the whole document.
- `true`: Alias for `alphabetical`.
- `false`: Disable the module.

Both sorting modes preserve attribute names and values, and keep case variants in their original
relative order. This preserves HTML's first-duplicate behavior and retains distinct attributes in XML mode.
Alphabetical sorting compares lowercased attribute names. Frequency sorting counts lowercased
attribute names across the document and uses alphabetical ordering to break ties.

#### Example

**alphabetical**

Source:
```html
<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId">
```

Processed:
```html
<input autocomplete="off" autofocus="" class="form-control" id="testId" name="testInput" type="text">
```

**frequency**

Source:
```html
<input type="text" class="form-control" name="testInput" id="testId">
<a id="testId" href="#" class="testClass"></a>
<img width="20" src="../images/image.png" height="40" alt="image" class="cls" id="id2">
```

Processed:
```html
<input class="form-control" id="testId" type="text" name="testInput">
<a class="testClass" id="testId" href="#"></a>
<img class="cls" id="id2" alt="image" height="40" src="../images/image.png" width="20">
```
