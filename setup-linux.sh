#!/bin/bash

# Instagram Poster API - Linux Setup Script
# This script sets up everything needed to run the server on Linux

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}================================${NC}\n"
}

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        print_error "Cannot detect Linux distribution"
        exit 1
    fi
    print_info "Detected Linux distribution: $DISTRO $VERSION"
}

# Check if running as root or with sudo
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. This is not recommended."
        SUDO=""
    else
        if ! command -v sudo &> /dev/null; then
            print_error "sudo is not installed. Please install sudo or run as root."
            exit 1
        fi
        SUDO="sudo"
    fi
}

# Install Node.js
install_nodejs() {
    print_header "Installing Node.js"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is already installed: $NODE_VERSION"
        
        # Check if version is at least 16
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 16 ]; then
            print_warning "Node.js version is less than 16. Updating..."
        else
            return 0
        fi
    fi
    
    print_info "Installing Node.js (LTS version)..."
    
    case $DISTRO in
        ubuntu|debian)
            # Install Node.js 20.x (LTS)
            $SUDO apt-get update
            $SUDO apt-get install -y curl
            curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
            $SUDO apt-get install -y nodejs
            ;;
        fedora|rhel|centos|rocky|almalinux)
            $SUDO dnf install -y curl
            curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash -
            $SUDO dnf install -y nodejs
            ;;
        arch|manjaro)
            $SUDO pacman -Sy --noconfirm nodejs npm
            ;;
        *)
            print_error "Unsupported distribution for automatic Node.js installation: $DISTRO"
            print_info "Please install Node.js manually from: https://nodejs.org/"
            exit 1
            ;;
    esac
    
    print_success "Node.js installed: $(node --version)"
    print_success "npm installed: $(npm --version)"
}

# Install system dependencies
install_dependencies() {
    print_header "Installing System Dependencies"
    
    case $DISTRO in
        ubuntu|debian)
            print_info "Updating package list..."
            $SUDO apt-get update
            
            print_info "Installing required packages..."
            $SUDO apt-get install -y \
                wget \
                curl \
                git \
                build-essential \
                ca-certificates \
                fonts-liberation \
                libasound2 \
                libatk-bridge2.0-0 \
                libatk1.0-0 \
                libc6 \
                libcairo2 \
                libcups2 \
                libdbus-1-3 \
                libexpat1 \
                libfontconfig1 \
                libgbm1 \
                libgcc1 \
                libglib2.0-0 \
                libgtk-3-0 \
                libnspr4 \
                libnss3 \
                libpango-1.0-0 \
                libpangocairo-1.0-0 \
                libstdc++6 \
                libx11-6 \
                libx11-xcb1 \
                libxcb1 \
                libxcomposite1 \
                libxcursor1 \
                libxdamage1 \
                libxext6 \
                libxfixes3 \
                libxi6 \
                libxrandr2 \
                libxrender1 \
                libxss1 \
                libxtst6 \
                lsb-release \
                xdg-utils
            ;;
        fedora|rhel|centos|rocky|almalinux)
            $SUDO dnf install -y \
                wget \
                curl \
                git \
                gcc-c++ \
                make \
                ca-certificates \
                liberation-fonts \
                alsa-lib \
                atk \
                cups-libs \
                gtk3 \
                ipa-gothic-fonts \
                libXcomposite \
                libXcursor \
                libXdamage \
                libXext \
                libXi \
                libXrandr \
                libXScrnSaver \
                libXtst \
                pango \
                xorg-x11-fonts-100dpi \
                xorg-x11-fonts-75dpi \
                xorg-x11-fonts-cyrillic \
                xorg-x11-fonts-misc \
                xorg-x11-fonts-Type1 \
                xorg-x11-utils
            ;;
        arch|manjaro)
            $SUDO pacman -Sy --noconfirm \
                wget \
                curl \
                git \
                base-devel \
                nss \
                atk \
                at-spi2-atk \
                cups \
                libdrm \
                gtk3 \
                libxcomposite \
                libxdamage \
                libxrandr \
                mesa \
                pango \
                alsa-lib
            ;;
        *)
            print_warning "Unknown distribution. Attempting to install basic dependencies..."
            ;;
    esac
    
    print_success "System dependencies installed"
}

# Install Brave browser
install_browser() {
    print_header "Installing Brave Browser"
    
    # Check if Brave is already installed
    CHROME_PATH=""
    
    if command -v brave-browser &> /dev/null; then
        CHROME_PATH=$(which brave-browser)
        print_success "Brave browser is already installed: $CHROME_PATH"
        return 0
    elif command -v brave &> /dev/null; then
        CHROME_PATH=$(which brave)
        print_success "Brave browser is already installed: $CHROME_PATH"
        return 0
    fi
    
    print_info "Installing Brave browser using official installation script..."
    
    # Use the official Brave installation script
    if curl -fsS https://dl.brave.com/install.sh | sh; then
        print_success "Brave browser installed successfully"
        
        # Find Brave path
        if command -v brave-browser &> /dev/null; then
            CHROME_PATH=$(which brave-browser)
        elif command -v brave &> /dev/null; then
            CHROME_PATH=$(which brave)
        else
            # Common installation paths
            if [ -f "/usr/bin/brave-browser" ]; then
                CHROME_PATH="/usr/bin/brave-browser"
            elif [ -f "/usr/bin/brave" ]; then
                CHROME_PATH="/usr/bin/brave"
            fi
        fi
        
        print_success "Brave installed at: $CHROME_PATH"
    else
        print_error "Failed to install Brave browser"
        print_info "Falling back to Chromium installation..."
        install_chromium_fallback
    fi
}

# Fallback to Chromium if Brave installation fails
install_chromium_fallback() {
    print_info "Installing Chromium as fallback..."
    
    case $DISTRO in
        ubuntu|debian)
            $SUDO apt-get install -y chromium-browser || $SUDO apt-get install -y chromium
            CHROME_PATH=$(which chromium-browser || which chromium)
            ;;
        fedora|rhel|centos|rocky|almalinux)
            $SUDO dnf install -y chromium
            CHROME_PATH=$(which chromium)
            ;;
        arch|manjaro)
            $SUDO pacman -S --noconfirm chromium
            CHROME_PATH=$(which chromium)
            ;;
        *)
            print_warning "Could not install browser automatically"
            print_info "Please install Brave or Chromium manually"
            CHROME_PATH="/usr/bin/brave-browser"
            ;;
    esac
    
    if [ -x "$CHROME_PATH" ]; then
        print_success "Browser installed: $CHROME_PATH"
    else
        print_error "Browser installation may have failed"
        print_info "You can specify a custom browser path later"
    fi
}

# Get browser data directory
get_browser_data_dir() {
    # Priority: Brave > Chrome > Chromium
    USER_DATA_DIR=""
    
    # Check for Brave first (highest priority)
    if [ -d "$HOME/.config/BraveSoftware/Brave-Browser" ]; then
        USER_DATA_DIR="$HOME/.config/BraveSoftware/Brave-Browser"
    elif [ -d "$HOME/.config/google-chrome" ]; then
        USER_DATA_DIR="$HOME/.config/google-chrome"
    elif [ -d "$HOME/.config/chromium" ]; then
        USER_DATA_DIR="$HOME/.config/chromium"
    else
        # Default to Brave since we're installing it
        USER_DATA_DIR="$HOME/.config/BraveSoftware/Brave-Browser"
    fi
    
    print_info "Browser data directory: $USER_DATA_DIR"
    
    # Create if doesn't exist
    if [ ! -d "$USER_DATA_DIR" ]; then
        mkdir -p "$USER_DATA_DIR"
        print_info "Created browser data directory"
    fi
}

# Install server dependencies
install_server_deps() {
    print_header "Installing Server Dependencies"
    
    print_info "Running npm install..."
    npm install
    
    print_success "Server dependencies installed"
}

# Create environment file
create_env_file() {
    print_header "Creating Configuration"
    
    if [ -f .env ]; then
        print_info ".env file already exists, skipping..."
        return 0
    fi
    
    cat > .env << EOF
# Server Configuration
PORT=3000

# Browser Configuration (will be set via API)
# BROWSER_EXECUTABLE_PATH=${CHROME_PATH}
# BROWSER_USER_DATA_DIR=${USER_DATA_DIR}
EOF
    
    print_success "Created .env file"
}

# Create initial config script
create_config_script() {
    print_header "Creating Configuration Helper Script"
    
    cat > config-browser.sh << 'EOF'
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
EOF
    
    chmod +x config-browser.sh
    print_success "Created config-browser.sh script"
}

# Create systemd service (optional)
create_systemd_service() {
    print_header "Creating Systemd Service (Optional)"
    
    read -p "Do you want to create a systemd service to run the server automatically? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping systemd service creation"
        return 0
    fi
    
    SERVICE_FILE="/etc/systemd/system/instagram-poster.service"
    CURRENT_DIR=$(pwd)
    CURRENT_USER=$(whoami)
    
    print_info "Creating systemd service file..."
    
    $SUDO tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=Instagram Poster API Server
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$(which node) $(pwd)/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=instagram-poster

[Install]
WantedBy=multi-user.target
EOF
    
    print_info "Building the server..."
    npm run build
    
    print_info "Enabling and starting service..."
    $SUDO systemctl daemon-reload
    $SUDO systemctl enable instagram-poster
    $SUDO systemctl start instagram-poster
    
    print_success "Systemd service created and started"
    print_info "Service commands:"
    echo "  - Start:   sudo systemctl start instagram-poster"
    echo "  - Stop:    sudo systemctl stop instagram-poster"
    echo "  - Status:  sudo systemctl status instagram-poster"
    echo "  - Logs:    sudo journalctl -u instagram-poster -f"
}

# Setup firewall (optional)
setup_firewall() {
    print_header "Firewall Configuration (Optional)"
    
    if ! command -v ufw &> /dev/null; then
        print_info "UFW firewall not installed, skipping..."
        return 0
    fi
    
    read -p "Do you want to open port 3000 in the firewall? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $SUDO ufw allow 3000/tcp
        print_success "Port 3000 opened in firewall"
    fi
}

# Print summary
print_summary() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}Installation Summary:${NC}"
    echo "  • Node.js: $(node --version)"
    echo "  • npm: $(npm --version)"
    echo "  • Browser: $CHROME_PATH"
    echo "  • Data Dir: $USER_DATA_DIR"
    echo ""
    
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. Start the development server:"
    echo "   ${YELLOW}npm run dev:watch${NC}"
    echo ""
    echo "2. Configure the browser (in a new terminal):"
    echo "   ${YELLOW}./config-browser.sh${NC}"
    echo ""
    echo "3. Open Brave browser and log into Instagram:"
    echo "   ${YELLOW}brave-browser${NC}"
    echo "   Or: ${YELLOW}${CHROME_PATH}${NC}"
    echo "   Make sure to check 'Remember me' when logging in"
    echo ""
    echo "4. Test the API:"
    echo "   ${YELLOW}curl -X POST http://localhost:3000/api/instagram/post \\${NC}"
    echo "   ${YELLOW}     -F 'image=@photo.jpg' \\${NC}"
    echo "   ${YELLOW}     -F 'caption=Hello from Linux!'${NC}"
    echo ""
    echo -e "${GREEN}Useful Commands:${NC}"
    echo "  • Start dev server:  ${YELLOW}npm run dev:watch${NC}"
    echo "  • Build for prod:    ${YELLOW}npm run build${NC}"
    echo "  • Start prod:        ${YELLOW}npm start${NC}"
    echo "  • Configure browser: ${YELLOW}./config-browser.sh${NC}"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  • API Docs:    ${YELLOW}cat API_DOCUMENTATION.md${NC}"
    echo "  • README:      ${YELLOW}cat README.md${NC}"
    echo ""
    echo -e "${GREEN}Server will be available at: ${YELLOW}http://localhost:3000${NC}"
    echo ""
    print_success "Setup completed successfully! 🎉"
}

# Main installation flow
main() {
    clear
    
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║                                                   ║"
    echo "║     Instagram Poster API - Linux Setup           ║"
    echo "║                                                   ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    print_info "This script will install and configure everything needed for the Instagram Poster API"
    echo ""
    
    # Check if in correct directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the server directory."
        exit 1
    fi
    
    # Detect distribution
    detect_distro
    
    # Check sudo
    check_sudo
    
    # Run installation steps
    install_nodejs
    install_dependencies
    install_browser
    get_browser_data_dir
    install_server_deps
    create_env_file
    create_config_script
    create_systemd_service
    setup_firewall
    
    # Print summary
    print_summary
}

# Run main function
main

    