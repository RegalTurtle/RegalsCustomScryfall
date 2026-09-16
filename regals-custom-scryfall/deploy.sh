#!/bin/bash
set -e

git pull
npm install
npm run build
pm2 restart regalscustomcards --update-env

echo "Deployment complete!"
