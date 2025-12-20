# Congo River MCP Server - Quick Reference Guide

## 🚀 Getting Started

After restarting Claude Code, the Congo River server should be available. Test it with:

```javascript
system_status({ detailed: true })
```

## 📚 Tool Reference

### 1. System Status

**Purpose:** Check server health, database connectivity, and tool availability

```javascript
// Basic status
system_status()

// Detailed status with environment info
system_status({ detailed: true })
```

**Returns:**
- Server version and transport mode
- Database connection status
- Knowledge base statistics (triples, proofs, embeddings)
- Available tools count
- API configuration

---

### 2. Triple Decomposition

**Purpose:** Break down complex concepts into RDF subject-predicate-object triples for semantic analysis

```javascript
// Basic decomposition
triple_decomposition({
  concept: "Consciousness is awareness of internal and external stimuli"
})

// With context and database storage
triple_decomposition({
  concept: "Intelligence emerges from the composition of simple operations",
  context: "AI_theory",
  store_in_db: true
})
```

**Returns:**
- Extracted RDF triples with confidence scores
- Subject → Predicate → Object relationships
- Optional database storage confirmation

**Use Cases:**
- Semantic analysis of philosophical concepts
- Breaking down complex definitions
- Building knowledge graphs from text

---

### 3. Lambda Abstraction

**Purpose:** Convert code or processes into lambda calculus representations

```javascript
// From code
lambda_abstraction({
  input: "(x) => x * 2"
})

// From natural language
lambda_abstraction({
  input: "map each item to its double"
})

// With type signatures and simplification
lambda_abstraction({
  input: "(x) => (y) => x + y",
  include_types: true,
  simplify: true
})
```

**Returns:**
- Lambda notation (λx. body)
- Curried form
- Beta-reduced form (if simplified)
- Type signature (Hindley-Milner)
- Complexity metrics
- Free variables analysis

**Use Cases:**
- Understanding functional composition
- Code abstraction analysis
- Type inference
- Mathematical function representation

---

### 4. Proof Search

**Purpose:** Search for logical proofs given goals and premises

```javascript
// Classic Socrates example
proof_search({
  goal: "Socrates is mortal",
  premises: [
    "Socrates is human",
    "All humans are mortal"
  ]
})

// With specific strategy
proof_search({
  goal: "P implies Q",
  premises: ["P", "P implies Q"],
  method: "backward_chaining",
  max_depth: 5
})
```

**Methods:**
- `forward_chaining` - Start from premises, work toward goal
- `backward_chaining` - Start from goal, work back to premises
- `resolution` - Resolution-based theorem proving
- `auto` - Automatically select best strategy

**Returns:**
- Proof success/failure
- Proof steps with rules applied
- Curry-Howard proof tree
- Strategy used

**Use Cases:**
- Logical theorem proving
- Validating arguments
- Automated reasoning
- Checking logical consistency

---

### 5. Graph Query

**Purpose:** Query the knowledge graph for relationships and patterns

```javascript
// Natural language query
graph_query({
  query: "Find all properties of consciousness"
})

// With context filtering
graph_query({
  query: "intelligence",
  context: "AI_theory",
  limit: 50
})

// Pattern matching
graph_query({
  query: "What relates to compositionality?"
})
```

**Returns:**
- Matching triples from knowledge graph
- Subject-predicate-object relationships
- Context information
- Query type used

**Use Cases:**
- Exploring stored knowledge
- Finding semantic relationships
- Pattern discovery
- Knowledge retrieval

---

### 6. Neuro-Symbolic Query ⭐ (Showcase Feature)

**Purpose:** Hybrid reasoning combining LLM understanding with knowledge graph queries

```javascript
// Basic query
neuro_symbolic_query({
  query: "What is the relationship between consciousness and awareness?"
})

// With proof traces
neuro_symbolic_query({
  query: "How does composition lead to intelligence?",
  include_proof: true,
  llm_provider: "anthropic"
})

// Disable LLM (pure symbolic)
neuro_symbolic_query({
  query: "consciousness",
  use_llm: false
})
```

**Parameters:**
- `use_llm`: Use LLM for parsing (default: true)
- `llm_provider`: "anthropic" or "openai"
- `include_proof`: Show reasoning trace

**Returns:**
- Natural language answer
- Confidence score
- Logical form of query
- Knowledge graph evidence
- Proof trace (if requested)
- Reasoning steps

**Use Cases:**
- Complex reasoning questions
- Combining neural and symbolic AI
- Grounded question answering
- Research and exploration

---

### 7. Recommend Language

**Purpose:** Get optimal programming language recommendations for specific tasks

```javascript
// Using task profiles
recommend_language({
  task_profile: "neuroSymbolic"
})

// Custom requirements
recommend_language({
  requirements: {
    needsLogic: true,
    needsGraphOps: true,
    needsMLLibraries: true,
    needsTypeSystem: false
  },
  show_all: true
})

// Compare all languages
recommend_language({
  task_profile: "graphQuery",
  show_all: true
})
```

**Task Profiles:**
- `tripleDecomposition` - Semantic analysis
- `proofSearch` - Theorem proving
- `graphQuery` - Graph operations
- `lambdaAbstraction` - Functional programming
- `neuroSymbolic` - AI/ML hybrid systems

**Returns:**
- Recommended language with score
- Reasoning breakdown (ecosystem, performance, typing, etc.)
- Strengths and weaknesses
- Alternative options (if show_all: true)

**Use Cases:**
- Choosing implementation language
- Understanding language trade-offs
- System architecture decisions

---

### 8. Configure Database

**Purpose:** Manage database configuration and view statistics

```javascript
// Check status
configure_database({
  action: "status"
})

// Health check
configure_database({
  action: "health"
})

// View statistics
configure_database({
  action: "stats"
})

// Run migrations
configure_database({
  action: "migrate"
})
```

**Actions:**
- `status` - Connection and statistics
- `health` - Health check only
- `stats` - Detailed statistics
- `migrate` - Run database migrations

**Returns:**
- Database connection status
- Knowledge base metrics
- Table counts and sizes

---

### 9. Export Knowledge

**Purpose:** Export knowledge graph to different formats

```javascript
// Export to RDF
export_knowledge({
  format: "rdf"
})

// Export to JSON file
export_knowledge({
  format: "json",
  output_path: "/path/to/backup.json"
})
```

**Formats:**
- `rdf` - RDF Turtle format (returns as string)
- `json` - JSON backup (requires output_path)

**Use Cases:**
- Backup knowledge base
- Share knowledge graphs
- Migrate data
- External processing

---

### 10. Import Knowledge

**Purpose:** Import triples into the knowledge graph

```javascript
// Import single triple
import_knowledge({
  triples: [
    {
      subject: "AI",
      predicate: "is_a",
      object: "technology"
    }
  ]
})

// Import multiple triples with context
import_knowledge({
  triples: [
    {
      subject: "consciousness",
      predicate: "has_property",
      object: "awareness",
      context: "philosophy"
    },
    {
      subject: "awareness",
      predicate: "enables",
      object: "experience",
      context: "philosophy"
    }
  ]
})
```

**Returns:**
- Number of triples imported
- Confirmation message

**Use Cases:**
- Seeding knowledge base
- Importing external data
- Building custom ontologies
- Restoring from backup

---

## 🔄 Workflow Examples

### Example 1: Building a Knowledge Graph

```javascript
// 1. Decompose concepts into triples
triple_decomposition({
  concept: "Artificial Intelligence is the simulation of human intelligence",
  store_in_db: true
})

// 2. Query what was stored
graph_query({
  query: "Find relationships about artificial intelligence"
})

// 3. Ask complex questions
neuro_symbolic_query({
  query: "What is the relationship between AI and human intelligence?",
  include_proof: true
})
```

### Example 2: Analyzing Code Structure

```javascript
// 1. Abstract code to lambda calculus
lambda_abstraction({
  input: "(users) => users.filter(u => u.active).map(u => u.name)"
})

// 2. Get language recommendation
recommend_language({
  task_profile: "lambdaAbstraction"
})

// 3. Understand composition
neuro_symbolic_query({
  query: "How does function composition relate to modularity?"
})
```

### Example 3: Logical Reasoning

```javascript
// 1. Search for proof
proof_search({
  goal: "All software engineers are problem solvers",
  premises: [
    "Alice is a software engineer",
    "All software engineers solve problems",
    "Problem solvers are creative thinkers"
  ]
})

// 2. Store result as triples
triple_decomposition({
  concept: "Alice is a creative problem solver",
  store_in_db: true
})

// 3. Query the reasoning
graph_query({
  query: "Alice"
})
```

---

## 🎯 Best Practices

1. **Start with system_status()** to verify the server is running
2. **Store important concepts** using `store_in_db: true`
3. **Use contexts** to organize knowledge by domain
4. **Include proofs** for complex reasoning to see the logic
5. **Export regularly** to backup your knowledge base
6. **Combine tools** for powerful workflows (decompose → store → query)

---

## 🐛 Troubleshooting

### "Tool not found"
- Restart Claude Code to reload MCP servers
- Check `.mcp.json` configuration

### "Python service timeout"
- Increase `PYTHON_SERVICE_TIMEOUT_MS` in `.env`
- Check Python installation and dependencies

### "Database connection failed"
- Verify Supabase URL in `.env`
- Check network connectivity
- Run `configure_database({ action: "health" })`

### "spaCy model not found"
- Python 3.14 compatibility issue (known limitation)
- triple_decomposition may have limited functionality

---

## 📖 More Information

- **Installation Guide:** `INSTALLATION.md`
- **Full Documentation:** `README.md`
- **Architecture:** See README for polyglot architecture details
- **GitHub:** https://github.com/Replicant-Partners/Congo

---

**🌊 The Congo River flows with unstoppable force from thousands of tributaries composing into one.**

*Compositional Intelligence in Action!*
