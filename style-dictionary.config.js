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
              token.path.some(
                (p) =>
                  p.toLowerCase().includes('font-family') ||
                  p.toLowerCase().includes('typeface'),
              ))
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

        // Helper to check if a token is a breakpoint-specific layout token
        const isBreakpointLayoutToken = (token) => {
          if (!token.filePath.includes('layout')) return false;

          const name = token.name;
          const breakpointSuffixes = ['-sm', '-md', '-lg', '-xl', '-xxl'];

          // List of token patterns that should be excluded (they're in layout.css)
          const excludePatterns = [
            'font-size-',
            'line-height-',
            'space-',
            'border-radius-',
            'border-width-',
            'colspan-',
            'page-cols-',
            'page-gutter-',
            'page-margin-',
            'page-min-width-',
            'page-max-width-',
            'visibility-',
          ];

          // Check if token ends with a breakpoint suffix
          const hasBreakpointSuffix = breakpointSuffixes.some((suffix) =>
            name.endsWith(suffix),
          );

          // Check if token matches any exclude pattern
          const matchesExcludePattern = excludePatterns.some((pattern) =>
            name.includes(pattern),
          );

          return hasBreakpointSuffix && matchesExcludePattern;
        };

        // First, add all non-theme/color specific tokens, excluding breakpoint layout tokens
        const regularTokens = dictionary.allTokens.filter((token) => {
          const isComponentTheme = token.filePath.includes('component-themes');
          const isColour = token.filePath.includes('colour.json');
          const isBreakpointLayout = isBreakpointLayoutToken(token);
          return !isComponentTheme && !isColour && !isBreakpointLayout;
        });

        regularTokens.forEach((token) => {
          output += `  --${token.name}: ${token.value};\n`;
        });

        // Now add default theme tokens (blue + neutral, and status generic + neutral)
        const defaultThemeTokens = dictionary.allTokens.filter((token) => {
          const isComponentTheme = token.filePath.includes('component-themes');
          const isColour = token.filePath.includes('colour.json');

          if (!isComponentTheme && !isColour) return false;

          const path = token.path;

          if (isComponentTheme) {
            const isStatus = token.path.includes('status');

            if (isStatus) {
              // For status tokens: path is [..., themeMode, statusMode]
              const statusMode = path[path.length - 1];
              const themeMode = path[path.length - 2];
              return statusMode === 'Generic' && themeMode === 'Neutral';
            } else {
              // For color mode tokens: path is [..., themeMode, colorMode]
              const colorMode = path[path.length - 1];
              const themeMode = path[path.length - 2];
              return colorMode === 'Blue' && themeMode === 'Neutral';
            }
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

          // Check if this is a status token (has 'status' in path)
          const isStatus = token.path.includes('status');

          // Skip status tokens - they're handled by css/status-classes formatter
          if (isStatus) return;

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
      'css/status-classes': function ({ dictionary }) {
        // Group tokens by status mode and theme mode
        const grouped = {};

        dictionary.allTokens.forEach((token) => {
          // Only process status tokens
          if (!token.path.includes('status')) return;

          // Extract status mode and theme mode from path
          // Path structure: [component, 'status', variant, property, themeMode, statusMode]
          // or: [component, 'status', property, themeMode, statusMode]
          const path = token.path;
          const statusMode = path[path.length - 1]; // Info, Success, Warning, Error, Generic
          const themeMode = path[path.length - 2]; // Neutral, Subtle, Bold, Neutral inverse

          if (!statusMode || !themeMode) return;

          // Normalize mode names
          const statusClass = statusMode.toLowerCase();
          const themeClass = themeMode.toLowerCase().replace(/\s+/g, '-');

          const key = `${statusClass}-${themeClass}`;

          if (!grouped[key]) {
            grouped[key] = {
              statusMode,
              themeMode,
              statusClass,
              themeClass,
              tokens: [],
            };
          }

          grouped[key].tokens.push(token);
        });

        // Generate CSS output
        let output =
          '/**\n * Do not edit directly, this file was auto-generated.\n */\n\n';

        // Sort by status type then theme mode
        const statusOrder = ['info', 'success', 'warning', 'error', 'generic'];
        const themeOrder = ['neutral', 'neutral-inverse', 'subtle', 'bold'];
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
          const parts = a.split('-');
          const sitA = parts[0];
          const themeAParts = parts.slice(1);

          const partsB = b.split('-');
          const sitB = partsB[0];
          const themeBParts = partsB.slice(1);

          const sitAIndex = statusOrder.indexOf(sitA);
          const sitBIndex = statusOrder.indexOf(sitB);

          if (sitAIndex !== sitBIndex) {
            return sitAIndex - sitBIndex;
          }

          // Rejoin theme parts for comparison
          const themeA = themeAParts.join('-');
          const themeB = themeBParts.join('-');

          return themeOrder.indexOf(themeA) - themeOrder.indexOf(themeB);
        });

        sortedKeys.forEach((key) => {
          const group = grouped[key];

          // Create class selector
          output += `.lg-status-${group.statusClass}.lg-theme-${group.themeClass} {\n`;

          // Sort tokens by name for consistent output
          group.tokens.sort((a, b) => a.name.localeCompare(b.name));

          group.tokens.forEach((token) => {
            // Remove theme mode and status mode from variable name
            // Find 'status' in path and build varName from there
            const statusIndex = token.path.indexOf('status');
            if (statusIndex >= 0) {
              const pathBeforeStatus = token.path.slice(0, statusIndex);
              const propertyPath = token.path.slice(statusIndex + 1, -2); // exclude themeMode and statusMode

              const varName = [...pathBeforeStatus, 'status', ...propertyPath].join('-');
              output += `  --${varName}: ${token.value};\n`;
            }
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
      'typescript/variables-with-typography': function ({ dictionary }) {
        const { allTokens } = dictionary;

        // Helper to format value for TypeScript
        const formatValue = (value) => {
          if (typeof value === 'string') {
            // Escape backslashes first, then quotes
            return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
          }
          return JSON.stringify(value);
        };

        // Check if token is typography-related
        const isTypographyToken = (token) => {
          const typographyTypes = [
            'fontWeights',
            'fontFamilies',
            'fontSizes',
            'lineHeights',
            'letterSpacing',
            'fontSize',
            'fontWeight',
            'fontFamily',
            'lineHeight',
          ];
          const isTypographyType = typographyTypes.includes(token.type);
          const hasTypographyPath = token.path.some(
            (p) =>
              p.toLowerCase().includes('font') ||
              p.toLowerCase().includes('letter-spacing') ||
              p.toLowerCase().includes('line-height') ||
              p.toLowerCase().includes('typography'),
          );
          return isTypographyType || hasTypographyPath;
        };

        let output = `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n`;

        // Generate tokens - skip typography tokens, simple exports for others
        allTokens.forEach((token) => {
          const name = token.name.replace(/-/g, '_').replace(/^_+/, '');

          if (!isTypographyToken(token)) {
            // Simple export for non-typography tokens
            output += `export const ${name} = ${formatValue(token.value)};\n`;
          }
        });

        // Now add typography composite styles

        // Group font sizes and line heights by scale and mode
        const fontSizeTokens = {};
        const lineHeightTokens = {};
        const fontFamilyTokens = {};

        allTokens.forEach((token) => {
          if (token.type === 'fontSizes' && token.path.includes('font-size')) {
            const key = token.path.join('|');
            fontSizeTokens[key] = token;
          } else if (token.type === 'lineHeights' && token.path.includes('line-height')) {
            const key = token.path.join('|');
            lineHeightTokens[key] = token;
          } else if (
            token.type === 'fontFamilies' &&
            token.path.includes('font-family')
          ) {
            const mode = token.path[token.path.length - 1];
            fontFamilyTokens[mode] = token;
          }
        });

        // Create composite typography objects
        const typographyStyles = [];

        Object.keys(fontSizeTokens).forEach((sizeKey) => {
          const sizeToken = fontSizeTokens[sizeKey];
          const sizePath = sizeKey.split('|');

          // Try to find matching line height
          const lineHeightKey = sizePath
            .map((p) => (p === 'font-size' ? 'line-height' : p))
            .join('|');
          const lineHeightToken = lineHeightTokens[lineHeightKey];

          if (lineHeightToken) {
            const scale = sizePath[1];
            const mode = sizePath[2];

            // Determine font family based on scale and mode
            const useExpressive =
              parseInt(scale) >= 6 && ['LG', 'XL', 'XXL'].includes(mode);
            const fontFamily = useExpressive
              ? fontFamilyTokens['Expressive']
                ? fontFamilyTokens['Expressive'].value
                : 'ABC Otto'
              : fontFamilyTokens['Productive']
                ? fontFamilyTokens['Productive'].value
                : 'Nunito Sans';

            // Create meaningful name
            const scaleNames = {
              '0-6': 'Caption2',
              '0-8': 'Caption1',
              1: 'Body',
              2: 'Callout',
              3: 'Subheadline',
              4: 'Headline',
              5: 'Title3',
              6: 'Title2',
              7: 'Title1',
              8: 'LargeTitle',
              9: 'LargeTitle2',
            };

            const scaleName = scaleNames[scale] || `Size${scale}`;
            const modeName = mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
            const styleName = `typography${scaleName}${modeName}${useExpressive ? 'Expressive' : 'Productive'}`;

            typographyStyles.push({
              name: styleName,
              fontFamily,
              fontSize: sizeToken.value,
              lineHeight: lineHeightToken.value,
            });
          }
        });

        // Sort and deduplicate typography styles
        const uniqueStyles = {};
        typographyStyles.forEach((style) => {
          const key = `${style.fontSize}-${style.lineHeight}-${style.fontFamily}`;
          if (!uniqueStyles[key] || style.name.length < uniqueStyles[key].name.length) {
            uniqueStyles[key] = style;
          }
        });

        // Output typography composite objects
        Object.values(uniqueStyles)
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach((style) => {
            output += `export const ${style.name} = {\n`;
            output += `  fontFamily: "${style.fontFamily}",\n`;
            output += `  fontSize: ${style.fontSize},\n`;
            output += `  lineHeight: ${style.lineHeight},\n`;
            output += `};\n`;
          });

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

    // Status tokens - single file with class-based selectors
    'css-status': {
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
          destination: 'status.css',
          format: 'css/status-classes',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.path &&
              token.path.includes('status')
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

    // Link - single file
    'css-link': {
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
          destination: 'link.css',
          format: 'css/variables',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.filePath.includes('link.json')
            );
          },
          options: {
            outputReferences: false,
          },
        },
      ],
    },

    // Link menu - single file
    'css-link-menu': {
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
          destination: 'link-menu.css',
          format: 'css/variables',
          filter: function (token) {
            return (
              token.value !== null &&
              token.value !== undefined &&
              token.filePath.includes('link-menu.json')
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

    // TypeScript tokens
    ts: {
      transformGroup: 'react-native',
      buildPath: 'build/ts/',
      files: [
        {
          destination: 'variables.ts',
          format: 'typescript/variables-with-typography',
          filter: function (token) {
            return token.value !== null && token.value !== undefined;
          },
        },
      ],
    },
  },
};
