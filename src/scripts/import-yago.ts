#!/usr/bin/env node
/**
 * YAGO Import Script
 * Imports YAGO Turtle files into Congo River database
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { RDFParser } from '../services/rdf-parser.js';

// Load environment variables
config();

const BATCH_SIZE = 1000;
const DATA_DIR = join(process.cwd(), 'data', 'yago');

interface ImportOptions {
  file?: string;
  subset?: 'taxonomy' | 'schema' | 'facts' | 'all';
  dryRun?: boolean;
  verbose?: boolean;
}

class YAGOImporter {
  private pool: Pool;
  private parser: RDFParser;

  constructor() {
    const connectionString = process.env.CLOUD_DB_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Database connection string not found in environment');
    }

    this.pool = new Pool({
      connectionString,
      max: 10,
    });

    this.parser = new RDFParser();
  }

  async import(options: ImportOptions): Promise<void> {
    console.log('🌊 Congo River - YAGO Importer');
    console.log('==============================\n');

    try {
      // Run migrations first
      await this.runMigrations();

      // Determine which files to import
      const filesToImport = this.getFilesToImport(options);

      if (filesToImport.length === 0) {
        console.log('⚠️  No files found to import');
        return;
      }

      console.log(`📁 Files to import: ${filesToImport.length}`);
      filesToImport.forEach(f => console.log(`   - ${f}`));
      console.log('');

      // Import each file
      for (const file of filesToImport) {
        await this.importFile(file, options);
      }

      // Show summary
      await this.showSummary();

      console.log('\n✅ Import complete!');
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async runMigrations(): Promise<void> {
    console.log('🔧 Running database migrations...');

    // Check if migrations table exists
    const migrationsPath = join(process.cwd(), 'src', 'db', 'migrations', '002-yago-integration.sql');
    if (existsSync(migrationsPath)) {
      const migrationSQL = readFileSync(migrationsPath, 'utf-8');

      try {
        await this.pool.query(migrationSQL);
        console.log('✓ Migrations applied\n');
      } catch (error) {
        console.warn('⚠️  Migration warning (may already be applied):', error);
      }
    }
  }

  private getFilesToImport(options: ImportOptions): string[] {
    const files: string[] = [];

    if (options.file) {
      const filePath = join(DATA_DIR, options.file);
      if (existsSync(filePath)) {
        files.push(options.file);
      } else {
        console.warn(`⚠️  File not found: ${filePath}`);
      }
    } else {
      // Import based on subset option
      const subsetMap: Record<string, string[]> = {
        taxonomy: ['yago-taxonomy.ttl'],
        schema: ['yago-schema.ttl'],
        facts: ['yago-facts.ttl'],
        all: ['yago-schema.ttl', 'yago-taxonomy.ttl', 'yago-facts.ttl'],
      };

      const subset = options.subset || 'all';
      const fileList = subsetMap[subset] || subsetMap.all;

      for (const file of fileList) {
        const filePath = join(DATA_DIR, file);
        if (existsSync(filePath)) {
          files.push(file);
        } else {
          console.warn(`⚠️  File not found: ${filePath} (skipping)`);
        }
      }
    }

    return files;
  }

  private async importFile(fileName: string, options: ImportOptions): Promise<void> {
    const filePath = join(DATA_DIR, fileName);
    const startTime = Date.now();

    console.log(`\n📥 Importing: ${fileName}`);
    console.log('─'.repeat(50));

    // Start import record
    const importId = await this.startImport(fileName);

    try {
      // Read and parse file
      console.log('📖 Reading file...');
      const content = readFileSync(filePath, 'utf-8');

      console.log('🔍 Parsing RDF triples...');
      const triples = this.parser.parseLines(content.split('\n'));

      console.log(`✓ Parsed ${triples.length} triples`);

      if (options.dryRun) {
        console.log('🔧 Dry run mode - skipping database insert');
        console.log('Sample triples:');
        triples.slice(0, 5).forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.subject} -> ${t.predicate} -> ${t.object}`);
        });
        return;
      }

      // Insert triples in batches
      console.log('💾 Inserting into database...');
      const context = this.getContext(fileName);
      let insertedCount = 0;

      for (let i = 0; i < triples.length; i += BATCH_SIZE) {
        const batch = triples.slice(i, i + BATCH_SIZE);
        await this.insertBatch(batch, context, 'yago');

        insertedCount += batch.length;
        const progress = ((insertedCount / triples.length) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${insertedCount}/${triples.length} (${progress}%)`);
      }

      console.log(''); // New line after progress

      // Complete import record
      const duration = Date.now() - startTime;
      await this.completeImport(importId, triples.length, duration, context);

      console.log(`✅ Imported ${triples.length} triples in ${(duration / 1000).toFixed(2)}s`);
    } catch (error) {
      await this.failImport(importId, error);
      throw error;
    }
  }

  private getContext(fileName: string): string {
    if (fileName.includes('taxonomy')) return 'yago-taxonomy';
    if (fileName.includes('schema')) return 'yago-schema';
    if (fileName.includes('facts')) return 'yago-facts';
    return 'yago-unknown';
  }

  private async startImport(fileName: string): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO yago_imports (version, subset, file_name, context, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['4.5', this.getSubset(fileName), fileName, this.getContext(fileName), JSON.stringify({ started_at: new Date() })]
    );
    return result.rows[0].id;
  }

  private getSubset(fileName: string): string {
    if (fileName.includes('taxonomy')) return 'taxonomy';
    if (fileName.includes('schema')) return 'schema';
    if (fileName.includes('facts')) return 'facts';
    return 'unknown';
  }

  private async insertBatch(triples: any[], context: string, source: string): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];

    triples.forEach((triple, i) => {
      const offset = i * 6;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      );
      values.push(
        triple.subject,
        triple.predicate,
        triple.object,
        context,
        source,
        1.0 // confidence
      );
    });

    const query = `
      INSERT INTO triples (subject, predicate, object, context, source, confidence)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    await this.pool.query(query, values);
  }

  private async completeImport(importId: string, tripleCount: number, duration: number, context: string): Promise<void> {
    await this.pool.query(
      `UPDATE yago_imports
       SET triple_count = $1,
           import_end_time = NOW(),
           import_duration_ms = $2,
           success = true
       WHERE id = $3`,
      [tripleCount, duration, importId]
    );
  }

  private async failImport(importId: string, error: any): Promise<void> {
    await this.pool.query(
      `UPDATE yago_imports
       SET import_end_time = NOW(),
           success = false,
           error_message = $1
       WHERE id = $2`,
      [error.message, importId]
    );
  }

  private async showSummary(): Promise<void> {
    console.log('\n📊 Import Summary');
    console.log('═'.repeat(50));

    const summary = await this.pool.query('SELECT * FROM get_yago_summary()');
    if (summary.rows.length > 0) {
      const data = summary.rows[0];
      console.log(`Total imports: ${data.total_imports}`);
      console.log(`Total triples: ${data.total_triples}`);
      console.log(`Versions: ${data.versions?.join(', ') || 'N/A'}`);
      console.log(`Contexts: ${data.contexts?.join(', ') || 'N/A'}`);
    }

    // Show stats by subset
    const stats = await this.pool.query('SELECT * FROM yago_stats ORDER BY subset');
    if (stats.rows.length > 0) {
      console.log('\nBy subset:');
      stats.rows.forEach(row => {
        console.log(`  ${row.subset}: ${row.total_triples} triples (${row.successful_imports} successful imports)`);
      });
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: ImportOptions = {
    subset: 'all',
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  };

  // Parse arguments
  const subsetIndex = args.findIndex(a => a === '--subset');
  if (subsetIndex !== -1 && args[subsetIndex + 1]) {
    options.subset = args[subsetIndex + 1] as any;
  }

  const fileIndex = args.findIndex(a => a === '--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    options.file = args[fileIndex + 1];
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run yago:import [options]

Options:
  --subset <type>    Import specific subset: taxonomy, schema, facts, or all (default: all)
  --file <filename>  Import specific file
  --dry-run          Parse files but don't insert into database
  --verbose          Show detailed output
  --help, -h         Show this help message

Examples:
  npm run yago:import                          # Import all files
  npm run yago:import -- --subset taxonomy     # Import only taxonomy
  npm run yago:import -- --file yago-facts.ttl # Import specific file
  npm run yago:import -- --dry-run             # Test without importing
    `);
    process.exit(0);
  }

  const importer = new YAGOImporter();
  await importer.import(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { YAGOImporter, ImportOptions };
