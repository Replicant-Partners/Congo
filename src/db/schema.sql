-- Congo River Compositional Intelligence Database Schema
-- PostgreSQL with pgvector extension for vector embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ============================================================================
-- Knowledge Graph Storage
-- ============================================================================

-- RDF-style triples for semantic knowledge representation
CREATE TABLE IF NOT EXISTS triples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    context TEXT,              -- Named graph for organizing knowledge
    source TEXT,               -- Which service/tool created this triple
    confidence FLOAT DEFAULT 1.0,  -- Confidence score (0.0 - 1.0)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB             -- Additional properties
);

-- Indexes for efficient triple queries
CREATE INDEX IF NOT EXISTS idx_triples_subject ON triples(subject);
CREATE INDEX IF NOT EXISTS idx_triples_predicate ON triples(predicate);
CREATE INDEX IF NOT EXISTS idx_triples_object ON triples(object);
CREATE INDEX IF NOT EXISTS idx_triples_context ON triples(context);
CREATE INDEX IF NOT EXISTS idx_triples_source ON triples(source);
CREATE INDEX IF NOT EXISTS idx_triples_spo ON triples(subject, predicate, object);

-- ============================================================================
-- Proof Search and Reasoning
-- ============================================================================

-- Store proof trees and inference traces
CREATE TABLE IF NOT EXISTS proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal TEXT NOT NULL,
    premises JSONB,            -- Array of premise statements
    proof_tree JSONB NOT NULL, -- Complete proof structure
    proof_method TEXT,         -- forward_chaining, backward_chaining, resolution, etc.
    success BOOLEAN NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Indexes for proof queries
CREATE INDEX IF NOT EXISTS idx_proofs_goal ON proofs(goal);
CREATE INDEX IF NOT EXISTS idx_proofs_success ON proofs(success);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON proofs(created_at DESC);

-- ============================================================================
-- Reasoning History and Analytics
-- ============================================================================

-- Track all tool invocations and their results
CREATE TABLE IF NOT EXISTS reasoning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_name TEXT NOT NULL,
    input JSONB NOT NULL,
    output JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    language_used TEXT,        -- Which programming language service was used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_context TEXT,         -- Optional user/session identifier
    metadata JSONB
);

-- Indexes for reasoning history
CREATE INDEX IF NOT EXISTS idx_reasoning_tool ON reasoning_sessions(tool_name);
CREATE INDEX IF NOT EXISTS idx_reasoning_success ON reasoning_sessions(success);
CREATE INDEX IF NOT EXISTS idx_reasoning_created_at ON reasoning_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_user_context ON reasoning_sessions(user_context);

-- ============================================================================
-- Vector Embeddings for Neuro-Symbolic Integration
-- ============================================================================

-- Store semantic embeddings for hybrid reasoning
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    embedding vector(384),     -- sentence-transformers default dimension
    embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
    content_type TEXT,         -- concept, statement, code, etc.
    related_triple_id UUID REFERENCES triples(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embeddings_content_type ON embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_related_triple ON embeddings(related_triple_id);

-- ============================================================================
-- Compositional Patterns and Meta-Learning
-- ============================================================================

-- Learn and store successful decomposition patterns
CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type TEXT NOT NULL,  -- decomposition, proof, abstraction, loop_discovery
    pattern_data JSONB NOT NULL,
    success_rate FLOAT DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Indexes for pattern queries
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_success_rate ON patterns(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_usage_count ON patterns(usage_count DESC);

-- ============================================================================
-- Lambda Abstractions
-- ============================================================================

-- Store lambda calculus representations
CREATE TABLE IF NOT EXISTS lambda_abstractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_text TEXT NOT NULL,
    lambda_expression TEXT NOT NULL,
    expression_type TEXT,      -- function, composition, application, etc.
    type_signature TEXT,       -- Type in Hindley-Milner notation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_lambda_original ON lambda_abstractions(original_text);
CREATE INDEX IF NOT EXISTS idx_lambda_type ON lambda_abstractions(expression_type);

-- ============================================================================
-- Concept Graph (Meta-Level Knowledge)
-- ============================================================================

-- Track conceptual relationships discovered through loop discovery
CREATE TABLE IF NOT EXISTS concept_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept TEXT UNIQUE NOT NULL,
    concept_type TEXT,         -- domain, method, principle, etc.
    description TEXT,
    related_triples JSONB,     -- Array of triple IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS concept_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_concept_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    target_concept_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,  -- analogous_to, implements, specializes, etc.
    strength FLOAT DEFAULT 1.0,       -- Strength of connection (0.0 - 1.0)
    evidence JSONB,                   -- Supporting evidence for this connection
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_concept_id, target_concept_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_concept_edges_source ON concept_edges(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_target ON concept_edges(target_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_type ON concept_edges(relationship_type);

-- ============================================================================
-- Database Metadata and Versioning
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert initial version
INSERT INTO schema_version (version, description)
VALUES (1, 'Initial Congo River schema with triples, proofs, embeddings, and patterns')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for triples table
CREATE TRIGGER update_triples_updated_at BEFORE UPDATE ON triples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for similarity search helper
CREATE OR REPLACE FUNCTION find_similar_embeddings(
    query_embedding vector(384),
    similarity_threshold float DEFAULT 0.7,
    max_results int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.content,
        1 - (e.embedding <=> query_embedding) as similarity,
        e.metadata
    FROM embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View for recent reasoning activity
CREATE OR REPLACE VIEW recent_reasoning AS
SELECT
    rs.id,
    rs.tool_name,
    rs.success,
    rs.duration_ms,
    rs.created_at,
    rs.error_message
FROM reasoning_sessions rs
ORDER BY rs.created_at DESC
LIMIT 100;

-- View for successful proof patterns
CREATE OR REPLACE VIEW successful_proofs AS
SELECT
    p.id,
    p.goal,
    p.proof_method,
    p.duration_ms,
    p.created_at
FROM proofs p
WHERE p.success = true
ORDER BY p.created_at DESC;

-- View for knowledge graph statistics
CREATE OR REPLACE VIEW knowledge_stats AS
SELECT
    COUNT(*) as total_triples,
    COUNT(DISTINCT subject) as unique_subjects,
    COUNT(DISTINCT predicate) as unique_predicates,
    COUNT(DISTINCT object) as unique_objects,
    COUNT(DISTINCT context) as unique_contexts
FROM triples;
