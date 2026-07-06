#!/usr/bin/env node

/**
 * Lists changed CSS custom property names from a git diff.
 *
 * Usage:
 *   node list-changed-css-variables.js
 *   node list-changed-css-variables.js --ref HEAD~1
 *   node list-changed-css-variables.js --file build/css/variables.css
 */

const { execSync } = require('node:child_process');

const DEFAULT_FILE = 'build/css/variables.css';

function parseArgs(argv) {
  const args = {
    ref: 'HEAD',
    file: DEFAULT_FILE,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--ref' && argv[i + 1]) {
      args.ref = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--file' && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log('List changed CSS variable names from git diff.');
  console.log('');
  console.log('Options:');
  console.log('  --ref <git-ref>     Compare against this ref (default: HEAD)');
  console.log(`  --file <path>        Target css file (default: ${DEFAULT_FILE})`);
  console.log('  --help, -h           Show this help');
}

function getDiff(ref, file) {
  // `git diff <ref> -- <file>` compares working tree + index against the ref.
  const command = `git diff ${escapeShellArg(ref)} -- ${escapeShellArg(file)}`;

  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = String(error?.stderr ?? '').trim();
    const message = stderr || error.message || 'Failed to run git diff';
    throw new Error(message);
  }
}

function escapeShellArg(value) {
  const escapedSingleQuote = String.raw`'\''`;
  return `'${String(value).replaceAll("'", escapedSingleQuote)}'`;
}

function isDiffMetaLine(line) {
  return line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@');
}

function extractVariableChange(line) {
  if (isDiffMetaLine(line)) {
    return null;
  }

  const isAdded = line.startsWith('+');
  const isRemoved = line.startsWith('-');

  if (!isAdded && !isRemoved) {
    return null;
  }

  const match = line.match(/^[+-]\s*(--[a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*;\s*$/);
  if (!match) {
    return null;
  }

  const [, variableName, variableValue] = match;

  return {
    kind: isAdded ? 'added' : 'removed',
    variableName,
    variableValue,
  };
}

function indexNamesByValue(names, valueMap) {
  const index = new Map();

  for (const name of names) {
    const value = valueMap.get(name);
    if (!index.has(value)) {
      index.set(value, []);
    }
    index.get(value).push(name);
  }

  return index;
}

function removeUnchangedNames(added, removed, addedMap, removedMap) {
  for (const name of Array.from(added)) {
    if (!removed.has(name)) {
      continue;
    }

    if (addedMap.get(name) === removedMap.get(name)) {
      added.delete(name);
      removed.delete(name);
    }
  }
}

function inferRenames(added, removed, addedMap, removedMap) {
  const renamed = [];
  const removedByValue = indexNamesByValue(removed, removedMap);
  const addedByValue = indexNamesByValue(added, addedMap);

  for (const [value, removedNames] of removedByValue.entries()) {
    const addedNames = addedByValue.get(value) || [];

    if (removedNames.length !== 1 || addedNames.length !== 1) {
      continue;
    }

    const from = removedNames[0];
    const to = addedNames[0];

    if (from !== to && removed.has(from) && added.has(to)) {
      renamed.push({ from, to });
      removed.delete(from);
      added.delete(to);
    }
  }

  return renamed;
}

function parseVariableChanges(diffText) {
  const addedMap = new Map();
  const removedMap = new Map();

  for (const line of diffText.split('\n')) {
    const change = extractVariableChange(line);
    if (!change) {
      continue;
    }

    if (change.kind === 'added') {
      addedMap.set(change.variableName, change.variableValue);
    } else {
      removedMap.set(change.variableName, change.variableValue);
    }
  }

  const added = new Set(addedMap.keys());
  const removed = new Set(removedMap.keys());

  removeUnchangedNames(added, removed, addedMap, removedMap);
  const renamed = inferRenames(added, removed, addedMap, removedMap);

  return {
    added: Array.from(added).sort((a, b) => a.localeCompare(b)),
    removed: Array.from(removed).sort((a, b) => a.localeCompare(b)),
    renamed,
  };
}

function printResult(result, file, ref) {
  console.log(`File: ${file}`);
  console.log(`Compared to: ${ref}`);

  const hasChanges =
    result.added.length > 0 || result.removed.length > 0 || result.renamed.length > 0;

  if (!hasChanges) {
    console.log('No changed CSS variable names found.');
    return;
  }

  if (result.added.length > 0) {
    console.log('\nAdded:');
    result.added.forEach((name) => console.log(`  - ${name}`));
  }

  if (result.removed.length > 0) {
    console.log('\nRemoved:');
    result.removed.forEach((name) => console.log(`  - ${name}`));
  }

  if (result.renamed.length > 0) {
    console.log('\nRenamed (inferred):');
    result.renamed.forEach((item) => console.log(`  - ${item.from} -> ${item.to}`));
  }
}

function main() {
  const { ref, file } = parseArgs(process.argv);

  try {
    const diff = getDiff(ref, file);
    const result = parseVariableChanges(diff);
    printResult(result, file, ref);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseVariableChanges,
};
