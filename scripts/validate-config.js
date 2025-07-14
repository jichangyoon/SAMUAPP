#!/usr/bin/env node

/**
 * Configuration validation script for SAMU app
 * Validates JSON configuration files before build
 */

import fs from 'fs';
import path from 'path';

const configFiles = [
  'ionic.config.json',
  'capacitor.config.json',
  'package.json'
];

console.log('🔍 Validating configuration files...');

let hasErrors = false;

configFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found, skipping...`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.trim() === '') {
      console.error(`❌ ${file} is empty`);
      hasErrors = true;
      return;
    }

    JSON.parse(content);
    console.log(`✅ ${file} is valid`);
  } catch (error) {
    console.error(`❌ ${file} has invalid JSON: ${error.message}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\n❌ Configuration validation failed!');
  process.exit(1);
} else {
  console.log('\n✅ All configuration files are valid!');
  process.exit(0);
}