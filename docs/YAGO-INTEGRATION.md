# YAGO Knowledge Base Integration

**Status:** ✅ Implemented (Phase 1)
**Version:** YAGO 4.5 Core Subset

This document describes how YAGO (Yet Another Great Ontology) is integrated into Congo River as the base/default ontology for the neuro-symbolic reasoning system.

---

## Overview

YAGO 4.5 provides **50+ million entities** and **2+ billion facts** from Wikidata, with 95% accuracy. Congo River uses YAGO as the foundational world knowledge layer, enabling:

- **Grounded reasoning**: LLM queries backed by factual knowledge
- **Compositional intelligence**: User concepts compose with world knowledge
- **Proof traces**: Reasoning chains traceable to YAGO facts
- **Neuro-symbolic queries**: Hybrid LLM + knowledge graph operations

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Congo River MCP Server                          │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  Neuro-Symbolic Query Tool              │   │
│  │  (Combines LLM + Knowledge Graph)       │   │
│  └──────────────┬──────────────────────────┘   │
│                 │                               │
│  ┌──────────────▼──────────────┐               │
│  │   Knowledge Graph (triples)  │               │
│  │                               │               │
│  │  ┌─────────────────────────┐ │               │
│  │  │ User-Generated Triples  │ │               │
│  │  │ context: 'user'         │ │               │
│  │  └─────────────────────────┘ │               │
│  │                               │               │
│  │  ┌─────────────────────────┐ │               │
│  │  │ YAGO Base Ontology      │ │               │
│  │  │ context: 'yago-*'       │ │               │
│  │  │ - yago-schema           │ │               │
│  │  │ - yago-taxonomy         │ │               │
│  │  │ - yago-facts            │ │               │
│  │  └─────────────────────────┘ │               │
│  └──────────────────────────────┘               │
└─────────────────────────────────────────────────┘
                  │
    ┌─────────────▼─────────────┐
    │ PostgreSQL + pgvector      │
    │ - triples table            │
    │ - yago_imports tracking    │
    │ - yago_entity_map          │
    └────────────────────────────┘
```

---

## Quick Start

### 1. Download YAGO 4.5 Core Files

```bash
cd /home/mdz-axolotl/ClaudeCode/congo-river-mcp

# Download YAGO 4.5 core subset (schema, taxonomy, facts)
npm run yago:download
```

**Downloads:**
- `yago-schema.ttl` - Property definitions and constraints
- `yago-taxonomy.ttl` - Class hierarchy (schema.org)
- `yago-facts.ttl` - Entities with English Wikipedia pages

**Note:** Files are downloaded to `data/yago/` directory.

### 2. Import into Database

```bash
# Import all files (schema, taxonomy, facts)
npm run yago:import

# Or import specific subset
npm run yago:import -- --subset taxonomy

# Or test without importing (dry run)
npm run yago:import:dry-run
```

### 3. One-Command Setup

```bash
# Download + Import in one command
npm run yago:setup
```

---

## Database Schema

### Core Tables

**`triples`** - Main RDF storage (existing)
```sql
CREATE TABLE triples (
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    context TEXT,           -- 'yago-schema', 'yago-taxonomy', 'yago-facts'
    source TEXT,            -- 'yago'
    confidence FLOAT,       -- YAGO confidence scores
    created_at TIMESTAMP,
    metadata JSONB
);
```

**`yago_imports`** - Import tracking
```sql
CREATE TABLE yago_imports (
    id UUID PRIMARY KEY,
    version TEXT,            -- '4.5'
    subset TEXT,             -- 'taxonomy', 'schema', 'facts'
    file_name TEXT,
    context TEXT,            -- Context used in triples table
    triple_count INTEGER,
    import_duration_ms INTEGER,
    success BOOLEAN,
    created_at TIMESTAMP
);
```

**`yago_entity_map`** - Entity metadata
```sql
CREATE TABLE yago_entity_map (
    id UUID PRIMARY KEY,
    yago_uri TEXT UNIQUE,
    yago_label TEXT,
    entity_type TEXT,
    wikipedia_title TEXT,
    concept_node_id UUID
);
```

### Utility Functions

```sql
-- Get import summary
SELECT * FROM get_yago_summary();

-- Find entities by label
SELECT * FROM find_yago_entities('consciousness', 10);

-- View YAGO statistics
SELECT * FROM yago_stats;

-- Query YAGO triples only
SELECT * FROM yago_triples WHERE subject LIKE '%Entity%';
```

---

## Usage Examples

### From Congo River MCP Tools

Once YAGO is imported, it's automatically available to all reasoning tools:

#### 1. **Triple Decomposition** (adds to YAGO knowledge)
```typescript
triple_decomposition({
  concept: "Consciousness relates to neural activity",
  store_in_db: true,
  context: "user"  // Separate from YAGO facts
})
```

#### 2. **Graph Query** (queries YAGO + user knowledge)
```typescript
graph_query({
  query: "Find all properties of consciousness",
  contexts: ["yago-facts", "user"]  // Query both contexts
})
```

#### 3. **Neuro-Symbolic Query** ⭐ (the showcase)
```typescript
neuro_symbolic_query({
  query: "How does consciousness relate to brain structures in neuroscience?",
  include_proof: true
})
// This queries YAGO for neuroscience facts + uses LLM reasoning
// Returns answer WITH proof trace showing YAGO sources
```

#### 4. **Proof Search** (uses YAGO as premises)
```typescript
proof_search({
  goal: "Consciousness involves the brain",
  premises: ["auto"],  // Automatically pulls from YAGO
  method: "forward_chaining"
})
```

### From SQL/Database

```sql
-- Count YAGO triples by context
SELECT context, COUNT(*) as count
FROM triples
WHERE source = 'yago'
GROUP BY context;

-- Find specific entities
SELECT subject, predicate, object
FROM triples
WHERE context = 'yago-facts'
  AND subject LIKE '%http://yago-knowledge.org/resource/Consciousness%'
LIMIT 10;

-- Get YAGO import history
SELECT
    subset,
    triple_count,
    import_duration_ms / 1000.0 as duration_seconds,
    success,
    import_end_time
FROM yago_imports
ORDER BY import_end_time DESC;
```

---

## Context Separation Strategy

Congo River uses **context fields** to separate knowledge sources:

| Context | Purpose | Source | Mutable |
|---------|---------|--------|---------|
| `yago-schema` | Property definitions, constraints | YAGO 4.5 | No |
| `yago-taxonomy` | Class hierarchy (schema.org) | YAGO 4.5 | No |
| `yago-facts` | World knowledge (entities, facts) | YAGO 4.5 | No |
| `user` | User-generated concepts/triples | `triple_decomposition` tool | Yes |
| `derived` | Inferred knowledge from reasoning | `proof_search` tool | Yes |

**Why separate?**
- Query specific knowledge sources
- Prevent pollution of YAGO base knowledge
- Track provenance of facts
- Enable selective updates

---

## Import Options

### Command-Line Options

```bash
# Import specific subset
npm run yago:import -- --subset taxonomy
npm run yago:import -- --subset schema
npm run yago:import -- --subset facts
npm run yago:import -- --subset all

# Import specific file
npm run yago:import -- --file yago-taxonomy.ttl

# Dry run (parse but don't insert)
npm run yago:import:dry-run

# With verbose output
npm run yago:import -- --verbose
```

### Programmatic Import

```typescript
import { YAGOImporter } from './scripts/import-yago.js';

const importer = new YAGOImporter();
await importer.import({
  subset: 'taxonomy',
  dryRun: false,
  verbose: true
});
```

---

## Performance Considerations

### Import Performance

- **Batch size**: 1000 triples per insert
- **Parallel inserts**: Up to 10 concurrent connections
- **Expected time**:
  - Taxonomy: ~30 seconds
  - Schema: ~1 minute
  - Facts: Varies by size (can be hours for full dataset)

### Query Performance

YAGO integration includes optimized indexes:

```sql
-- Fast lookups on subject/predicate/object
CREATE INDEX idx_triples_spo ON triples(subject, predicate, object);

-- Fast context filtering
CREATE INDEX idx_triples_context ON triples(context);

-- Fast source filtering
CREATE INDEX idx_triples_source ON triples(source);
```

**Query Tips:**
- Always filter by `context` when possible
- Use `LIMIT` for large result sets
- Consider `yago_triples` view for YAGO-only queries

---

## Troubleshooting

### Download Issues

```bash
# Manual download if script fails
cd data/yago
curl -L -O https://yago-knowledge.org/data/yago4.5/yago-schema.ttl
curl -L -O https://yago-knowledge.org/data/yago4.5/yago-taxonomy.ttl
curl -L -O https://yago-knowledge.org/data/yago4.5/yago-facts.ttl
```

### Import Errors

**"Database connection failed"**
- Check `.env` has `CLOUD_DB_URL` or `DATABASE_URL`
- Verify database is accessible

**"Migration errors"**
- Migrations may already be applied (safe to ignore warnings)
- Check `schema_version` table: `SELECT * FROM schema_version;`

**"Out of memory"**
- Import subsets separately instead of `--subset all`
- Reduce `BATCH_SIZE` in `import-yago.ts`

### Verification

```bash
# Check import status
psql $CLOUD_DB_URL -c "SELECT * FROM yago_imports;"

# Count triples by context
psql $CLOUD_DB_URL -c "
SELECT context, COUNT(*) as count
FROM triples
WHERE source = 'yago'
GROUP BY context;"

# Get summary
psql $CLOUD_DB_URL -c "SELECT * FROM get_yago_summary();"
```

---

## Future Enhancements

### Phase 2: Extended YAGO Integration
- [ ] **Full YAGO 4.5 dataset** (beyond English Wikipedia)
- [ ] **YAGO 4** (2B triples from full Wikidata)
- [ ] **Temporal facts** (time-stamped knowledge)
- [ ] **Entity embeddings** (pgvector integration)
- [ ] **Incremental updates** (track YAGO changes)

### Phase 3: Advanced Features
- [ ] **YAGO entity search** (full-text search on labels)
- [ ] **SPARQL endpoint** (standard RDF query interface)
- [ ] **Entity linking** (map user concepts to YAGO entities)
- [ ] **Confidence propagation** (track certainty through reasoning)

---

## Related Documentation

- **YAGO Official Site**: https://yago-knowledge.org
- **YAGO 4.5 Downloads**: https://yago-knowledge.org/downloads/yago-4-5
- **Schema.org**: https://schema.org (YAGO's property vocabulary)
- **Congo River README**: `README.md`
- **Database Schema**: `src/db/schema.sql`
- **Migration**: `src/db/migrations/002-yago-integration.sql`

---

## Support

For issues or questions:
1. Check import logs: `SELECT * FROM yago_imports WHERE success = false;`
2. Review YAGO stats: `SELECT * FROM yago_stats;`
3. Test with dry run: `npm run yago:import:dry-run`
4. Open issue on GitHub (if applicable)

---

**🌊 YAGO gives Congo River its massive tributaries - world knowledge flowing into compositional intelligence.**
