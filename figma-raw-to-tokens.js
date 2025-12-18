#!/usr/bin/env node

/**
 * Figma Raw Variables to Tokens Converter
 * 
 * This script reads the raw Figma JSON and converts it to Style Dictionary
 * compatible token structure, organizing by collection and expanding
 * component themes across color modes.
 * 
 * Usage: npm run tokens:process-raw
 * 
 * Input: tokens/figma-variables-raw.json
 * Output: Multiple JSON files in tokens/ directory, one per collection
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = './tokens/figma-variables-raw.json';
const OUTPUT_DIR = './tokens';

/**
 * Converts RGB color values to hex
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolves a variable alias to its actual value
 */
function resolveVariableAlias(aliasId, variables, currentModeId = null, seenIds = new Set()) {
  if (seenIds.has(aliasId)) {
    return null;
  }
  
  let referencedVariable = variables[aliasId];
  
  if (!referencedVariable) {
    const idParts = aliasId.split(':');
    const shortId = idParts[idParts.length - 1];
    referencedVariable = variables[shortId];
  }
  
  if (!referencedVariable) {
    const varIdKey = Object.keys(variables).find(key => 
      key === aliasId || key.endsWith(aliasId) || aliasId.endsWith(key)
    );
    if (varIdKey) {
      referencedVariable = variables[varIdKey];
    }
  }
  
  if (!referencedVariable) {
    return null;
  }
  
  seenIds.add(aliasId);
  
  let modeId = currentModeId;
  if (!modeId || !referencedVariable.valuesByMode[modeId]) {
    modeId = Object.keys(referencedVariable.valuesByMode)[0];
  }
  
  const referencedValue = referencedVariable.valuesByMode[modeId];
  
  if (referencedValue && typeof referencedValue === 'object' && referencedValue.type === 'VARIABLE_ALIAS') {
    return resolveVariableAlias(referencedValue.id, variables, modeId, seenIds);
  }
  
  return convertVariableValue(referencedVariable, referencedValue, variables, modeId, seenIds);
}

/**
 * Converts Figma variable value to simplified token value
 */
function convertVariableValue(variable, value, allVariables = null, currentModeId = null, seenIds = new Set()) {
  if (!value) return null;
  
  if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
    if (!allVariables) {
      return null;
    }
    return resolveVariableAlias(value.id, allVariables, currentModeId, seenIds);
  }
  
  switch (variable.resolvedType) {
    case 'COLOR':
      if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
        return rgbToHex(value.r, value.g, value.b);
      }
      break;
      
    case 'FLOAT':
      return typeof value === 'number' ? value : parseFloat(value);
      
    case 'STRING':
      return typeof value === 'string' ? value : String(value);
      
    case 'BOOLEAN':
      return Boolean(value);
      
    default:
      return value;
  }
  
  return value;
}

/**
 * Determines token type based on Figma variable type and name
 */
function getTokenType(variable) {
  const name = variable.name.toLowerCase();
  
  switch (variable.resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      if (name.includes('font') && name.includes('size')) {
        return 'fontSizes';
      } else if (name.includes('font') && name.includes('weight')) {
        return 'fontWeights';
      } else if (name.includes('space') || name.includes('padding') || name.includes('margin')) {
        return 'spacing';
      } else if (name.includes('border') && name.includes('radius')) {
        return 'borderRadius';
      } else if (name.includes('border') && name.includes('width')) {
        return 'borderWidth';
      } else if (name.includes('line') && name.includes('height')) {
        return 'lineHeights';
      }
      return 'sizing';
    case 'STRING':
      if (name.includes('font') && name.includes('family')) {
        return 'fontFamilies';
      } else if (name.includes('font') && name.includes('weight')) {
        return 'fontWeights';
      }
      return 'other';
    default:
      return 'other';
  }
}

/**
 * Converts variable name to nested object path
 */
function parseVariableName(name) {
  const normalized = name
    .replace(/[\/\\]/g, '/')
    .replace(/\s*[\/\\]\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized.split('/').map(part => part.trim()).filter(Boolean);
}

/**
 * Sets a nested value in an object using path array
 */
function setNestedValue(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Gets the color modes from the Colour collection
 */
function getColorModes(collections) {
  const colourCollection = Object.values(collections).find(c => c.name === 'Colour');
  if (!colourCollection || !colourCollection.modes) {
    return [
      { name: 'Blue', modeId: null },
      { name: 'Green', modeId: null },
      { name: 'Red', modeId: null },
      { name: 'Yellow', modeId: null }
    ];
  }
  return colourCollection.modes.map(m => ({ name: m.name, modeId: m.modeId }));
}

/**
 * Processes variables and organizes them by collection
 */
function processVariablesByCollection(variables, collections) {
  const tokensByCollection = {};
  const colorModes = getColorModes(collections);
  
  Object.values(variables).forEach(variable => {
    const collection = collections[variable.variableCollectionId];
    if (!collection) return;
    
    const collectionName = collection.name;
    
    if (!tokensByCollection[collectionName]) {
      tokensByCollection[collectionName] = {};
    }
    
    // For Component themes, expand across color modes
    if (collectionName === 'Component themes') {
      processComponentThemeVariable(variable, collection, variables, tokensByCollection[collectionName], colorModes);
    } else {
      processStandardVariable(variable, collection, variables, tokensByCollection[collectionName]);
    }
  });
  
  return tokensByCollection;
}

/**
 * Processes a standard variable (not component themes)
 */
function processStandardVariable(variable, collection, allVariables, output) {
  Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
    const mode = collection.modes?.find(m => m.modeId === modeId);
    const modeName = mode?.name || 'default';
    
    const convertedValue = convertVariableValue(variable, value, allVariables, modeId);
    if (convertedValue === null) return;
    
    const tokenType = getTokenType(variable);
    
    const token = {
      value: convertedValue,
      type: tokenType
    };
    
    if (variable.description) {
      token.description = variable.description;
    }
    
    const namePath = parseVariableName(variable.name);
    
    // Include mode in path if there are multiple modes
    const fullPath = Object.keys(variable.valuesByMode).length > 1 && modeName !== 'default'
      ? [...namePath, modeName]
      : namePath;
    
    setNestedValue(output, fullPath, token);
  });
}

/**
 * Processes a component theme variable - expands across color modes
 */
function processComponentThemeVariable(variable, collection, allVariables, output, colorModes) {
  const namePath = parseVariableName(variable.name);
  
  // Get the original modes (Neutral, Subtle, Bold, Neutral inverse)
  Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
    const mode = collection.modes?.find(m => m.modeId === modeId);
    const modeName = mode?.name || 'default';
    
    const tokenType = getTokenType(variable);
    
    // For each color mode, resolve the value in that color mode's context
    colorModes.forEach(colorMode => {
      // Resolve the value using the specific color mode ID
      const convertedValue = convertVariableValue(variable, value, allVariables, colorMode.modeId);
      if (convertedValue === null) return;
      
      const token = {
        value: convertedValue,
        type: tokenType
      };
      
      if (variable.description) {
        token.description = variable.description;
      }
      
      // Path: name parts + theme mode + color mode name
      const fullPath = [...namePath, modeName, colorMode.name];
      setNestedValue(output, fullPath, token);
    });
  });
}

/**
 * Normalizes collection name for filename
 */
function normalizeCollectionName(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Saves tokens by collection to separate files
 */
function saveTokensByCollection(tokensByCollection) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const fileMap = {};
  
  Object.entries(tokensByCollection).forEach(([collectionName, tokens]) => {
    const filename = `${normalizeCollectionName(collectionName)}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    const output = {
      $description: `Design tokens from ${collectionName} collection`,
      $timestamp: new Date().toISOString(),
      ...tokens
    };
    
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`  ✓ ${filepath}`);
    
    fileMap[collectionName] = filename;
  });
  
  return fileMap;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔄 Processing raw Figma variables...\n');
  
  try {
    // Read raw data
    console.log('📖 Reading raw Figma data...');
    const rawData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    
    if (!rawData.meta || !rawData.meta.variables || !rawData.meta.variableCollections) {
      throw new Error('Invalid raw data structure');
    }
    
    const { variables, variableCollections } = rawData.meta;
    
    console.log(`  Found ${Object.keys(variables).length} variables`);
    console.log(`  Found ${Object.keys(variableCollections).length} collections\n`);
    
    // Process variables by collection
    console.log('🔄 Processing variables by collection...');
    const tokensByCollection = processVariablesByCollection(variables, variableCollections);
    
    // Filter to specific collections
    const targetCollections = ['Colour', 'Component themes', 'Foundations', 'Layout', 'Typography'];
    const filteredTokens = {};
    
    Object.keys(tokensByCollection).forEach(name => {
      if (targetCollections.includes(name)) {
        filteredTokens[name] = tokensByCollection[name];
      }
    });
    
    // Save to separate files
    console.log('\n💾 Saving token files...');
    const fileMap = saveTokensByCollection(filteredTokens);
    
    console.log('\n📊 Summary:');
    Object.entries(fileMap).forEach(([collection, filename]) => {
      console.log(`  ${collection} → ${filename}`);
    });
    
    console.log('\n🎉 Successfully processed raw Figma variables!');
    console.log('💡 Next: Run npm run build:tokens-separate to generate CSS files');
    
  } catch (error) {
    console.error('\n❌ Failed to process raw variables:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  processVariablesByCollection,
  saveTokensByCollection
};
