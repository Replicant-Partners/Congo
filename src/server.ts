#!/usr/bin/env node
/**
 * Congo River Compositional Intelligence MCP Server
 * Main entry point - orchestrates all tools and services
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import * as dotenv from 'dotenv';
import { DatabaseManager, createDatabaseManager } from './config/database.js';
import {
  scoreLanguages,
  formatScores,
  TASK_PROFILES,
  ComponentRequirements,
} from './config/language-selector.js';
import { getPythonBridge } from './services/python-bridge.js';
import { LambdaAbstractor } from './services/typescript/lambda-abstractor.js';
import { handlePebbleSearch, formatPebbleSearchResult, pebbleSearchSchema } from './tools/core/pebble-search.js';

// Load environment variables
dotenv.config();

// Global database manager
let db: DatabaseManager;

/**
 * Initialize the MCP server
 */
const server = new Server(
  {
    name: 'congo-river',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool Definitions
 */
const TOOLS: Tool[] = [
  // Core Reasoning Tools
  {
    name: 'triple_decomposition',
    description:
      'Decomposes complex concepts into RDF-style subject-predicate-object triples. Implements Stanley Fish\'s 3-word sentence principle for semantic analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'The concept or statement to decompose into triples',
        },
        context: {
          type: 'string',
          description: 'Optional context or named graph for organizing knowledge',
        },
        store_in_db: {
          type: 'boolean',
          description: 'Whether to store the resulting triples in the knowledge graph',
          default: true,
        },
      },
      required: ['concept'],
    },
  },
  {
    name: 'lambda_abstraction',
    description:
      'Converts processes or code into lambda calculus representations. Shows Montague-style compositional semantics with type signatures.',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Process description or code to abstract',
        },
        include_types: {
          type: 'boolean',
          description: 'Include Hindley-Milner type signatures',
          default: true,
        },
        simplify: {
          type: 'boolean',
          description: 'Apply beta reduction to simplify the expression',
          default: true,
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'proof_search',
    description:
      'Searches for proofs of goals given premises. Implements Curry-Howard correspondence with constructive proof trees.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The statement to prove',
        },
        premises: {
          type: 'array',
          items: { type: 'string' },
          description: 'Available premises/axioms to use in the proof',
        },
        method: {
          type: 'string',
          enum: ['forward_chaining', 'backward_chaining', 'resolution', 'auto'],
          description: 'Proof search strategy',
          default: 'auto',
        },
        max_depth: {
          type: 'number',
          description: 'Maximum proof depth to explore',
          default: 10,
        },
      },
      required: ['goal'],
    },
  },
  {
    name: 'graph_query',
    description:
      'Queries the knowledge graph using SPARQL-like patterns. Returns matching triples and their relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query or SPARQL pattern',
        },
        context: {
          type: 'string',
          description: 'Optional named graph to query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 100,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'neuro_symbolic_query',
    description:
      'Hybrid neuro-symbolic reasoning: parses natural language with LLM, queries knowledge graph symbolically, and synthesizes grounded answers with proof traces.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language question',
        },
        use_llm: {
          type: 'boolean',
          description: 'Use LLM for parsing and enhancement',
          default: true,
        },
        llm_provider: {
          type: 'string',
          enum: ['anthropic', 'openai'],
          description: 'Which LLM provider to use',
          default: 'anthropic',
        },
        include_proof: {
          type: 'boolean',
          description: 'Include proof trace in response',
          default: true,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'pebble_search',
    description:
      'Pebble Search: Drop a "pebble" on a starting node and explore the graph in ripples, finding the most densely connected nodes at a specified hop distance, then enriching them with multi-modal web searches. Perfect for exploratory graph traversal and knowledge discovery.',
    inputSchema: {
      type: 'object',
      properties: {
        start: {
          type: 'string',
          description: 'Starting node URI or label (e.g., "Alan_Turing" or "yago:Alan_Turing")',
        },
        hops: {
          type: 'number',
          description: 'Number of hops away from starting node (1-10)',
          minimum: 1,
          maximum: 10,
        },
        top_n: {
          type: 'number',
          description: 'Return top N densest nodes',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
        contexts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by context (e.g., ["yago-facts", "user"])',
        },
        density_metric: {
          type: 'string',
          enum: ['degree', 'weighted'],
          description: 'Density calculation method',
          default: 'degree',
        },
        enable_web_search: {
          type: 'boolean',
          description: 'Enable web enrichment of dense nodes',
          default: true,
        },
        web_search_limit: {
          type: 'number',
          description: 'Number of web searches per dense node',
          default: 3,
          minimum: 1,
          maximum: 5,
        },
        include_neighbors: {
          type: 'boolean',
          description: 'Include neighbor information',
          default: true,
        },
        include_path: {
          type: 'boolean',
          description: 'Include path from start to each node',
          default: true,
        },
        auto_import_triples: {
          type: 'boolean',
          description: 'Automatically import discovered triples',
          default: false,
        },
      },
      required: ['start', 'hops'],
    },
  },

  // Meta Tools
  {
    name: 'recommend_language',
    description:
      'Analyzes component requirements and recommends the optimal programming language with scoring rationale. Demonstrates meta-level compositional intelligence.',
    inputSchema: {
      type: 'object',
      properties: {
        requirements: {
          type: 'object',
          properties: {
            needsLogic: { type: 'boolean', default: false },
            needsGraphOps: { type: 'boolean', default: false },
            needsTypeSystem: { type: 'boolean', default: false },
            needsPerformance: { type: 'boolean', default: false },
            needsMLLibraries: { type: 'boolean', default: false },
            needsSemanticWeb: { type: 'boolean', default: false },
            needsConcurrency: { type: 'boolean', default: false },
            needsWebIntegration: { type: 'boolean', default: false },
            needsDataScience: { type: 'boolean', default: false },
          },
          description: 'Component requirements',
        },
        task_profile: {
          type: 'string',
          enum: [
            'tripleDecomposition',
            'proofSearch',
            'graphQuery',
            'lambdaAbstraction',
            'neuroSymbolic',
          ],
          description: 'Use a preset task profile',
        },
        show_all: {
          type: 'boolean',
          description: 'Show all language scores, not just the recommendation',
          default: false,
        },
      },
    },
  },
  {
    name: 'configure_database',
    description:
      'Manages database configuration - switch between local and cloud, run migrations, view statistics.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['status', 'migrate', 'stats', 'health'],
          description: 'Database action to perform',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'export_knowledge',
    description: 'Exports knowledge graph to RDF format or JSON backup.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['rdf', 'json'],
          description: 'Export format',
          default: 'rdf',
        },
        output_path: {
          type: 'string',
          description: 'Path to save export (optional, returns as string if not provided)',
        },
      },
      required: ['format'],
    },
  },
  {
    name: 'import_knowledge',
    description: 'Imports triples into the knowledge graph.',
    inputSchema: {
      type: 'object',
      properties: {
        triples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              predicate: { type: 'string' },
              object: { type: 'string' },
              context: { type: 'string' },
            },
            required: ['subject', 'predicate', 'object'],
          },
          description: 'Array of triples to import',
        },
      },
      required: ['triples'],
    },
  },
  {
    name: 'system_status',
    description:
      'Shows comprehensive system status including database stats, service health, and recent activity.',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Include detailed metrics',
          default: false,
        },
      },
    },
  },
];

/**
 * Register tool handlers
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Log tool invocation
    console.error(`[Congo River] Tool called: ${name}`);

    // Route to appropriate handler
    switch (name) {
      case 'triple_decomposition':
        return await handleTripleDecomposition(args);

      case 'lambda_abstraction':
        return await handleLambdaAbstraction(args);

      case 'proof_search':
        return await handleProofSearch(args);

      case 'graph_query':
        return await handleGraphQuery(args);

      case 'neuro_symbolic_query':
        return await handleNeuroSymbolicQuery(args);

      case 'recommend_language':
        return await handleRecommendLanguage(args);

      case 'configure_database':
        return await handleConfigureDatabase(args);

      case 'export_knowledge':
        return await handleExportKnowledge(args);

      case 'import_knowledge':
        return await handleImportKnowledge(args);

      case 'system_status':
        return await handleSystemStatus(args);

      case 'pebble_search':
        return await handlePebbleSearchTool(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[Congo River] Error in ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Tool Handlers (Stubs for now, will implement with services)
 */

async function handleTripleDecomposition(args: any) {
  const python = getPythonBridge();
  const result = await python.tripleDecomposition({
    concept: args.concept,
    context: args.context,
  });

  if (!result.success) {
    throw new Error('Triple decomposition failed');
  }

  // Format output
  let output = `🌊 **Triple Decomposition Results**\n\n`;
  output += `**Input:** ${result.input}\n`;
  if (result.context) {
    output += `**Context:** ${result.context}\n`;
  }
  output += `**Triples Found:** ${result.count}\n\n`;

  result.triples.forEach((triple: any, idx: number) => {
    output += `${idx + 1}. **${triple.subject}** → \`${triple.predicate}\` → **${triple.object}**\n`;
    output += `   _Confidence: ${(triple.confidence * 100).toFixed(0)}%_\n\n`;
  });

  // Store in database if requested
  if (args.store_in_db && db) {
    try {
      const count = await db.importTriples(result.triples.map((t: any) => ({
        subject: t.subject,
        predicate: t.predicate,
        object: t.object,
        context: args.context,
      })));
      output += `\n✅ Stored ${count} triples in knowledge graph`;
    } catch (error) {
      output += `\n⚠️  Warning: Could not store in database: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

async function handleLambdaAbstraction(args: any) {
  const abstractor = new LambdaAbstractor();
  const result = abstractor.abstract(args.input);

  if (!result.success) {
    throw new Error('Lambda abstraction failed');
  }

  // Format output
  let output = `🌊 **Lambda Calculus Abstraction**\n\n`;
  output += `**Input:** ${result.input}\n`;
  output += `**Type:** ${result.inputType}\n\n`;

  output += `**Lambda Notation:**\n\`\`\`\n${result.notation}\n\`\`\`\n\n`;

  if (result.curried !== result.notation) {
    output += `**Curried Form:**\n\`\`\`\n${result.curried}\n\`\`\`\n\n`;
  }

  if (result.betaReduced && args.simplify !== false) {
    output += `**Beta Reduced:**\n\`\`\`\n${result.betaReduced}\n\`\`\`\n\n`;
  }

  if (result.typeSignature && args.include_types !== false) {
    output += `**Type Signature:** \`${result.typeSignature}\`\n\n`;
  }

  output += `**Properties:**\n`;
  output += `- Complexity: ${result.complexity}\n`;
  output += `- Variables: ${result.variables.join(', ') || 'none'}\n`;
  output += `- Free Variables: ${result.freeVariables.join(', ') || 'none'}\n`;

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

async function handleProofSearch(args: any) {
  const python = getPythonBridge();
  const result = await python.proofSearch({
    goal: args.goal,
    premises: args.premises,
    method: args.method,
    max_depth: args.max_depth,
  });

  if (!result.success) {
    throw new Error('Proof search failed');
  }

  // Format output
  let output = `🌊 **Proof Search Results**\n\n`;
  output += `**Goal:** ${result.goal}\n`;
  output += `**Strategy:** ${result.proof?.strategy || 'auto'}\n\n`;

  if (result.proof?.success) {
    output += `✅ **Proof Found!**\n\n`;
    output += `**Proof Steps:**\n\n`;

    result.proof.steps?.forEach((step: any, idx: number) => {
      output += `${idx + 1}. **${step.conclusion}**\n`;
      if (step.premises && step.premises.length > 0) {
        output += `   From: ${step.premises.join(', ')}\n`;
      }
      output += `   Rule: \`${step.rule_name}\`\n\n`;
    });

    if (result.proof.proof_tree) {
      output += `\n**Proof Tree (Curry-Howard):**\n\`\`\`\n${result.proof.proof_tree}\n\`\`\`\n`;
    }
  } else {
    output += `❌ **No Proof Found**\n\n`;
    output += `The goal could not be proven with the given premises and constraints.\n`;
    if (result.proof?.attempted_steps) {
      output += `\nAttempted ${result.proof.attempted_steps} proof steps.`;
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

async function handleGraphQuery(args: any) {
  const python = getPythonBridge();

  // Get triples from database if available
  let triples: any[] = [];
  if (db) {
    try {
      const dbResult = await db.query(
        `SELECT subject, predicate, object, context
         FROM triples
         ${args.context ? 'WHERE context = $1' : ''}
         LIMIT ${args.limit || 100}`,
        args.context ? [args.context] : []
      );
      triples = dbResult.rows;
    } catch (error) {
      console.error('[GraphQuery] Database query failed:', error);
    }
  }

  const result = await python.graphQuery({
    query: args.query,
    context: args.context,
    triples,
  });

  if (!result.success) {
    throw new Error('Graph query failed');
  }

  // Format output
  let output = `🌊 **Knowledge Graph Query Results**\n\n`;
  output += `**Query:** ${result.query}\n`;
  output += `**Results Found:** ${result.count || 0}\n\n`;

  if (result.matches && result.matches.length > 0) {
    output += `**Matching Triples:**\n\n`;
    result.matches.forEach((triple: any, idx: number) => {
      output += `${idx + 1}. **${triple.subject}** → \`${triple.predicate}\` → **${triple.object}**\n`;
      if (triple.context) {
        output += `   Context: _${triple.context}_\n`;
      }
      output += `\n`;
    });
  } else {
    output += `No matching triples found.\n`;
  }

  if (result.query_type) {
    output += `\n_Query Type: ${result.query_type}_\n`;
  }

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

async function handleNeuroSymbolicQuery(args: any) {
  const python = getPythonBridge();

  // Note: Database context could be queried here if needed for the Python service
  // For now, the Python service will handle its own knowledge retrieval

  const result = await python.neuroSymbolicQuery({
    query: args.query,
    use_llm: args.use_llm,
    llm_provider: args.llm_provider,
    include_proof: args.include_proof,
  });

  if (!result.success) {
    throw new Error('Neuro-symbolic query failed');
  }

  // Format output
  let output = `🌊 **Neuro-Symbolic Reasoning Results**\n\n`;
  output += `**Query:** ${result.query || args.query}\n\n`;

  if (result.result) {
    output += `**Answer:**\n${result.result.answer}\n\n`;

    if (result.result.confidence) {
      output += `**Confidence:** ${(result.result.confidence * 100).toFixed(0)}%\n\n`;
    }

    if (result.result.logical_form) {
      output += `**Logical Form:**\n\`\`\`\n${result.result.logical_form}\n\`\`\`\n\n`;
    }

    if (result.result.graph_results && result.result.graph_results.length > 0) {
      output += `**Knowledge Graph Evidence:**\n\n`;
      result.result.graph_results.slice(0, 5).forEach((triple: any, idx: number) => {
        output += `${idx + 1}. ${triple.subject} → \`${triple.predicate}\` → ${triple.object}\n`;
      });
      output += `\n`;
    }

    if (result.result.proof_trace && args.include_proof) {
      output += `**Proof Trace:**\n\`\`\`\n${JSON.stringify(result.result.proof_trace, null, 2)}\n\`\`\`\n\n`;
    }

    if (result.result.reasoning_steps && result.result.reasoning_steps.length > 0) {
      output += `**Reasoning Process:**\n`;
      result.result.reasoning_steps.forEach((step: string, idx: number) => {
        output += `${idx + 1}. ${step}\n`;
      });
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

async function handleRecommendLanguage(args: any) {
  let requirements: ComponentRequirements;

  if (args.task_profile) {
    requirements = TASK_PROFILES[args.task_profile];
    if (!requirements) {
      throw new Error(`Unknown task profile: ${args.task_profile}`);
    }
  } else if (args.requirements) {
    requirements = args.requirements;
  } else {
    throw new Error('Either requirements or task_profile must be provided');
  }

  const scores = scoreLanguages(requirements);
  const output = args.show_all
    ? formatScores(scores)
    : formatScores([scores[0]]);

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

async function handleConfigureDatabase(args: any) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  let result: string;

  switch (args.action) {
    case 'health':
      const healthy = await db.healthCheck();
      result = healthy ? '✅ Database is healthy' : '❌ Database health check failed';
      break;

    case 'migrate':
      await db.runMigrations();
      result = '✅ Migrations completed successfully';
      break;

    case 'stats':
      const stats = await db.getStats();
      result = `📊 Database Statistics:
- Total Triples: ${stats.totalTriples}
- Total Proofs: ${stats.totalProofs}
- Total Embeddings: ${stats.totalEmbeddings}
- Total Patterns: ${stats.totalPatterns}
- Database Size: ${stats.databaseSize}`;
      break;

    case 'status':
      const statusHealthy = await db.healthCheck();
      const statusStats = await db.getStats();
      result = `🌊 Congo River Database Status

**Connection:** ${statusHealthy ? '✅ Connected' : '❌ Disconnected'}
**Type:** ${process.env.DB_TYPE || 'local'}

**Statistics:**
- Triples: ${statusStats.totalTriples}
- Proofs: ${statusStats.totalProofs}
- Embeddings: ${statusStats.totalEmbeddings}
- Patterns: ${statusStats.totalPatterns}
- Size: ${statusStats.databaseSize}`;
      break;

    default:
      throw new Error(`Unknown database action: ${args.action}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: result,
      },
    ],
  };
}

async function handleExportKnowledge(args: any) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  let result: string;

  if (args.format === 'rdf') {
    result = await db.exportToRDF();
  } else {
    // JSON export
    if (!args.output_path) {
      throw new Error('output_path required for JSON export');
    }
    await db.backup(args.output_path);
    result = `Exported to ${args.output_path}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: result,
      },
    ],
  };
}

async function handleImportKnowledge(args: any) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const count = await db.importTriples(args.triples);

  return {
    content: [
      {
        type: 'text',
        text: `✅ Imported ${count} triples into knowledge graph`,
      },
    ],
  };
}

async function handleSystemStatus(args: any) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const healthy = await db.healthCheck();
  const stats = await db.getStats();

  let status = `🌊 **Congo River Compositional Intelligence System**

**Server:** Running (v1.0.0)
**Transport:** ${process.env.TRANSPORT || 'stdio'}
**Database:** ${healthy ? '✅ Connected' : '❌ Disconnected'} (${process.env.DB_TYPE || 'local'})

**Knowledge Base:**
- RDF Triples: ${stats.totalTriples}
- Proof Trees: ${stats.totalProofs}
- Vector Embeddings: ${stats.totalEmbeddings}
- Learned Patterns: ${stats.totalPatterns}
- Total Size: ${stats.databaseSize}

**Available Tools:** ${TOOLS.length}
- Core Reasoning: 4 (triple_decomposition, lambda_abstraction, proof_search, graph_query)
- Advanced: 1 (neuro_symbolic_query)
- Meta: 5 (recommend_language, configure_database, export_knowledge, import_knowledge, system_status)
`;

  if (args.detailed) {
    status += `\n**Environment:**
- Node Version: ${process.version}
- Python Executable: ${process.env.PYTHON_EXECUTABLE || 'python3'}
- LLM APIs: ${process.env.ANTHROPIC_API_KEY ? '✅ Anthropic' : '❌ Anthropic'} ${process.env.OPENAI_API_KEY ? '✅ OpenAI' : '❌ OpenAI'}
- Cache: ${process.env.CACHE_ENABLED === 'true' ? '✅ Enabled' : '❌ Disabled'}
`;
  }

  return {
    content: [
      {
        type: 'text',
        text: status,
      },
    ],
  };
}

async function handlePebbleSearchTool(args: any) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Validate input using zod schema
  const validated = pebbleSearchSchema.parse(args);

  // Execute pebble search
  const result = await handlePebbleSearch(validated, db.getPool());

  // Format result for display
  const formattedOutput = formatPebbleSearchResult(result);

  return {
    content: [
      {
        type: 'text',
        text: formattedOutput,
      },
    ],
  };
}

/**
 * Initialize and start server
 */
async function main() {
  console.error('🌊 Congo River Compositional Intelligence MCP Server');
  console.error('Initializing...\n');

  // Initialize database
  try {
    db = createDatabaseManager();
    await db.initialize();
    console.error('✅ Database connected\n');
  } catch (error) {
    console.error('⚠️  Database connection failed:', error);
    console.error('Continuing without database (some features will be limited)\n');
  }

  // Choose transport based on environment
  const transport = process.env.TRANSPORT;

  if (transport === 'sse') {
    // SSE transport temporarily disabled due to API changes
    // TODO: Update to latest MCP SDK SSE transport API
    console.error('⚠️  SSE transport is not currently supported');
    console.error('Please use STDIO transport (default) instead');
    process.exit(1);
  } else {
    // STDIO transport for local use (default)
    console.error('📡 Starting STDIO server...');

    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);

    console.error('✅ STDIO server ready');
    console.error('\nConnected! Waiting for MCP requests...\n');
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.error('\n\n🌊 Shutting down Congo River server...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n\n🌊 Shutting down Congo River server...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
