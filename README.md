# Canopy Design Tokens

A [Design Tokens](https://css-tricks.com/what-are-design-tokens/) implementation for [Canopy](https://github.com/Legal-and-General/canopy). Uses the [Style Dictionary](https://amzn.github.io/style-dictionary) package to turn the design token JSON files into consumable files for your project, e.g. CSS varaibles.

## Build

To build the consumable files for your project:

```bash
# All platforms
npm run build

# Just CSS varaibles
npm run build:css

# Just SCSS variables
npm run build:scss
```

The resuling build files can be found in the **build/** directory.

## Design token JSON files

All design tokens are defined in the **propeties/** directory.
