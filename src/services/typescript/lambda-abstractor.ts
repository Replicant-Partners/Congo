/**
 * Lambda Abstraction Service
 * Converts processes and code into lambda calculus representations
 *
 * Implements Montague-style compositional semantics using functional decomposition.
 * Demonstrates how complex operations are composed from simpler lambda terms.
 */

import * as ts from "typescript";

/**
 * Lambda term types in the untyped lambda calculus
 */
export type LambdaTerm =
  | { type: "variable"; name: string }
  | { type: "abstraction"; param: string; body: LambdaTerm; paramType?: string }
  | { type: "application"; func: LambdaTerm; arg: LambdaTerm }
  | { type: "constant"; value: any; valueType?: string };

/**
 * Typed lambda term with explicit type annotations
 */
export interface TypedLambdaTerm {
  type: "variable" | "abstraction" | "application" | "constant";
  inferredType?: string;
}

/**
 * Result of lambda abstraction analysis
 */
export interface AbstractionResult {
  success: boolean;
  input: string;
  inputType: "code" | "natural_language" | "mathematical";
  lambdaTerm: LambdaTerm;
  notation: string; // Traditional lambda notation
  curried: string; // Curried form
  betaReduced?: string; // After beta reduction
  typeSignature?: string;
  complexity: number; // Nesting depth
  variables: string[];
  freeVariables: string[];
}

/**
 * Lambda Abstractor - converts various inputs to lambda calculus
 */
export class LambdaAbstractor {
  /**
   * Main abstraction method - dispatches to appropriate converter
   */
  abstract(input: string, inputType?: string): AbstractionResult {
    // Auto-detect input type if not specified
    const detectedType = inputType || this.detectInputType(input);

    let lambdaTerm: LambdaTerm;

    switch (detectedType) {
      case "code":
        lambdaTerm = this.abstractFromCode(input);
        break;
      case "mathematical":
        lambdaTerm = this.abstractFromMath(input);
        break;
      case "natural_language":
      default:
        lambdaTerm = this.abstractFromNaturalLanguage(input);
        break;
    }

    // Analyze the term
    const notation = this.toNotation(lambdaTerm);
    const curried = this.toCurriedForm(lambdaTerm);
    const variables = this.extractVariables(lambdaTerm);
    const freeVars = this.findFreeVariables(lambdaTerm);
    const complexity = this.calculateComplexity(lambdaTerm);

    // Try beta reduction
    const reduced = this.betaReduce(lambdaTerm);
    const betaReduced = reduced !== lambdaTerm ? this.toNotation(reduced) : undefined;

    // Infer type signature
    const typeSignature = this.inferType(lambdaTerm);

    return {
      success: true,
      input,
      inputType: detectedType as any,
      lambdaTerm,
      notation,
      curried,
      betaReduced,
      typeSignature,
      complexity,
      variables,
      freeVariables: freeVars,
    };
  }

  /**
   * Detect the type of input
   */
  private detectInputType(input: string): string {
    // Check for code patterns
    if (
      input.includes("function") ||
      input.includes("=>") ||
      input.includes("const") ||
      input.includes("return")
    ) {
      return "code";
    }

    // Check for mathematical notation
    if (input.includes("λ") || input.includes("\\") || /^[a-z]\s*\.\s*/.test(input)) {
      return "mathematical";
    }

    // Default to natural language
    return "natural_language";
  }

  /**
   * Abstract from TypeScript/JavaScript code
   */
  private abstractFromCode(code: string): LambdaTerm {
    try {
      // Parse as TypeScript
      const sourceFile = ts.createSourceFile("temp.ts", code, ts.ScriptTarget.Latest, true);

      // Find the first function or arrow function
      let lambdaTerm: LambdaTerm | null = null;

      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
          lambdaTerm = this.convertTSFunction(node);
        } else if (ts.isArrowFunction(node)) {
          lambdaTerm = this.convertTSArrowFunction(node);
        }

        if (!lambdaTerm) {
          ts.forEachChild(node, visit);
        }
      };

      visit(sourceFile);

      if (lambdaTerm) {
        return lambdaTerm;
      }
    } catch (e) {
      // Fall through to simple parsing
    }

    // Simple arrow function parser
    const arrowMatch = code.match(/\(([^)]*)\)\s*=>\s*(.+)/);
    if (arrowMatch) {
      const params = arrowMatch[1]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
      const body = arrowMatch[2].trim();

      // Build nested abstractions (currying)
      let term: LambdaTerm = this.parseExpression(body);
      for (let i = params.length - 1; i >= 0; i--) {
        term = {
          type: "abstraction",
          param: params[i],
          body: term,
        };
      }
      return term;
    }

    // Fallback: treat as variable or constant
    return { type: "constant", value: code };
  }

  /**
   * Convert TypeScript function declaration to lambda term
   */
  private convertTSFunction(node: ts.FunctionDeclaration | ts.FunctionExpression): LambdaTerm {
    const params = node.parameters.map((p) => (p.name as ts.Identifier).text);
    let body: LambdaTerm;

    if (node.body && ts.isBlock(node.body)) {
      // Extract return statement
      const returnStmt = node.body.statements.find(ts.isReturnStatement);
      if (returnStmt?.expression) {
        body = this.convertExpression(returnStmt.expression);
      } else {
        body = { type: "constant", value: "block" };
      }
    } else {
      body = { type: "constant", value: "expression" };
    }

    // Curry the parameters
    let term = body;
    for (let i = params.length - 1; i >= 0; i--) {
      term = {
        type: "abstraction",
        param: params[i],
        body: term,
      };
    }

    return term;
  }

  /**
   * Convert TypeScript arrow function to lambda term
   */
  private convertTSArrowFunction(node: ts.ArrowFunction): LambdaTerm {
    const params = node.parameters.map((p) => (p.name as ts.Identifier).text);
    const body = this.convertExpression(node.body as ts.Expression);

    // Curry the parameters
    let term = body;
    for (let i = params.length - 1; i >= 0; i--) {
      term = {
        type: "abstraction",
        param: params[i],
        body: term,
      };
    }

    return term;
  }

  /**
   * Convert TypeScript expression to lambda term
   */
  private convertExpression(expr: ts.Expression): LambdaTerm {
    if (ts.isIdentifier(expr)) {
      return { type: "variable", name: expr.text };
    }

    if (ts.isCallExpression(expr)) {
      const func = this.convertExpression(expr.expression);
      const args = expr.arguments.map((arg) => this.convertExpression(arg as ts.Expression));

      // Build application chain
      let term = func;
      for (const arg of args) {
        term = {
          type: "application",
          func: term,
          arg,
        };
      }
      return term;
    }

    // Fallback
    return { type: "constant", value: expr.getText() };
  }

  /**
   * Abstract from mathematical notation (λx. body)
   */
  private abstractFromMath(math: string): LambdaTerm {
    // Replace λ with backslash for easier parsing
    let normalized = math.replace(/λ/g, "\\");

    // Parse λx. body or \x. body
    const lambdaMatch = normalized.match(/\\([a-z])\s*\.\s*(.+)/);
    if (lambdaMatch) {
      const param = lambdaMatch[1];
      const body = this.abstractFromMath(lambdaMatch[2]);

      return {
        type: "abstraction",
        param,
        body,
      };
    }

    // Parse application: f x
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
      let term: LambdaTerm = { type: "variable", name: parts[0] };

      for (let i = 1; i < parts.length; i++) {
        term = {
          type: "application",
          func: term,
          arg: { type: "variable", name: parts[i] },
        };
      }

      return term;
    }

    // Single variable or constant
    return { type: "variable", name: normalized.trim() };
  }

  /**
   * Abstract from natural language description
   */
  private abstractFromNaturalLanguage(nl: string): LambdaTerm {
    const lower = nl.toLowerCase();

    // Pattern: "map X to Y" or "for each X, compute Y"
    const mapMatch = lower.match(/map\s+(\w+)\s+to\s+(.+)/);
    if (mapMatch) {
      const param = mapMatch[1];
      const body = this.parseExpression(mapMatch[2]);

      return {
        type: "abstraction",
        param,
        body,
      };
    }

    // Pattern: "apply F to X"
    const applyMatch = lower.match(/apply\s+(\w+)\s+to\s+(\w+)/);
    if (applyMatch) {
      return {
        type: "application",
        func: { type: "variable", name: applyMatch[1] },
        arg: { type: "variable", name: applyMatch[2] },
      };
    }

    // Pattern: "compose F and G"
    const composeMatch = lower.match(/compose\s+(\w+)\s+and\s+(\w+)/);
    if (composeMatch) {
      // λx. f(g(x))
      const f = composeMatch[1];
      const g = composeMatch[2];

      return {
        type: "abstraction",
        param: "x",
        body: {
          type: "application",
          func: { type: "variable", name: f },
          arg: {
            type: "application",
            func: { type: "variable", name: g },
            arg: { type: "variable", name: "x" },
          },
        },
      };
    }

    // Fallback: create identity or constant
    return { type: "constant", value: nl };
  }

  /**
   * Parse a simple expression into lambda term
   */
  private parseExpression(expr: string): LambdaTerm {
    const trimmed = expr.trim();

    // Function application: f(x)
    const funcMatch = trimmed.match(/(\w+)\(([^)]+)\)/);
    if (funcMatch) {
      return {
        type: "application",
        func: { type: "variable", name: funcMatch[1] },
        arg: this.parseExpression(funcMatch[2]),
      };
    }

    // Simple variable
    if (/^[a-z_]\w*$/i.test(trimmed)) {
      return { type: "variable", name: trimmed };
    }

    // Constant
    return { type: "constant", value: trimmed };
  }

  /**
   * Convert lambda term to standard notation (λx. body)
   */
  toNotation(term: LambdaTerm): string {
    switch (term.type) {
      case "variable":
        return term.name;

      case "constant":
        return String(term.value);

      case "abstraction":
        return `λ${term.param}. ${this.toNotation(term.body)}`;

      case "application":
        const funcStr = this.toNotation(term.func);
        const argStr = this.toNotation(term.arg);

        // Add parentheses if needed
        const needsParens = term.arg.type === "abstraction" || term.arg.type === "application";
        return `${funcStr} ${needsParens ? `(${argStr})` : argStr}`;
    }
  }

  /**
   * Convert to curried form showing nested structure
   */
  toCurriedForm(term: LambdaTerm): string {
    if (term.type === "abstraction") {
      // Collect all consecutive abstractions
      const params: string[] = [];
      let current: LambdaTerm = term;

      while (current.type === "abstraction") {
        params.push(current.param);
        current = current.body;
      }

      return `λ${params.join(" ")}. ${this.toNotation(current)}`;
    }

    return this.toNotation(term);
  }

  /**
   * Beta reduction: (λx. body) arg -> body[x := arg]
   */
  betaReduce(term: LambdaTerm): LambdaTerm {
    if (term.type === "application") {
      const { func, arg } = term;

      // Reduce function and argument first
      const reducedFunc = this.betaReduce(func);
      const reducedArg = this.betaReduce(arg);

      // If function is abstraction, substitute
      if (reducedFunc.type === "abstraction") {
        return this.substitute(reducedFunc.body, reducedFunc.param, reducedArg);
      }

      return { type: "application", func: reducedFunc, arg: reducedArg };
    }

    if (term.type === "abstraction") {
      return {
        ...term,
        body: this.betaReduce(term.body),
      };
    }

    return term;
  }

  /**
   * Substitute variable with term: body[param := replacement]
   */
  private substitute(body: LambdaTerm, param: string, replacement: LambdaTerm): LambdaTerm {
    switch (body.type) {
      case "variable":
        return body.name === param ? replacement : body;

      case "constant":
        return body;

      case "abstraction":
        if (body.param === param) {
          // Variable shadowing - don't substitute
          return body;
        }
        return {
          ...body,
          body: this.substitute(body.body, param, replacement),
        };

      case "application":
        return {
          type: "application",
          func: this.substitute(body.func, param, replacement),
          arg: this.substitute(body.arg, param, replacement),
        };
    }
  }

  /**
   * Extract all variables from term
   */
  private extractVariables(term: LambdaTerm): string[] {
    const vars = new Set<string>();

    const visit = (t: LambdaTerm) => {
      switch (t.type) {
        case "variable":
          vars.add(t.name);
          break;
        case "abstraction":
          vars.add(t.param);
          visit(t.body);
          break;
        case "application":
          visit(t.func);
          visit(t.arg);
          break;
      }
    };

    visit(term);
    return Array.from(vars);
  }

  /**
   * Find free variables (not bound by lambda)
   */
  private findFreeVariables(term: LambdaTerm, bound: Set<string> = new Set()): string[] {
    const free = new Set<string>();

    const visit = (t: LambdaTerm, boundVars: Set<string>) => {
      switch (t.type) {
        case "variable":
          if (!boundVars.has(t.name)) {
            free.add(t.name);
          }
          break;

        case "abstraction":
          const newBound = new Set(boundVars);
          newBound.add(t.param);
          visit(t.body, newBound);
          break;

        case "application":
          visit(t.func, boundVars);
          visit(t.arg, boundVars);
          break;
      }
    };

    visit(term, bound);
    return Array.from(free);
  }

  /**
   * Calculate complexity (nesting depth)
   */
  private calculateComplexity(term: LambdaTerm): number {
    switch (term.type) {
      case "variable":
      case "constant":
        return 1;

      case "abstraction":
        return 1 + this.calculateComplexity(term.body);

      case "application":
        return 1 + Math.max(this.calculateComplexity(term.func), this.calculateComplexity(term.arg));
    }
  }

  /**
   * Infer type signature (simple type inference)
   */
  private inferType(term: LambdaTerm): string {
    switch (term.type) {
      case "variable":
        return "α"; // Type variable

      case "constant":
        return typeof term.value;

      case "abstraction":
        const bodyType = this.inferType(term.body);
        return `α → ${bodyType}`;

      case "application":
        return this.inferType(term.func).split("→").pop()?.trim() || "β";
    }
  }
}

// CLI interface
if (require.main === module) {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: node lambda-abstractor.js <input>");
    console.error('   OR: node lambda-abstractor.js --json \'{"input": "...", "inputType": "..."}\'');
    process.exit(1);
  }

  let inputData: { input: string; inputType?: string };

  if (input === "--json") {
    inputData = JSON.parse(process.argv[3]);
  } else {
    inputData = { input: process.argv.slice(2).join(" ") };
  }

  const abstractor = new LambdaAbstractor();
  const result = abstractor.abstract(inputData.input, inputData.inputType);

  console.log(JSON.stringify(result, null, 2));
}
