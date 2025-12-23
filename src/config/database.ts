/**
 * Database Connection Manager
 * Handles both local PostgreSQL and cloud database connections
 * Supports connection pooling, migrations, and health checks
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DatabaseConfig {
  type: 'local' | 'cloud';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  cloudUrl?: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

export class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      maxConnections: 20,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 5000,
      ...config,
    };
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Database already initialized');
      return;
    }

    try {
      if (this.config.type === 'cloud' && this.config.cloudUrl) {
        // Cloud database (Supabase, Neon, AWS RDS, etc.)
        this.pool = new Pool({
          connectionString: this.config.cloudUrl,
          max: this.config.maxConnections,
          idleTimeoutMillis: this.config.idleTimeoutMs,
          connectionTimeoutMillis: this.config.connectionTimeoutMs,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
        });
      } else {
        // Local PostgreSQL
        this.pool = new Pool({
          host: this.config.host || 'localhost',
          port: this.config.port || 5432,
          database: this.config.database || 'congo_river',
          user: this.config.user || 'postgres',
          password: this.config.password,
          max: this.config.maxConnections,
          idleTimeoutMillis: this.config.idleTimeoutMs,
          connectionTimeoutMillis: this.config.connectionTimeoutMs,
        });
      }

      // Test connection
      await this.healthCheck();

      this.isInitialized = true;
      console.log(`Database initialized (${this.config.type})`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      console.error('Query error:', error);
      console.error('Query:', text);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    console.log('Running database migrations...');

    try {
      // Read schema.sql
      const schemaPath = path.join(__dirname, '../db/schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf-8');

      // Execute schema
      await this.query(schema);

      console.log('Database schema created successfully');

      // Run additional migrations from migrations directory
      const migrationsDir = path.join(__dirname, '../db/migrations');

      try {
        const migrationFiles = await fs.readdir(migrationsDir);
        const sqlFiles = migrationFiles
          .filter((file) => file.endsWith('.sql'))
          .sort(); // Execute in alphabetical order

        for (const file of sqlFiles) {
          const migrationPath = path.join(migrationsDir, file);
          const migration = await fs.readFile(migrationPath, 'utf-8');

          console.log(`Running migration: ${file}`);
          await this.query(migration);
        }

        console.log('All migrations completed successfully');
      } catch (err) {
        // Migrations directory might not exist yet
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw err;
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get the connection pool (for advanced use cases)
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    return this.pool;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalTriples: number;
    totalProofs: number;
    totalEmbeddings: number;
    totalPatterns: number;
    databaseSize: string;
  }> {
    const queries = await Promise.all([
      this.query('SELECT COUNT(*) as count FROM triples'),
      this.query('SELECT COUNT(*) as count FROM proofs'),
      this.query('SELECT COUNT(*) as count FROM embeddings'),
      this.query('SELECT COUNT(*) as count FROM patterns'),
      this.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `),
    ]);

    return {
      totalTriples: parseInt(queries[0].rows[0].count),
      totalProofs: parseInt(queries[1].rows[0].count),
      totalEmbeddings: parseInt(queries[2].rows[0].count),
      totalPatterns: parseInt(queries[3].rows[0].count),
      databaseSize: queries[4].rows[0].size,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Export knowledge graph to RDF format
   */
  async exportToRDF(): Promise<string> {
    const triples = await this.query(`
      SELECT subject, predicate, object, context
      FROM triples
      ORDER BY created_at
    `);

    // Generate N-Triples format (simple RDF format)
    const rdf = triples.rows
      .map((row) => {
        const context = row.context ? ` <${row.context}>` : '';
        return `<${row.subject}> <${row.predicate}> <${row.object}>${context} .`;
      })
      .join('\n');

    return rdf;
  }

  /**
   * Import triples from array
   */
  async importTriples(
    triples: Array<{
      subject: string;
      predicate: string;
      object: string;
      context?: string;
      source?: string;
    }>
  ): Promise<number> {
    let imported = 0;

    await this.transaction(async (client) => {
      for (const triple of triples) {
        await client.query(
          `
          INSERT INTO triples (subject, predicate, object, context, source)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `,
          [
            triple.subject,
            triple.predicate,
            triple.object,
            triple.context || null,
            triple.source || 'import',
          ]
        );
        imported++;
      }
    });

    return imported;
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAll(): Promise<void> {
    console.warn('Clearing all database data...');

    await this.transaction(async (client) => {
      await client.query('TRUNCATE triples CASCADE');
      await client.query('TRUNCATE proofs CASCADE');
      await client.query('TRUNCATE reasoning_sessions CASCADE');
      await client.query('TRUNCATE embeddings CASCADE');
      await client.query('TRUNCATE patterns CASCADE');
      await client.query('TRUNCATE lambda_abstractions CASCADE');
      await client.query('TRUNCATE concept_nodes CASCADE');
      await client.query('TRUNCATE concept_edges CASCADE');
    });

    console.log('All data cleared');
  }

  /**
   * Backup database to JSON
   */
  async backup(outputPath: string): Promise<void> {
    console.log('Creating database backup...');

    const backup = {
      timestamp: new Date().toISOString(),
      version: 1,
      data: {
        triples: await this.query('SELECT * FROM triples'),
        proofs: await this.query('SELECT * FROM proofs'),
        embeddings: await this.query('SELECT * FROM embeddings'),
        patterns: await this.query('SELECT * FROM patterns'),
        lambda_abstractions: await this.query('SELECT * FROM lambda_abstractions'),
        concept_nodes: await this.query('SELECT * FROM concept_nodes'),
        concept_edges: await this.query('SELECT * FROM concept_edges'),
      },
    };

    await fs.writeFile(outputPath, JSON.stringify(backup, null, 2));
    console.log(`Backup created: ${outputPath}`);
  }
}

/**
 * Create database manager from environment variables
 */
export function createDatabaseManager(): DatabaseManager {
  const config: DatabaseConfig = {
    type: (process.env.DB_TYPE as 'local' | 'cloud') || 'local',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    cloudUrl: process.env.CLOUD_DB_URL,
  };

  return new DatabaseManager(config);
}
