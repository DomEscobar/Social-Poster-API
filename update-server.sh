#!/bin/bash

# Social Media Poster API - Update Script
# This script updates and restarts the server

set -e

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

# Check if running as root or with sudo
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        SUDO=""
    else
        if command -v sudo &> /dev/null; then
            SUDO="sudo"
        else
            SUDO=""
        fi
    fi
}

# Main update flow
main() {
    clear
    
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║                                                   ║"
    echo "║     Social Media Poster API - Update Script      ║"
    echo "║                                                   ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    check_sudo
    
    # Check if in correct directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project directory."
        exit 1
    fi
    
    print_header "Update Process Started"
    
    # Check if service is running
    SERVICE_RUNNING=false
    if systemctl is-active --quiet instagram-poster 2>/dev/null; then
        SERVICE_RUNNING=true
        print_info "Detected systemd service is running"
    fi
    
    # Check if manual process is running
    MANUAL_PID=$(pgrep -f "node.*dist/index.js" 2>/dev/null || echo "")
    MANUAL_RUNNING=false
    if [ -n "$MANUAL_PID" ]; then
        MANUAL_RUNNING=true
        print_info "Detected manual node process (PID: $MANUAL_PID)"
    fi
    
    # Stop the server
    print_header "Stopping Server"
    
    if [ "$SERVICE_RUNNING" = true ]; then
        print_info "Stopping systemd service..."
        $SUDO systemctl stop instagram-poster
        print_success "Service stopped"
    elif [ "$MANUAL_RUNNING" = true ]; then
        print_info "Stopping manual process..."
        kill $MANUAL_PID 2>/dev/null || $SUDO kill $MANUAL_PID
        sleep 2
        print_success "Process stopped"
    else
        print_warning "No running server detected"
    fi
    
    # Pull latest code (if git repository)
    if [ -d ".git" ]; then
        print_header "Pulling Latest Code"
        print_info "Fetching from git repository..."
        
        # Check for uncommitted changes
        if ! git diff-index --quiet HEAD -- 2>/dev/null; then
            print_warning "You have uncommitted changes!"
            read -p "Stash changes and continue? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git stash
                print_info "Changes stashed"
            else
                print_error "Update cancelled. Commit or stash your changes first."
                exit 1
            fi
        fi
        
        git pull
        print_success "Code updated"
    else
        print_warning "Not a git repository - skipping code pull"
    fi
    
    # Install dependencies
    print_header "Installing Dependencies"
    print_info "Running npm install..."
    npm install
    print_success "Dependencies installed"
    
    # Build the project
    print_header "Building Project"
    print_info "Running npm run build..."
    npm run build
    print_success "Build completed"
    
    # Restart the server
    print_header "Restarting Server"
    
    if [ "$SERVICE_RUNNING" = true ]; then
        print_info "Starting systemd service..."
        $SUDO systemctl start instagram-poster
        sleep 2
        
        if systemctl is-active --quiet instagram-poster; then
            print_success "Service started successfully"
            echo ""
            print_info "Service Status:"
            $SUDO systemctl status instagram-poster --no-pager -l
        else
            print_error "Service failed to start"
            echo ""
            print_info "Recent logs:"
            $SUDO journalctl -u instagram-poster -n 20 --no-pager
            exit 1
        fi
    else
        print_info "Server was not running as a service"
        print_info "To start the server manually, run:"
        echo ""
        echo "  ${YELLOW}npm start${NC}         # Production mode"
        echo "  ${YELLOW}npm run dev:watch${NC} # Development mode"
        echo ""
    fi
    
    # Print summary
    print_header "Update Complete!"
    
    echo -e "${GREEN}Update Summary:${NC}"
    echo "  • Node.js: $(node --version)"
    echo "  • npm: $(npm --version)"
    echo "  • Build: ✓ Completed"
    
    if [ "$SERVICE_RUNNING" = true ]; then
        echo "  • Service: ✓ Running"
        echo ""
        echo -e "${BLUE}Useful Commands:${NC}"
        echo "  • View logs:    ${YELLOW}sudo journalctl -u instagram-poster -f${NC}"
        echo "  • Stop service: ${YELLOW}sudo systemctl stop instagram-poster${NC}"
        echo "  • Restart:      ${YELLOW}sudo systemctl restart instagram-poster${NC}"
        echo "  • Status:       ${YELLOW}sudo systemctl status instagram-poster${NC}"
    fi
    
    echo ""
    print_success "Update completed successfully! 🎉"
}

# Run main function
main

