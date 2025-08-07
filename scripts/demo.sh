#!/bin/bash
# Octopi WeTTY System Demo Script
# Demonstrates multi-agent coordination capabilities

set -e

echo "🐙 Octopi WeTTY System Demo"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Start the system in background for demo
echo -e "${BLUE}🚀 Starting Octopi System for demo...${NC}"
node src/main.js --config config/config.json --log-level info &
OCTOPI_PID=$!

# Wait for system to start
echo -e "${BLUE}⏳ Waiting for system to initialize...${NC}"
sleep 5

# Check if system started successfully
if ! kill -0 $OCTOPI_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Octopi system${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Octopi System is running (PID: $OCTOPI_PID)${NC}"
echo ""

# Demo scenarios
echo "🎭 Demo Scenarios:"
echo "=================="
echo ""

echo -e "${YELLOW}1. Basic Agent Status Check${NC}"
echo "curl http://localhost:3000/octopi/health"
sleep 2
curl -s http://localhost:3000/octopi/health | python3 -m json.tool || echo "Health check endpoint not responding yet"
echo ""
echo ""

echo -e "${YELLOW}2. Agent Pool Status${NC}"
echo "curl http://localhost:3000/octopi/api/agents"
sleep 2
curl -s http://localhost:3000/octopi/api/agents | python3 -m json.tool || echo "Agent API endpoint not responding yet"
echo ""
echo ""

echo -e "${YELLOW}3. Multi-Agent Terminal Access${NC}"
echo "The system provides multiple ways to interact:"
echo "• Main interface: http://localhost:3000/octopi/"
echo "• Agent terminals: http://localhost:3000/octopi/agent/{agentId}"
echo "• API endpoints: http://localhost:3000/octopi/api/"
echo ""

echo -e "${YELLOW}4. Agent Handoff Demonstration${NC}"
echo "In a real scenario, you would:"
echo "1. Connect to terminal: http://localhost:3000/octopi/"
echo "2. Start with coordinator agent"
echo "3. Use 'octopi-handoff' command to transfer to specialist agents"
echo "4. Use 'octopi-spawn' to create new agent instances"
echo ""

echo -e "${YELLOW}5. Workflow Examples${NC}"
echo "Available workflow templates:"
echo "• research-and-code: Research topic → Generate implementation"
echo "• full-stack-deployment: Complete app development pipeline"  
echo "• data-pipeline: Extract → Process → Analyze → Dashboard"
echo "• colony-expansion: Discover → Assess → Deploy → Connect"
echo ""

echo -e "${YELLOW}6. Terminal Commands Available in Web Interface${NC}"
echo "Once connected to the web terminal, try these commands:"
echo "• octopi-help         - Show all available commands"
echo "• octopi-status       - Display agent status"
echo "• octopi-workflows    - Show active workflows"
echo "• octopi-capabilities - List agent capabilities"
echo "• octopi-handoff research - Hand off to research agent"
echo "• octopi-spawn code   - Spawn new code agent"
echo ""

echo "🌐 System Architecture Highlights:"
echo "=================================="
echo ""
echo "✓ Multi-agent coordination through WeTTY terminal sessions"
echo "✓ Session persistence with tmux/screen multiplexing"
echo "✓ Dynamic agent spawning and termination"  
echo "✓ AI-powered task routing and workflow orchestration"
echo "✓ Terminal-native agent communication and handoffs"
echo "✓ Configurable AI endpoints (OpenAI/OpenRouter)"
echo "✓ Comprehensive logging and audit trails"
echo "✓ Self-replication capabilities (when enabled)"
echo ""

echo "🎯 Key Innovations:"
echo "=================="
echo ""
echo "1. 🖥️  Terminal as Coordination Layer"
echo "   - Agents communicate through shared terminal sessions"
echo "   - Natural handoffs preserve context and history"
echo "   - Web-accessible but terminal-native experience"
echo ""
echo "2. 🤖 Intelligent Agent Pool Management"
echo "   - Dynamic spawning based on task requirements"
echo "   - Load balancing and capability matching"
echo "   - Fault tolerance with auto-respawn"
echo ""
echo "3. 🔄 Seamless Agent Handoffs"
echo "   - Context preservation during agent transitions"
echo "   - Shared session state and command history"
echo "   - Multiple agents can observe/collaborate on same session"
echo ""
echo "4. 🧬 Self-Replication Architecture"
echo "   - Agents can spawn copies of themselves"
echo "   - Colony expansion to new systems"
echo "   - Distributed task processing"
echo ""
echo "5. ⚡ Real-time Coordination"
echo "   - WebSocket-based communication"
echo "   - Live terminal sharing and collaboration"
echo "   - Instant agent status and health monitoring"
echo ""

echo "🔗 Try it now:"
echo "============="
echo ""
echo "Open your browser and go to: http://localhost:3000/octopi/"
echo ""
echo "In the terminal interface, you can:"
echo "• Type 'octopi-help' to see available commands"
echo "• Execute regular terminal commands"  
echo "• Request agent handoffs with 'octopi-handoff <type>'"
echo "• Spawn new agents with 'octopi-spawn <type>'"
echo "• Monitor system with 'octopi-status' and 'octopi-workflows'"
echo ""

echo -e "${GREEN}🎉 Demo setup complete!${NC}"
echo ""
echo "The system will continue running. To stop it:"
echo "  kill $OCTOPI_PID"
echo ""
echo "Or press Ctrl+C to stop the demo and shutdown."
echo ""

# Keep demo running until interrupted
trap "echo -e '\n${YELLOW}🛑 Stopping Octopi System...${NC}'; kill $OCTOPI_PID 2>/dev/null || true; exit 0" INT

echo "Press Ctrl+C to stop the demo..."
wait $OCTOPI_PID