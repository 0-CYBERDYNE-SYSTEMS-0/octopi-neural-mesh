# Scripts Directory

This directory contains installation scripts and automation tools for deploying Octopi Neural Mesh across various platforms.

## Installation Scripts

### Bash Scripts

#### `install-termux.sh` - Android/Termux Installation
Automated installer for Termux on Android devices.

**Usage:**
```bash
curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-termux.sh | bash
```

**Features:**
- Installs all required packages (Node.js, Git, tmux, etc.)
- Sets up wake lock for background operation
- Creates auto-start script for boot
- Configures launcher shortcuts
- Enables network access from other devices

#### `install-macos.sh` - macOS Installation
Automated installer for macOS systems using Homebrew.

**Usage:**
```bash
curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-macos.sh | bash
```

**Features:**
- Installs/updates Homebrew
- Installs Node.js, Git, tmux
- Creates launchd service for auto-start
- Sets up helper scripts
- Creates AppleScript launchers

#### `install-ubuntu.sh` - Ubuntu/Debian Installation
Automated installer for Ubuntu and Debian-based systems.

**Usage:**
```bash
curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-ubuntu.sh | bash
```

**Features:**
- Adds NodeSource repository for Node.js 18+
- Installs system dependencies
- Creates systemd service (user or system)
- Sets up helper scripts
- Configures firewall rules

### AppleScript Files

#### `Install-Octopi.applescript` - GUI Installer for macOS
Complete installation wizard with graphical interface.

**Usage:**
```bash
osascript scripts/Install-Octopi.applescript
```

**Features:**
- Step-by-step installation with progress indicators
- Automatic dependency installation
- Configuration wizard
- Option to launch immediately

#### `Launch-Octopi.applescript` - Quick Launcher
Launches Octopi in Terminal with tmux session management.

**Usage:**
```bash
osascript scripts/Launch-Octopi.applescript
```

**Features:**
- Creates or attaches to existing tmux session
- Opens web interface automatically
- Sends system notifications

#### `Check-Octopi-Status.applescript` - Status Monitor
Checks if Octopi is running and displays status.

**Usage:**
```bash
osascript scripts/Check-Octopi-Status.applescript
```

**Features:**
- Displays health check information
- Option to view logs
- Option to start if not running

## Utility Scripts

### `setup.sh` - Development Setup
Sets up development environment with all dependencies.

**Usage:**
```bash
./scripts/setup.sh
```

### `demo.sh` - Interactive Demo
Launches Octopi with demonstration scenarios.

**Usage:**
```bash
./scripts/demo.sh
```

### `start-all.js` - Complete System Startup
Starts all Octopi components including agents and web interface.

**Usage:**
```bash
npm run start-all
# Or directly:
node scripts/start-all.js
```

## Helper Scripts Created by Installers

After installation, the following helper scripts are created in the installation directory:

### `start-octopi.sh`
Quick launcher that starts Octopi in a tmux session.

```bash
~/octopi-neural-mesh/start-octopi.sh
```

### `octopi-status.sh`
Check if Octopi is running and display health information.

```bash
~/octopi-neural-mesh/octopi-status.sh
```

## Making Scripts Executable

If you need to make scripts executable manually:

```bash
chmod +x scripts/*.sh
chmod +x scripts/*.applescript
```

## Platform-Specific Notes

### Termux
- Scripts use `#!/data/data/com.termux/files/usr/bin/bash` shebang
- Requires storage permissions: `termux-setup-storage`
- Wake lock prevents sleep during operation
- SSH server available on port 8022 by default

### macOS
- Requires Homebrew for dependency management
- AppleScripts can be compiled to `.app` for Dock access
- launchd services run at login or boot
- M1/M2 Macs use `/opt/homebrew` path

### Linux
- Ubuntu/Debian use apt package manager
- systemd services support both user and system mode
- Firewall configuration may be needed (ufw)
- SELinux contexts may need adjustment on RHEL/CentOS

## Troubleshooting

### Script Fails to Download
```bash
# Use wget instead of curl
wget -O - <script-url> | bash
```

### Permission Denied
```bash
# Make script executable
chmod +x script-name.sh

# Or run with bash
bash script-name.sh
```

### Node.js Version Issues
```bash
# Check version
node --version

# Update if < 18
# See platform-specific installation script
```

## Security Considerations

- Always review scripts before running with `curl | bash`
- Scripts create `.env` file but don't populate API keys
- Never commit `.env` file to version control
- SSH keys for replication should use key-based authentication
- Firewall rules should restrict access appropriately

## Documentation

For complete documentation on installation, self-replication, and terminal commands, see:

- [TERMINAL_COMMANDS.md](../TERMINAL_COMMANDS.md) - Comprehensive terminal command guide
- [README.md](../README.md) - Main project documentation
- [USAGE.md](../USAGE.md) - Usage and feature guide

## Contributing

When adding new scripts:

1. Add proper error handling
2. Include colored output for better UX
3. Document all options and usage
4. Test on target platform
5. Update this README
6. Add to appropriate section above
