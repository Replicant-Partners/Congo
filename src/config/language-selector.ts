/**
 * Language Selection Scoring System
 * Meta-level decision engine for choosing optimal implementation language
 *
 * Embodies compositional intelligence: each component should be implemented
 * in the language best suited to its requirements.
 */

export type ProgrammingLanguage = 'TypeScript' | 'Python' | 'Prolog' | 'Rust' | 'Go';

export interface ComponentRequirements {
  needsLogic: boolean | number;          // Logic programming, theorem proving
  needsGraphOps: boolean | number;       // RDF, SPARQL, graph algorithms
  needsTypeSystem: boolean | number;     // Strong static typing
  needsPerformance: boolean | number;    // High-performance computing
  needsMLLibraries: boolean | number;    // Machine learning, NLP
  needsSemanticWeb: boolean | number;    // RDF, OWL, ontologies
  needsConcurrency: boolean | number;    // Async/parallel processing
  needsWebIntegration: boolean | number; // HTTP, REST, SSE
  needsDataScience: boolean | number;    // Numerical computing, data analysis
}

export interface LanguageScoreReasoning {
  ecosystem: number;      // Library availability (0-10)
  performance: number;    // Runtime speed (0-10)
  typing: number;        // Type safety (0-10)
  interop: number;       // Integration ease (0-10)
  expertise: number;     // Development ease (0-10)
}

export interface LanguageScore {
  language: ProgrammingLanguage;
  score: number;
  reasoning: LanguageScoreReasoning;
  rationale: string;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Language capability matrix
 * Scores represent inherent strengths (0-10 scale)
 */
const LANGUAGE_CAPABILITIES: Record<ProgrammingLanguage, Record<keyof ComponentRequirements, number>> = {
  TypeScript: {
    needsLogic: 6,
    needsGraphOps: 6,
    needsTypeSystem: 10,
    needsPerformance: 8,
    needsMLLibraries: 5,
    needsSemanticWeb: 6,
    needsConcurrency: 9,
    needsWebIntegration: 10,
    needsDataScience: 4,
  },
  Python: {
    needsLogic: 8,
    needsGraphOps: 10,
    needsTypeSystem: 6,
    needsPerformance: 6,
    needsMLLibraries: 10,
    needsSemanticWeb: 10,
    needsConcurrency: 7,
    needsWebIntegration: 9,
    needsDataScience: 10,
  },
  Prolog: {
    needsLogic: 10,
    needsGraphOps: 5,
    needsTypeSystem: 7,
    needsPerformance: 7,
    needsMLLibraries: 3,
    needsSemanticWeb: 5,
    needsConcurrency: 5,
    needsWebIntegration: 4,
    needsDataScience: 3,
  },
  Rust: {
    needsLogic: 5,
    needsGraphOps: 7,
    needsTypeSystem: 10,
    needsPerformance: 10,
    needsMLLibraries: 6,
    needsSemanticWeb: 5,
    needsConcurrency: 10,
    needsWebIntegration: 8,
    needsDataScience: 5,
  },
  Go: {
    needsLogic: 5,
    needsGraphOps: 6,
    needsTypeSystem: 8,
    needsPerformance: 9,
    needsMLLibraries: 4,
    needsSemanticWeb: 5,
    needsConcurrency: 10,
    needsWebIntegration: 9,
    needsDataScience: 4,
  },
};

/**
 * Language ecosystem scores (independent of requirements)
 */
const LANGUAGE_ECOSYSTEM: Record<ProgrammingLanguage, LanguageScoreReasoning> = {
  TypeScript: {
    ecosystem: 9,
    performance: 8,
    typing: 10,
    interop: 9,
    expertise: 9,
  },
  Python: {
    ecosystem: 10,
    performance: 6,
    typing: 6,
    interop: 9,
    expertise: 10,
  },
  Prolog: {
    ecosystem: 5,
    performance: 7,
    typing: 7,
    interop: 5,
    expertise: 5,
  },
  Rust: {
    ecosystem: 7,
    performance: 10,
    typing: 10,
    interop: 7,
    expertise: 6,
  },
  Go: {
    ecosystem: 8,
    performance: 9,
    typing: 8,
    interop: 8,
    expertise: 8,
  },
};

/**
 * Language-specific strengths and weaknesses
 */
const LANGUAGE_CHARACTERISTICS = {
  TypeScript: {
    strengths: [
      'Excellent type system with inference',
      'Great async/await for concurrency',
      'Rich web ecosystem (Express, NestJS)',
      'Strong IDE support and tooling',
      'Easy Node.js integration',
    ],
    weaknesses: [
      'Limited ML/AI libraries compared to Python',
      'Not ideal for heavy numerical computation',
      'Smaller semantic web ecosystem',
    ],
  },
  Python: {
    strengths: [
      'Best-in-class ML/AI ecosystem (PyTorch, TensorFlow)',
      'Excellent semantic web libraries (rdflib, owlready2)',
      'Rich data science tools (NumPy, pandas)',
      'Clear, readable syntax',
      'Extensive NLP tools (spaCy, NLTK)',
    ],
    weaknesses: [
      'Weaker type system (even with type hints)',
      'Slower runtime performance',
      'GIL limits true parallelism',
    ],
  },
  Prolog: {
    strengths: [
      'Native logic programming and theorem proving',
      'Built-in backtracking and unification',
      'Excellent for rule-based systems',
      'Declarative problem solving',
    ],
    weaknesses: [
      'Limited general-purpose libraries',
      'Steeper learning curve',
      'Smaller community and ecosystem',
      'Harder to integrate with modern web stacks',
    ],
  },
  Rust: {
    strengths: [
      'Memory safety without garbage collection',
      'Exceptional performance',
      'Excellent concurrency model',
      'Strong type system',
    ],
    weaknesses: [
      'Steeper learning curve',
      'Longer development time',
      'Smaller ML/AI ecosystem',
      'Overkill for many tasks',
    ],
  },
  Go: {
    strengths: [
      'Simple, clean syntax',
      'Excellent concurrency (goroutines)',
      'Fast compilation and execution',
      'Great for microservices',
    ],
    weaknesses: [
      'Limited ML/AI libraries',
      'No generics (until recently)',
      'Smaller semantic web ecosystem',
    ],
  },
};

/**
 * Score languages for given requirements
 */
export function scoreLanguages(
  requirements: ComponentRequirements,
  weights?: Partial<ComponentRequirements>
): LanguageScore[] {
  const defaultWeights: ComponentRequirements = {
    needsLogic: 1.0,
    needsGraphOps: 1.0,
    needsTypeSystem: 1.0,
    needsPerformance: 1.0,
    needsMLLibraries: 1.0,
    needsSemanticWeb: 1.0,
    needsConcurrency: 1.0,
    needsWebIntegration: 1.0,
    needsDataScience: 1.0,
    ...weights,
  };

  const languages: ProgrammingLanguage[] = ['TypeScript', 'Python', 'Prolog', 'Rust', 'Go'];
  const scores: LanguageScore[] = [];

  for (const language of languages) {
    const capabilities = LANGUAGE_CAPABILITIES[language];
    const ecosystem = LANGUAGE_ECOSYSTEM[language];
    const characteristics = LANGUAGE_CHARACTERISTICS[language];

    // Calculate requirement match score
    let requirementScore = 0;
    let totalWeight = 0;

    for (const [req, value] of Object.entries(requirements) as [keyof ComponentRequirements, boolean | number][]) {
      if (value) {
        const weight = defaultWeights[req] as number;
        const capability = capabilities[req];
        requirementScore += capability * weight;
        totalWeight += 10 * weight; // Max score is 10
      }
    }

    // Normalize requirement score (0-100)
    const normalizedReqScore = totalWeight > 0 ? (requirementScore / totalWeight) * 100 : 0;

    // Calculate ecosystem score (0-100)
    const ecosystemScore =
      ((ecosystem.ecosystem +
        ecosystem.performance +
        ecosystem.typing +
        ecosystem.interop +
        ecosystem.expertise) /
        50) *
      100;

    // Final score is weighted combination
    const finalScore = normalizedReqScore * 0.7 + ecosystemScore * 0.3;

    // Generate rationale
    const rationale = generateRationale(language, requirements, capabilities, finalScore);

    scores.push({
      language,
      score: Math.round(finalScore * 10) / 10,
      reasoning: ecosystem,
      rationale,
      strengths: characteristics.strengths,
      weaknesses: characteristics.weaknesses,
    });
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Generate human-readable rationale for score
 */
function generateRationale(
  language: ProgrammingLanguage,
  requirements: ComponentRequirements,
  capabilities: Record<keyof ComponentRequirements, number>,
  score: number
): string {
  const reasons: string[] = [];

  // Identify strong matches
  const strongMatches: string[] = [];
  const weakMatches: string[] = [];

  for (const [req, value] of Object.entries(requirements) as [keyof ComponentRequirements, boolean][]) {
    if (value) {
      const capability = capabilities[req];
      const reqName = req.replace('needs', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();

      if (capability >= 8) {
        strongMatches.push(reqName);
      } else if (capability <= 5) {
        weakMatches.push(reqName);
      }
    }
  }

  if (strongMatches.length > 0) {
    reasons.push(`Strong fit for: ${strongMatches.join(', ')}`);
  }

  if (weakMatches.length > 0) {
    reasons.push(`Limited support for: ${weakMatches.join(', ')}`);
  }

  if (score >= 80) {
    reasons.push('Excellent overall match');
  } else if (score >= 60) {
    reasons.push('Good match with some trade-offs');
  } else if (score >= 40) {
    reasons.push('Moderate fit, consider alternatives');
  } else {
    reasons.push('Not recommended for these requirements');
  }

  return reasons.join('. ') + '.';
}

/**
 * Get recommended language (top scorer)
 */
export function recommendLanguage(requirements: ComponentRequirements): LanguageScore {
  const scores = scoreLanguages(requirements);
  return scores[0];
}

/**
 * Format scoring results for display
 */
export function formatScores(scores: LanguageScore[]): string {
  let output = '# Language Selection Analysis\n\n';

  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    const rank = i === 0 ? '🥇 RECOMMENDED' : i === 1 ? '🥈 Alternative' : `${i + 1}.`;

    output += `## ${rank} ${score.language} (Score: ${score.score}/100)\n\n`;
    output += `**Rationale:** ${score.rationale}\n\n`;

    output += `**Ecosystem Scores:**\n`;
    output += `- Library Ecosystem: ${score.reasoning.ecosystem}/10\n`;
    output += `- Performance: ${score.reasoning.performance}/10\n`;
    output += `- Type Safety: ${score.reasoning.typing}/10\n`;
    output += `- Integration: ${score.reasoning.interop}/10\n`;
    output += `- Developer Experience: ${score.reasoning.expertise}/10\n\n`;

    output += `**Strengths:**\n`;
    score.strengths.forEach((s) => (output += `- ${s}\n`));

    output += `\n**Weaknesses:**\n`;
    score.weaknesses.forEach((w) => (output += `- ${w}\n`));

    output += '\n---\n\n';
  }

  return output;
}

/**
 * Preset requirement profiles for common Congo River tasks
 */
export const TASK_PROFILES: Record<string, ComponentRequirements> = {
  tripleDecomposition: {
    needsLogic: false,
    needsGraphOps: true,
    needsTypeSystem: false,
    needsPerformance: false,
    needsMLLibraries: true,
    needsSemanticWeb: true,
    needsConcurrency: false,
    needsWebIntegration: false,
    needsDataScience: false,
  },
  proofSearch: {
    needsLogic: true,
    needsGraphOps: false,
    needsTypeSystem: true,
    needsPerformance: true,
    needsMLLibraries: false,
    needsSemanticWeb: false,
    needsConcurrency: false,
    needsWebIntegration: false,
    needsDataScience: false,
  },
  graphQuery: {
    needsLogic: false,
    needsGraphOps: true,
    needsTypeSystem: false,
    needsPerformance: true,
    needsMLLibraries: false,
    needsSemanticWeb: true,
    needsConcurrency: false,
    needsWebIntegration: false,
    needsDataScience: false,
  },
  lambdaAbstraction: {
    needsLogic: true,
    needsGraphOps: false,
    needsTypeSystem: true,
    needsPerformance: false,
    needsMLLibraries: false,
    needsSemanticWeb: false,
    needsConcurrency: false,
    needsWebIntegration: false,
    needsDataScience: false,
  },
  neuroSymbolic: {
    needsLogic: true,
    needsGraphOps: true,
    needsTypeSystem: false,
    needsPerformance: false,
    needsMLLibraries: true,
    needsSemanticWeb: true,
    needsConcurrency: true,
    needsWebIntegration: true,
    needsDataScience: true,
  },
};

/**
 * Validate language selection recommendations
 */
export function validateRecommendation(taskName: string): {
  recommended: string;
  score: number;
  analysis: string;
} {
  const profile = TASK_PROFILES[taskName];
  if (!profile) {
    throw new Error(`Unknown task profile: ${taskName}`);
  }

  const recommendation = recommendLanguage(profile);

  return {
    recommended: recommendation.language,
    score: recommendation.score,
    analysis: formatScores([recommendation]),
  };
}
