#!/usr/bin/env python3
"""
Graph Query Engine
SPARQL-like queries over RDF knowledge graphs

Implements semantic web operations using rdflib.
Supports both structured queries and natural language query translation.
"""

import json
import sys
import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from rdflib import Graph, Namespace, Literal, URIRef, RDF, RDFS
from rdflib.plugins.sparql import prepareQuery
import psycopg2
from psycopg2.extras import RealDictCursor


# Custom namespace for Congo River ontology
CR = Namespace("http://congoriver.ai/ontology#")


@dataclass
class Triple:
    """RDF Triple representation"""
    subject: str
    predicate: str
    object: str
    context: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_rdf_tuple(self) -> Tuple[URIRef, URIRef, Any]:
        """Convert to rdflib tuple format"""
        subj = URIRef(self.subject) if self.subject.startswith("http") else CR[self.subject]
        pred = URIRef(self.predicate) if self.predicate.startswith("http") else CR[self.predicate]

        # Handle object - could be URI or Literal
        if self.object.startswith("http"):
            obj = URIRef(self.object)
        elif self._looks_like_number(self.object):
            obj = Literal(float(self.object) if "." in self.object else int(self.object))
        else:
            obj = Literal(self.object)

        return (subj, pred, obj)

    def _looks_like_number(self, s: str) -> bool:
        """Check if string represents a number"""
        try:
            float(s)
            return True
        except ValueError:
            return False


@dataclass
class QueryResult:
    """Result of a graph query"""
    success: bool
    query: str
    query_type: str
    triples: List[Triple]
    bindings: List[Dict[str, str]]  # For SELECT queries
    count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "query": self.query,
            "query_type": self.query_type,
            "triples": [t.to_dict() for t in self.triples],
            "bindings": self.bindings,
            "count": self.count
        }


class GraphEngine:
    """
    Knowledge graph query engine using rdflib.

    Supports:
    1. SPARQL queries (structured)
    2. Triple pattern matching
    3. Path queries (subject → predicate → object chains)
    4. Natural language query translation (basic)
    5. Integration with PostgreSQL triple store
    """

    def __init__(self, db_url: Optional[str] = None):
        """Initialize graph engine with optional database connection"""
        self.graph = Graph()
        self.graph.bind("cr", CR)
        self.graph.bind("rdf", RDF)
        self.graph.bind("rdfs", RDFS)

        self.db_url = db_url or os.getenv("CLOUD_DB_URL")

        # Load triples from database if available
        if self.db_url:
            self._load_from_database()

    def _load_from_database(self):
        """Load triples from PostgreSQL into in-memory graph"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute("SELECT subject, predicate, object FROM triples LIMIT 10000")
            rows = cursor.fetchall()

            for row in rows:
                triple = Triple(
                    subject=row["subject"],
                    predicate=row["predicate"],
                    object=row["object"]
                )
                self.graph.add(triple.to_rdf_tuple())

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"Warning: Could not load from database: {e}", file=sys.stderr)

    def add_triple(self, triple: Triple):
        """Add a triple to the in-memory graph"""
        self.graph.add(triple.to_rdf_tuple())

    def add_triples(self, triples: List[Triple]):
        """Add multiple triples"""
        for triple in triples:
            self.add_triple(triple)

    def query_sparql(self, sparql_query: str) -> QueryResult:
        """
        Execute a SPARQL query on the graph.

        Args:
            sparql_query: SPARQL query string

        Returns:
            QueryResult with bindings or triples
        """
        try:
            results = self.graph.query(sparql_query)

            # Convert results to standard format
            bindings = []
            triples = []

            # Check query type
            query_lower = sparql_query.lower()

            if "select" in query_lower:
                # SELECT query - return bindings
                for row in results:
                    binding = {}
                    for var, value in row.asdict().items():
                        binding[var] = str(value)
                    bindings.append(binding)

                return QueryResult(
                    success=True,
                    query=sparql_query,
                    query_type="select",
                    triples=[],
                    bindings=bindings,
                    count=len(bindings)
                )

            elif "construct" in query_lower:
                # CONSTRUCT query - return triples
                for s, p, o in results:
                    triples.append(Triple(
                        subject=str(s),
                        predicate=str(p),
                        object=str(o)
                    ))

                return QueryResult(
                    success=True,
                    query=sparql_query,
                    query_type="construct",
                    triples=triples,
                    bindings=[],
                    count=len(triples)
                )

            else:
                # ASK query or other
                return QueryResult(
                    success=True,
                    query=sparql_query,
                    query_type="ask",
                    triples=[],
                    bindings=[{"result": str(results.askAnswer)}] if hasattr(results, 'askAnswer') else [],
                    count=1
                )

        except Exception as e:
            return QueryResult(
                success=False,
                query=sparql_query,
                query_type="error",
                triples=[],
                bindings=[{"error": str(e)}],
                count=0
            )

    def query_pattern(
        self,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        object: Optional[str] = None
    ) -> QueryResult:
        """
        Query using triple pattern (None = wildcard).

        Example: query_pattern(subject="consciousness", predicate=None, object=None)
        Returns all triples about consciousness.
        """
        # Convert to URIRefs/Literals
        s = CR[subject] if subject else None
        p = CR[predicate] if predicate else None
        o = Literal(object) if object and not object.startswith("http") else (URIRef(object) if object else None)

        triples = []
        for subj, pred, obj in self.graph.triples((s, p, o)):
            triples.append(Triple(
                subject=str(subj),
                predicate=str(pred),
                object=str(obj)
            ))

        return QueryResult(
            success=True,
            query=f"pattern({subject}, {predicate}, {object})",
            query_type="pattern",
            triples=triples,
            bindings=[],
            count=len(triples)
        )

    def query_path(self, start: str, path: List[str]) -> QueryResult:
        """
        Follow a path through the graph.

        Example: query_path("consciousness", ["has_property", "relates_to"])
        Returns entities reached by following these predicates.
        """
        current_nodes = [CR[start]]
        triples = []

        for predicate in path:
            next_nodes = []
            pred_uri = CR[predicate]

            for node in current_nodes:
                for s, p, o in self.graph.triples((node, pred_uri, None)):
                    triples.append(Triple(
                        subject=str(s),
                        predicate=str(p),
                        object=str(o)
                    ))
                    next_nodes.append(o)

            current_nodes = next_nodes

            if not current_nodes:
                break

        return QueryResult(
            success=True,
            query=f"path({start}, {path})",
            query_type="path",
            triples=triples,
            bindings=[],
            count=len(triples)
        )

    def query_natural_language(self, nl_query: str) -> QueryResult:
        """
        Translate natural language query to SPARQL (basic implementation).

        Examples:
        - "Find all properties of consciousness"
        - "What relates to awareness?"
        - "Show everything about qualia"
        """
        nl_lower = nl_query.lower()

        # Pattern: "find all properties of X"
        if "properties of" in nl_lower:
            entity = nl_lower.split("properties of")[-1].strip().strip("?.")
            return self.query_pattern(subject=entity, predicate="has_property")

        # Pattern: "what relates to X"
        elif "relates to" in nl_lower or "related to" in nl_lower:
            entity = nl_lower.split("relates to")[-1].strip() if "relates to" in nl_lower else nl_lower.split("related to")[-1].strip()
            entity = entity.strip("?.")

            # Find both directions
            result1 = self.query_pattern(subject=entity, predicate="relates_to")
            result2 = self.query_pattern(object=entity, predicate="relates_to")

            combined_triples = result1.triples + result2.triples
            return QueryResult(
                success=True,
                query=nl_query,
                query_type="natural_language",
                triples=combined_triples,
                bindings=[],
                count=len(combined_triples)
            )

        # Pattern: "show everything about X" or "what is X"
        elif "everything about" in nl_lower or "what is" in nl_lower:
            if "everything about" in nl_lower:
                entity = nl_lower.split("everything about")[-1].strip().strip("?.")
            else:
                entity = nl_lower.split("what is")[-1].strip().strip("?.")

            # Get all triples with entity as subject
            return self.query_pattern(subject=entity)

        # Pattern: "find X that Y"
        elif "find" in nl_lower and "that" in nl_lower:
            # Simple subject-predicate extraction
            parts = nl_lower.split("that")
            if len(parts) >= 2:
                predicate_part = parts[1].strip().strip("?.")
                # Try to extract predicate
                words = predicate_part.split()
                if len(words) >= 1:
                    predicate = "_".join(words[:2]) if len(words) >= 2 else words[0]
                    return self.query_pattern(predicate=predicate)

        # Fallback: return all triples (limited)
        return QueryResult(
            success=False,
            query=nl_query,
            query_type="natural_language",
            triples=[],
            bindings=[{"error": "Could not parse natural language query. Try SPARQL or pattern matching."}],
            count=0
        )

    def get_statistics(self) -> Dict[str, Any]:
        """Get graph statistics"""
        return {
            "triple_count": len(self.graph),
            "unique_subjects": len(set(s for s, _, _ in self.graph)),
            "unique_predicates": len(set(p for _, p, _ in self.graph)),
            "unique_objects": len(set(o for _, _, o in self.graph))
        }


def main():
    """CLI interface for graph queries"""
    if len(sys.argv) < 2:
        print("Usage: python graph_engine.py <query>", file=sys.stderr)
        print("   OR: python graph_engine.py --json '{\"query\": \"...\", \"query_type\": \"sparql|pattern|natural\", ...}'", file=sys.stderr)
        sys.exit(1)

    # Parse input
    if sys.argv[1] == "--json":
        input_data = json.loads(sys.argv[2])
        query = input_data.get("query")
        query_type = input_data.get("query_type", "natural")
        triples_data = input_data.get("triples", [])

        # Initialize engine
        engine = GraphEngine()

        # Add any provided triples
        if triples_data:
            triples = [Triple(**t) for t in triples_data]
            engine.add_triples(triples)

        # Execute query based on type
        if query_type == "sparql":
            result = engine.query_sparql(query)
        elif query_type == "pattern":
            # Extract pattern components
            subject = input_data.get("subject")
            predicate = input_data.get("predicate")
            obj = input_data.get("object")
            result = engine.query_pattern(subject, predicate, obj)
        elif query_type == "path":
            start = input_data.get("start")
            path = input_data.get("path", [])
            result = engine.query_path(start, path)
        else:  # natural language
            result = engine.query_natural_language(query)

    else:
        # Simple text query (natural language)
        query = " ".join(sys.argv[1:])
        engine = GraphEngine()
        result = engine.query_natural_language(query)

    # Output as JSON
    output = {
        "success": True,
        "result": result.to_dict(),
        "statistics": engine.get_statistics()
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
