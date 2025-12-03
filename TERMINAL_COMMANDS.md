# 🖥️ Terminal Commands Guide for Self-Replication & Installation

## 🎯 Overview

This guide provides strong, concise command-line instructions for deploying, replicating, and managing the Octopi Neural Mesh system across different platforms using Bash and terminal interfaces, with special emphasis on Termux (Android) and macOS (AppleScript).

---

## 📱 Termux (Android) Deployment

### Quick Start - One-Line Installer

```bash
# Complete automated setup
curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-termux.sh | bash
```

### Manual Installation

```bash
# 1. Update Termux packages
pkg update && pkg upgrade -y

# 2. Install required dependencies
pkg install -y nodejs git openssh tmux python curl wget

# 3. Clone the repository
cd ~ && git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git
cd octopi-neural-mesh

# 4. Install Node.js dependencies
npm install

# 5. Configure environment
cp .env.example .env
nano .env  # Add your API keys

# 6. Start the system
npm start
```

### Termux-Specific Commands

```bash
# Start in background with persistent session
termux-wake-lock  # Prevent sleep
tmux new-session -d -s octopi 'npm start'
tmux attach -t octopi

# Auto-start on device boot
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/octopi-autostart.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/octopi-neural-mesh
tmux new-session -d -s octopi 'npm start'
EOF
chmod +x ~/.termux/boot/octopi-autostart.sh

# Access via local network
ifconfig | grep "inet " | grep -v 127.0.0.1
# Then access from other devices: http://<ip-address>:3000/octopi
```

### Termux Self-Replication

```bash
# Deploy to another Termux device via SSH
# On source device:
pkg install openssh
sshd  # Start SSH server
whoami && hostname -I

# From coordinator device:
npm run cli
# Then in CLI:
octopi-replicate <target-ip> 8022
```

---

## 🍎 macOS Deployment with AppleScript

### One-Line Installer

```bash
# Automated installation
curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-macos.sh | bash
```

### AppleScript Automation

#### Install and Launch (Save as Application)

```applescript
#!/usr/bin/osascript
-- Octopi Neural Mesh Installer for macOS

on run
    -- Check for Homebrew
    try
        do shell script "which brew"
    on error
        display dialog "Installing Homebrew..." buttons {"OK"} default button 1
        do shell script "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    end try
    
    -- Install Node.js if needed
    try
        do shell script "node --version"
    on error
        display dialog "Installing Node.js..." buttons {"OK"} default button 1
        do shell script "brew install node"
    end try
    
    -- Install Git if needed
    try
        do shell script "git --version"
    on error
        do shell script "brew install git"
    end try
    
    -- Install tmux for session management
    try
        do shell script "which tmux"
    on error
        do shell script "brew install tmux"
    end try
    
    -- Clone repository
    set homeFolder to POSIX path of (path to home folder)
    set repoPath to homeFolder & "octopi-neural-mesh"
    
    try
        do shell script "test -d " & quoted form of repoPath
        display dialog "Repository already exists. Updating..." buttons {"OK"} default button 1
        do shell script "cd " & quoted form of repoPath & " && git pull"
    on error
        display dialog "Cloning Octopi repository..." buttons {"OK"} default button 1
        do shell script "cd " & quoted form of homeFolder & " && git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git"
    end try
    
    -- Install dependencies
    display dialog "Installing Node.js dependencies..." buttons {"OK"} default button 1
    do shell script "cd " & quoted form of repoPath & " && npm install"
    
    -- Setup environment
    try
        do shell script "test -f " & quoted form of (repoPath & "/.env")
    on error
        do shell script "cd " & quoted form of repoPath & " && cp .env.example .env"
        display dialog "Please edit .env file with your API keys at:" & return & repoPath & "/.env" buttons {"OK"} default button 1
    end try
    
    -- Ask to launch
    set launchChoice to button returned of (display dialog "Installation complete! Launch Octopi now?" buttons {"Later", "Launch"} default button 2)
    
    if launchChoice is "Launch" then
        -- Launch in Terminal
        tell application "Terminal"
            activate
            do script "cd " & quoted form of repoPath & " && npm start"
        end tell
        
        delay 3
        
        -- Open in browser
        open location "http://localhost:3000/octopi"
    end if
    
    return "Octopi Neural Mesh installed successfully!"
end run
```

#### Quick Launch AppleScript

```applescript
#!/usr/bin/osascript
-- Quick Launch Octopi in tmux session

on run
    set repoPath to (POSIX path of (path to home folder)) & "octopi-neural-mesh"
    
    tell application "Terminal"
        activate
        
        -- Check if tmux session exists
        try
            set sessionExists to do shell script "tmux has-session -t octopi 2>/dev/null && echo 'yes' || echo 'no'"
            
            if sessionExists is "yes" then
                -- Attach to existing session
                do script "tmux attach -t octopi"
            else
                -- Create new session
                do script "cd " & quoted form of repoPath & " && tmux new-session -s octopi 'npm start'"
            end if
        on error
            -- Fallback: start without tmux
            do script "cd " & quoted form of repoPath & " && npm start"
        end try
    end tell
    
    -- Open web interface
    delay 2
    open location "http://localhost:3000/octopi"
    
    return "Octopi launched successfully!"
end run
```

#### Status Check AppleScript

```applescript
#!/usr/bin/osascript
-- Check Octopi status and display info

on run
    try
        set statusJSON to do shell script "curl -s http://localhost:3000/octopi/health"
        display dialog "Octopi Status:" & return & return & statusJSON buttons {"OK"} default button 1
    on error
        display dialog "Octopi is not running." & return & "Would you like to start it?" buttons {"No", "Yes"} default button 2
        if button returned of result is "Yes" then
            run script file ((path to home folder as text) & "Applications:Launch Octopi.app")
        end if
    end try
end run
```

---

## 🐧 Linux Self-Installation

### Ubuntu/Debian

```bash
#!/bin/bash
# One-line installer for Ubuntu/Debian

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git tmux build-essential
cd ~ && git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git
cd octopi-neural-mesh && npm install
cp .env.example .env
echo "Edit .env file with your API keys, then run: npm start"
```

### CentOS/RHEL/Fedora

```bash
#!/bin/bash
# One-line installer for CentOS/RHEL/Fedora

curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git tmux gcc-c++ make
cd ~ && git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git
cd octopi-neural-mesh && npm install
cp .env.example .env
echo "Edit .env file with your API keys, then run: npm start"
```

### Alpine Linux (Docker-friendly)

```bash
#!/bin/sh
# Alpine Linux installer

apk add --no-cache nodejs npm git tmux bash python3 make g++
cd /root && git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git
cd octopi-neural-mesh && npm install
cp .env.example .env
```

---

## 🔄 Self-Replication Commands

### SSH-Based Replication

```bash
# Prerequisites: SSH access to target system

# Method 1: Direct replication via CLI
npm run cli
> spawn replication
> replicate <target-host> [port]

# Method 2: Programmatic replication
node -e "
const { ReplicationAgent } = require('./src/agents/replication.js');
const agent = new ReplicationAgent();
agent.performSelfReplication({
  targetHost: 'remote.server.com',
  targetPort: 22,
  credentials: { username: 'user', key: '/path/to/key' }
});
"

# Method 3: Batch replication to multiple targets
cat targets.txt | while read host; do
  npm run cli -- --command "replicate $host"
done
```

### Docker-Based Replication

```bash
# Build and push Docker image
docker build -t octopi-neural-mesh .
docker tag octopi-neural-mesh:latest yourrepo/octopi:latest
docker push yourrepo/octopi:latest

# Deploy to remote Docker host
docker -H ssh://user@remote.host run -d \
  -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e JWT_SECRET=$JWT_SECRET \
  --name octopi \
  yourrepo/octopi:latest

# Kubernetes replication
kubectl create secret generic octopi-secrets \
  --from-literal=openai-api-key=$OPENAI_API_KEY \
  --from-literal=jwt-secret=$JWT_SECRET

kubectl apply -f k8s/octopi-deployment.yaml
```

### Network Discovery & Auto-Replication

```bash
# Discover available systems on network
npm run cli
> spawn replication
> discover --network 192.168.1.0/24

# Auto-replicate to discovered systems
> expand --strategy resource-based --max-colonies 5

# Check colony status
> colonies
```

---

## 🚀 Advanced Terminal Commands

### Session Management

```bash
# Create persistent tmux session
tmux new-session -s octopi-master 'cd ~/octopi-neural-mesh && npm start'

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t octopi-master

# List sessions
tmux list-sessions

# Kill session
tmux kill-session -t octopi-master

# Multi-pane setup
tmux new-session -s octopi-dev \; \
  split-window -h \; \
  split-window -v \; \
  select-pane -t 0 \; \
  send-keys 'npm start' C-m \; \
  select-pane -t 1 \; \
  send-keys 'npm run chat' C-m \; \
  select-pane -t 2 \; \
  send-keys 'tail -f logs/octopi.log' C-m
```

### Background Service Setup

```bash
# systemd service (Linux)
sudo tee /etc/systemd/system/octopi.service > /dev/null <<EOF
[Unit]
Description=Octopi Neural Mesh
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/octopi-neural-mesh
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable octopi
sudo systemctl start octopi
sudo systemctl status octopi

# launchd service (macOS)
mkdir -p ~/Library/LaunchAgents
tee ~/Library/LaunchAgents/com.octopi.neural-mesh.plist > /dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.octopi.neural-mesh</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$HOME/octopi-neural-mesh/src/main.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$HOME/octopi-neural-mesh</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/octopi-neural-mesh/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/octopi-neural-mesh/logs/stderr.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.octopi.neural-mesh.plist
launchctl start com.octopi.neural-mesh
```

---

## 🔧 Quick Reference Commands

### Installation

| Platform | Command |
|----------|---------|
| Termux | `curl -fsSL <url>/install-termux.sh \| bash` |
| macOS | `curl -fsSL <url>/install-macos.sh \| bash` |
| Ubuntu | `curl -fsSL <url>/install-ubuntu.sh \| bash` |
| Docker | `docker run -d -p 3000:3000 octopi-neural-mesh` |

### Management

| Action | Command |
|--------|---------|
| Start | `npm start` |
| Start in background | `tmux new -d -s octopi 'npm start'` |
| Status | `curl http://localhost:3000/octopi/health` |
| Logs | `tail -f logs/octopi.log` |
| Stop | `pkill -f "node.*octopi"` |

### Replication

| Action | Command |
|--------|---------|
| Discover systems | `npm run cli -- --command "discover"` |
| Replicate to host | `npm run cli -- --command "replicate <host>"` |
| Expand colony | `npm run cli -- --command "expand"` |
| List colonies | `npm run cli -- --command "colonies"` |

---

## 📦 Dependencies Quick Install

```bash
# All platforms - minimal dependencies
# Node.js 18+
# Git
# tmux (optional, for persistence)

# Termux
pkg install nodejs git tmux openssh

# macOS
brew install node git tmux

# Ubuntu/Debian
sudo apt install nodejs git tmux npm

# Fedora/RHEL
sudo dnf install nodejs git tmux npm

# Alpine
apk add nodejs npm git tmux bash
```

---

## 🔐 Security Considerations

```bash
# Generate secure JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# Restrict file permissions
chmod 600 .env
chmod 700 scripts/*.sh

# SSH key-based authentication for replication
ssh-keygen -t ed25519 -C "octopi-replication"
ssh-copy-id user@target-host

# Firewall configuration
# Allow only necessary ports
sudo ufw allow 3000/tcp  # Web interface
sudo ufw allow 22/tcp    # SSH for replication
sudo ufw enable
```

---

## 🧪 Testing Commands

```bash
# Verify installation
node --version  # Should be 18+
npm --version
git --version

# Test server start
npm start &
sleep 5
curl http://localhost:3000/octopi/health
pkill -f "node.*octopi"

# Test replication agent
npm run cli -- --command "spawn replication"
npm run cli -- --command "discover --network 127.0.0.1"

# Load test
npm install -g autocannon
autocannon -c 10 -d 30 http://localhost:3000/octopi/health
```

---

## 🆘 Troubleshooting

```bash
# Check if port 3000 is available
lsof -i :3000  # macOS/Linux
netstat -tuln | grep 3000  # Linux

# Kill existing processes
pkill -f "node.*octopi"
tmux kill-session -t octopi

# Reset installation
cd ~/octopi-neural-mesh
git reset --hard origin/main
rm -rf node_modules
npm install

# View detailed logs
tail -n 100 logs/octopi.log

# Debug mode
NODE_ENV=development LOG_LEVEL=debug npm start
```

---

## 📚 Additional Resources

- Main README: [README.md](README.md)
- Usage Guide: [USAGE.md](USAGE.md)
- Configuration: [config/config.example.json](config/config.example.json)
- API Documentation: Access `/octopi/api/docs` when running

---

**Note**: Always ensure you have proper authorization before deploying agents to remote systems. Self-replication should only be used in controlled environments with appropriate security measures.
