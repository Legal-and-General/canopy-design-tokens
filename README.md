# Canopy Design Tokens

A design tokens system that fetches variables from Figma's REST API and transforms them into CSS custom properties using Style Dictionary.

## Features

- 🎨 **Figma Variables Integration** - Direct fetch from Figma API
- 🔄 **Multi-mode Support** - Handles colour modes (Blue, Green, Red, Yellow) and theme modes (Neutral, Subtle, Bold, Neutral inverse)
- 📦 **Multiple Output Formats** - Generates separate CSS files by collection and class-based theme files
- 🎯 **Smart Naming** - Size modifiers (sm, md, lg, xl, xxl) as suffixes for responsive tokens
- 📏 **Responsive Units** - Automatic px to rem conversion (16px base)
- ✨ **Custom Transforms** - Font family quoting, letter-spacing rounding, kebab-case normalization

## Output Files

The build process generates 6 CSS files in `build/css/`:

- **`colour.css`** - Colour tokens with class selectors: `.mode-blue`, `.mode-green`, `.mode-red`, `.mode-yellow`
- **`component-themes.css`** - Component theme tokens with class selectors: `.mode-blue.neutral`, `.mode-green.subtle`, etc. (16 combinations)
- **`foundations.css`** - Foundation tokens (dimensions, colours)
- **`layout.css`** - Layout tokens grouped by breakpoint suffix (sm, md, lg, xl, xxl)
- **`typography.css`** - Typography tokens (font families, weights, letter-spacing)
- **`variables.css`** - Combined file with all tokens in `:root`

[All output files can be found here](https://github.com/Legal-and-General/canopy-design-tokens/blob/master/build/css/)

## Setup

### 1. Prerequisites

```bash
npm install
```

### 2. Figma Access

#### Get your Figma Access Token

1. Go to [Figma account settings](https://www.figma.com/settings)
2. Scroll to "Personal Access Tokens"
3. Click "Create a new personal access token"
4. Copy the token

#### Get your Figma File Key

From your Figma file URL: `https://www.figma.com/design/ABC123DEF456/My-Design-System`  
The file key is: `ABC123DEF456`

### 3. GitHub Configuration

The Figma credentials should be stored as GitHub secrets (not in the repository)

**For Local Development Only**: Create a `.env` file in the project root:

```bash
FIGMA_ACCESS_TOKEN=your_token_here
FIGMA_FILE_KEY=your_file_key_here
```

⚠️ **Important**: Never commit the `.env` file to the repository. It should be in `.gitignore`.

## Usage

### Committing Changes

This project uses Prettier and Commitizen for code formatting and conventional commits:

```bash
npm run commit
```

This command will:

- Automatically format your staged files with Prettier (via pre-commit hook)
- Guide you through creating a conventional commit message
- Ensure proper commit formatting for automated releases

### Automated Workflow (Recommended)

The repository includes a GitHub Actions workflow that automatically:

1. Fetches design tokens from Figma
2. Processes them into token files
3. Creates a pull request with any changes

To run the workflow:

1. Go to **Actions** tab in your GitHub repository
2. Select **Sync Figma Design Tokens**
3. Click **Run workflow**

The workflow will create a PR if there are any changes to the tokens.

### Manual Build Pipeline

For local development or manual updates:

```bash
npm run tokens:fetch-raw      # Step 1: Fetch raw data from Figma
npm run tokens:process-raw    # Step 2: Process into token files
npm run build:tokens          # Step 3: Generate CSS files
```

### Individual Steps

#### 1. Fetch Raw Data

```bash
npm run tokens:fetch-raw
```

- Fetches raw Figma variables via REST API
- Saves to `tokens/figma-variables-raw.json`
- Includes all collection and mode metadata

#### 2. Process into Token Files

```bash
npm run tokens:process-raw
```

- Reads `tokens/figma-variables-raw.json`
- Expands component themes across all colour modes
- Generates 5 token files:
  - `tokens/colour.json`
  - `tokens/component-themes.json`
  - `tokens/foundations.json`
  - `tokens/layout.json`
  - `tokens/typography.json`

#### 3. Build CSS Files

```bash
npm run build:tokens
```

- Transforms token files into CSS using Style Dictionary
- Applies custom transforms (rem conversion, naming conventions, etc.)
- Outputs 6 CSS files to `build/css/`

## Token Structure

### Colour Tokens

Organised by colour mode with class selectors:

```css
.mode-blue {
  --brand-tint-1: #d2effb;
  --brand-tint-2: #aee1f7;
  /* ... */
}

.mode-green {
  --brand-tint-1: #dff6eb;
  --brand-tint-2: #caeedd;
  /* ... */
}
```

### Component Theme Tokens

Organised by colour and theme mode combinations:

```css
.mode-blue.neutral {
  --container-accent-1: #42aeea;
  --interactive-primary-default-background-colour: #005dba;
  /* ... */
}

.mode-green.subtle {
  --container-accent-1: #43af6e;
  --interactive-primary-default-background-colour: #00633d;
  /* ... */
}
```

### Layout Tokens

Grouped by breakpoint suffix (sm, md, lg, xl, xxl):

```css
/* Small breakpoint */
--font-size-1-sm: 1rem;
--line-height-1-sm: 1.375rem;
--space-1-sm: 0.25rem;

/* Medium breakpoint */
--font-size-1-md: 1rem;
--line-height-1-md: 1.375rem;
--space-1-md: 0.25rem;
```

### Typography Tokens

```css
--font-family-productive: 'Nunito Sans';
--font-family-expressive: 'ABC Otto';
--letter-spacing-condensed-productive: -0.00625rem;
--font-weight-700-productive: 700;
```

## Custom Transforms

### Size to REM

Converts numeric pixel values to rem units (16px base):

- `12` → `0.75rem`
- `16` → `1rem`
- `48` → `3rem`

### Kebab-case Normalization

Converts all token names to kebab-case:

- `Neutral inverse` → `neutral-inverse`
- `Blue` → `blue`

### Font Family Quoting

Wraps font families in single quotes:

- `Nunito Sans` → `'Nunito Sans'`

### Letter-spacing Rounding

Rounds to 5 decimal places:

- `-0.012500000186264515rem` → `-0.01250rem`

## File Structure

```
canopy-design-tokens/
├── .github/
│   └── workflows/
│       └── sync-figma-tokens.yml
├── build/
│   └── css/
│       ├── colour.css
│       ├── component-themes.css
│       ├── foundations.css
│       ├── layout.css
│       ├── typography.css
│       └── variables.css
├── tokens/
│   ├── figma-variables-raw.json
│   ├── colour.json
│   ├── component-themes.json
│   ├── foundations.json
│   ├── layout.json
│   └── typography.json
├── fetch-figma-tokens.js
├── figma-raw-to-tokens.js
├── style-dictionary.config.js
├── package.json
└── README.md
```

## Configuration

### Style Dictionary Config

The `style-dictionary.config.js` file includes:

- **Custom Transforms**: `size/pxToRem`, `name/kebab`, `asset/fontFamily`, `size/letterSpacingRound`
- **Custom Formats**: `css/component-themes-classes`, `css/colour-classes`, `css/layout-grouped`
- **Platform Configurations**: Separate build targets for each output file

### Mode Configuration

- **Colour Modes**: Blue, Green, Red, Yellow
- **Theme Modes**: Neutral, Subtle, Bold, Neutral inverse
- **Breakpoints**: sm, md, lg, xl, xxl

## Usage in Projects

### Import Individual Files

```html
<link rel="stylesheet" href="build/css/foundations.css" />
<link rel="stylesheet" href="build/css/colour.css" />
<link rel="stylesheet" href="build/css/component-themes.css" />
```

### Apply Themes with Classes

```html
<!-- Blue colour with neutral theme -->
<div class="mode-blue neutral">
  <button>Primary Button</button>
</div>

<!-- Green colour with subtle theme -->
<div class="mode-green subtle">
  <button>Primary Button</button>
</div>
```

### Responsive Layout Tokens

```css
@media (min-width: 768px) {
  .container {
    font-size: var(--font-size-3-md);
    padding: var(--space-4-md);
  }
}

@media (min-width: 1024px) {
  .container {
    font-size: var(--font-size-3-lg);
    padding: var(--space-4-lg);
  }
}
```

## Dependencies

- **style-dictionary**: ^5.1.1

## Notes

- All numeric dimension values are converted to rem (16px base)
- Font families are automatically quoted
- Letter-spacing values are rounded to 5 decimal places
- Token names use kebab-case throughout
- Component themes are expanded across all colour modes for consistent theming

```javascript
const {
  fetchFromFigma,
  processVariables,
  convertVariableValue,
} = require('./fetch-figma-variables.js');
```

## Examples

See the `tokens/` directory for examples of the expected output format.
