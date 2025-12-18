#!/usr/bin/env node

/**
 * Figma Raw Variables Fetcher
 * 
 * This script fetches the raw design variables JSON from Figma's REST API
 * without any transformations or conversions. Use this to inspect the raw
 * data structure including all modes, collections, and variable values.
 * 
 * Usage:
 * 1. Set environment variables: FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEY
 * 2. Run: npm run tokens:fetch-raw
 * 
 * Environment Variables:
 * - FIGMA_ACCESS_TOKEN: Your Figma personal access token
 * - FIGMA_FILE_KEY: The file key from your Figma file URL
 * 
 * Output: tokens/figma-variables-raw.json
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  // Silently continue if .env file can't be read
}

// Configuration
const CONFIG = {
  FIGMA_ACCESS_TOKEN: process.env.FIGMA_ACCESS_TOKEN,
  FIGMA_FILE_KEY: process.env.FIGMA_FILE_KEY,
  OUTPUT_PATH: './tokens/figma-variables-raw.json',
  BASE_URL: 'https://api.figma.com/v1'
};

/**
 * Validates required environment variables
 */
function validateConfig() {
  const errors = [];
  
  if (!CONFIG.FIGMA_ACCESS_TOKEN) {
    errors.push('FIGMA_ACCESS_TOKEN environment variable is required');
  }
  
  if (!CONFIG.FIGMA_FILE_KEY) {
    errors.push('FIGMA_FILE_KEY environment variable is required');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration Error:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nExample usage:');
    console.error('FIGMA_ACCESS_TOKEN=your_token FIGMA_FILE_KEY=your_file_key npm run tokens:fetch-raw');
    process.exit(1);
  }
}

/**
 * Makes authenticated request to Figma API
 */
async function fetchFromFigma(endpoint) {
  const url = `${CONFIG.BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': CONFIG.FIGMA_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Failed to fetch from ${url}:`, error.message);
    throw error;
  }
}

/**
 * Ensures the output directory exists
 */
function ensureOutputDirectory() {
  const outputDir = path.dirname(CONFIG.OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }
}

/**
 * Saves raw data to file with pretty formatting
 */
function saveRawData(data) {
  ensureOutputDirectory();
  
  const output = {
    $description: 'Raw design variables from Figma API (unprocessed)',
    $timestamp: new Date().toISOString(),
    $source: `figma://file/${CONFIG.FIGMA_FILE_KEY}`,
    $endpoint: `/files/${CONFIG.FIGMA_FILE_KEY}/variables/local`,
    ...data
  };
  
  try {
    const content = JSON.stringify(output, null, 2);
    
    fs.writeFileSync(CONFIG.OUTPUT_PATH, content, 'utf8');
    console.log(`✅ Raw data saved to: ${CONFIG.OUTPUT_PATH}`);
  } catch (error) {
    console.error(`❌ Failed to save raw data: ${error.message}`);
    throw error;
  }
}

/**
 * Prints summary statistics
 */
function printSummary(data) {
  console.log('\n📊 Raw Data Summary:');
  
  if (data.meta) {
    if (data.meta.variables) {
      console.log(`  Total variables: ${Object.keys(data.meta.variables).length}`);
    }
    
    if (data.meta.variableCollections) {
      const collections = data.meta.variableCollections;
      console.log(`  Total collections: ${Object.keys(collections).length}`);
      
      console.log('\n  Collections and their modes:');
      Object.entries(collections).forEach(([id, collection]) => {
        const modeNames = collection.modes?.map(m => m.name).join(', ') || 'none';
        console.log(`    ${collection.name}: [${modeNames}]`);
      });
    }
  }
  
  if (data.error) {
    console.log(`  ⚠️  API returned error: ${data.error}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎨 Fetching raw Figma variables...\n');
  
  validateConfig();
  
  try {
    console.log('📡 Fetching from Figma API...');
    const rawData = await fetchFromFigma(`/files/${CONFIG.FIGMA_FILE_KEY}/variables/local`);
    
    // Save raw response
    saveRawData(rawData);
    
    // Print summary
    printSummary(rawData);
    
    console.log('\n🎉 Successfully fetched raw Figma variables!');
    console.log(`\n💡 Tip: Open ${CONFIG.OUTPUT_PATH} to inspect all modes, collections, and raw variable structures.`);
    
  } catch (error) {
    console.error('\n❌ Failed to fetch raw Figma variables:', error.message);
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  main();
}

module.exports = {
  fetchFromFigma,
  saveRawData
};
