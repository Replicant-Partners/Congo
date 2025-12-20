#!/usr/bin/env python3
"""
Neuro-Symbolic Integration Service
Hybrid reasoning combining neural (LLM) and symbolic (knowledge graph) AI

This is the showcase feature that demonstrates the full Congo River pipeline:
1. Neural: Parse natural language to logical form using LLM
2. Symbolic: Query knowledge graph with precise semantics
3. Synthesis: Combine results with LLM context and proof traces
4. Output: Grounded answer with transparent reasoning
"""

import json
import sys
import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import anthropic
from openai import OpenAI

# Import our other services
from triple_decomposer import TripleDecomposer, Triple as DecomposedTriple
from graph_engine import GraphEngine, QueryResult
from proof_searcher import ProofSearcher, ProofTree


@dataclass
class NeuroSymbolicResult:
    """Result of neuro-symbolic query"""
    success: bool
    query: str
    answer: str
    confidence: float

    # Neural components
    logical_form: str
    parsed_intent: Dict[str, Any]

    # Symbolic components
    graph_query: str
    graph_results: List[Dict[str, Any]]
    proof_trace: Optional[Dict[str, Any]]

    # Synthesis
    reasoning_steps: List[str]
    sources: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class NeuroSymbolicEngine:
    """
    Orchestrates neuro-symbolic reasoning pipeline.

    Pipeline stages:
    1. Intent Recognition (Neural): What is the user asking?
    2. Logical Form Parsing (Neural): Convert to structured query
    3. Knowledge Retrieval (Symbolic): Query graph for facts
    4. Proof Construction (Symbolic): Build reasoning trace
    5. Answer Synthesis (Neural): Generate natural language answer
    """

    def __init__(self):
        # Initialize LLM clients
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

        if self.anthropic_key:
            self.anthropic = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.anthropic = None

        if self.openai_key:
            self.openai = OpenAI(api_key=self.openai_key)
        else:
            self.openai = None

        # Initialize symbolic services
        self.triple_decomposer = TripleDecomposer()
        self.graph_engine = GraphEngine()
        self.proof_searcher = ProofSearcher()

    def query(
        self,
        natural_language_query: str,
        include_proof: bool = True,
        llm_provider: str = "anthropic"
    ) -> NeuroSymbolicResult:
        """
        Main neuro-symbolic query method.

        Args:
            natural_language_query: User's question in natural language
            include_proof: Whether to construct proof traces
            llm_provider: "anthropic" or "openai"

        Returns:
            NeuroSymbolicResult with answer and reasoning
        """
        reasoning_steps = []

        # Stage 1: Parse intent and extract entities (Neural)
        reasoning_steps.append("Parsing query intent with LLM")
        parsed_intent = self._parse_intent(natural_language_query, llm_provider)
        reasoning_steps.append(f"Intent: {parsed_intent.get('intent_type', 'query')}")

        # Stage 2: Convert to logical form (Neural)
        reasoning_steps.append("Converting to logical form")
        logical_form = self._to_logical_form(natural_language_query, parsed_intent, llm_provider)
        reasoning_steps.append(f"Logical form: {logical_form}")

        # Stage 3: Decompose key concepts into triples (Symbolic)
        reasoning_steps.append("Decomposing concepts into RDF triples")
        key_entities = parsed_intent.get("entities", [])
        triples_data = []

        for entity in key_entities:
            decomposed = self.triple_decomposer.decompose(entity)
            triples_data.extend(decomposed)
            # Add to graph engine
            for triple in decomposed:
                from graph_engine import Triple
                self.graph_engine.add_triple(Triple(
                    subject=triple.subject,
                    predicate=triple.predicate,
                    object=triple.object
                ))

        reasoning_steps.append(f"Extracted {len(triples_data)} triples from entities")

        # Stage 4: Query knowledge graph (Symbolic)
        reasoning_steps.append("Querying knowledge graph")
        graph_query = self._construct_graph_query(parsed_intent, logical_form)

        try:
            if graph_query.startswith("SELECT") or graph_query.startswith("CONSTRUCT"):
                # SPARQL query
                query_result = self.graph_engine.query_sparql(graph_query)
            else:
                # Natural language query
                query_result = self.graph_engine.query_natural_language(graph_query)

            graph_results = [t.to_dict() for t in query_result.triples]
            reasoning_steps.append(f"Found {len(graph_results)} relevant triples")
        except Exception as e:
            graph_results = []
            reasoning_steps.append(f"Graph query failed: {str(e)}")

        # Stage 5: Construct proof if requested (Symbolic)
        proof_trace = None

        if include_proof and parsed_intent.get("intent_type") == "reasoning":
            reasoning_steps.append("Constructing proof trace")
            goal = parsed_intent.get("goal", "")

            if goal:
                # Extract facts from graph results
                facts = [f"{t['subject']} {t['predicate']} {t['object']}" for t in graph_results[:5]]

                # Simple inference rules
                rules = [
                    {
                        "premises": ["X has_property awareness"],
                        "conclusion": "X is_a conscious_entity",
                        "name": "consciousness_rule"
                    },
                    {
                        "premises": ["X is_a Y", "Y is_a Z"],
                        "conclusion": "X is_a Z",
                        "name": "transitivity"
                    }
                ]

                try:
                    proof = self.proof_searcher.search(goal, facts, rules)
                    proof_trace = proof.to_dict()
                    reasoning_steps.append(f"Proof {'found' if proof.success else 'not found'}")
                except Exception as e:
                    reasoning_steps.append(f"Proof search failed: {str(e)}")

        # Stage 6: Synthesize answer (Neural)
        reasoning_steps.append("Synthesizing natural language answer")
        answer = self._synthesize_answer(
            natural_language_query,
            graph_results,
            proof_trace,
            parsed_intent,
            llm_provider
        )

        # Calculate confidence based on evidence
        confidence = self._calculate_confidence(graph_results, proof_trace)

        return NeuroSymbolicResult(
            success=True,
            query=natural_language_query,
            answer=answer,
            confidence=confidence,
            logical_form=logical_form,
            parsed_intent=parsed_intent,
            graph_query=graph_query,
            graph_results=graph_results,
            proof_trace=proof_trace,
            reasoning_steps=reasoning_steps,
            sources=["knowledge_graph", "llm_synthesis"]
        )

    def _parse_intent(self, query: str, llm_provider: str) -> Dict[str, Any]:
        """Parse user intent using LLM"""
        prompt = f"""Analyze this query and extract structured information:

Query: "{query}"

Provide a JSON response with:
- intent_type: "factual", "reasoning", "definition", "relationship", or "comparison"
- entities: list of key concepts/entities mentioned
- goal: what the user wants to know (rephrased as a statement to prove)
- context: any relevant context or constraints

Respond with ONLY valid JSON, no other text."""

        try:
            if llm_provider == "anthropic" and self.anthropic:
                response = self.anthropic.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                result_text = response.content[0].text
            elif llm_provider == "openai" and self.openai:
                response = self.openai.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=500
                )
                result_text = response.choices[0].message.content
            else:
                # Fallback to simple parsing
                return {
                    "intent_type": "factual",
                    "entities": query.split()[:3],
                    "goal": query,
                    "context": ""
                }

            # Parse JSON from response
            return json.loads(result_text)
        except Exception as e:
            print(f"Intent parsing error: {e}", file=sys.stderr)
            # Fallback
            return {
                "intent_type": "factual",
                "entities": [word for word in query.split() if len(word) > 3][:3],
                "goal": query,
                "context": ""
            }

    def _to_logical_form(self, query: str, intent: Dict[str, Any], llm_provider: str) -> str:
        """Convert natural language to logical form"""
        prompt = f"""Convert this query to first-order logic or a structured logical form:

Query: "{query}"
Intent: {intent.get('intent_type')}
Entities: {', '.join(intent.get('entities', []))}

Express the query as a logical statement using predicates and quantifiers.
Example: "What properties does consciousness have?" → "∃P. has_property(consciousness, P)"

Respond with ONLY the logical form, no explanation."""

        try:
            if llm_provider == "anthropic" and self.anthropic:
                response = self.anthropic.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text.strip()
            elif llm_provider == "openai" and self.openai:
                response = self.openai.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200
                )
                return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Logical form error: {e}", file=sys.stderr)

        # Fallback: simple predicate form
        entities = intent.get("entities", [])
        if len(entities) >= 2:
            return f"related({entities[0]}, {entities[1]})"
        elif len(entities) == 1:
            return f"query({entities[0]})"
        return f"query({query})"

    def _construct_graph_query(self, intent: Dict[str, Any], logical_form: str) -> str:
        """Construct graph query from intent and logical form"""
        intent_type = intent.get("intent_type", "factual")
        entities = intent.get("entities", [])

        if intent_type == "definition" and entities:
            # Find all triples about this entity
            return f"Show everything about {entities[0]}"

        elif intent_type == "relationship" and len(entities) >= 2:
            # Find relationships between entities
            return f"""
            SELECT ?p WHERE {{
                <{entities[0]}> ?p <{entities[1]}> .
            }}
            """

        elif intent_type == "reasoning":
            # Use natural language for complex reasoning
            return intent.get("goal", logical_form)

        else:
            # Default: find properties of first entity
            if entities:
                return f"Find all properties of {entities[0]}"
            return logical_form

    def _synthesize_answer(
        self,
        query: str,
        graph_results: List[Dict[str, Any]],
        proof_trace: Optional[Dict[str, Any]],
        intent: Dict[str, Any],
        llm_provider: str
    ) -> str:
        """Synthesize natural language answer from symbolic results"""

        # Format graph results
        facts_str = "\n".join([
            f"- {r['subject']} {r['predicate']} {r['object']}"
            for r in graph_results[:10]
        ])

        # Format proof if available
        proof_str = ""
        if proof_trace and proof_trace.get("success"):
            proof_str = f"\nProof steps: {len(proof_trace.get('steps', []))} inference steps"

        prompt = f"""Based on the knowledge graph and reasoning below, answer this question:

Question: "{query}"

Knowledge from graph:
{facts_str if facts_str else "No direct facts found in knowledge graph."}
{proof_str}

Provide a clear, concise answer that:
1. Directly addresses the question
2. Cites specific facts from the knowledge graph
3. Explains any reasoning steps
4. Admits uncertainty if evidence is insufficient

Answer:"""

        try:
            if llm_provider == "anthropic" and self.anthropic:
                response = self.anthropic.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=400,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text.strip()
            elif llm_provider == "openai" and self.openai:
                response = self.openai.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=400
                )
                return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Answer synthesis error: {e}", file=sys.stderr)

        # Fallback: simple answer from facts
        if graph_results:
            first_result = graph_results[0]
            return f"Based on the knowledge graph: {first_result['subject']} {first_result['predicate']} {first_result['object']}."

        return "I don't have enough information in the knowledge graph to answer this question confidently."

    def _calculate_confidence(
        self,
        graph_results: List[Dict[str, Any]],
        proof_trace: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate confidence score based on evidence quality"""
        confidence = 0.0

        # Confidence from graph results
        if graph_results:
            # More results = higher confidence (up to 0.7)
            confidence += min(0.7, len(graph_results) * 0.1)

        # Confidence from proof
        if proof_trace and proof_trace.get("success"):
            # Successful proof adds 0.3
            confidence += 0.3

        return min(1.0, confidence)


def main():
    """CLI interface for neuro-symbolic queries"""
    if len(sys.argv) < 2:
        print("Usage: python neuro_symbolic.py <query>", file=sys.stderr)
        print('   OR: python neuro_symbolic.py --json \'{"query": "...", "include_proof": true, "llm_provider": "anthropic"}\'', file=sys.stderr)
        sys.exit(1)

    # Parse input
    if sys.argv[1] == "--json":
        input_data = json.loads(sys.argv[2])
        query = input_data.get("query")
        include_proof = input_data.get("include_proof", True)
        llm_provider = input_data.get("llm_provider", "anthropic")
    else:
        query = " ".join(sys.argv[1:])
        include_proof = True
        llm_provider = "anthropic"

    # Execute neuro-symbolic query
    engine = NeuroSymbolicEngine()
    result = engine.query(query, include_proof, llm_provider)

    # Output as JSON
    output = {
        "success": True,
        "result": result.to_dict()
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
