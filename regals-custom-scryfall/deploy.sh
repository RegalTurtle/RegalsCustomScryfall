#!/bin/bash
set -e

# GitHub Actions runs this script in a non-interactive shell, so load NVM
# explicitly before invoking npm, Next.js, or PM2.
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi


git pull --ff-only
npm install
npm run build
pm2 restart regalscustomcards --update-env

echo "Deployment complete!"
