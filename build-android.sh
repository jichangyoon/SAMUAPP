#!/bin/bash

# SAMU Android Build Script
# This script handles the complete Android build process

set -e

echo "🚀 Starting SAMU Android Build Process"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf android/
rm -rf ios/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the web application
echo "🏗️ Building web application..."
npm run build

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync android

# Build Android app
echo "🔨 Building Android app..."
npx cap build android

echo "✅ Android build completed successfully!"
echo "📍 APK location: android/app/build/outputs/apk/"