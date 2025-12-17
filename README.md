# Canopy Design Tokens Repository

An exploratory look at a [Design Tokens](https://css-tricks.com/what-are-design-tokens/) implementation for [Canopy](https://github.com/Legal-and-General/canopy). Uses the [Style Dictionary](https://amzn.github.io/style-dictionary) package to turn the design token JSON files into consumable files for your project, e.g. CSS variables.

Note this is a proof of concept.

## Build

To build the consumable files for your project:

```bash
# All platforms
npm run build

# Just CSS variables
npm run build:css
```

The resulting build files can be found in the **build/** directory.

## Design token JSON files

All design tokens are defined in JSON files the **properties/** directory. Here you can edit, add or remove tokens.

It's from these files that the build artifacts are created.
