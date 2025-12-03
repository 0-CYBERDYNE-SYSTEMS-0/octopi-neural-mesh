#!/data/data/com.termux/files/usr/bin/bash
# Octopi Neural Mesh - Termux Installation Script
# Automated installer for Android Termux environment

set -e

echo "🐙 Octopi Neural Mesh - Termux Installer"
echo "=========================================="
echo ""

# Colors for Termux
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script is designed for Termux only!"
    print_status "For other platforms, use appropriate install script"
    exit 1
fi

print_success "Running in Termux environment"
echo ""

# Step 1: Update packages
print_header "Step 1/7: Updating Termux packages"
print_status "This may take a few minutes..."
pkg update -y && pkg upgrade -y
print_success "Packages updated"
echo ""

# Step 2: Install dependencies
print_header "Step 2/7: Installing required packages"
print_status "Installing: nodejs, git, openssh, tmux, python, curl, wget"

PACKAGES="nodejs git openssh tmux python curl wget"
for pkg in $PACKAGES; do
    if pkg list-installed | grep -q "^${pkg}/"; then
        print_success "$pkg already installed"
    else
        print_status "Installing $pkg..."
        pkg install -y $pkg
        print_success "$pkg installed"
    fi
done
echo ""

# Step 3: Verify installations
print_header "Step 3/7: Verifying installations"
node --version && print_success "Node.js: $(node --version)"
npm --version && print_success "npm: $(npm --version)"
git --version && print_success "Git: $(git --version)"
tmux -V && print_success "tmux: $(tmux -V)"
python --version && print_success "Python: $(python --version)"
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
print_status "Running npm install (this may take several minutes)..."
npm install --production
print_success "Node.js dependencies installed"
echo ""

# Step 6: Setup environment
print_header "Step 6/7: Configuring environment"
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "IMPORTANT: You must edit .env file with your API keys!"
    print_status "Edit with: nano .env"
else
    print_success ".env file already exists"
fi

# Create logs directory
mkdir -p logs
print_success "Logs directory created"
echo ""

# Step 7: Setup Termux-specific features
print_header "Step 7/7: Setting up Termux integration"

# Request necessary permissions
print_status "Requesting storage permissions..."
termux-setup-storage 2>/dev/null || print_warning "Storage permission setup skipped"

# Setup wake lock for background operation
print_status "Configuring wake lock for background operation..."
cat > "$HOME/.octopi-wakelock.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
echo "Wake lock acquired - Octopi can run in background"
EOF
chmod +x "$HOME/.octopi-wakelock.sh"
print_success "Wake lock script created at ~/.octopi-wakelock.sh"

# Setup boot script
print_status "Setting up auto-start on boot..."
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/octopi-autostart.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Auto-start Octopi on Termux boot

# Acquire wake lock
termux-wake-lock

# Wait for network
sleep 5

# Start Octopi in tmux session
cd ~/octopi-neural-mesh
tmux new-session -d -s octopi 'npm start'

# Notify
termux-notification --title "Octopi Started" --content "Neural Mesh is now running"
EOF
chmod +x "$HOME/.termux/boot/octopi-autostart.sh"
print_success "Auto-start script created"

# Create quick launch shortcuts
print_status "Creating launcher shortcuts..."

# Start script
cat > "$INSTALL_DIR/start-octopi.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/octopi-neural-mesh
termux-wake-lock
tmux new-session -s octopi 'npm start' || tmux attach -t octopi
EOF
chmod +x "$INSTALL_DIR/start-octopi.sh"

# Status check script
cat > "$INSTALL_DIR/octopi-status.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
echo "🐙 Octopi Neural Mesh Status"
echo "============================"
echo ""

# Check if running
if curl -s http://localhost:3000/octopi/health > /dev/null 2>&1; then
    echo "Status: ✓ Running"
    echo ""
    curl -s http://localhost:3000/octopi/health | python -m json.tool
else
    echo "Status: ✗ Not running"
    echo ""
    echo "Start with: ~/octopi-neural-mesh/start-octopi.sh"
fi
EOF
chmod +x "$INSTALL_DIR/octopi-status.sh"

print_success "Launcher scripts created"
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
echo -e "   ${CYAN}~/octopi-neural-mesh/start-octopi.sh${NC}"
echo ""
echo "   Or with manual tmux:"
echo -e "   ${CYAN}cd ~/octopi-neural-mesh && npm start${NC}"
echo ""
echo "3. Check status:"
echo -e "   ${CYAN}~/octopi-neural-mesh/octopi-status.sh${NC}"
echo ""
echo "4. Access web interface:"
echo "   Find your device IP:"
echo -e "   ${CYAN}ifconfig | grep 'inet ' | grep -v 127.0.0.1${NC}"
echo ""
echo "   Then from any browser on same network:"
echo -e "   ${CYAN}http://<your-ip>:3000/octopi${NC}"
echo ""
print_header "🔧 Termux-Specific Tips:"
echo ""
echo "• Enable wake lock for background operation:"
echo -e "  ${CYAN}~/.octopi-wakelock.sh${NC}"
echo ""
echo "• Auto-start is configured for boot"
echo "  Enable in Termux settings: Settings → Boot"
echo ""
echo "• Keep Termux alive with persistent notification:"
echo -e "  ${CYAN}termux-wake-lock${NC}"
echo ""
echo "• Detach from tmux session: Ctrl+B, then D"
echo "• Reattach: tmux attach -t octopi"
echo ""
print_header "📚 Documentation:"
echo ""
echo "• Terminal Commands Guide: TERMINAL_COMMANDS.md"
echo "• Usage Guide: USAGE.md"
echo "• Main README: README.md"
echo ""
print_warning "⚠️  Remember to keep your API keys secure!"
print_warning "⚠️  Never commit .env file to version control"
echo ""
print_success "Happy hacking! 🚀"
echo ""
