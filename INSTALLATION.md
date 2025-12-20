# Congo River MCP Server - Installation & Setup Guide

## 🎉 Status: **READY TO INSTALL**

All Python services are now **fully integrated** with the TypeScript MCP server! The polyglot architecture is complete and functional.

## Prerequisites

- **Node.js 18+** - For running the MCP server
- **Python 3.10+** - For AI/ML services
- **PostgreSQL with pgvector** - Either local or Supabase
- **API Keys** - Anthropic and/or OpenAI (for neuro-symbolic features)

## Quick Start Installation

### 1. Clone or Pull the Repository

```bash
# If using GitHub
git clone https://github.com/Replicant-Partners/Congo.git
cd Congo

# Or pull latest if already cloned
git pull origin main
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Required `.env` configuration:**

```bash
# Transport (use stdio for Claude Code)
TRANSPORT=stdio

# Database - Use Supabase (recommended) or local PostgreSQL
DB_TYPE=cloud
CLOUD_DB_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres

# Or for local PostgreSQL:
# DB_TYPE=local
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=congo_river
# DB_USER=postgres
# DB_PASSWORD=yourpassword

# LLM API Keys (for neuro-symbolic reasoning)
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here  # Optional

# Python Configuration
PYTHON_EXECUTABLE=python3
PYTHON_SERVICE_TIMEOUT_MS=30000
```

### 4. Build TypeScript

```bash
npm run build
```

This compiles the TypeScript server to the `dist/` directory.

### 5. Initialize Database

```bash
# Run database setup
node dist/server.js --setup
```

This creates all necessary tables, indexes, and extensions in your PostgreSQL database.

### 6. Test the Server

```bash
# Start the server
npm start

# You should see:
# 🌊 Congo River Compositional Intelligence MCP Server
# ✅ Database connected
# 📡 Starting STDIO server...
# ✅ STDIO server ready
```

Press `Ctrl+C` to stop the server.

## Add to Claude Code

### Option 1: Via `.mcp.json` (Global)

Edit `~/.mcp.json` (or your Claude Code MCP config file):

```json
{
  "mcpServers": {
    "congo-river": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/absolute/path/to/Congo",
      "type": "stdio",
      "env": {
        "TRANSPORT": "stdio",
        "DB_TYPE": "cloud",
        "CLOUD_DB_URL": "postgresql://...",
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/Congo` with the actual path where you cloned the repository.

### Option 2: Via Project `.mcp.json` (Project-specific)

Create `.mcp.json` in your project root with the same configuration as above.

### Restart Claude Code

After adding the configuration, restart Claude Code to load the Congo River server.

## Verify Installation

Once Claude Code restarts, you can test the tools:

### 1. Check System Status

```
system_status({ detailed: true })
```

Should show:
- Server running
- Database connected
- 10 tools available

### 2. Test Triple Decomposition

```
triple_decomposition({
  concept: "Consciousness is awareness of internal and external stimuli",
  store_in_db: true
})
```

### 3. Test Language Recommendation

```
recommend_language({
  task_profile: "neuroSymbolic",
  show_all: true
})
```

### 4. Test Lambda Abstraction

```
lambda_abstraction({
  input: "(x) => x * 2",
  include_types: true
})
```

## What's Working

✅ **All 10 MCP Tools:**
1. `triple_decomposition` - RDF semantic analysis (Python → TypeScript bridge)
2. `lambda_abstraction` - Lambda calculus conversion (TypeScript native)
3. `proof_search` - Logical proof search (Python → TypeScript bridge)
4. `graph_query` - Knowledge graph queries (Python → TypeScript bridge)
5. `neuro_symbolic_query` - Hybrid LLM + graph reasoning (Python → TypeScript bridge)
6. `recommend_language` - Meta-level language selection (TypeScript native)
7. `configure_database` - Database management (TypeScript native)
8. `export_knowledge` - Knowledge export (TypeScript native)
9. `import_knowledge` - Triple import (TypeScript native)
10. `system_status` - System health check (TypeScript native)

✅ **Python Service Bridge:**
- Spawns Python processes with JSON communication
- Handles timeouts and error recovery
- Automatic environment setup

✅ **Database Integration:**
- Full PostgreSQL + pgvector support
- RDF triple storage
- Proof tree persistence
- Vector embeddings
- Knowledge graph queries

✅ **Polyglot Architecture:**
- TypeScript handles MCP protocol and orchestration
- Python handles AI/ML operations (NLP, reasoning, graphs)
- Seamless inter-language communication

## Architecture Overview

```
┌────────────────────────────────────┐
│      Claude Code (User)             │
└──────────┬─────────────────────────┘
           │ MCP Protocol (STDIO)
┌──────────▼─────────────────────────┐
│   Congo River Server (TypeScript)   │
│   ┌─────────────────────────────┐  │
│   │  Python Service Bridge       │  │
│   │  • Spawns Python processes   │  │
│   │  • JSON communication        │  │
│   │  • Timeout handling          │  │
│   └──────────┬──────────────────┘  │
└──────────────┼─────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐  ┌──────┐  ┌───────┐
│Triple │  │Proof │  │Graph  │
│Decomp │  │Search│  │Engine │
└───────┘  └──────┘  └───────┘
    Python Services
               │
    ┌──────────▼──────────────┐
    │ PostgreSQL + pgvector    │
    │  • RDF Triples           │
    │  • Proofs                │
    │  • Embeddings            │
    └──────────────────────────┘
```

## Development Workflow

### Run in Watch Mode

```bash
npm run dev
```

Automatically recompiles TypeScript on changes.

### Run Tests

```bash
# Python service tests
python -m pytest tests/

# Full integration tests
npm test
```

### Linting & Formatting

```bash
npm run lint
npm run format
```

## Troubleshooting

### "spaCy model not found"

```bash
python -m spacy download en_core_web_sm
```

### "Python service timed out"

Increase timeout in `.env`:

```bash
PYTHON_SERVICE_TIMEOUT_MS=60000  # 60 seconds
```

### "Database connection failed"

- Verify `CLOUD_DB_URL` is correct
- Check Supabase project is running
- Test connection: `psql $CLOUD_DB_URL`

### "Command not found: node"

Ensure Node.js 18+ is installed:

```bash
node --version  # Should be v18.0.0 or higher
```

### Import errors in Python

Set PYTHONPATH:

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src/services/python"
```

## What's Next

### Phase 2 Features (Planned)
- Tree of Thoughts orchestrator
- Chain of Thought tracer
- Enhanced meta-cognitive analysis

### Known Limitations
- SSE transport temporarily disabled (STDIO only)
- Some type strictness relaxed for compatibility
- Full test suite in progress

## Contributing

This is a research/educational project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

---

**🌊 The Congo River flows with unstoppable force from thousands of tributaries composing into one.**

*Built with compositional intelligence principles - each tool implemented in its optimal language.*
