#!/usr/bin/env python3
"""
Triple Decomposition Service
Decomposes complex concepts into RDF-style subject-predicate-object triples

Implements Stanley Fish's 3-word sentence principle for semantic analysis.
Uses spaCy for NLP parsing and linguistic structure extraction.
"""

import json
import sys
import spacy
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class Triple:
    """RDF-style triple representation"""
    subject: str
    predicate: str
    object: str
    confidence: float = 1.0
    source: str = "triple_decomposer"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class TripleDecomposer:
    """
    Decomposes natural language into semantic triples.

    Uses multiple strategies:
    1. Syntactic parsing (spaCy dependency trees)
    2. Entity-relation extraction
    3. Property attribution
    4. Taxonomic relationships (is_a, has_property, etc.)
    """

    def __init__(self):
        """Initialize with spaCy model"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("Error: spaCy model 'en_core_web_sm' not found.", file=sys.stderr)
            print("Install with: python -m spacy download en_core_web_sm", file=sys.stderr)
            sys.exit(1)

    def decompose(self, text: str, context: Optional[str] = None) -> List[Triple]:
        """
        Main decomposition method.

        Args:
            text: Natural language text to decompose
            context: Optional context/domain for disambiguation

        Returns:
            List of Triple objects
        """
        doc = self.nlp(text)
        triples = []

        # Strategy 1: Extract from dependency parse
        triples.extend(self._extract_from_dependencies(doc))

        # Strategy 2: Extract entity relationships
        triples.extend(self._extract_entity_relations(doc))

        # Strategy 3: Extract copula relationships (X is Y)
        triples.extend(self._extract_copula_relations(doc))

        # Strategy 4: Extract property attributions
        triples.extend(self._extract_properties(doc))

        # Deduplicate while preserving order
        seen = set()
        unique_triples = []
        for triple in triples:
            key = (triple.subject, triple.predicate, triple.object)
            if key not in seen:
                seen.add(key)
                unique_triples.append(triple)

        return unique_triples

    def _extract_from_dependencies(self, doc) -> List[Triple]:
        """Extract triples from spaCy dependency parse"""
        triples = []

        for token in doc:
            # Subject-Verb-Object patterns
            if token.dep_ in ("nsubj", "nsubjpass") and token.head.pos_ == "VERB":
                subject = self._get_compound_phrase(token)
                predicate = token.head.lemma_

                # Find object
                for child in token.head.children:
                    if child.dep_ in ("dobj", "attr", "oprd"):
                        obj = self._get_compound_phrase(child)
                        triples.append(Triple(
                            subject=subject,
                            predicate=predicate,
                            object=obj,
                            confidence=0.9
                        ))
                    elif child.dep_ == "prep":
                        # Prepositional phrases
                        for pobj in child.children:
                            if pobj.dep_ == "pobj":
                                obj = self._get_compound_phrase(pobj)
                                predicate_full = f"{predicate}_{child.lemma_}"
                                triples.append(Triple(
                                    subject=subject,
                                    predicate=predicate_full,
                                    object=obj,
                                    confidence=0.85
                                ))

        return triples

    def _extract_entity_relations(self, doc) -> List[Triple]:
        """Extract relationships between named entities"""
        triples = []
        entities = list(doc.ents)

        for i, ent1 in enumerate(entities):
            for ent2 in entities[i+1:]:
                # Find connecting verb or relation
                relation = self._find_relation_between(ent1, ent2, doc)
                if relation:
                    triples.append(Triple(
                        subject=ent1.text,
                        predicate=relation,
                        object=ent2.text,
                        confidence=0.8
                    ))

        return triples

    def _extract_copula_relations(self, doc) -> List[Triple]:
        """Extract 'X is Y' type relationships"""
        triples = []

        for token in doc:
            if token.lemma_ == "be" and token.pos_ == "AUX":
                # Find subject
                subject = None
                obj = None

                for child in token.children:
                    if child.dep_ in ("nsubj", "nsubjpass"):
                        subject = self._get_compound_phrase(child)
                    elif child.dep_ in ("attr", "acomp"):
                        obj = self._get_compound_phrase(child)

                if subject and obj:
                    triples.append(Triple(
                        subject=subject,
                        predicate="is_a",
                        object=obj,
                        confidence=0.95
                    ))

        return triples

    def _extract_properties(self, doc) -> List[Triple]:
        """Extract property attributions (X has property Y)"""
        triples = []

        for token in doc:
            # Adjective modifiers
            if token.pos_ == "ADJ" and token.head.pos_ in ("NOUN", "PROPN"):
                subject = self._get_compound_phrase(token.head)
                property_value = token.text
                triples.append(Triple(
                    subject=subject,
                    predicate="has_property",
                    object=property_value,
                    confidence=0.85
                ))

            # Possessive relationships
            if token.dep_ == "poss":
                subject = self._get_compound_phrase(token.head)
                owner = token.text
                triples.append(Triple(
                    subject=subject,
                    predicate="owned_by",
                    object=owner,
                    confidence=0.9
                ))

        return triples

    def _get_compound_phrase(self, token) -> str:
        """Get the full compound phrase for a token"""
        # Collect compounds
        compounds = [child for child in token.children if child.dep_ == "compound"]
        phrase = " ".join([c.text for c in compounds] + [token.text])
        return phrase

    def _find_relation_between(self, ent1, ent2, doc) -> Optional[str]:
        """Find the relation/verb connecting two entities"""
        # Simple heuristic: find verb between entities
        start = min(ent1.start, ent2.start)
        end = max(ent1.end, ent2.end)

        for token in doc[start:end]:
            if token.pos_ == "VERB":
                return token.lemma_

        return "relates_to"  # Default relation


def main():
    """CLI interface for triple decomposition"""
    if len(sys.argv) < 2:
        print("Usage: python triple_decomposer.py <text>", file=sys.stderr)
        print("   OR: python triple_decomposer.py --json '{\"text\": \"...\", \"context\": \"...\"}'", file=sys.stderr)
        sys.exit(1)

    # Parse input
    if sys.argv[1] == "--json":
        # JSON input
        input_data = json.loads(sys.argv[2])
        text = input_data.get("text") or input_data.get("concept")
        context = input_data.get("context")
    else:
        # Plain text input
        text = " ".join(sys.argv[1:])
        context = None

    # Decompose
    decomposer = TripleDecomposer()
    triples = decomposer.decompose(text, context)

    # Output as JSON
    result = {
        "success": True,
        "input": text,
        "context": context,
        "triples": [t.to_dict() for t in triples],
        "count": len(triples)
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
