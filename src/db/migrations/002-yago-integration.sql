-- YAGO Integration Schema Extension
-- Adds tracking and management for YAGO knowledge base imports

-- ============================================================================
-- YAGO Import Tracking
-- ============================================================================

-- Track YAGO dataset imports
CREATE TABLE IF NOT EXISTS yago_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version TEXT NOT NULL,           -- '4.5', '4', '3'
    subset TEXT NOT NULL,            -- 'taxonomy', 'facts', 'schema', 'full'
    file_name TEXT NOT NULL,         -- Original filename imported
    context TEXT NOT NULL,           -- Context used in triples table
    triple_count INTEGER DEFAULT 0,
    import_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    import_end_time TIMESTAMP,
    import_duration_ms INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    metadata JSONB,                  -- Additional import metadata
    UNIQUE(version, subset, file_name)
);

-- Indexes for YAGO import queries
CREATE INDEX IF NOT EXISTS idx_yago_imports_version ON yago_imports(version);
CREATE INDEX IF NOT EXISTS idx_yago_imports_subset ON yago_imports(subset);
CREATE INDEX IF NOT EXISTS idx_yago_imports_context ON yago_imports(context);
CREATE INDEX IF NOT EXISTS idx_yago_imports_success ON yago_imports(success);

-- ============================================================================
-- YAGO Entity Mapping
-- ============================================================================

-- Map YAGO entities to our internal concept nodes
CREATE TABLE IF NOT EXISTS yago_entity_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yago_uri TEXT UNIQUE NOT NULL,      -- Full YAGO entity URI
    yago_label TEXT,                     -- Human-readable label
    concept_node_id UUID REFERENCES concept_nodes(id) ON DELETE CASCADE,
    entity_type TEXT,                    -- Class/type from YAGO taxonomy
    wikipedia_title TEXT,                -- English Wikipedia page title (if available)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB                       -- Additional YAGO properties
);

-- Indexes for entity mapping queries
CREATE INDEX IF NOT EXISTS idx_yago_entity_uri ON yago_entity_map(yago_uri);
CREATE INDEX IF NOT EXISTS idx_yago_entity_label ON yago_entity_map(yago_label);
CREATE INDEX IF NOT EXISTS idx_yago_entity_type ON yago_entity_map(entity_type);
CREATE INDEX IF NOT EXISTS idx_yago_entity_wikipedia ON yago_entity_map(wikipedia_title);
CREATE INDEX IF NOT EXISTS idx_yago_entity_concept ON yago_entity_map(concept_node_id);

-- ============================================================================
-- YAGO Statistics View
-- ============================================================================

-- View for YAGO import statistics
CREATE OR REPLACE VIEW yago_stats AS
SELECT
    yi.version,
    yi.subset,
    COUNT(*) as import_count,
    SUM(yi.triple_count) as total_triples,
    AVG(yi.import_duration_ms) as avg_import_duration_ms,
    MAX(yi.import_end_time) as last_import_time,
    SUM(CASE WHEN yi.success = true THEN 1 ELSE 0 END) as successful_imports,
    SUM(CASE WHEN yi.success = false THEN 1 ELSE 0 END) as failed_imports
FROM yago_imports yi
GROUP BY yi.version, yi.subset;

-- ============================================================================
-- YAGO Triple Context View
-- ============================================================================

-- View for querying triples by YAGO context
CREATE OR REPLACE VIEW yago_triples AS
SELECT
    t.id,
    t.subject,
    t.predicate,
    t.object,
    t.context,
    t.confidence,
    t.created_at,
    yi.version as yago_version,
    yi.subset as yago_subset
FROM triples t
LEFT JOIN yago_imports yi ON t.context = yi.context
WHERE t.context LIKE 'yago%'
ORDER BY t.created_at DESC;

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function to get YAGO import summary
CREATE OR REPLACE FUNCTION get_yago_summary()
RETURNS TABLE (
    total_imports INTEGER,
    total_triples BIGINT,
    versions TEXT[],
    contexts TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT yi.id)::INTEGER as total_imports,
        SUM(yi.triple_count)::BIGINT as total_triples,
        ARRAY_AGG(DISTINCT yi.version) as versions,
        ARRAY_AGG(DISTINCT yi.context) as contexts
    FROM yago_imports yi
    WHERE yi.success = true;
END;
$$ LANGUAGE plpgsql;

-- Function to find entities by label
CREATE OR REPLACE FUNCTION find_yago_entities(
    search_label TEXT,
    limit_count INT DEFAULT 10
)
RETURNS TABLE (
    yago_uri TEXT,
    label TEXT,
    entity_type TEXT,
    wikipedia_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        yem.yago_uri,
        yem.yago_label as label,
        yem.entity_type,
        yem.wikipedia_title
    FROM yago_entity_map yem
    WHERE yem.yago_label ILIKE '%' || search_label || '%'
    ORDER BY yem.yago_label
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update Schema Version
-- ============================================================================

INSERT INTO schema_version (version, description)
VALUES (2, 'YAGO integration - import tracking, entity mapping, and statistics')
ON CONFLICT DO NOTHING;
