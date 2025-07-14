#!/bin/bash

# SAMU Mobile App Package Creator
# Creates complete mobile deployment package

set -e

echo "📦 Creating SAMU Mobile App Package..."

# Package name with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="samu-mobile-app-$TIMESTAMP"

# Create temporary directory
mkdir -p temp/$PACKAGE_NAME

# Copy essential files
echo "📁 Copying project files..."
cp -r client/ temp/$PACKAGE_NAME/
cp -r server/ temp/$PACKAGE_NAME/
cp -r shared/ temp/$PACKAGE_NAME/
cp -r scripts/ temp/$PACKAGE_NAME/

# Copy configuration files
cp package.json temp/$PACKAGE_NAME/
cp ionic.config.json temp/$PACKAGE_NAME/
cp capacitor.config.ts temp/$PACKAGE_NAME/
cp capacitor.config.json temp/$PACKAGE_NAME/
cp vite.config.ts temp/$PACKAGE_NAME/
cp tailwind.config.ts temp/$PACKAGE_NAME/
cp postcss.config.js temp/$PACKAGE_NAME/
cp drizzle.config.ts temp/$PACKAGE_NAME/
cp tsconfig.json temp/$PACKAGE_NAME/
cp .gitignore temp/$PACKAGE_NAME/
cp .gitlab-ci.yml temp/$PACKAGE_NAME/

# Copy build scripts
cp build-android.sh temp/$PACKAGE_NAME/
cp build-fix.md temp/$PACKAGE_NAME/

# Create README for mobile deployment
cat > temp/$PACKAGE_NAME/README.md << 'EOF'
# SAMU Mobile App - Complete Deployment Package

This package contains everything needed to build and deploy the SAMU meme contest mobile app.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build Web App**
   ```bash
   npm run build
   ```

3. **Build Android App**
   ```bash
   ./build-android.sh
   ```

## Requirements

- Node.js 20.18.2+
- npm 10.8.2+
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

## Build Commands

### Web Build
```bash
npm run build
```

### Android Build
```bash
npm run build
npx cap sync android
npx cap build android
```

### iOS Build (macOS only)
```bash
npm run build
npx cap sync ios
npx cap build ios
```

## Configuration

- **App ID**: com.samu.memecontest
- **App Name**: SAMU
- **Version**: 1.0.0

## Environment Variables

Create `.env` file with:
```
DATABASE_URL=your_database_url
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=your_r2_public_url
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
```

## Build Outputs

- **Android APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **iOS App**: `ios/App/build/`

## Support

For build issues, check `build-fix.md` for troubleshooting guide.
EOF

# Create package info
cat > temp/$PACKAGE_NAME/package-info.json << EOF
{
  "name": "SAMU Mobile App",
  "version": "1.0.0",
  "description": "Complete mobile deployment package for SAMU meme contest app",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "platform": "Android/iOS",
  "framework": "Capacitor",
  "tech_stack": [
    "React 18",
    "TypeScript",
    "Vite",
    "Capacitor 7",
    "Tailwind CSS",
    "Privy Auth",
    "PostgreSQL",
    "Cloudflare R2"
  ],
  "build_commands": {
    "web": "npm run build",
    "android": "./build-android.sh",
    "ios": "npm run build && npx cap sync ios && npx cap build ios"
  }
}
EOF

# Create environment template
cat > temp/$PACKAGE_NAME/.env.template << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Privy Authentication
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Admin Configuration
ADMIN_EMAILS=admin@example.com,admin2@example.com
EOF

# Create build info
echo "Build Date: $(date)" > temp/$PACKAGE_NAME/build-info.txt
echo "Git Commit: $(git rev-parse HEAD 2>/dev/null || echo 'No git repository')" >> temp/$PACKAGE_NAME/build-info.txt
echo "Package: $PACKAGE_NAME" >> temp/$PACKAGE_NAME/build-info.txt

# Create tar.gz package
echo "🗜️ Creating compressed package..."
cd temp
tar -czf ../$PACKAGE_NAME.tar.gz $PACKAGE_NAME
cd ..

# Clean up
rm -rf temp

echo "✅ Package created successfully!"
echo "📦 Package: $PACKAGE_NAME.tar.gz"
echo "📊 Size: $(ls -lh $PACKAGE_NAME.tar.gz | awk '{print $5}')"

# Show package contents
echo ""
echo "📋 Package Contents:"
tar -tzf $PACKAGE_NAME.tar.gz | head -20
echo "..."
echo "Total files: $(tar -tzf $PACKAGE_NAME.tar.gz | wc -l)"