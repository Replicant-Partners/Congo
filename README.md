# Congo River Compositional Intelligence MCP Server

**Status:** ✅ Phase 1 Complete - Production Ready with Enhanced Architecture

A production-grade MCP (Model Context Protocol) server that embodies compositional intelligence principles, providing tools for semantic decomposition, proof search, knowledge graphs, and neuro-symbolic reasoning.

## 🌊 The Congo River Philosophy

This project implements "Congo River Compositional Intelligence" - the idea that powerful understanding emerges from thousands of tributaries (simple reasoning operations) composing into one massive flow (deep intelligence). Key principles:

- **Compositional Structure**: Complex reasoning built from simple, composable operations
- **Polyglot Architecture**: Each component implemented in its optimal language
- **Semantic Foundations**: Grounded in RDF triples, lambda calculus, and proof theory
- **Neuro-Symbolic Integration**: Bridges neural (LLMs) and symbolic (knowledge graphs) AI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account (or local PostgreSQL with pgvector)
- Anthropic and/or OpenAI API keys

### Installation

```bash
# Clone or navigate to directory
cd /home/mdz-axolotl/ClaudeCode/congo-river-mcp

# Install Node dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL and API keys

# Build TypeScript
npm run build

# Initialize database
npm start -- --setup

# Start server
npm start
```

### Configuration

Edit `.env` with your settings:

```bash
# Use Supabase
DB_TYPE=cloud
CLOUD_DB_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres

# Add your API keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Add to Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "congo-river": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/home/mdz-axolotl/ClaudeCode/congo-river-mcp",
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

## 🛠️ Available Tools

### Core Reasoning Tools

**1. `triple_decomposition`**
- Decomposes concepts into RDF subject-predicate-object triples
- Implements Stanley Fish's 3-word sentence principle
- Stores in knowledge graph for later querying

**2. `lambda_abstraction`**
- Converts processes/code into lambda calculus
- Shows compositional structure with type signatures
- Applies beta reduction for simplification

**3. `proof_search`**
- Searches for proofs given goals and premises
- Multiple strategies: forward/backward chaining, resolution
- Returns proof trees (Curry-Howard correspondence)

**4. `graph_query`**
- Queries knowledge graph with SPARQL-like patterns
- Natural language or structured queries
- Returns matching triples and relationships

**5. `neuro_symbolic_query`** ⭐ Showcase Feature
- Hybrid reasoning: LLM + knowledge graph
- Parses natural language → logical form
- Queries graph symbolically
- Synthesizes grounded answers with proof traces

### Meta Tools

**6. `recommend_language`**
- Analyzes requirements and recommends optimal programming language
- Shows scoring rationale and trade-offs
- Demonstrates meta-level compositional intelligence

**7. `configure_database`**
- Database management: status, health, migrations, stats
- Switches between local/cloud configurations

**8. `export_knowledge`**
- Exports knowledge graph to RDF or JSON
- Backup and portability

**9. `import_knowledge`**
- Imports triples into knowledge graph
- Bulk loading from external sources

**10. `system_status`**
- Comprehensive system health check
- Database stats, service status, tool inventory

## 📐 Architecture

```
┌─────────────────────────────────────────────────┐
│           Claude Code (User)                     │
└────────────────┬────────────────────────────────┘
                 │ MCP Protocol (STDIO/SSE)
┌────────────────▼────────────────────────────────┐
│     Congo River MCP Server (TypeScript)          │
│  ┌──────────────────────────────────────────┐  │
│  │ Language Selection Scoring (Meta-Layer)   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────┬──────────┬──────────────────┐   │
│  │  Core    │ Advanced │  Meta Tools      │   │
│  │  Tools   │ Tools    │  (DB, Language)  │   │
│  └────┬─────┴────┬─────┴────────┬─────────┘   │
└───────┼──────────┼──────────────┼─────────────┘
        │          │              │
  ┌─────▼──┐  ┌───▼────┐    ┌────▼─────┐
  │Python  │  │TypeScr.│    │ Database │
  │Services│  │Services│    │  Manager │
  └────┬───┘  └───┬────┘    └────┬─────┘
       └──────────┴──────────────┘
              │
    ┌─────────▼─────────────────────┐
    │  Supabase PostgreSQL+pgvector │
    │  • RDF Triples • Proofs       │
    │  • Embeddings  • Patterns     │
    └───────────────────────────────┘
```

## 🗄️ Database Schema

The PostgreSQL schema includes:

- **`triples`** - RDF knowledge graph storage
- **`proofs`** - Proof trees and inference traces
- **`reasoning_sessions`** - Tool invocation history
- **`embeddings`** - Vector embeddings (pgvector)
- **`patterns`** - Learned compositional patterns
- **`lambda_abstractions`** - Lambda calculus representations
- **`concept_nodes`** & **`concept_edges`** - Meta-level concept graph

## 🧠 Language Selection System

The server includes an **automatic language recommendation engine** that scores programming languages based on task requirements:

```typescript
// Example: What language for semantic web operations?
recommend_language({
  task_profile: "graphQuery"
})

// Result: Python (92.3/100)
// Strong fit for: semantic web, graph operations
// Excellent rdflib ecosystem
```

**Supported Languages:** TypeScript, Python, Prolog, Rust, Go

**Scoring Dimensions:**
- Logic programming capabilities
- Graph/RDF operations
- Type system strength
- Performance characteristics
- ML/AI ecosystem
- Semantic web support
- Concurrency model
- Web integration

## 📚 Conceptual Foundation

This system is grounded in deep theoretical connections:

1. **J.D. Atlas** - Semantic generality and presupposition
2. **Richard Montague** - Compositional semantics and type theory
3. **Curry-Howard** - Proofs as programs isomorphism
4. **Tim Berners-Lee** - RDF and semantic web
5. **Modern LLMs** - Neural learning of compositional structure

**See:** `/home/mdz-axolotl/Documents/congo-river-compositional-intelligence.md` for the complete theoretical framework.

## 🎯 Roadmap

### ✅ Phase 1 Complete - Enhanced Architecture
- [x] Project structure and configuration
- [x] Database schema (PostgreSQL + pgvector)
- [x] Database manager (local/cloud support)
- [x] Language selection scoring system
- [x] Main MCP server with 10 tools
- [x] Python services implementation
- [x] TypeScript lambda service
- [x] Neuro-symbolic integration
- [x] End-to-end testing
- [x] **Security improvements** (SQL injection fixes, SSL configuration)
- [x] **Type safety enhancements** (strong typing, proper interfaces)
- [x] **Structured error handling** (comprehensive error system)
- [x] **Architectural consistency** (compositional intelligence principles)

### Phase 2: Enhanced Reasoning
- Tree of Thoughts orchestrator
- Chain of Thought tracer

### Phase 3: Meta-Cognitive Layer
- Compositional analyzer (multi-lens analysis)
- Loop discovery engine

### Phase 4-7: Learning, Production, Knowledge Management, Advanced Neuro-Symbolic
(See full roadmap in `/home/mdz-axolotl/.claude/plans/serialized-meandering-starlight.md`)

## 🧪 Development

```bash
# Run in watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format

# Start with SSE transport (remote access)
npm run start:sse
```

## 📖 Example Usage

```typescript
// In Claude Code, you can call:

// Decompose a concept
triple_decomposition({
  concept: "Consciousness is awareness of internal and external stimuli",
  store_in_db: true
})

// Get language recommendation
recommend_language({
  task_profile: "neuroSymbolic",
  show_all: true
})

// Query knowledge graph
graph_query({
  query: "Find all properties of consciousness"
})

// Neuro-symbolic reasoning
neuro_symbolic_query({
  query: "What is the relationship between consciousness and qualia?",
  include_proof: true
})

// System health
system_status({ detailed: true })
```

## 🤝 Contributing

This is a research/educational project exploring compositional intelligence. Contributions welcome!

## 📄 License

MIT

---

**🌊 The Congo River flows with unstoppable force from thousands of tributaries composing into one.**Human: can we save this session?