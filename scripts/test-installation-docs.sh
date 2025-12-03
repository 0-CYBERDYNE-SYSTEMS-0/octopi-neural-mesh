#!/bin/bash
# Test script to verify installation scripts and documentation

echo "🧪 Testing Octopi Installation Scripts and Documentation"
echo "========================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

# Helper functions
test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

test_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo "1. Testing File Existence"
echo "-------------------------"

# Test documentation files
if [ -f "TERMINAL_COMMANDS.md" ]; then
    test_pass "TERMINAL_COMMANDS.md exists"
else
    test_fail "TERMINAL_COMMANDS.md missing"
fi

if [ -f "scripts/README.md" ]; then
    test_pass "scripts/README.md exists"
else
    test_fail "scripts/README.md missing"
fi

echo ""
echo "2. Testing Installation Scripts"
echo "-------------------------------"

# Test shell scripts
for script in scripts/install-termux.sh scripts/install-macos.sh scripts/install-ubuntu.sh; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            test_pass "$script exists and is executable"
        else
            test_fail "$script exists but is not executable"
        fi
    else
        test_fail "$script missing"
    fi
done

echo ""
echo "3. Testing AppleScript Files"
echo "----------------------------"

for script in scripts/Install-Octopi.applescript scripts/Launch-Octopi.applescript scripts/Check-Octopi-Status.applescript; do
    if [ -f "$script" ]; then
        test_pass "$script exists"
    else
        test_fail "$script missing"
    fi
done

echo ""
echo "4. Testing Shell Script Syntax"
echo "------------------------------"

for script in scripts/install-*.sh; do
    if bash -n "$script" 2>/dev/null; then
        test_pass "$script syntax valid"
    else
        test_fail "$script has syntax errors"
    fi
done

echo ""
echo "5. Testing JavaScript Syntax"
echo "----------------------------"

if node -c src/agents/replication.js 2>/dev/null; then
    test_pass "src/agents/replication.js syntax valid"
else
    test_fail "src/agents/replication.js has syntax errors"
fi

if node -c src/shared/agent-base.js 2>/dev/null; then
    test_pass "src/shared/agent-base.js syntax valid"
else
    test_fail "src/shared/agent-base.js has syntax errors"
fi

echo ""
echo "6. Testing Documentation Content"
echo "--------------------------------"

# Check for key sections in TERMINAL_COMMANDS.md
if grep -q "Termux" TERMINAL_COMMANDS.md; then
    test_pass "TERMINAL_COMMANDS.md contains Termux section"
else
    test_fail "TERMINAL_COMMANDS.md missing Termux section"
fi

if grep -q "AppleScript" TERMINAL_COMMANDS.md; then
    test_pass "TERMINAL_COMMANDS.md contains AppleScript section"
else
    test_fail "TERMINAL_COMMANDS.md missing AppleScript section"
fi

if grep -q "Self-Replication" TERMINAL_COMMANDS.md; then
    test_pass "TERMINAL_COMMANDS.md contains Self-Replication section"
else
    test_fail "TERMINAL_COMMANDS.md missing Self-Replication section"
fi

if grep -q "install-termux.sh" README.md; then
    test_pass "README.md references installation scripts"
else
    test_fail "README.md missing installation script references"
fi

echo ""
echo "7. Testing Script Content"
echo "-------------------------"

# Check install scripts have key features
if grep -q "pkg install" scripts/install-termux.sh; then
    test_pass "install-termux.sh contains Termux package installation"
else
    test_fail "install-termux.sh missing Termux package commands"
fi

if grep -q "brew install" scripts/install-macos.sh; then
    test_pass "install-macos.sh contains Homebrew commands"
else
    test_fail "install-macos.sh missing Homebrew commands"
fi

if grep -q "apt-get install" scripts/install-ubuntu.sh; then
    test_pass "install-ubuntu.sh contains apt-get commands"
else
    test_fail "install-ubuntu.sh missing apt-get commands"
fi

echo ""
echo "8. Testing Agent Code Integration"
echo "---------------------------------"

if grep -q "octopi-install-guide" src/shared/agent-base.js; then
    test_pass "agent-base.js includes install-guide command"
else
    test_fail "agent-base.js missing install-guide command"
fi

if grep -q "showInstallGuide" src/shared/agent-base.js; then
    test_pass "agent-base.js includes showInstallGuide method"
else
    test_fail "agent-base.js missing showInstallGuide method"
fi

if grep -q "octopi-install-guide" src/agents/replication.js; then
    test_pass "replication.js includes install-guide command"
else
    test_fail "replication.js missing install-guide command"
fi

echo ""
echo "9. Testing README Updates"
echo "-------------------------"

if grep -q "TERMINAL_COMMANDS.md" README.md; then
    test_pass "README.md links to TERMINAL_COMMANDS.md"
else
    test_fail "README.md missing link to TERMINAL_COMMANDS.md"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
