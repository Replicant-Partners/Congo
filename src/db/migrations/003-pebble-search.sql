-- Pebble Search: Graph Traversal and Density Analysis
-- Enables ripple-based exploration with density hotspot detection

-- ============================================================================
-- Graph Traversal: BFS from Starting Node
-- ============================================================================

-- Find all nodes exactly N hops away from a starting node
CREATE OR REPLACE FUNCTION find_nodes_at_hop_distance(
    start_uri TEXT,
    hop_distance INT,
    contexts TEXT[] DEFAULT NULL,  -- Filter by context (NULL = all contexts)
    max_nodes INT DEFAULT 1000     -- Safety limit
)
RETURNS TABLE (
    uri TEXT,
    hop INT,
    path TEXT[]
) AS $$
WITH RECURSIVE graph_traversal AS (
    -- Base case: Starting node at hop 0
    SELECT
        start_uri as uri,
        0 as hop,
        ARRAY[start_uri] as path

    UNION ALL

    -- Recursive case: Explore neighbors
    SELECT DISTINCT
        CASE
            -- Follow edges in both directions (undirected graph)
            WHEN gt.uri = t.subject THEN t.object
            WHEN gt.uri = t.object THEN t.subject
        END as uri,
        gt.hop + 1 as hop,
        gt.path || CASE
            WHEN gt.uri = t.subject THEN t.object
            WHEN gt.uri = t.object THEN t.subject
        END as path
    FROM graph_traversal gt
    JOIN triples t ON (gt.uri = t.subject OR gt.uri = t.object)
    WHERE
        gt.hop < hop_distance
        AND (contexts IS NULL OR t.context = ANY(contexts))
        -- Prevent cycles
        AND NOT (CASE
            WHEN gt.uri = t.subject THEN t.object
            WHEN gt.uri = t.object THEN t.subject
        END = ANY(gt.path))
)
SELECT DISTINCT uri, hop, path
FROM graph_traversal
WHERE hop = hop_distance
LIMIT max_nodes;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Density Calculation: Node Degree
-- ============================================================================

-- Calculate node degree (number of connections)
CREATE OR REPLACE FUNCTION calculate_node_degree(
    node_uri TEXT,
    contexts TEXT[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    degree_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT t.id) INTO degree_count
    FROM triples t
    WHERE
        (t.subject = node_uri OR t.object = node_uri)
        AND (contexts IS NULL OR t.context = ANY(contexts));

    RETURN degree_count;
END;
$$ LANGUAGE plpgsql;

-- Calculate weighted node degree (sum of confidence scores)
CREATE OR REPLACE FUNCTION calculate_weighted_node_degree(
    node_uri TEXT,
    contexts TEXT[] DEFAULT NULL
)
RETURNS FLOAT AS $$
DECLARE
    weighted_degree FLOAT;
BEGIN
    SELECT COALESCE(SUM(t.confidence), 0) INTO weighted_degree
    FROM triples t
    WHERE
        (t.subject = node_uri OR t.object = node_uri)
        AND (contexts IS NULL OR t.context = ANY(contexts));

    RETURN weighted_degree;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Pebble Search: Main Function
-- ============================================================================

-- Complete pebble search: traverse + analyze density + return top N
CREATE OR REPLACE FUNCTION pebble_search_core(
    start_uri TEXT,
    hop_distance INT,
    top_n INT DEFAULT 10,
    contexts TEXT[] DEFAULT NULL,
    density_metric TEXT DEFAULT 'degree'  -- 'degree' or 'weighted'
)
RETURNS TABLE (
    uri TEXT,
    density FLOAT,
    hop_distance INT,
    path TEXT[],
    rank INT
) AS $$
BEGIN
    RETURN QUERY
    WITH nodes_at_distance AS (
        SELECT *
        FROM find_nodes_at_hop_distance(start_uri, hop_distance, contexts)
    ),
    nodes_with_density AS (
        SELECT
            n.uri,
            CASE
                WHEN density_metric = 'weighted' THEN
                    calculate_weighted_node_degree(n.uri, contexts)
                ELSE
                    calculate_node_degree(n.uri, contexts)::FLOAT
            END as density,
            n.hop as hop_distance,
            n.path
        FROM nodes_at_distance n
    )
    SELECT
        nwd.uri,
        nwd.density,
        nwd.hop_distance,
        nwd.path,
        ROW_NUMBER() OVER (ORDER BY nwd.density DESC) as rank
    FROM nodes_with_density nwd
    ORDER BY nwd.density DESC
    LIMIT top_n;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Neighbor Discovery: Get Adjacent Nodes
-- ============================================================================

-- Get all neighbors of a node with their relationship
CREATE OR REPLACE FUNCTION get_node_neighbors(
    node_uri TEXT,
    contexts TEXT[] DEFAULT NULL,
    limit_count INT DEFAULT 50
)
RETURNS TABLE (
    neighbor_uri TEXT,
    predicate TEXT,
    direction TEXT,  -- 'outgoing' or 'incoming'
    confidence FLOAT,
    context TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Outgoing edges (node is subject)
    SELECT
        t.object as neighbor_uri,
        t.predicate,
        'outgoing'::TEXT as direction,
        t.confidence,
        t.context
    FROM triples t
    WHERE
        t.subject = node_uri
        AND (contexts IS NULL OR t.context = ANY(contexts))

    UNION ALL

    -- Incoming edges (node is object)
    SELECT
        t.subject as neighbor_uri,
        t.predicate,
        'incoming'::TEXT as direction,
        t.confidence,
        t.context
    FROM triples t
    WHERE
        t.object = node_uri
        AND (contexts IS NULL OR t.context = ANY(contexts))

    ORDER BY confidence DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Pebble Search Results Tracking
-- ============================================================================

-- Store pebble search executions for analysis
CREATE TABLE IF NOT EXISTS pebble_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_uri TEXT NOT NULL,
    hop_distance INT NOT NULL,
    top_n INT NOT NULL,
    contexts TEXT[],
    density_metric TEXT,
    nodes_explored INT,
    dense_nodes_found INT,
    web_searches_performed INT DEFAULT 0,
    execution_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Index for search history queries
CREATE INDEX IF NOT EXISTS idx_pebble_searches_start ON pebble_searches(start_uri);
CREATE INDEX IF NOT EXISTS idx_pebble_searches_created ON pebble_searches(created_at DESC);

-- Store discovered triples from pebble search web enrichment
CREATE TABLE IF NOT EXISTS pebble_discoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pebble_search_id UUID REFERENCES pebble_searches(id) ON DELETE CASCADE,
    dense_node_uri TEXT NOT NULL,
    source_modality TEXT NOT NULL,  -- 'exa', 'websearch', 'context7', etc.
    discovered_triples JSONB,        -- Array of new triples found
    summary TEXT,                    -- Summary of web search findings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_pebble_discoveries_search ON pebble_discoveries(pebble_search_id);
CREATE INDEX IF NOT EXISTS idx_pebble_discoveries_node ON pebble_discoveries(dense_node_uri);

-- ============================================================================
-- Utility Views
-- ============================================================================

-- View recent pebble searches
CREATE OR REPLACE VIEW recent_pebble_searches AS
SELECT
    ps.id,
    ps.start_uri,
    ps.hop_distance,
    ps.dense_nodes_found,
    ps.web_searches_performed,
    ps.execution_time_ms,
    ps.created_at,
    COUNT(pd.id) as discoveries_count
FROM pebble_searches ps
LEFT JOIN pebble_discoveries pd ON ps.id = pd.pebble_search_id
GROUP BY ps.id
ORDER BY ps.created_at DESC
LIMIT 100;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Resolve URI by label (find entity by human-readable name)
CREATE OR REPLACE FUNCTION resolve_uri_by_label(
    label_text TEXT,
    contexts TEXT[] DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    found_uri TEXT;
BEGIN
    -- Try exact match on object (for name/label predicates)
    SELECT t.subject INTO found_uri
    FROM triples t
    WHERE
        t.object ILIKE label_text
        AND t.predicate IN ('schema:name', 'rdfs:label', 'http://schema.org/name')
        AND (contexts IS NULL OR t.context = ANY(contexts))
    LIMIT 1;

    -- If not found, try fuzzy match
    IF found_uri IS NULL THEN
        SELECT t.subject INTO found_uri
        FROM triples t
        WHERE
            t.object ILIKE '%' || label_text || '%'
            AND t.predicate IN ('schema:name', 'rdfs:label', 'http://schema.org/name')
            AND (contexts IS NULL OR t.context = ANY(contexts))
        ORDER BY LENGTH(t.object)
        LIMIT 1;
    END IF;

    RETURN found_uri;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update Schema Version
-- ============================================================================

INSERT INTO schema_version (version, description)
VALUES (3, 'Pebble Search - graph traversal, density analysis, and web enrichment')
ON CONFLICT DO NOTHING;
