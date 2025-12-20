/**
 * RDF Parser for YAGO Turtle files
 * Parses Turtle (.ttl) format into subject-predicate-object triples
 */

export interface RDFTriple {
  subject: string;
  predicate: string;
  object: string;
  datatype?: string;
  language?: string;
}

export interface ParseOptions {
  skipComments?: boolean;
  skipPrefixes?: boolean;
  batchSize?: number;
}

export class RDFParser {
  private prefixes: Map<string, string> = new Map();
  private currentBatchSize: number = 0;

  /**
   * Parse a Turtle file line by line
   * @param lines Lines from the Turtle file
   * @param options Parsing options
   * @returns Array of RDF triples
   */
  parseLines(lines: string[], options: ParseOptions = {}): RDFTriple[] {
    const triples: RDFTriple[] = [];
    const { skipComments = true, skipPrefixes = false } = options;

    let currentSubject = '';
    let currentPredicate = '';

    for (let line of lines) {
      line = line.trim();

      // Skip empty lines
      if (!line) continue;

      // Skip comments
      if (skipComments && line.startsWith('#')) continue;

      // Handle prefixes
      if (line.startsWith('@prefix') || line.startsWith('PREFIX')) {
        if (!skipPrefixes) {
          this.parsePrefix(line);
        }
        continue;
      }

      // Handle base declarations
      if (line.startsWith('@base') || line.startsWith('BASE')) {
        continue;
      }

      // Parse triple
      try {
        const triple = this.parseTripleLine(line, currentSubject, currentPredicate);
        if (triple) {
          triples.push(triple);

          // Update current subject/predicate for abbreviated syntax
          if (triple.subject) currentSubject = triple.subject;
          if (triple.predicate) currentPredicate = triple.predicate;
        }
      } catch (error) {
        console.warn(`Failed to parse line: ${line}`, error);
      }
    }

    return triples;
  }

  /**
   * Parse a single triple line
   */
  private parseTripleLine(
    line: string,
    currentSubject: string,
    currentPredicate: string
  ): RDFTriple | null {
    // Remove trailing period
    line = line.replace(/\s*\.\s*$/, '').trim();

    if (!line) return null;

    // Split by whitespace (simplified - doesn't handle all edge cases)
    const parts = this.splitTriple(line);

    if (parts.length < 3) {
      // Handle abbreviated syntax (comma or semicolon)
      if (line.startsWith(',') || line.startsWith(';')) {
        // TODO: Implement abbreviated syntax support
        return null;
      }
      return null;
    }

    const [subject, predicate, ...objectParts] = parts;
    const object = objectParts.join(' ');

    return {
      subject: this.expandPrefix(subject),
      predicate: this.expandPrefix(predicate),
      object: this.parseObject(object),
    };
  }

  /**
   * Split triple handling quoted strings
   */
  private splitTriple(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';

      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        current += char;
      } else if (char === ' ' && !inQuotes && current) {
        parts.push(current);
        current = '';
      } else if (char !== ' ' || inQuotes) {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Parse object value (literal, URI, or blank node)
   */
  private parseObject(object: string): string {
    // Remove surrounding quotes for literals
    if (object.startsWith('"') && object.includes('"')) {
      // Handle datatype or language tag
      const match = object.match(/"([^"]*)"(?:@([a-z]+)|\^\^(.+))?/);
      if (match) {
        return match[1]; // Return just the literal value
      }
    }

    // Expand prefixed URIs
    if (object.includes(':') && !object.startsWith('http')) {
      return this.expandPrefix(object);
    }

    // Remove angle brackets from URIs
    if (object.startsWith('<') && object.endsWith('>')) {
      return object.slice(1, -1);
    }

    return object;
  }

  /**
   * Parse prefix declaration
   */
  private parsePrefix(line: string): void {
    // @prefix schema: <http://schema.org/> .
    const match = line.match(/@?prefix\s+([^:]+):\s*<([^>]+)>/i);
    if (match) {
      this.prefixes.set(match[1].trim(), match[2]);
    }
  }

  /**
   * Expand prefixed URI
   */
  private expandPrefix(uri: string): string {
    if (uri.startsWith('<') && uri.endsWith('>')) {
      return uri.slice(1, -1);
    }

    const colonIndex = uri.indexOf(':');
    if (colonIndex > 0) {
      const prefix = uri.substring(0, colonIndex);
      const localPart = uri.substring(colonIndex + 1);
      const baseUri = this.prefixes.get(prefix);
      if (baseUri) {
        return baseUri + localPart;
      }
    }

    return uri;
  }

  /**
   * Get all parsed prefixes
   */
  getPrefixes(): Map<string, string> {
    return new Map(this.prefixes);
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.prefixes.clear();
    this.currentBatchSize = 0;
  }
}

/**
 * Utility function to parse RDF from string
 */
export function parseRDF(content: string, options?: ParseOptions): RDFTriple[] {
  const parser = new RDFParser();
  const lines = content.split('\n');
  return parser.parseLines(lines, options);
}
