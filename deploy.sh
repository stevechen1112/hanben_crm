#!/bin/bash
set -e

APP_DIR="/var/www/hanben_crm"
REPO_URL="https://github.com/stevechen1112/hanben_crm.git"

echo "Updating system..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

if [ ! -d "$APP_DIR" ]; then
    mkdir -p /var/www
    git clone $REPO_URL $APP_DIR
else
    cd $APP_DIR
    git pull origin main
fi

echo "Setting up Backend..."
cd $APP_DIR/server
rm -f package-lock.json
npm install
npx prisma db push

echo "Setting up Frontend..."
cd $APP_DIR/client
rm -f package-lock.json
npm install
npm run build

echo "Preparing public assets..."
mkdir -p $APP_DIR/server/public
cp -r $APP_DIR/client/dist/* $APP_DIR/server/public/

echo "Starting Application..."
cd $APP_DIR/server
pm2 delete hanben-crm || true
pm2 start index.js --name hanben-crm

echo "Deployment finished successfully!"
pm2 list
