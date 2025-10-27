#!/bin/bash

# Instagram Poster API - Browser Configuration Script

PORT=${PORT:-3000}
API_URL="http://localhost:${PORT}/api"

# Detect browser (Priority: Brave > Chrome > Chromium)
BROWSER_PATH=""
if command -v brave-browser &> /dev/null; then
    BROWSER_PATH=$(which brave-browser)
elif command -v brave &> /dev/null; then
    BROWSER_PATH=$(which brave)
elif command -v google-chrome &> /dev/null; then
    BROWSER_PATH=$(which google-chrome)
elif command -v chromium-browser &> /dev/null; then
    BROWSER_PATH=$(which chromium-browser)
elif command -v chromium &> /dev/null; then
    BROWSER_PATH=$(which chromium)
else
    echo "Error: Could not find Brave, Chrome, or Chromium"
    echo "Please install a browser and specify the path manually"
    exit 1
fi

# Detect user data directory (Priority: Brave > Chrome > Chromium)
USER_DATA_DIR=""
if [ -d "$HOME/.config/BraveSoftware/Brave-Browser" ]; then
    USER_DATA_DIR="$HOME/.config/BraveSoftware/Brave-Browser"
elif [ -d "$HOME/.config/google-chrome" ]; then
    USER_DATA_DIR="$HOME/.config/google-chrome"
elif [ -d "$HOME/.config/chromium" ]; then
    USER_DATA_DIR="$HOME/.config/chromium"
else
    USER_DATA_DIR="$HOME/.config/BraveSoftware/Brave-Browser"
    mkdir -p "$USER_DATA_DIR"
fi

echo "==================================="
echo "Browser Configuration"
echo "==================================="
echo ""
echo "Browser Path: $BROWSER_PATH"
echo "User Data Dir: $USER_DATA_DIR"
echo ""

# Send configuration to API
echo "Sending configuration to API..."

RESPONSE=$(curl -s -X POST "${API_URL}/browser/config" \
    -H "Content-Type: application/json" \
    -d "{\"executablePath\":\"${BROWSER_PATH}\",\"userDataDir\":\"${USER_DATA_DIR}\"}")

echo ""
echo "API Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✓ Browser configuration set successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Open your browser and log into Instagram"
    echo "2. Make sure to check 'Remember me' when logging in"
    echo "3. Use the API to post: curl -X POST ${API_URL}/instagram/post -F 'image=@photo.jpg' -F 'caption=Hello!'"
else
    echo "✗ Failed to configure browser"
    echo "Please check the error message above"
fi
