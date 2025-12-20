# Pebble Search - Ripple-Based Graph Exploration

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Added:** 2025-12-20

---

## What is Pebble Search?

Pebble Search is a graph exploration technique that uses the metaphor of dropping a pebble into water and watching the ripples spread outward. It finds the most **densely connected nodes** at a specific distance from a starting point, then enriches those discoveries with multi-modal web searches.

```
Starting Node: "Alan Turing"
        ↓
    Drop Pebble
        ↓
   ╱───────────╲
  ╱ Ripple 1    ╲  (1 hop)
 │  Computing    │
  ╲ Mathematics /
   ╲───────────╱
        ↓
   ╱───────────╲
  ╱ Ripple 2    ╲  (2 hops) ← Find densest nodes here
 │  AI, Crypto   │
 │  Cambridge U  │
  ╲ WWII Enigma /
   ╲───────────╱
        ↓
    Web Enrichment
    (Exa, WebSearch, GitHub)
```

**Key Insight:** Dense nodes are information-rich hubs that connect many concepts. They're where knowledge clusters form.

---

## Quick Start

### Basic Search

```typescript
// Drop a pebble on "Alan Turing" and explore 2 hops away
pebble_search({
  start: "Alan_Turing",
  hops: 2,
  top_n: 10
})
```

**Returns:** Top 10 most connected nodes that are exactly 2 hops from Alan Turing, with:
- Density score (number of connections)
- Path from start to each node
- Neighbors and relationships
- Web search recommendations

### With YAGO Entities

```typescript
// Search YAGO knowledge base
pebble_search({
  start: "Consciousness",
  hops: 3,
  top_n: 5,
  contexts: ["yago-facts", "yago-taxonomy"]
})
```

### Full-Featured Search

```typescript
pebble_search({
  start: "Neural Networks",
  hops: 2,
  top_n: 15,
  density_metric: "weighted",          // Use confidence scores
  enable_web_search: true,             // Prepare web search recommendations
  web_search_limit: 5,                 // Top 5 nodes to enrich
  include_neighbors: true,             // Show adjacent nodes
  include_path: true,                  // Show path from start
  contexts: ["yago-facts", "user"]     // Search specific contexts
})
```

---

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | string | **required** | Starting node URI or label (e.g., "Alan_Turing" or "yago:Alan_Turing") |
| `hops` | number | **required** | Number of hops away from start (1-10) |
| `top_n` | number | 10 | Return top N densest nodes (1-50) |
| `contexts` | string[] | all | Filter by context (e.g., ["yago-facts", "user"]) |
| `density_metric` | string | "degree" | "degree" (count) or "weighted" (confidence sum) |
| `enable_web_search` | boolean | true | Prepare web search recommendations |
| `web_search_limit` | number | 3 | Number of nodes to recommend for web enrichment |
| `include_neighbors` | boolean | true | Include neighbor information in results |
| `include_path` | boolean | true | Include path from start to each node |
| `auto_import_triples` | boolean | false | Automatically import discovered triples (future) |

---

## Understanding Results

### Dense Node Object

Each result includes:

```typescript
{
  uri: "yago:Artificial_Intelligence",
  label: "Artificial Intelligence",
  density: 47,              // 47 connections
  hop_distance: 2,          // 2 hops from start
  rank: 1,                  // Most dense node

  path: [                   // How we got here
    "yago:Alan_Turing",
    "yago:Computing",
    "yago:Artificial_Intelligence"
  ],

  neighbors: [              // Adjacent nodes
    {
      uri: "yago:Machine_Learning",
      predicate: "schema:subFieldOf",
      direction: "incoming",
      confidence: 0.95
    },
    // ... more neighbors
  ],

  web_research: {           // Search recommendations
    exa: {
      summary: "Recommended: Search academic/technical sources for \"Artificial Intelligence\"",
      url: "https://exa.ai/search?q=Artificial+Intelligence"
    },
    websearch: {
      summary: "Recommended: Broad web search for \"Artificial Intelligence\""
    },
    dynamic: {
      summary: "Recommended modality: Context7 (technical documentation)",
      snippets: ["Node type suggests Context7 search would be most effective"]
    },
    modality_used: "Context7 (technical documentation)"
  }
}
```

### Density Metrics

**Degree Density** (default):
```
density = count of edges connected to node
```
Simple and fast. Best for most use cases.

**Weighted Density**:
```
density = sum of confidence scores of all edges
```
Considers edge quality. Better for knowledge graphs with confidence scores.

---

## Use Cases

### 1. Knowledge Discovery

**Scenario:** Explore what concepts are closely related to "Consciousness"

```typescript
pebble_search({
  start: "Consciousness",
  hops: 2,
  top_n: 10,
  contexts: ["yago-facts"]
})
```

**Result:** Discover philosophy, neuroscience, AI clusters at 2 hops.

### 2. Research Exploration

**Scenario:** Find research areas connected to "Quantum Computing"

```typescript
pebble_search({
  start: "Quantum_Computing",
  hops: 3,
  top_n: 20,
  density_metric: "weighted",
  enable_web_search: true,
  web_search_limit: 10
})
```

**Workflow:**
1. Pebble search finds dense research areas (cryptography, algorithms, hardware)
2. Review web_research recommendations
3. Use Exa/WebSearch tools to enrich top 10 nodes
4. Import new knowledge back to graph

### 3. Person Network Analysis

**Scenario:** Find influential people/organizations 3 degrees from "Alan Turing"

```typescript
pebble_search({
  start: "Alan_Turing",
  hops: 3,
  top_n: 15,
  include_neighbors: true
})
```

**Result:** Cambridge, Bletchley Park, early computing pioneers emerge as hubs.

### 4. Concept Mapping

**Scenario:** Build a concept map around "Neural Networks"

```typescript
pebble_search({
  start: "Neural_Networks",
  hops: 2,
  top_n: 25,
  include_path: true,
  include_neighbors: true
})
```

**Result:** Paths show how concepts connect (Neural Networks → Deep Learning → Computer Vision).

---

## Web Search Enrichment Workflow

Pebble search prepares **search recommendations** for Claude to execute:

### Step 1: Run Pebble Search

```typescript
pebble_search({
  start: "Quantum_Computing",
  hops: 2,
  top_n: 5,
  enable_web_search: true,
  web_search_limit: 3
})
```

### Step 2: Review Recommendations

Results include web_research for top 3 nodes:
- Exa search query
- WebSearch query
- Recommended modality (Context7, GitHub, WebSearch)

### Step 3: Execute Searches (Manual)

Claude can now use external MCP tools:

```typescript
// For node: "Quantum_Algorithms"
exa_search({ query: "Quantum Algorithms" })
// Returns: Academic papers, documentation

websearch({ query: "Quantum Algorithms applications" })
// Returns: Broader context, implementations

github_search({ query: "quantum algorithm library:qiskit" })
// Returns: Code examples, repositories
```

### Step 4: Import Discoveries (Future)

```typescript
// Future: auto_import_triples flag will store discoveries
pebble_search({
  start: "Quantum_Computing",
  hops: 2,
  auto_import_triples: true  // Not yet implemented
})
```

---

## Search Modality Selection

Pebble search **intelligently recommends** which search tool to use:

| Node Type | Recommended Modality | Reason |
|-----------|---------------------|---------|
| Technical concepts (algorithms, theories) | **Context7** | Technical documentation |
| Code/libraries/frameworks | **GitHub Code Search** | Source code, examples |
| People/organizations/places | **WebSearch** | Encyclopedic information |
| Default | **Exa** | High-quality neural search |

**Example:**
- "Transformer_Architecture" → Context7 (technical docs)
- "PyTorch" → GitHub (code examples)
- "Geoffrey_Hinton" → WebSearch (biography)
- "Consciousness" → Exa (quality academic sources)

---

## Performance Characteristics

### Sample Dataset (YAGO sample, 20 triples)

```
Start: "Alan_Turing"
Hops: 2
Top N: 10

Execution time: ~50ms
Nodes explored: ~15
Dense nodes found: 5
```

### Full YAGO (10M triples)

```
Start: "Alan_Turing"
Hops: 3
Top N: 20

Execution time: ~500ms (estimated)
Nodes explored: ~500
Dense nodes found: 20
```

**Optimization Tips:**
- Lower `hops` for faster results (2-3 is usually sufficient)
- Use `contexts` filter to narrow search space
- Start with small `top_n`, increase if needed

---

## SQL Functions Used

Pebble search is powered by PostgreSQL recursive queries:

```sql
-- BFS graph traversal with cycle prevention
find_nodes_at_hop_distance(start_uri, hop_distance, contexts, max_nodes)

-- Density calculations
calculate_node_degree(node_uri, contexts)
calculate_weighted_node_degree(node_uri, contexts)

-- Main search
pebble_search_core(start_uri, hop_distance, top_n, contexts, density_metric)

-- Neighbor discovery
get_node_neighbors(node_uri, contexts, limit_count)

-- URI resolution
resolve_uri_by_label(label_text, contexts)
```

**See:** `src/db/migrations/003-pebble-search.sql` for implementation details.

---

## Advanced Features

### Context Filtering

Search only specific knowledge sources:

```typescript
// YAGO facts only
pebble_search({ start: "AI", hops: 2, contexts: ["yago-facts"] })

// User-generated knowledge only
pebble_search({ start: "MyProject", hops: 3, contexts: ["user"] })

// Multiple contexts
pebble_search({ start: "AI", hops: 2, contexts: ["yago-facts", "yago-taxonomy", "user"] })
```

### Label Resolution

Start with human-readable names:

```typescript
// These are equivalent:
pebble_search({ start: "Alan Turing", hops: 2 })
pebble_search({ start: "Alan_Turing", hops: 2 })
pebble_search({ start: "yago:Alan_Turing", hops: 2 })
```

The service automatically resolves labels to URIs.

### Tracking and Analytics

All searches are recorded:

```sql
-- View recent searches
SELECT * FROM recent_pebble_searches;

-- Search history
SELECT * FROM pebble_searches ORDER BY created_at DESC;

-- Discoveries (future feature)
SELECT * FROM pebble_discoveries WHERE pebble_search_id = '...';
```

---

## Troubleshooting

### "No nodes found at hop distance N"

**Problem:** Starting node has no connections at that distance.

**Solutions:**
- Verify start node exists: `SELECT * FROM triples WHERE subject LIKE '%YourNode%'`
- Try smaller hop distance: Start with `hops: 1`
- Check context filter: Remove `contexts` parameter
- Import more data if knowledge base is sparse

### "Database not initialized"

**Problem:** Congo River MCP not connected to database.

**Solution:**
1. Check `.env` has `CLOUD_DB_URL` or local DB config
2. Restart MCP server
3. Verify with `system_status` tool

### Slow performance

**Problem:** Search taking > 1 second.

**Solutions:**
- Reduce `hops` (try 2-3 instead of 4-5)
- Reduce `top_n` (try 10 instead of 50)
- Add `contexts` filter to narrow search
- Check database indexes: `EXPLAIN ANALYZE` on SQL queries

### Empty web_research fields

**Problem:** `enable_web_search: false` was set.

**Solution:** Set `enable_web_search: true` (default).

---

## Architecture

```
User Query: "Drop pebble on Alan Turing, explore 2 hops"
                    ↓
        [MCP Tool: pebble_search]
                    ↓
        [PebbleSearchService]
                    ↓
        ┌───────────┴───────────┐
        │                       │
   Resolve Start URI      Execute Core Search
   (label → URI)          (SQL recursive BFS)
        │                       │
        └───────────┬───────────┘
                    ↓
            Find Dense Nodes
            (calculate_node_degree)
                    ↓
        ┌───────────┴───────────┐
        │                       │
   Enrich Labels          Enrich Neighbors
   (human-readable)       (get_node_neighbors)
        │                       │
        └───────────┬───────────┘
                    ↓
        Prepare Web Search
        (determineSearchModality)
                    ↓
        Format & Return Results
                    ↓
            Claude receives:
            - Dense node list
            - Search recommendations
            - Paths and neighbors
```

---

## Future Enhancements

### Phase 2 Features (Planned)

- [ ] **Auto-import triples**: `auto_import_triples: true` stores web search discoveries
- [ ] **Range queries**: Find nodes at 2-4 hops (not just exact distance)
- [ ] **Temporal filtering**: Search by time periods
- [ ] **Clustering**: Group dense nodes by similarity
- [ ] **Visualization export**: Generate graph diagrams
- [ ] **Real-time web enrichment**: Direct API calls to Exa/WebSearch

---

## Examples

### Example 1: Explore Consciousness

```bash
# In Claude Code after loading Congo River MCP
pebble_search({
  start: "Consciousness",
  hops: 2,
  top_n: 10
})
```

**Result:**
```
🌊 Pebble Search Results
====================================

Starting Node: yago:Consciousness
Hop Distance: 2
Dense Nodes Found: 10
Execution Time: 45ms

Top Dense Nodes:
──────────────────────────────────

1. Philosophy (yago:Philosophy)
   URI: yago:Philosophy
   Density: 38 connections
   Distance: 2 hops
   Path: Consciousness → Mind → Philosophy

   Top Neighbors (5):
     - Epistemology (schema:subFieldOf, incoming)
     - Ethics (schema:subFieldOf, incoming)
     - Metaphysics (schema:subFieldOf, incoming)

   Web Research:
     Exa: Recommended search for "Philosophy"
     Dynamic: Context7 (technical documentation)

2. Neuroscience (yago:Neuroscience)
   Density: 31 connections
   ...
```

---

## Resources

- **Implementation**: `src/tools/core/pebble-search.ts`
- **SQL Functions**: `src/db/migrations/003-pebble-search.sql`
- **Database Schema**: See tracking tables `pebble_searches`, `pebble_discoveries`
- **Tool Handler**: `src/server.ts` line 889-911

---

**🌊 Drop a pebble, watch the ripples, discover knowledge density hotspots.**
