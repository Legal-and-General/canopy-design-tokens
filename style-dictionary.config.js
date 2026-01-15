module.exports = {
  source: [
    'tokens/colour.json',
    'tokens/component-themes.json',
    'tokens/foundations.json',
    'tokens/layout.json',
    'tokens/typography.json',
  ],
  hooks: {
    transforms: {
      'size/pxToRem': {
        type: 'value',
        filter: function (token) {
          // Only transform numeric values that represent sizes
          // Exclude boolean values
          if (typeof token.value !== 'number') return false;
          if (token.type === 'boolean') return false;

          // Check if the token path contains size-related keywords
          const pathString = token.path.join('-').toLowerCase();

          // Exclude certain tokens that should remain unitless
          // Be specific with 'cols' - don't exclude 'colspan'
          if (
            pathString.includes('-cols-') ||
            pathString.endsWith('-cols') ||
            pathString.includes('visibility')
          ) {
            return false;
          }

          // Include dimension, number, and sizing types, plus specific keywords
          return (
            token.type === 'dimension' ||
            token.type === 'number' ||
            token.type === 'sizing' ||
            token.path.some((p) => {
              const lower = p.toLowerCase();
              return (
                lower.includes('padding') ||
                lower.includes('margin') ||
                lower.includes('gap') ||
                lower.includes('width') ||
                lower.includes('height') ||
                lower.includes('spacing') ||
                lower.includes('space') ||
                lower.includes('size') ||
                lower.includes('radius') ||
                lower.includes('gutter')
              );
            })
          );
        },
        transform: function (token) {
          // Convert px to rem (assuming 16px base)
          const remValue = token.value / 16;
          return `${remValue}rem`;
        },
      },
      'name/kebab': {
        type: 'name',
        filter: function (token) {
          // Apply to all tokens
          return true;
        },
        transform: function (token) {
          // Helper function to convert to kebab-case
          const toKebab = (str) => {
            return str
              .replace(/([a-z])([A-Z])/g, '$1-$2')
              .replace(/[\s_]+/g, '-')
              .toLowerCase();
          };

          // Convert path to kebab-case and join
          // e.g., ['font', 'size', '1', 'SM'] -> 'font-size-1-sm'
          const kebabPath = token.path.map((p) => toKebab(p));
          return kebabPath.join('-');
        },
      },
      'asset/fontFamily': {
        type: 'value',
        filter: function (token) {
          return (
            token.type === 'fontFamily' ||
            (token.path &&
              token.path.some((p) => p.toLowerCase().includes('font-family')))
          );
        },
        transform: function (token) {
          // Wrap font family in single quotes if it contains spaces or isn't already quoted
          const value = token.value;
          if (
            typeof value === 'string' &&
            !value.startsWith("'") &&
            !value.startsWith('"')
          ) {
            return `'${value}'`;
          }
          return value;
        },
      },
      'size/letterSpacingRound': {
        type: 'value',
        filter: function (token) {
          return (
            token.path &&
            token.path.some((p) => p.toLowerCase().includes('letter-spacing'))
          );
        },
        transform: function (token) {
          const value = token.value;
          if (typeof value === 'string' && value.endsWith('rem')) {
            // Extract the number, round to 5 decimal places, and append rem
            const numValue = parseFloat(value);
            return `${numValue.toFixed(5)}rem`;
          }
          return value;
        },
      },
    },
    formats: {
      'css/variables-with-defaults': function ({ dictionary, file, options }) {
        let output =
          '/**\n * Do not edit directly, this file was auto-generated.\n */\n\n:root {\n';

        // First, add all non-theme/color specific tokens
        const regularTokens = dictionary.allTokens.filter((token) => {
          const isComponentTheme = token.filePath.includes('component-themes');
          const isColour = token.filePath.includes('colour.json');
          return !isComponentTheme && !isColour;
        });

        regularTokens.forEach((token) => {
          output += `  --${token.name}: ${token.value};\n`;
        });

        // Now add default theme tokens (blue + neutral)
        const defaultThemeTokens = dictionary.allTokens.filter((token) => {
          const isComponentTheme = token.filePath.includes('component-themes');
          const isColour = token.filePath.includes('colour.json');

          if (!isComponentTheme && !isColour) return false;

          const path = token.path;

          if (isComponentTheme) {
            const colorMode = path[path.length - 1];
            const themeMode = path[path.length - 2];
            return colorMode === 'Blue' && themeMode === 'Neutral';
          } else if (isColour) {
            const colorMode = path[path.length - 1];
            return colorMode === 'Blue';
          }

          return false;
        });

        defaultThemeTokens.forEach((token) => {
          let varName;

          if (token.filePath.includes('colour.json')) {
            varName = 'colour-' + token.path.slice(0, -1).join('-');
          } else {
            const pathWithoutModes = token.path.slice(0, -2);
            varName = pathWithoutModes.join('-');
          }

          output += `  --${varName}: ${token.value};\n`;
        });

        output += '}\n';
        return output;
      },
      'css/component-themes-classes': function ({ dictionary }) {
        // Group tokens by color mode and theme mode
        const grouped = {};

        dictionary.allTokens.forEach((token) => {
          // Process both component theme and colour tokens
          const isComponentTheme = token.filePath.includes('component-themes');
          const isColour = token.filePath.includes('colour.json');

          if (!isComponentTheme && !isColour) return;

          // Extract color mode (and optionally theme mode) from path
          const path = token.path;
          let colorMode, themeMode;

          if (isComponentTheme) {
            // Path structure: [token-name, ..., themeMode, colorMode]
            colorMode = path[path.length - 1]; // Blue, Green, Red, Yellow
            themeMode = path[path.length - 2]; // Neutral, Subtle, Bold, Neutral inverse
          } else if (isColour) {
            // Path structure: [token-name, ..., colorMode]
            colorMode = path[path.length - 1]; // Blue, Green, Red, Yellow
            // For colour tokens, we need to duplicate them across all theme modes
            // We'll handle this by creating entries for each theme mode
            const themeModes = ['Neutral', 'Subtle', 'Bold', 'Neutral inverse'];

            themeModes.forEach((tm) => {
              const colorClass = colorMode.toLowerCase();
              const themeClass = tm.toLowerCase().replace(/\s+/g, '-');
              const key = `${colorClass}-${themeClass}`;

              if (!grouped[key]) {
                grouped[key] = {
                  colorMode,
                  themeMode: tm,
                  colorClass,
                  themeClass,
                  tokens: [],
                };
              }

              // Create a copy of the token with modified name
              const colourToken = {
                ...token,
                name: 'colour-' + token.path.slice(0, -1).join('-'),
              };

              grouped[key].tokens.push(colourToken);
            });

            return; // Skip the normal processing below
          }

          if (!colorMode || !themeMode) return;

          // Normalize mode names for class names
          const colorClass = colorMode.toLowerCase();
          const themeClass = themeMode.toLowerCase().replace(/\s+/g, '-');

          const key = `${colorClass}-${themeClass}`;

          if (!grouped[key]) {
            grouped[key] = {
              colorMode,
              themeMode,
              colorClass,
              themeClass,
              tokens: [],
            };
          }

          grouped[key].tokens.push(token);
        });

        // Generate CSS output
        let output =
          '/**\n * Do not edit directly, this file was auto-generated.\n */\n\n';

        // Sort by color mode then theme mode
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
          const [colorA, themeA] = a.split('-');
          const [colorB, themeB] = b.split('-');

          const colorOrder = ['blue', 'green', 'red', 'yellow'];
          const themeOrder = ['neutral', 'neutral-inverse', 'subtle', 'bold'];

          const colorCompare = colorOrder.indexOf(colorA) - colorOrder.indexOf(colorB);
          if (colorCompare !== 0) return colorCompare;

          return themeOrder.indexOf(themeA) - themeOrder.indexOf(themeB);
        });

        sortedKeys.forEach((key) => {
          const group = grouped[key];

          // Skip the default (blue + neutral) combination as it will be in :root in variables.css
          if (group.colorClass === 'blue' && group.themeClass === 'neutral') {
            return;
          }

          // Create class selector
          output += `.lg-mode-${group.colorClass}.lg-theme-${group.themeClass} {\n`;

          // Sort tokens by name for consistent output
          group.tokens.sort((a, b) => a.name.localeCompare(b.name));

          group.tokens.forEach((token) => {
            let varName;

            // Check if this is a colour token (it will have the 'colour-' prefix we added)
            if (token.name && token.name.startsWith('colour-')) {
              varName = token.name;
            } else {
              // Remove color mode and theme mode from variable name for component theme tokens
              const pathWithoutModes = token.path.slice(0, -2);
              varName = pathWithoutModes.join('-');
            }

            output += `  --${varName}: ${token.value};\n`;
          });

          output += '}\n\n';
        });

        return output;
      },
      'css/colour-classes': function ({ dictionary }) {
        // Group tokens by color mode
        const grouped = {};

        dictionary.allTokens.forEach((token) => {
          // Only process colour tokens
          if (!token.filePath.includes('colour.json')) return;

          // Extract color mode from path
          // Path structure: [token-name, ..., colorMode]
          const path = token.path;
          const colorMode = path[path.length - 1]; // Blue, Green, Red, Yellow

          if (!colorMode) return;

          // Normalize mode name for class name
          const colorClass = colorMode.toLowerCase();

          if (!grouped[colorClass]) {
            grouped[colorClass] = {
              colorMode,
              colorClass,
              tokens: [],
            };
          }

          grouped[colorClass].tokens.push(token);
        });

        // Generate CSS output
        let output =
          '/**\n * Do not edit directly, this file was auto-generated.\n */\n\n';

        // Sort by color mode
        const colorOrder = ['blue', 'green', 'red', 'yellow'];
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
          return colorOrder.indexOf(a) - colorOrder.indexOf(b);
        });

        sortedKeys.forEach((key) => {
          const group = grouped[key];

          // Create class selector
          output += `.lg-mode-${group.colorClass} {\n`;

          // Sort tokens by name for consistent output
          group.tokens.sort((a, b) => a.name.localeCompare(b.name));

          group.tokens.forEach((token) => {
            // Remove color mode from variable name
            const pathWithoutMode = token.path.slice(0, -1);
            const varName = pathWithoutMode.join('-');

            output += `  --${varName}: ${token.value};\n`;
          });

          output += '}\n\n';
        });

        return output;
      },
      'css/layout-grouped': function ({ dictionary }) {
        // Group tokens by size prefix
        const grouped = {};

        dictionary.allTokens.forEach((token) => {
          // Only process layout tokens
          if (!token.filePath.includes('layout')) return;

          // Extract size suffix from token name
          const name = token.name;
          const sizeModifiers = ['sm', 'md', 'lg', 'xl', 'xxl'];
          let suffix = 'no-suffix';

          for (const size of sizeModifiers) {
            if (name.endsWith('-' + size)) {
              suffix = size;
              break;
            }
          }

          if (!grouped[suffix]) {
            grouped[suffix] = [];
          }

          grouped[suffix].push(token);
        });

        // Generate CSS output
        let output =
          '/**\n * Do not edit directly, this file was auto-generated.\n */\n\n:root {\n';

        // Sort by size order
        const sizeOrder = ['sm', 'md', 'lg', 'xl', 'xxl', 'no-suffix'];

        sizeOrder.forEach((size) => {
          if (!grouped[size] || grouped[size].length === 0) return;

          // Add comment for the group
          if (size !== 'no-suffix') {
            output += `\n  /* ${size.toUpperCase()} tokens */\n`;
          } else {
            output += `\n  /* Other tokens */\n`;
          }

          // Sort tokens by name within the group
          grouped[size].sort((a, b) => a.name.localeCompare(b.name));

          grouped[size].forEach((token) => {
            output += `  --${token.name}: ${token.value};\n`;
          });
        });

        output += '}\n';
        return output;
      },
    },
  },
  preprocessors: ['tokens-studio'],
  log: {
    warnings: 'warn',
    verbosity: 'default',
  },
  platforms: {
    // Component themes - single file with class-based selectors
    'css-component-themes': {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/pxToRem',
        'color/css',
        'asset/url',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
      buildPath: 'build/css/',
      files: [
        {
          destination: 'component-themes.css',
          format: 'css/component-themes-classes',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              (token.filePath.includes('component-themes') ||
                token.filePath.includes('colour.json'))
            );
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },

    // Colour tokens - single file with class-based selectors
    'css-colour': {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/pxToRem',
        'color/css',
        'asset/url',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
      buildPath: 'build/css/',
      files: [
        {
          destination: 'colour.css',
          format: 'css/colour-classes',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.filePath.includes('colour.json')
            );
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },

    // Foundations - single file
    'css-foundations': {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/pxToRem',
        'color/css',
        'asset/url',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
      buildPath: 'build/css/',
      files: [
        {
          destination: 'foundations.css',
          format: 'css/variables',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.filePath.includes('foundations')
            );
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },

    // Layout - single file
    'css-layout': {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/pxToRem',
        'color/css',
        'asset/url',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
      buildPath: 'build/css/',
      files: [
        {
          destination: 'layout.css',
          format: 'css/layout-grouped',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.filePath.includes('layout')
            );
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },

    // Typography - single file
    'css-typography': {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/pxToRem',
        'size/letterSpacingRound',
        'color/css',
        'asset/url',
        'asset/fontFamily',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
      buildPath: 'build/css/',
      files: [
        {
          destination: 'typography.css',
          format: 'css/variables',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.filePath.includes('typography')
            );
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },

    // Combined variables file - all tokens
    'css-all': {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/pxToRem',
        'color/css',
        'asset/url',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
      buildPath: 'build/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables-with-defaults',
          filter: function (token) {
            return token.value !== null && token.value !== undefined;
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },
  },
};
