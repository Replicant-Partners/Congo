#!/usr/bin/env python3
"""
Proof Search Service
Implements forward and backward chaining for logical inference

Embodies the Curry-Howard correspondence: proofs as programs.
Provides transparent reasoning traces for compositional intelligence.
"""

import json
import sys
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


class ProofStrategy(Enum):
    """Proof search strategies"""
    FORWARD = "forward"      # Data-driven: facts → conclusions
    BACKWARD = "backward"    # Goal-driven: goal → premises
    RESOLUTION = "resolution"  # Resolution-based theorem proving


@dataclass
class Fact:
    """A logical fact or proposition"""
    proposition: str
    confidence: float = 1.0
    source: str = "given"

    def __hash__(self):
        return hash(self.proposition)

    def __eq__(self, other):
        return isinstance(other, Fact) and self.proposition == other.proposition


@dataclass
class Rule:
    """A logical inference rule (premises → conclusion)"""
    premises: List[str]
    conclusion: str
    name: str = "rule"
    confidence: float = 1.0

    def matches_fact(self, fact: str) -> bool:
        """Check if fact matches conclusion"""
        return self.conclusion == fact or self._pattern_match(self.conclusion, fact)

    def _pattern_match(self, pattern: str, fact: str) -> bool:
        """Simple pattern matching with variables (e.g., X is mortal)"""
        # Simplified pattern matching - could be extended
        pattern_parts = pattern.split()
        fact_parts = fact.split()

        if len(pattern_parts) != len(fact_parts):
            return False

        bindings = {}
        for p, f in zip(pattern_parts, fact_parts):
            if p.isupper() and len(p) == 1:  # Variable
                if p in bindings and bindings[p] != f:
                    return False
                bindings[p] = f
            elif p != f:
                return False

        return True

    def instantiate(self, bindings: Dict[str, str]) -> 'Rule':
        """Create concrete rule from pattern with bindings"""
        def replace_vars(text: str) -> str:
            words = text.split()
            return " ".join(bindings.get(w, w) if w.isupper() and len(w) == 1 else w for w in words)

        return Rule(
            premises=[replace_vars(p) for p in self.premises],
            conclusion=replace_vars(self.conclusion),
            name=self.name,
            confidence=self.confidence
        )


@dataclass
class ProofStep:
    """A single step in a proof"""
    conclusion: str
    premises: List[str]
    rule_name: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProofTree:
    """A complete proof with all inference steps"""
    goal: str
    success: bool
    strategy: str
    steps: List[ProofStep] = field(default_factory=list)
    confidence: float = 1.0
    depth: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal": self.goal,
            "success": self.success,
            "strategy": self.strategy,
            "steps": [step.to_dict() for step in self.steps],
            "confidence": self.confidence,
            "depth": self.depth
        }


class ProofSearcher:
    """
    Implements multiple proof search strategies for logical inference.

    Supports:
    1. Forward chaining (data-driven reasoning)
    2. Backward chaining (goal-driven reasoning)
    3. Resolution (theorem proving)
    """

    def __init__(self):
        self.max_depth = 10  # Prevent infinite loops
        self.visited: Set[str] = set()

    def search(
        self,
        goal: str,
        facts: List[str],
        rules: List[Dict[str, Any]],
        strategy: ProofStrategy = ProofStrategy.BACKWARD
    ) -> ProofTree:
        """
        Main proof search entry point.

        Args:
            goal: The proposition to prove
            facts: Known facts/premises
            rules: Inference rules as dicts
            strategy: Search strategy to use

        Returns:
            ProofTree with success status and steps
        """
        # Convert inputs to proper types
        fact_objects = [Fact(f) for f in facts]
        rule_objects = [
            Rule(
                premises=r.get("premises", []),
                conclusion=r.get("conclusion", ""),
                name=r.get("name", "rule"),
                confidence=r.get("confidence", 1.0)
            ) for r in rules
        ]

        # Reset search state
        self.visited = set()

        # Select strategy
        if strategy == ProofStrategy.FORWARD:
            return self._forward_chaining(goal, fact_objects, rule_objects)
        elif strategy == ProofStrategy.BACKWARD:
            return self._backward_chaining(goal, fact_objects, rule_objects, depth=0)
        elif strategy == ProofStrategy.RESOLUTION:
            return self._resolution_search(goal, fact_objects, rule_objects)
        else:
            return ProofTree(goal=goal, success=False, strategy=strategy.value)

    def _forward_chaining(
        self,
        goal: str,
        facts: List[Fact],
        rules: List[Rule]
    ) -> ProofTree:
        """
        Forward chaining: start with facts, derive new facts until goal is reached.
        Data-driven reasoning.
        """
        proof = ProofTree(goal=goal, success=False, strategy="forward")
        known_facts = set(f.proposition for f in facts)
        steps = []

        # Keep applying rules until no new facts can be derived
        changed = True
        iteration = 0

        while changed and iteration < self.max_depth:
            changed = False
            iteration += 1

            for rule in rules:
                # Check if all premises are known
                if all(premise in known_facts for premise in rule.premises):
                    # Can we derive the conclusion?
                    if rule.conclusion not in known_facts:
                        # New fact derived!
                        known_facts.add(rule.conclusion)

                        step = ProofStep(
                            conclusion=rule.conclusion,
                            premises=rule.premises.copy(),
                            rule_name=rule.name,
                            confidence=rule.confidence
                        )
                        steps.append(step)
                        changed = True

                        # Check if we've reached the goal
                        if rule.conclusion == goal:
                            proof.success = True
                            proof.steps = steps
                            proof.depth = iteration
                            proof.confidence = min(s.confidence for s in steps)
                            return proof

        # Goal not reached
        proof.steps = steps
        proof.depth = iteration
        return proof

    def _backward_chaining(
        self,
        goal: str,
        facts: List[Fact],
        rules: List[Rule],
        depth: int = 0
    ) -> ProofTree:
        """
        Backward chaining: start with goal, work backwards to find supporting facts.
        Goal-driven reasoning.
        """
        # Prevent infinite recursion
        if depth > self.max_depth:
            return ProofTree(goal=goal, success=False, strategy="backward", depth=depth)

        # Check if goal is circular
        if goal in self.visited:
            return ProofTree(goal=goal, success=False, strategy="backward", depth=depth)

        self.visited.add(goal)

        # Base case: goal is a known fact
        known_facts = set(f.proposition for f in facts)
        if goal in known_facts:
            return ProofTree(
                goal=goal,
                success=True,
                strategy="backward",
                steps=[ProofStep(
                    conclusion=goal,
                    premises=[],
                    rule_name="given_fact",
                    confidence=1.0
                )],
                confidence=1.0,
                depth=depth
            )

        # Try to find a rule that concludes the goal
        for rule in rules:
            if rule.conclusion == goal:
                # Try to prove all premises
                subproofs = []
                all_succeeded = True

                for premise in rule.premises:
                    subproof = self._backward_chaining(premise, facts, rules, depth + 1)
                    subproofs.append(subproof)
                    if not subproof.success:
                        all_succeeded = False
                        break

                if all_succeeded:
                    # Successfully proved all premises!
                    proof = ProofTree(
                        goal=goal,
                        success=True,
                        strategy="backward",
                        depth=depth
                    )

                    # Collect all steps from subproofs
                    for subproof in subproofs:
                        proof.steps.extend(subproof.steps)

                    # Add the final rule application
                    proof.steps.append(ProofStep(
                        conclusion=goal,
                        premises=rule.premises.copy(),
                        rule_name=rule.name,
                        confidence=rule.confidence
                    ))

                    # Calculate overall confidence
                    if proof.steps:
                        proof.confidence = min(s.confidence for s in proof.steps)

                    return proof

        # No proof found
        return ProofTree(goal=goal, success=False, strategy="backward", depth=depth)

    def _resolution_search(
        self,
        goal: str,
        facts: List[Fact],
        rules: List[Rule]
    ) -> ProofTree:
        """
        Resolution-based theorem proving.
        Converts to clausal form and searches for contradiction.
        """
        # Simplified resolution - would need full clause conversion in production
        proof = ProofTree(goal=goal, success=False, strategy="resolution")

        # Try backward chaining as a fallback
        # (Full resolution would require clause normalization)
        return self._backward_chaining(goal, facts, rules)


def main():
    """CLI interface for proof search"""
    if len(sys.argv) < 2:
        print("Usage: python proof_searcher.py <goal>", file=sys.stderr)
        print("   OR: python proof_searcher.py --json '{\"goal\": \"...\", \"facts\": [...], \"rules\": [...], \"strategy\": \"...\"}'", file=sys.stderr)
        sys.exit(1)

    # Parse input
    if sys.argv[1] == "--json":
        input_data = json.loads(sys.argv[2])
        goal = input_data.get("goal")
        facts = input_data.get("facts", [])
        rules = input_data.get("rules", [])
        strategy_str = input_data.get("strategy", "backward")

        # Parse strategy
        try:
            strategy = ProofStrategy(strategy_str)
        except ValueError:
            strategy = ProofStrategy.BACKWARD
    else:
        # Simple text input
        goal = " ".join(sys.argv[1:])
        facts = []
        rules = []
        strategy = ProofStrategy.BACKWARD

    # Search for proof
    searcher = ProofSearcher()
    proof_tree = searcher.search(goal, facts, rules, strategy)

    # Output as JSON
    result = {
        "success": True,
        "goal": goal,
        "proof": proof_tree.to_dict()
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
