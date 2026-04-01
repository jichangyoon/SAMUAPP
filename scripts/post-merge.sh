#!/bin/bash
set -e
npm install
npx patch-package
npm run db:push
