---
sidebar_position: 1
slug: /
---

# Introduction

htmlnano is a modular HTML minifier built on top of [PostHTML](https://github.com/posthtml/posthtml).
Inspired by [cssnano](http://cssnano.co/).

## Why htmlnano

htmlnano is designed for production HTML optimization with a modular architecture:

- Safe by default: the built-in `safe` preset focuses on conservative transforms.
- Configurable per module: enable, disable, or tune each transform independently.
- Ecosystem-friendly: use it through the JS API, PostHTML, CLI, or bundler integrations.
- Extensible: optional modules let you include CSS/JS/URL minification as needed.

## How it works

htmlnano processes your HTML with an ordered set of modules. Each module handles one concern
(for example, comments, whitespace, attributes, inline CSS, or inline JS), so behavior is
predictable and easy to tune for your project.

In most setups, the typical flow is:

1. Start with a preset (`safe`, `ampSafe`, or `max`).
2. Override only the modules you care about.
3. Run htmlnano as the final PostHTML step.

## Next steps

- Learn integration patterns in [Usage](./usage).
- See config precedence and file-based config in [Config](./config).
- Pick a baseline preset in [Presets](./presets).
- Review module behavior and caveats in [Modules](./modules).
- Compare size reduction results in [Benchmarks](./benchmarks).
