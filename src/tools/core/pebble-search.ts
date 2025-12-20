/**
 * Pebble Search - Ripple-based Graph Exploration
 *
 * Drop a "pebble" on a starting node and explore the graph in ripples,
 * finding the most densely connected nodes at a specified distance,
 * then enriching them with multi-modal web searches.
 */

import { z } from 'zod';
import { Pool } from 'pg';

// Input schema for pebble search
export const pebbleSearchSchema = z.object({
  start: z.string().describe('Starting node URI or label (e.g., "Alan_Turing" or "yago:Alan_Turing")'),
  hops: z.number().min(1).max(10).describe('Number of hops away from starting node'),
  top_n: z.number().min(1).max(50).default(10).describe('Return top N densest nodes'),
  contexts: z.array(z.string()).optional().describe('Filter by context (e.g., ["yago-facts", "user"])'),
  density_metric: z.enum(['degree', 'weighted']).default('degree').describe('Density calculation method'),
  enable_web_search: z.boolean().default(true).describe('Enable web enrichment of dense nodes'),
  web_search_limit: z.number().min(1).max(5).default(3).describe('Number of web searches per dense node'),
  include_neighbors: z.boolean().default(true).describe('Include neighbor information'),
  include_path: z.boolean().default(true).describe('Include path from start to each node'),
  auto_import_triples: z.boolean().default(false).describe('Automatically import discovered triples'),
});

export type PebbleSearchInput = z.infer<typeof pebbleSearchSchema>;

// Result types
export interface DenseNode {
  uri: string;
  label?: string;
  density: number;
  hop_distance: number;
  rank: number;
  path?: string[];
  neighbors?: Neighbor[];
  web_research?: WebResearchResults;
}

export interface Neighbor {
  uri: string;
  label?: string;
  predicate: string;
  direction: 'outgoing' | 'incoming';
  confidence: number;
  context: string;
}

export interface WebResearchResults {
  exa?: WebSearchResult;
  websearch?: WebSearchResult;
  dynamic?: WebSearchResult;
  modality_used?: string;
}

export interface WebSearchResult {
  title?: string;
  summary: string;
  url?: string;
  snippets?: string[];
  discovered_facts?: string[];
}

export interface PebbleSearchResult {
  start_node: string;
  hops: number;
  total_nodes_explored: number;
  dense_nodes: DenseNode[];
  execution_time_ms: number;
  search_id: string;
}

/**
 * Pebble Search Service
 */
export class PebbleSearchService {
  constructor(private pool: Pool) {}

  /**
   * Main pebble search execution
   */
  async search(input: PebbleSearchInput): Promise<PebbleSearchResult> {
    const startTime = Date.now();

    try {
      // Step 1: Resolve start URI if label provided
      const startUri = await this.resolveStartNode(input.start, input.contexts);

      // Step 2: Execute core graph search (SQL function)
      const denseNodes = await this.executeCoreSearch(
        startUri,
        input.hops,
        input.top_n,
        input.contexts,
        input.density_metric
      );

      // Step 3: Enrich with neighbors if requested
      if (input.include_neighbors) {
        await this.enrichWithNeighbors(denseNodes, input.contexts);
      }

      // Step 4: Enrich with labels
      await this.enrichWithLabels(denseNodes);

      // Step 5: Web search enrichment if enabled
      if (input.enable_web_search && denseNodes.length > 0) {
        await this.enrichWithWebSearch(
          denseNodes,
          input.web_search_limit,
          input.auto_import_triples
        );
      }

      const executionTime = Date.now() - startTime;

      // Step 6: Record search execution
      const searchId = await this.recordSearch(
        startUri,
        input.hops,
        input.top_n,
        input.contexts || [],
        input.density_metric,
        denseNodes.length,
        executionTime
      );

      return {
        start_node: startUri,
        hops: input.hops,
        total_nodes_explored: denseNodes.length,
        dense_nodes: denseNodes,
        execution_time_ms: executionTime,
        search_id: searchId,
      };
    } catch (error) {
      console.error('Pebble search failed:', error);
      throw error;
    }
  }

  /**
   * Resolve starting node URI from label or URI
   */
  private async resolveStartNode(
    start: string,
    contexts?: string[]
  ): Promise<string> {
    // If already looks like a URI, use as-is
    if (start.includes(':') || start.startsWith('http')) {
      return start;
    }

    // Try to resolve by label
    const result = await this.pool.query(
      'SELECT resolve_uri_by_label($1, $2) as uri',
      [start, contexts || null]
    );

    if (result.rows[0]?.uri) {
      return result.rows[0].uri;
    }

    // If not found, treat as literal URI
    return start;
  }

  /**
   * Execute core pebble search using SQL function
   */
  private async executeCoreSearch(
    startUri: string,
    hops: number,
    topN: number,
    contexts?: string[],
    densityMetric: string = 'degree'
  ): Promise<DenseNode[]> {
    const result = await this.pool.query(
      `SELECT * FROM pebble_search_core($1, $2, $3, $4, $5)`,
      [startUri, hops, topN, contexts || null, densityMetric]
    );

    return result.rows.map(row => ({
      uri: row.uri,
      density: parseFloat(row.density),
      hop_distance: row.hop_distance,
      rank: row.rank,
      path: row.path,
    }));
  }

  /**
   * Enrich nodes with neighbor information
   */
  private async enrichWithNeighbors(
    nodes: DenseNode[],
    contexts?: string[]
  ): Promise<void> {
    for (const node of nodes) {
      const result = await this.pool.query(
        'SELECT * FROM get_node_neighbors($1, $2, $3)',
        [node.uri, contexts || null, 20]
      );

      node.neighbors = result.rows.map(row => ({
        uri: row.neighbor_uri,
        predicate: row.predicate,
        direction: row.direction,
        confidence: parseFloat(row.confidence),
        context: row.context,
      }));
    }
  }

  /**
   * Enrich nodes with human-readable labels
   */
  private async enrichWithLabels(nodes: DenseNode[]): Promise<void> {
    for (const node of nodes) {
      // Try to find label from triples
      const result = await this.pool.query(
        `SELECT object as label FROM triples
         WHERE subject = $1
         AND predicate IN ('schema:name', 'rdfs:label', 'http://schema.org/name')
         LIMIT 1`,
        [node.uri]
      );

      if (result.rows[0]?.label) {
        node.label = result.rows[0].label;
      } else {
        // Extract label from URI
        node.label = this.extractLabelFromUri(node.uri);
      }

      // Also enrich neighbor labels
      if (node.neighbors) {
        for (const neighbor of node.neighbors) {
          const nResult = await this.pool.query(
            `SELECT object as label FROM triples
             WHERE subject = $1
             AND predicate IN ('schema:name', 'rdfs:label')
             LIMIT 1`,
            [neighbor.uri]
          );

          if (nResult.rows[0]?.label) {
            neighbor.label = nResult.rows[0].label;
          } else {
            neighbor.label = this.extractLabelFromUri(neighbor.uri);
          }
        }
      }
    }
  }

  /**
   * Extract human-readable label from URI
   */
  private extractLabelFromUri(uri: string): string {
    // Remove namespace prefix
    const parts = uri.split(/[:/]/);
    const lastPart = parts[parts.length - 1];

    // Replace underscores with spaces
    return lastPart.replace(/_/g, ' ');
  }

  /**
   * Enrich dense nodes with web search results
   * Note: This method prepares search recommendations for Claude
   * Actual web searches are performed by Claude using external MCP tools
   */
  private async enrichWithWebSearch(
    nodes: DenseNode[],
    limitPerNode: number,
    autoImport: boolean
  ): Promise<void> {
    const limitedNodes = nodes.slice(0, limitPerNode);

    for (const node of limitedNodes) {
      // Determine recommended search modality based on node type
      const recommendedModality = this.determineSearchModality(node);

      // Prepare search queries
      const searchQuery = node.label || this.extractLabelFromUri(node.uri);

      node.web_research = {
        exa: {
          summary: `Recommended: Search academic/technical sources for "${searchQuery}"`,
          url: `https://exa.ai/search?q=${encodeURIComponent(searchQuery)}`,
          snippets: [],
          discovered_facts: [],
        },
        websearch: {
          summary: `Recommended: Broad web search for "${searchQuery}"`,
          snippets: [],
          discovered_facts: [],
        },
        dynamic: {
          summary: `Recommended modality: ${recommendedModality} for "${searchQuery}"`,
          snippets: [`Node type suggests ${recommendedModality} search would be most effective`],
          discovered_facts: [],
        },
        modality_used: recommendedModality,
      };
    }

    // Note: Actual enrichment would require:
    // 1. Claude calls Exa/WebSearch MCP tools with these queries
    // 2. Parse results and extract new triples
    // 3. If autoImport=true, store discovered triples in pebble_discoveries table
  }

  /**
   * Determine best search modality based on node characteristics
   */
  private determineSearchModality(node: DenseNode): string {
    const uri = node.uri.toLowerCase();
    const label = (node.label || '').toLowerCase();

    // Technical/scientific concepts → Context7 or academic sources
    if (uri.includes('scientific') || uri.includes('technology') ||
        label.includes('algorithm') || label.includes('theory')) {
      return 'Context7 (technical documentation)';
    }

    // Code-related → GitHub
    if (uri.includes('code') || uri.includes('software') ||
        label.includes('library') || label.includes('framework')) {
      return 'GitHub Code Search';
    }

    // People, places, organizations → Wikipedia/general
    if (uri.includes('person') || uri.includes('organization') ||
        uri.includes('location') || label.match(/^[A-Z]/)) {
      return 'WebSearch (encyclopedic)';
    }

    // Default to Exa for quality results
    return 'Exa (neural search)';
  }

  /**
   * Record search execution for analytics
   */
  private async recordSearch(
    startUri: string,
    hops: number,
    topN: number,
    contexts: string[],
    densityMetric: string,
    nodesFound: number,
    executionTime: number
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO pebble_searches
       (start_uri, hop_distance, top_n, contexts, density_metric,
        nodes_explored, dense_nodes_found, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        startUri,
        hops,
        topN,
        contexts,
        densityMetric,
        nodesFound,
        nodesFound,
        executionTime,
      ]
    );

    return result.rows[0].id;
  }
}

/**
 * Tool handler for MCP
 */
export async function handlePebbleSearch(
  input: PebbleSearchInput,
  pool: Pool
): Promise<PebbleSearchResult> {
  const service = new PebbleSearchService(pool);
  return await service.search(input);
}

/**
 * Format result for display
 */
export function formatPebbleSearchResult(result: PebbleSearchResult): string {
  let output = `🌊 Pebble Search Results\n`;
  output += `${'='.repeat(60)}\n\n`;
  output += `Starting Node: ${result.start_node}\n`;
  output += `Hop Distance: ${result.hops}\n`;
  output += `Dense Nodes Found: ${result.dense_nodes.length}\n`;
  output += `Execution Time: ${result.execution_time_ms}ms\n\n`;

  output += `Top Dense Nodes:\n`;
  output += `${'─'.repeat(60)}\n\n`;

  for (const node of result.dense_nodes) {
    output += `${node.rank}. ${node.label || node.uri}\n`;
    output += `   URI: ${node.uri}\n`;
    output += `   Density: ${node.density} connections\n`;
    output += `   Distance: ${node.hop_distance} hops\n`;

    if (node.path && node.path.length > 0) {
      output += `   Path: ${node.path.map(p => this.extractLabel(p)).join(' → ')}\n`;
    }

    if (node.neighbors && node.neighbors.length > 0) {
      output += `   Top Neighbors (${node.neighbors.length}):\n`;
      node.neighbors.slice(0, 5).forEach(n => {
        output += `     - ${n.label || n.uri} (${n.predicate}, ${n.direction})\n`;
      });
    }

    if (node.web_research) {
      output += `   Web Research:\n`;
      if (node.web_research.exa) {
        output += `     Exa: ${node.web_research.exa.summary}\n`;
      }
      if (node.web_research.websearch) {
        output += `     WebSearch: ${node.web_research.websearch.summary}\n`;
      }
    }

    output += `\n`;
  }

  return output;

  function extractLabel(uri: string): string {
    const parts = uri.split(/[:/]/);
    return parts[parts.length - 1].replace(/_/g, ' ');
  }
}
