# Canopy Design Tokens

A design tokens system that fetches variables from Figma's REST API and transforms them into CSS custom properties using Style Dictionary.

## Table of Contents

- [Features](#features)
- [Output Files](#output-files)
- [Usage in Your Project](#usage-in-your-project)
- [Token Structure](#token-structure)
- [How to Contribute](#how-to-contribute)

## Features

- 🎨 **Figma Variables Integration** - Direct fetch from Figma API
- 🔄 **Multi-mode Support** - Handles colour modes (Blue, Green, Red, Yellow) and theme modes (Neutral, Subtle, Bold, Neutral inverse)
- 📦 **Multiple Output Formats** - Generates separate CSS files by collection and class-based theme files
- 🎯 **Smart Naming** - Size modifiers (sm, md, lg, xl, xxl) as suffixes for responsive tokens
- 📏 **Responsive Units** - Automatic px to rem conversion (16px base)
- ✨ **Custom Transforms** - Font family quoting, letter-spacing rounding, kebab-case normalization

## Output Files

The build process generates 6 CSS files in `build/css/`:

- **`colour.css`** - Colour tokens with class selectors: `.lg-mode-blue`, `.lg-mode-green`, `.lg-mode-red`, `.lg-mode-yellow`
- **`component-themes.css`** - Component theme tokens with class selectors: `.lg-mode-blue.lg-neutral`, `.lg-mode-green.lg-subtle`, etc. (16 combinations)
- **`status.css`** - Status tokens with class selectors: `.lg-status-info`, `.lg-status-success`, `.lg-status-warning`, `.lg-status-error`, `.lg-status-generic` combined with theme modes (20 combinations)
- **`layout.css`** - Layout tokens grouped by breakpoint suffix (sm, md, lg, xl, xxl)
- **`typography.css`** - Typography tokens (typeface, weights, letter-spacing)
- **`variables.css`** - Combined file with all tokens in `:root` (includes all foundation tokens: dimensions, colours, font sizes, line heights)

[All output files can be found here](https://github.com/Legal-and-General/canopy-design-tokens/blob/master/build/css/)

## Usage in Your Project

### Install the Package

```bash
npm install @legal-and-general/canopy-design-tokens
```

### Import Individual Files

```html
<link
  rel="stylesheet"
  href="node_modules/@legal-and-general/canopy-design-tokens/css/variables.css"
/>
<link
  rel="stylesheet"
  href="node_modules/@legal-and-general/canopy-design-tokens/css/colour.css"
/>
<link
  rel="stylesheet"
  href="node_modules/@legal-and-general/canopy-design-tokens/css/component-themes.css"
/>
<link
  rel="stylesheet"
  href="node_modules/@legal-and-general/canopy-design-tokens/css/status.css"
/>
```

### Apply Themes with Classes

```html
<!-- Blue colour with neutral theme -->
<div class="lg-mode-blue lg-neutral">
  <button>Primary Button</button>
</div>

<!-- Green colour with subtle theme -->
<div class="lg-mode-green lg-subtle">
  <button>Primary Button</button>
</div>

<!-- Status with theme -->
<div class="lg-status-info lg-theme-neutral">
  <p>Information message</p>
</div>

<div class="lg-status-error lg-theme-bold">
  <p>Error message</p>
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

## Token Structure

### Colour Tokens

Organised by colour mode with class selectors:

```css
.lg-mode-blue {
  --brand-tint-1: #d2effb;
  --brand-tint-2: #aee1f7;
  /* ... */
}

.lg-mode-green {
  --brand-tint-1: #dff6eb;
  --brand-tint-2: #caeedd;
  /* ... */
}
```

### Component Theme Tokens

Organised by colour and theme mode combinations:

```css
.lg-mode-blue.lg-neutral {
  --container-accent-1: #42aeea;
  --interactive-primary-default-background-colour: #005dba;
  /* ... */
}

.lg-mode-green.lg-subtle {
  --container-accent-1: #43af6e;
  --interactive-primary-default-background-colour: #00633d;
  /* ... */
}
```

### Status Tokens

Organised by status mode (info, success, warning, error, generic) and theme mode combinations:

```css
.lg-status-info.lg-theme-neutral {
  --container-status-background-colour: #aee1f7;
  --interactive-status-rest-background-colour: #005dba;
  /* ... */
}

.lg-status-error.lg-theme-bold {
  --container-status-background-colour: #ff3e51;
  --interactive-status-rest-background-colour: #c50b30;
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
--typeface-productive: 'Nunito Sans';
--typeface-expressive: 'ABC Otto';
--letter-spacing-condensed-productive: -0.00625rem;
--font-weight-700-productive: 700;
```

## How to Contribute

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

### Making Changes

#### Committing Changes

This project uses Prettier and Commitizen for code formatting and conventional commits:

```bash
npm run commit
```

This command will:

- Automatically format your staged files with Prettier (via pre-commit hook)
- Guide you through creating a conventional commit message
- Ensure proper commit formatting for automated releases

#### Automated Workflow (Recommended)

The repository includes a GitHub Actions workflow that automatically:

1. Fetches design tokens from Figma
2. Processes them into token files
3. Creates a pull request with any changes

To run the workflow:

1. Go to **Actions** tab in your GitHub repository
2. Select **Sync Figma Design Tokens**
3. Click **Run workflow**

The workflow will create a PR if there are any changes to the tokens.

#### Manual Build Pipeline

For local development or manual updates:

```bash
npm run tokens:fetch-raw      # Step 1: Fetch raw data from Figma
npm run tokens:process-raw    # Step 2: Process into token files
npm run build:tokens          # Step 3: Generate CSS files
```

##### Individual Steps

**1. Fetch Raw Data**

```bash
npm run tokens:fetch-raw
```

- Fetches raw Figma variables via REST API
- Saves to `tokens/figma-variables-raw.json`
- Includes all collection and mode metadata

**2. Process into Token Files**

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

**3. Build CSS Files**

```bash
npm run build:tokens
```

- Transforms token files into CSS using Style Dictionary
- Applies custom transforms (rem conversion, naming conventions, etc.)
- Outputs 7 CSS files to `build/css/`
