#!/bin/bash
# Octopi WeTTY System Setup Script

set -e

echo "🐙 Setting up Octopi WeTTY System..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check Node.js version
print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+."
    exit 1
fi

print_success "Node.js version $NODE_VERSION detected"

# Check npm/yarn
if command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
    print_status "Using Yarn as package manager"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    print_status "Using npm as package manager"
else
    print_error "No package manager found. Please install npm or yarn."
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    yarn install
else
    npm install
fi

print_success "Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file and add your API keys before starting the system"
else
    print_status ".env file already exists"
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Check for tmux (optional for session persistence)
if command -v tmux &> /dev/null; then
    print_success "tmux detected - session persistence available"
else
    print_warning "tmux not found - session persistence will be disabled"
fi

# Check for required system tools
print_status "Checking system dependencies..."

# Check for lsof (used for terminal cwd detection)
if ! command -v lsof &> /dev/null; then
    print_warning "lsof not found - terminal working directory detection may not work properly"
fi

# Make scripts executable
print_status "Making scripts executable..."
chmod +x scripts/*.sh

# Build the system (if build script exists)
if [ -f "scripts/build.js" ]; then
    print_status "Building the system..."
    node scripts/build.js
fi

print_success "Octopi WeTTY System setup complete!"
echo ""
echo "🚀 Quick Start:"
echo "==============="
echo ""
echo "1. Edit the .env file and add your API keys:"
echo "   - OPENAI_API_KEY=your-openai-key"
echo "   - OPENROUTER_API_KEY=your-openrouter-key (optional)"
echo "   - JWT_SECRET=your-secret-key"
echo ""
echo "2. Start the system:"
echo "   npm start"
echo ""
echo "3. Access the terminal interface:"
echo "   http://localhost:3000/octopi"
echo ""
echo "🔧 Advanced Usage:"
echo "=================="
echo ""
echo "Development mode:"
echo "  npm run dev"
echo ""
echo "Custom configuration:"
echo "  npm start -- --config custom-config.json"
echo ""
echo "Enable replication:"
echo "  npm start -- --enable-replication"
echo ""
echo "📖 For more information, see README.md"
echo ""
print_warning "Remember to keep your API keys secure and never commit them to version control!"
echo ""