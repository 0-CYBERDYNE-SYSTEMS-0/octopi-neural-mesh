#!/bin/bash
# Octopi Neural Mesh - macOS Installation Script
# Automated installer for macOS systems

set -e

echo "🐙 Octopi Neural Mesh - macOS Installer"
echo "========================================"
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

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is for macOS only!"
    print_status "For other platforms, use appropriate install script"
    exit 1
fi

print_success "Running on macOS"
echo ""

# Step 1: Check/Install Homebrew
print_header "Step 1/7: Checking Homebrew"
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found, installing..."
    print_status "This will prompt for your password"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for M1/M2 Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    print_success "Homebrew installed"
else
    print_success "Homebrew already installed: $(brew --version | head -n 1)"
fi
echo ""

# Step 2: Install dependencies
print_header "Step 2/7: Installing required packages"

# Node.js
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    brew install node
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed: $NODE_VERSION"
    
    # Check version
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_warning "Node.js version is < 18, upgrading..."
        brew upgrade node
    fi
fi

# Git
if ! command -v git &> /dev/null; then
    print_status "Installing Git..."
    brew install git
    print_success "Git installed"
else
    print_success "Git already installed: $(git --version)"
fi

# tmux
if ! command -v tmux &> /dev/null; then
    print_status "Installing tmux..."
    brew install tmux
    print_success "tmux installed"
else
    print_success "tmux already installed: $(tmux -V)"
fi

echo ""

# Step 3: Clone repository
print_header "Step 3/7: Cloning Octopi Neural Mesh"
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

# Step 4: Install Node.js dependencies
print_header "Step 4/7: Installing Node.js dependencies"
cd "$INSTALL_DIR"
print_status "Running npm install..."
npm install --production
print_success "Node.js dependencies installed"
echo ""

# Step 5: Setup environment
print_header "Step 5/7: Configuring environment"
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

# Step 6: Create launchd service
print_header "Step 6/7: Setting up auto-start service"
PLIST_PATH="$HOME/Library/LaunchAgents/com.octopi.neural-mesh.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.octopi.neural-mesh</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$INSTALL_DIR/src/main.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>$INSTALL_DIR/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$INSTALL_DIR/logs/stderr.log</string>
</dict>
</plist>
EOF

print_success "Launch agent created at $PLIST_PATH"
print_status "To enable auto-start: launchctl load $PLIST_PATH"
echo ""

# Step 7: Create helper scripts and AppleScripts
print_header "Step 7/7: Creating launcher scripts"

# Shell launcher
cat > "$INSTALL_DIR/start-octopi.sh" << 'EOF'
#!/bin/bash
cd ~/octopi-neural-mesh
tmux new-session -s octopi 'npm start' || tmux attach -t octopi
EOF
chmod +x "$INSTALL_DIR/start-octopi.sh"

# Status checker
cat > "$INSTALL_DIR/octopi-status.sh" << 'EOF'
#!/bin/bash
echo "🐙 Octopi Neural Mesh Status"
echo "============================"
echo ""

if curl -s http://localhost:3000/octopi/health > /dev/null 2>&1; then
    echo "Status: ✓ Running"
    echo ""
    curl -s http://localhost:3000/octopi/health | python3 -m json.tool
else
    echo "Status: ✗ Not running"
    echo ""
    echo "Start with: ~/octopi-neural-mesh/start-octopi.sh"
fi
EOF
chmod +x "$INSTALL_DIR/octopi-status.sh"

# AppleScript launcher
APPLESCRIPT_DIR="$HOME/Library/Scripts/Octopi"
mkdir -p "$APPLESCRIPT_DIR"

cat > "$APPLESCRIPT_DIR/Launch Octopi.scpt" << 'APPLESCRIPT'
#!/usr/bin/osascript
tell application "Terminal"
    activate
    set repoPath to (POSIX path of (path to home folder)) & "octopi-neural-mesh"
    
    try
        set sessionExists to do shell script "tmux has-session -t octopi 2>/dev/null && echo 'yes' || echo 'no'"
        
        if sessionExists is "yes" then
            do script "tmux attach -t octopi"
        else
            do script "cd " & quoted form of repoPath & " && tmux new-session -s octopi 'npm start'"
        end if
    on error
        do script "cd " & quoted form of repoPath & " && npm start"
    end try
end tell

delay 3
open location "http://localhost:3000/octopi"
APPLESCRIPT

cat > "$APPLESCRIPT_DIR/Octopi Status.scpt" << 'APPLESCRIPT'
#!/usr/bin/osascript
try
    set statusJSON to do shell script "curl -s http://localhost:3000/octopi/health"
    display dialog "Octopi Status: Running" & return & return & statusJSON buttons {"OK"} default button 1
on error
    display dialog "Octopi is not running." & return & return & "Would you like to start it?" buttons {"No", "Yes"} default button 2
    if button returned of result is "Yes" then
        tell application "Terminal"
            activate
            do script "cd ~/octopi-neural-mesh && npm start"
        end tell
        delay 3
        open location "http://localhost:3000/octopi"
    end if
end try
APPLESCRIPT

chmod +x "$APPLESCRIPT_DIR/"*.scpt
print_success "AppleScripts created in $APPLESCRIPT_DIR"
print_status "Access from Script Menu or Finder"
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
echo "   Or use TextEdit:"
echo -e "   ${CYAN}open -a TextEdit ~/octopi-neural-mesh/.env${NC}"
echo ""
echo "   Required keys:"
echo "   - OPENAI_API_KEY=your-key-here"
echo "   - JWT_SECRET=your-secret-here"
echo ""
echo "2. Start Octopi:"
echo ""
echo "   Option A - Shell script:"
echo -e "   ${CYAN}~/octopi-neural-mesh/start-octopi.sh${NC}"
echo ""
echo "   Option B - AppleScript (from Finder or Terminal):"
echo -e "   ${CYAN}osascript ~/Library/Scripts/Octopi/Launch\\ Octopi.scpt${NC}"
echo ""
echo "   Option C - Direct command:"
echo -e "   ${CYAN}cd ~/octopi-neural-mesh && npm start${NC}"
echo ""
echo "3. Check status:"
echo -e "   ${CYAN}~/octopi-neural-mesh/octopi-status.sh${NC}"
echo ""
echo "4. Access web interface:"
echo -e "   ${CYAN}http://localhost:3000/octopi${NC}"
echo ""
print_header "🍎 macOS-Specific Features:"
echo ""
echo "• AppleScript launchers available in:"
echo "  ~/Library/Scripts/Octopi/"
echo ""
echo "• Enable auto-start (optional):"
echo -e "  ${CYAN}launchctl load $PLIST_PATH${NC}"
echo ""
echo "• Disable auto-start:"
echo -e "  ${CYAN}launchctl unload $PLIST_PATH${NC}"
echo ""
echo "• Add to Dock for quick access:"
echo "  Drag the AppleScript to your Dock"
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
