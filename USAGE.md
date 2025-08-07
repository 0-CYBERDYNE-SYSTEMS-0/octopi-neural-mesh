# 🐙 Octopi System Usage Guide

## Quick Start

### 1. Start the System
```bash
npm start
```
This launches the main server with the ASCII banner and web interface at http://localhost:3000/octopi

### 2. Conversational CLI Mode (NEW!)
```bash
npm run chat
```
**Natural Language Interface** - Talk to your agents like a human assistant:

**Example Conversations:**
```
User> Hi there!
🤖 Hello! Ready to work with some agents?

User> I need to analyze some website data
🤖 For "analyze website data", I suggest using a 🔍 Research agent.
Should I submit this task to the agent pool? (Yes)

User> Show me all active agents
🤖 Active Agents (2):
1. ● 🎯 Coordinator (coord_001) - Status: idle
2. ● 🔍 Research (research_042) - Status: working

User> Spawn a code agent for me
🤖 ✅ Successfully spawned 💻 Code agent!
The agent is now available for tasks and ready to assist you.
```

### 3. Traditional CLI Mode  
```bash
npm run cli
```
**Command-Based Interface** - Traditional commands:
```
octopi> help
octopi> spawn research
octopi> status  
octopi> task "analyze competitor websites"
```

### 4. Web Interface
Open http://localhost:3000/octopi for browser-based terminal with:
- Real-time agent monitoring
- Interactive terminal sessions
- Visual agent controls
- System status dashboard

## Conversational CLI Features

### Natural Language Understanding
The conversational CLI recognizes various ways to express the same intent:

**Spawning Agents:**
- "Spawn a research agent"
- "I need a code agent"  
- "Can you create a DevOps agent for me?"
- "Get me an agent that can analyze data"

**Checking Status:**
- "How is the system doing?"
- "Show me the system status"
- "What's happening with my agents?"
- "Is everything running okay?"

**Managing Tasks:**
- "I need help with data analysis"
- "Can you analyze these websites for me?"
- "Help me deploy my application"
- "I want to research AI trends"

**Getting Help:**
- "What can you do?"
- "Help me understand the system"
- "Show me available commands"
- "How do I use this?"

### Contextual Conversations
The AI assistant remembers your conversation and preferences:
- Personalizes responses with your name
- Suggests appropriate agent types based on task description  
- Maintains conversation history
- Provides contextual follow-up questions

### Agent Types & Capabilities

**🎯 Coordinator**
- Master orchestrator for task routing
- Workflow management and coordination
- Multi-step planning and execution

**🔍 Research**  
- Web scraping and data extraction
- Content analysis and report generation
- Information gathering from multiple sources

**💻 Code**
- Development and programming tasks
- GitHub integration and repository management
- Code review and quality assurance

**⚙️ DevOps**
- Server management and deployment
- Infrastructure provisioning and scaling  
- System monitoring and maintenance

**🧬 Replication**
- Self-spawning and colony expansion
- System discovery across networks
- Load balancing and optimization

## Advanced Usage

### Workflow Templates
Request predefined multi-agent workflows:
```
User> Run the research-and-code workflow
User> I need a full-stack deployment
User> Help me expand the colony to new systems
```

### Agent Handoffs
Agents can seamlessly transfer tasks:
```
User> The research agent should hand this off to a code agent
🤖 ✅ Handoff completed! Task transferred to Code agent.
```

### Session Management  
Monitor and manage terminal sessions:
```
User> Show me active sessions
User> What terminals are running?
```

## Tips for Best Experience

### 🗣️ Conversational Mode Tips
- **Be natural**: Speak as you would to a human assistant
- **Be specific**: "Analyze competitor pricing" vs "do some research"
- **Ask follow-ups**: The AI remembers context within the conversation
- **Use examples**: "Like when we analyzed those AI papers yesterday"

### 🖥️ CLI Mode Tips  
- Use tab completion for commands
- `help` shows all available commands
- Commands can be abbreviated: `stat` for `status`
- Use `clear` to clean up the display

### 🌐 Web Mode Tips
- Multiple terminal tabs for different agents
- Real-time updates show agent activity
- Sidebar controls for quick actions
- Right-click for context menus

## Troubleshooting

**CLI shows "System not running"**
```bash
# Start the server first
npm start
# Then in another terminal:
npm run chat
```

**Agents not responding**
```bash
# Check system status
npm run cli -- --command "status"
# Restart if needed
npm start
```

**Connection errors**
- Check .env file has correct JWT_SECRET
- Verify ports 3000 is available
- Look at logs in logs/octopi.log

## Configuration

**Environment Variables (.env):**
```
OPENAI_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here  
JWT_SECRET=your-secret-here
PORT=3000
LOG_LEVEL=info
```

**Config File (config/config.json):**
- Server settings (host, port, paths)
- Agent limits and timeouts
- AI endpoint configurations  
- Security and monitoring settings

## Getting Started Checklist

- [ ] Run `npm install` to install dependencies
- [ ] Copy `.env.example` to `.env` and set API keys
- [ ] Start system: `npm start`
- [ ] Try conversational mode: `npm run chat` 
- [ ] Open web interface: http://localhost:3000/octopi
- [ ] Spawn your first agent: "I need a research agent"
- [ ] Submit a task: "Help me analyze competitor websites"
- [ ] Monitor progress: "Show me system status"

🎉 **You're ready to coordinate your multi-agent system!**