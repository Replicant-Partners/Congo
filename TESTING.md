# Congo River MCP Server - Testing Guide

Quick start guide for testing all services and verifying the Phase 1 implementation.

## Prerequisites

```bash
# Install Node dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install spaCy model
python -m spacy download en_core_web_sm

# Build TypeScript
npm run build
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Database (use Supabase or local PostgreSQL)
DB_TYPE=cloud
CLOUD_DB_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres

# LLM API Keys (for neuro-symbolic service)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Transport
TRANSPORT=stdio
```

## Test Individual Services

### 1. Triple Decomposition Service

```bash
# Test with simple sentence
python src/services/python/triple_decomposer.py "Consciousness is awareness"

# Test with JSON input
python src/services/python/triple_decomposer.py --json '{
  "text": "Consciousness is awareness of internal and external stimuli",
  "context": "philosophy"
}'
```

**Expected output:**
```json
{
  "success": true,
  "input": "Consciousness is awareness...",
  "triples": [
    {
      "subject": "Consciousness",
      "predicate": "is_a",
      "object": "awareness",
      "confidence": 0.95
    },
    {
      "subject": "awareness",
      "predicate": "has_property",
      "object": "internal",
      "confidence": 0.85
    }
  ],
  "count": 2
}
```

### 2. Proof Search Service

```bash
# Classic Socrates example
python src/services/python/proof_searcher.py --json '{
  "goal": "Socrates is mortal",
  "facts": ["Socrates is human"],
  "rules": [
    {
      "premises": ["X is human"],
      "conclusion": "X is mortal",
      "name": "mortality_rule"
    }
  ],
  "strategy": "backward"
}'
```

**Expected output:**
```json
{
  "success": true,
  "goal": "Socrates is mortal",
  "proof": {
    "success": true,
    "steps": [
      {
        "conclusion": "Socrates is human",
        "premises": [],
        "rule_name": "given_fact"
      },
      {
        "conclusion": "Socrates is mortal",
        "premises": ["Socrates is human"],
        "rule_name": "mortality_rule"
      }
    ]
  }
}
```

### 3. Graph Query Engine

```bash
# Natural language query
python src/services/python/graph_engine.py "Find all properties of consciousness"

# Pattern matching
python src/services/python/graph_engine.py --json '{
  "query": "consciousness",
  "query_type": "pattern",
  "subject": "consciousness",
  "triples": [
    {"subject": "consciousness", "predicate": "has_property", "object": "awareness"},
    {"subject": "consciousness", "predicate": "relates_to", "object": "qualia"}
  ]
}'

# SPARQL query
python src/services/python/graph_engine.py --json '{
  "query": "SELECT ?p WHERE { <consciousness> ?p ?o }",
  "query_type": "sparql",
  "triples": [
    {"subject": "consciousness", "predicate": "has_property", "object": "awareness"}
  ]
}'
```

### 4. Lambda Abstraction Service

```bash
# Test with arrow function
node dist/services/typescript/lambda-abstractor.js --json '{
  "input": "(x) => x * 2",
  "inputType": "code"
}'

# Test with function composition
node dist/services/typescript/lambda-abstractor.js --json '{
  "input": "compose f and g",
  "inputType": "natural_language"
}'

# Test with mathematical notation
node dist/services/typescript/lambda-abstractor.js --json '{
  "input": "λx. x + 1",
  "inputType": "mathematical"
}'
```

**Expected output:**
```json
{
  "success": true,
  "input": "(x) => x * 2",
  "inputType": "code",
  "notation": "λx. (x * 2)",
  "curried": "λx. (x * 2)",
  "typeSignature": "α → β",
  "complexity": 2,
  "variables": ["x"],
  "freeVariables": []
}
```

### 5. Neuro-Symbolic Engine (Requires API Keys)

```bash
# Simple query
python src/services/python/neuro_symbolic.py "What is consciousness?"

# Complex reasoning with proof
python src/services/python/neuro_symbolic.py --json '{
  "query": "What is the relationship between consciousness and awareness?",
  "include_proof": true,
  "llm_provider": "anthropic"
}'
```

**Expected output:**
```json
{
  "success": true,
  "result": {
    "answer": "Based on the knowledge graph, consciousness has_property awareness...",
    "confidence": 0.85,
    "logical_form": "related(consciousness, awareness)",
    "graph_results": [...],
    "proof_trace": {...},
    "reasoning_steps": [
      "Parsing query intent with LLM",
      "Converting to logical form",
      "Decomposing concepts into RDF triples",
      "Querying knowledge graph",
      "Synthesizing natural language answer"
    ]
  }
}
```

## Test MCP Server

### Start the Server

```bash
# Start with STDIO transport (default)
npm start

# Or start with SSE transport for remote access
TRANSPORT=sse npm start
```

### Test with MCP Inspector

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector

# Point it to the server
node dist/server.js
```

### Add to Claude Code

Add to `.mcp.json`:
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
        "CLOUD_DB_URL": "your-supabase-url",
        "ANTHROPIC_API_KEY": "your-key"
      }
    }
  }
}
```

Then restart Claude Code and test tools:

```
recommend_language({ task_profile: "neuroSymbolic" })
system_status({ detailed: true })
triple_decomposition({ concept: "consciousness is awareness" })
```

## Database Testing

### Initialize Database

```bash
npm start -- --setup
```

This will:
1. Create all tables from schema.sql
2. Set up pgvector extension
3. Create helper functions and views

### Test Database Manager

```typescript
import { DatabaseManager } from './src/config/database';

const db = new DatabaseManager();
await db.initialize();

// Test query
const result = await db.query('SELECT COUNT(*) FROM triples');
console.log('Triple count:', result.rows[0].count);

// Test triple import
await db.importTriples([
  { subject: 'test', predicate: 'is_a', object: 'example' }
]);

// Test export
const rdf = await db.exportToRDF();
console.log('RDF export:', rdf);
```

## Integration Testing

### End-to-End Workflow

```bash
# 1. Decompose concept
python src/services/python/triple_decomposer.py "Intelligence emerges from composition"

# 2. Store in database (need to integrate with server)
# 3. Query the graph
python src/services/python/graph_engine.py "What relates to intelligence?"

# 4. Run neuro-symbolic query
python src/services/python/neuro_symbolic.py "How does composition lead to intelligence?"
```

### Test Language Selection

```typescript
import { LanguageSelector } from './src/config/language-selector';

const selector = new LanguageSelector();

// Test recommendation
const result = selector.recommendLanguage({
  needsLogic: true,
  needsGraphOps: true,
  needsMLLibraries: true
});

console.log('Recommended:', result.language); // Should be Python
console.log('Score:', result.score);
console.log('Reasoning:', result.reasoning);
```

## Troubleshooting

### Common Issues

**1. spaCy model not found**
```bash
python -m spacy download en_core_web_sm
```

**2. TypeScript compilation errors**
```bash
npm install --save-dev @types/node @types/pg
npm run build
```

**3. Database connection failed**
- Check CLOUD_DB_URL in .env
- Verify Supabase project is running
- Test connection: `psql $CLOUD_DB_URL`

**4. LLM API errors**
- Verify API keys in .env
- Check API key permissions
- Try switching provider (anthropic ↔ openai)

**5. Import errors in Python**
```bash
# Make sure you're in the right directory
cd /home/mdz-axolotl/ClaudeCode/congo-river-mcp
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src/services/python"
```

## Success Criteria

✅ **All services running independently**
- Triple decomposer extracts triples
- Proof searcher finds proofs
- Graph engine queries RDF
- Lambda abstractor converts code
- Neuro-symbolic engine synthesizes answers

✅ **MCP server starts and lists tools**
```bash
npm start
# Should see: "Congo River MCP Server listening on stdio..."
```

✅ **Database connection works**
```bash
npm start -- --setup
# Should see: "Database initialized successfully"
```

✅ **Claude Code integration**
- Server appears in MCP servers list
- Tools are callable from Claude
- Results are formatted correctly

## Next Steps After Testing

1. **Fix any integration bugs** found during testing
2. **Optimize performance** for large knowledge graphs
3. **Add caching** for repeated queries
4. **Implement Phase 2** features (Tree of Thoughts, Chain of Thought)
5. **Add comprehensive test suite** (unit + integration)

---

**Happy Testing! The Congo River awaits! 🌊**
