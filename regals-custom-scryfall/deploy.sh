#!/bin/bash
set -e

git pull --ff-only
npm install
npm run build
pm2 restart regalscustomcards --update-env

echo "Deployment complete!"
