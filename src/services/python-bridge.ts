/**
 * Python Service Bridge
 * Executes Python services and handles JSON communication
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  TripleDecompositionResult,
  ProofSearchResult,
  GraphQueryResult,
  NeuroSymbolicResult,
} from './types/python-service-types.js';
import { ServiceError } from './types/error-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PythonServiceResult is now defined in types/python-service-types.ts
// This interface is kept for backward compatibility but should not be used directly
export type PythonServiceResult = any;

export class PythonBridge {
  private pythonExecutable: string;
  private servicesDir: string;
  private timeout: number;

  constructor() {
    this.pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    this.servicesDir = path.join(__dirname, 'python');
    this.timeout = parseInt(process.env.PYTHON_SERVICE_TIMEOUT_MS || '30000');
  }

  /**
   * Execute a Python service and return JSON result
   */
  async execute(
    scriptName: string,
    args: any
  ): Promise<PythonServiceResult> {
    const scriptPath = path.join(this.servicesDir, scriptName);
    const jsonArg = JSON.stringify(args);

    return new Promise((resolve, reject) => {
      const childProcess = spawn(
        this.pythonExecutable,
        [scriptPath, '--json', jsonArg],
        {
          env: {
            ...process.env,
            PYTHONPATH: this.servicesDir,
          },
        }
      );

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Timeout handling
      const timeoutId = setTimeout(() => {
        childProcess.kill();
        reject(new ServiceError(`Python service timed out after ${this.timeout}ms`, {
          script: scriptName,
          timeout: this.timeout,
        }));
      }, this.timeout);

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          console.error(`[PythonBridge] ${scriptName} failed:`, stderr);
          reject(
            new ServiceError(
              `Python service exited with code ${code}: ${stderr || 'Unknown error'}`,
              {
                script: scriptName,
                exitCode: code,
                stderr,
              }
            )
          );
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          console.error(`[PythonBridge] Failed to parse JSON:`, stdout);
          reject(
            new ServiceError(`Failed to parse Python output: ${error instanceof Error ? error.message : String(error)}`, {
              script: scriptName,
              stdout,
              originalError: error instanceof Error ? error.message : String(error),
            })
          );
        }
      });

      childProcess.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        console.error(`[PythonBridge] Process error:`, error);
        reject(new ServiceError(`Python process failed: ${error.message}`, {
          script: scriptName,
          originalError: error.message,
        }));
      });
    });
  }

  /**
   * Triple Decomposition Service
   */
  async tripleDecomposition(args: {
    concept: string;
    context?: string;
  }): Promise<TripleDecompositionResult> {
    return this.execute('triple_decomposer.py', {
      text: args.concept,
      context: args.context,
    });
  }

  /**
   * Proof Search Service
   */
  async proofSearch(args: {
    goal: string;
    premises?: string[];
    method?: string;
    max_depth?: number;
  }): Promise<ProofSearchResult> {
    // Convert premises to facts and rules format
    const facts = args.premises || [];
    const rules: any[] = [];

    return this.execute('proof_searcher.py', {
      goal: args.goal,
      facts,
      rules,
      strategy: args.method || 'auto',
      max_depth: args.max_depth || 10,
    });
  }

  /**
   * Graph Query Service
   */
  async graphQuery(args: {
    query: string;
    context?: string;
    triples?: any[];
  }): Promise<GraphQueryResult> {
    return this.execute('graph_engine.py', {
      query: args.query,
      context: args.context,
      triples: args.triples || [],
    });
  }

  /**
   * Neuro-Symbolic Query Service
   */
  async neuroSymbolicQuery(args: {
    query: string;
    use_llm?: boolean;
    llm_provider?: 'anthropic' | 'openai';
    include_proof?: boolean;
  }): Promise<NeuroSymbolicResult> {
    return this.execute('neuro_symbolic.py', {
      query: args.query,
      use_llm: args.use_llm !== false,
      llm_provider: args.llm_provider || 'anthropic',
      include_proof: args.include_proof || false,
      anthropic_api_key: process.env.ANTHROPIC_API_KEY,
      openai_api_key: process.env.OPENAI_API_KEY,
    });
  }
}

// Singleton instance
let pythonBridge: PythonBridge | null = null;

export function getPythonBridge(): PythonBridge {
  if (!pythonBridge) {
    pythonBridge = new PythonBridge();
  }
  return pythonBridge;
}
