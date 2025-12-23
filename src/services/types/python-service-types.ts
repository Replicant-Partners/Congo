/**
 * TypeScript interfaces for Python service responses
 * Provides type safety for inter-service communication
 */

export interface PythonServiceResult<T = unknown> {
  success: boolean;
  error?: string;
  [key: string]: T | boolean | string | undefined;
}

// Triple Decomposition Service Types
export interface Triple {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source?: string;
}

export interface TripleDecompositionResult extends PythonServiceResult {
  success: boolean;
  input: string;
  context?: string;
  triples: Triple[];
  count: number;
}

// Proof Search Service Types
export interface ProofStep {
  conclusion: string;
  premises?: string[];
  rule_name: string;
}

export interface ProofTree {
  success: boolean;
  strategy?: string;
  steps?: ProofStep[];
  proof_tree?: string;
  attempted_steps?: number;
}

export interface ProofSearchResult extends PythonServiceResult {
  success: boolean;
  goal: string;
  proof?: ProofTree;
}

// Graph Query Service Types
export interface GraphQueryResult extends PythonServiceResult {
  success: boolean;
  query: string;
  query_type?: string;
  count?: number;
  matches?: Triple[];
}

// Neuro-Symbolic Query Service Types
export interface NeuroSymbolicAnswer {
  answer: string;
  confidence?: number;
  logical_form?: string;
  graph_results?: Triple[];
  proof_trace?: unknown;
  reasoning_steps?: string[];
}

export interface NeuroSymbolicResult extends PythonServiceResult {
  success: boolean;
  query?: string;
  result?: NeuroSymbolicAnswer;
}