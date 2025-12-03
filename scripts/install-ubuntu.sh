#!/bin/bash
# Octopi Neural Mesh - Ubuntu/Debian Installation Script
# Automated installer for Ubuntu and Debian-based systems

set -e

echo "🐙 Octopi Neural Mesh - Ubuntu/Debian Installer"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Print functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}▓▓▓ $1${NC}"
}

# Check if running on Ubuntu/Debian
if ! grep -qEi 'debian|ubuntu' /etc/os-release 2>/dev/null; then
    print_warning "This script is optimized for Ubuntu/Debian"
    print_status "It may work on other Debian-based distributions"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_success "Running on $(grep PRETTY_NAME /etc/os-release | cut -d '"' -f 2)"
echo ""

# Check for sudo
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root - proceeding without sudo"
    SUDO=""
else
    if ! command -v sudo &> /dev/null; then
        print_error "sudo is not installed and script is not run as root"
        print_status "Please install sudo or run as root"
        exit 1
    fi
    SUDO="sudo"
    print_status "Will use sudo for system package installation"
fi
echo ""

# Step 1: Update package lists
print_header "Step 1/7: Updating package lists"
print_status "Running apt update..."
$SUDO apt-get update
print_success "Package lists updated"
echo ""

# Step 2: Install Node.js
print_header "Step 2/7: Installing Node.js"
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js 18.x from NodeSource..."
    
    # Install prerequisites
    $SUDO apt-get install -y curl ca-certificates gnupg
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
    
    # Install Node.js
    $SUDO apt-get install -y nodejs
    
    print_success "Node.js installed: $(node --version)"
else
    NODE_VERSION=$(node --version | cut -d 'v' -f 2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
    
    print_success "Node.js already installed: v$NODE_VERSION"
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_warning "Node.js version is < 18, upgrading..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
        $SUDO apt-get install -y nodejs
        print_success "Node.js upgraded to $(node --version)"
    fi
fi
echo ""

# Step 3: Install additional dependencies
print_header "Step 3/7: Installing system dependencies"
print_status "Installing: git, tmux, build-essential, python3"
$SUDO apt-get install -y git tmux build-essential python3 python3-pip
print_success "System dependencies installed"
echo ""

# Step 4: Clone repository
print_header "Step 4/7: Cloning Octopi Neural Mesh"
REPO_URL="https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git"
INSTALL_DIR="$HOME/octopi-neural-mesh"

if [ -d "$INSTALL_DIR" ]; then
    print_warning "Repository already exists at $INSTALL_DIR"
    read -p "Update existing installation? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Updating repository..."
        cd "$INSTALL_DIR"
        git pull
        print_success "Repository updated"
    else
        print_status "Skipping repository clone"
    fi
else
    print_status "Cloning from $REPO_URL"
    git clone "$REPO_URL" "$INSTALL_DIR"
    print_success "Repository cloned to $INSTALL_DIR"
fi
echo ""

# Step 5: Install Node.js dependencies
print_header "Step 5/7: Installing Node.js dependencies"
cd "$INSTALL_DIR"
print_status "Running npm install..."
npm install --production
print_success "Node.js dependencies installed"
echo ""

# Step 6: Setup environment
print_header "Step 6/7: Configuring environment"
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "IMPORTANT: You must edit .env file with your API keys!"
else
    print_success ".env file already exists"
fi

mkdir -p logs
print_success "Logs directory created"
echo ""

# Step 7: Setup systemd service
print_header "Step 7/7: Setting up systemd service"

SERVICE_FILE="/etc/systemd/system/octopi.service"
USER_SERVICE_DIR="$HOME/.config/systemd/user"
USER_SERVICE_FILE="$USER_SERVICE_DIR/octopi.service"

print_status "Creating systemd service configuration..."

# Determine which service to create
read -p "Install as system service (requires sudo) or user service? (system/user): " SERVICE_TYPE
echo

if [[ $SERVICE_TYPE == "system" ]]; then
    # System service (requires sudo)
    $SUDO tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Octopi Neural Mesh
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/src/main.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/stdout.log
StandardError=append:$INSTALL_DIR/logs/stderr.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    print_success "System service created at $SERVICE_FILE"
    print_status "Enable with: sudo systemctl enable octopi"
    print_status "Start with: sudo systemctl start octopi"
    print_status "Status: sudo systemctl status octopi"
else
    # User service (no sudo required)
    mkdir -p "$USER_SERVICE_DIR"
    
    tee "$USER_SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Octopi Neural Mesh
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/src/main.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/stdout.log
StandardError=append:$INSTALL_DIR/logs/stderr.log
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF
    
    systemctl --user daemon-reload
    
    print_success "User service created at $USER_SERVICE_FILE"
    print_status "Enable with: systemctl --user enable octopi"
    print_status "Start with: systemctl --user start octopi"
    print_status "Status: systemctl --user status octopi"
    
    # Enable lingering for user service to start at boot
    if command -v loginctl &> /dev/null; then
        $SUDO loginctl enable-linger $USER 2>/dev/null || true
    fi
fi

# Create helper scripts
cat > "$INSTALL_DIR/start-octopi.sh" << 'EOF'
#!/bin/bash
cd ~/octopi-neural-mesh
tmux new-session -s octopi 'npm start' || tmux attach -t octopi
EOF
chmod +x "$INSTALL_DIR/start-octopi.sh"

cat > "$INSTALL_DIR/octopi-status.sh" << 'EOF'
#!/bin/bash
echo "🐙 Octopi Neural Mesh Status"
echo "============================"
echo ""

if curl -s http://localhost:3000/octopi/health > /dev/null 2>&1; then
    echo "Status: ✓ Running"
    echo ""
    curl -s http://localhost:3000/octopi/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/octopi/health
else
    echo "Status: ✗ Not running"
    echo ""
    echo "Start with: ~/octopi-neural-mesh/start-octopi.sh"
    echo "Or with systemd: systemctl --user start octopi"
fi
EOF
chmod +x "$INSTALL_DIR/octopi-status.sh"

print_success "Helper scripts created"
echo ""

# Installation complete!
echo ""
print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "  🎉 Installation Complete! 🎉"
print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_header "📝 Next Steps:"
echo ""
echo "1. Configure your API keys:"
echo -e "   ${CYAN}nano ~/octopi-neural-mesh/.env${NC}"
echo ""
echo "   Required keys:"
echo "   - OPENAI_API_KEY=your-key-here"
echo "   - JWT_SECRET=your-secret-here"
echo ""
echo "2. Start Octopi:"
echo ""
echo "   Option A - Manual start:"
echo -e "   ${CYAN}~/octopi-neural-mesh/start-octopi.sh${NC}"
echo ""
if [[ $SERVICE_TYPE == "system" ]]; then
    echo "   Option B - System service:"
    echo -e "   ${CYAN}sudo systemctl start octopi${NC}"
    echo ""
    echo "   Enable auto-start:"
    echo -e "   ${CYAN}sudo systemctl enable octopi${NC}"
else
    echo "   Option B - User service:"
    echo -e "   ${CYAN}systemctl --user start octopi${NC}"
    echo ""
    echo "   Enable auto-start:"
    echo -e "   ${CYAN}systemctl --user enable octopi${NC}"
fi
echo ""
echo "3. Check status:"
echo -e "   ${CYAN}~/octopi-neural-mesh/octopi-status.sh${NC}"
echo ""
if [[ $SERVICE_TYPE == "system" ]]; then
    echo "   Or: ${CYAN}sudo systemctl status octopi${NC}"
else
    echo "   Or: ${CYAN}systemctl --user status octopi${NC}"
fi
echo ""
echo "4. Access web interface:"
echo -e "   ${CYAN}http://localhost:3000/octopi${NC}"
echo ""
echo "   Or from another machine on your network:"
echo -e "   ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/octopi${NC}"
echo ""
print_header "🐧 Linux-Specific Tips:"
echo ""
echo "• View logs:"
if [[ $SERVICE_TYPE == "system" ]]; then
    echo -e "  ${CYAN}sudo journalctl -u octopi -f${NC}"
else
    echo -e "  ${CYAN}journalctl --user -u octopi -f${NC}"
fi
echo ""
echo "• Detach from tmux: Ctrl+B, then D"
echo "• Reattach: tmux attach -t octopi"
echo ""
echo "• Configure firewall (if needed):"
echo -e "  ${CYAN}sudo ufw allow 3000/tcp${NC}"
echo ""
print_header "📚 Documentation:"
echo ""
echo "• Terminal Commands Guide: ~/octopi-neural-mesh/TERMINAL_COMMANDS.md"
echo "• Usage Guide: ~/octopi-neural-mesh/USAGE.md"
echo "• Main README: ~/octopi-neural-mesh/README.md"
echo ""
print_warning "⚠️  Remember to configure your API keys before starting!"
print_warning "⚠️  Keep your .env file secure and never commit it"
echo ""
print_success "Happy hacking! 🚀"
echo ""
