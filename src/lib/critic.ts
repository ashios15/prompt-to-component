/**
 * Deterministic static critic for LLM-generated React components.
 *
 * This is the whole point of v2: we don't trust the model, we parse what it
 * produced and check invariants. If anything fails, the caller can re-prompt
 * with the specific issues — closed-loop, no human needed.
 *
 * Pure. Synchronous. No network. Fully unit-tested.
 */

import { parse, type ParserPlugin } from "@babel/parser";
import traverse from "@babel/traverse";
import type { File } from "@babel/types";

export type CriticSeverity = "error" | "warning";

export interface CriticIssue {
  code: string;
  severity: CriticSeverity;
  message: string;
  /** 1-based line number; -1 when unknown (e.g. syntax errors reported without a loc). */
  line: number;
}

export interface CriticReport {
  ok: boolean;
  issues: CriticIssue[];
  /** True iff the input parses. When false, no further checks ran. */
  parsed: boolean;
}

export interface CriticOptions {
  /**
   * Modules the component is allowed to import from. Anything else becomes an
   * error. `react` is always allowed implicitly.
   */
  allowedImports?: readonly string[];
  /**
   * If true, `dangerouslySetInnerHTML` is permitted. Off by default — the LLM
   * should not be producing it in a sandboxed preview.
   */
  allowDangerousHtml?: boolean;
}

const DEFAULT_ALLOWED = new Set(["react"]);
const PLUGINS: ParserPlugin[] = ["jsx", "typescript"];

export function critique(code: string, options: CriticOptions = {}): CriticReport {
  const issues: CriticIssue[] = [];
  const allowed = new Set(DEFAULT_ALLOWED);
  for (const m of options.allowedImports ?? []) allowed.add(m);

  let ast: File;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: PLUGINS,
      errorRecovery: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Babel errors like "Unexpected token (5:12)" — parse the line if present.
    const match = /\((\d+):\d+\)/.exec(message);
    const line = match && match[1] ? parseInt(match[1], 10) : -1;
    return {
      ok: false,
      parsed: false,
      issues: [
        { code: "syntax", severity: "error", message: `Syntax error: ${message}`, line },
      ],
    };
  }

  let defaultExports = 0;
  let hasExportedComponent = false;

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (!allowed.has(source)) {
        issues.push({
          code: "import-not-allowed",
          severity: "error",
          message: `Import from "${source}" is not allowed. Preview supports only: ${[...allowed].join(", ")}.`,
          line: path.node.loc?.start.line ?? -1,
        });
      }
    },

    ExportDefaultDeclaration(path) {
      defaultExports++;
      const decl = path.node.declaration;
      // Accept: function decl, arrow/expression, or identifier referring to a component.
      if (
        decl.type === "FunctionDeclaration" ||
        decl.type === "ArrowFunctionExpression" ||
        decl.type === "FunctionExpression" ||
        decl.type === "Identifier" ||
        decl.type === "CallExpression"
      ) {
        hasExportedComponent = true;
      }
    },

    JSXAttribute(path) {
      if (
        !options.allowDangerousHtml &&
        path.node.name.type === "JSXIdentifier" &&
        path.node.name.name === "dangerouslySetInnerHTML"
      ) {
        issues.push({
          code: "dangerous-html",
          severity: "error",
          message: "dangerouslySetInnerHTML is not allowed in the preview sandbox.",
          line: path.node.loc?.start.line ?? -1,
        });
      }
    },

    CallExpression(path) {
      // Hook rules (abridged): a `useX(...)` call must live at the top level of
      // a function body, never inside a conditional, loop, or logical guard.
      const callee = path.node.callee;
      const name =
        callee.type === "Identifier"
          ? callee.name
          : callee.type === "MemberExpression" && callee.property.type === "Identifier"
            ? callee.property.name
            : null;
      if (!name || !isHookName(name)) return;

      const parent = path.findParent(
        (p) =>
          p.isIfStatement() ||
          p.isConditionalExpression() ||
          p.isLogicalExpression() ||
          p.isForStatement() ||
          p.isWhileStatement() ||
          p.isDoWhileStatement() ||
          p.isSwitchStatement()
      );
      if (parent) {
        issues.push({
          code: "hook-conditional",
          severity: "error",
          message: `Hook ${name}() must not be called conditionally. Move it to the top level of the component body.`,
          line: path.node.loc?.start.line ?? -1,
        });
      }
    },
  });

  if (defaultExports === 0) {
    issues.push({
      code: "no-default-export",
      severity: "error",
      message: "The component must have a default export (e.g. `export default function Component() { … }`).",
      line: -1,
    });
  } else if (defaultExports > 1) {
    issues.push({
      code: "multiple-default-exports",
      severity: "error",
      message: `Found ${defaultExports} default exports; exactly one is required.`,
      line: -1,
    });
  } else if (!hasExportedComponent) {
    issues.push({
      code: "default-export-shape",
      severity: "error",
      message: "The default export must be a function component, identifier, or call expression.",
      line: -1,
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return { ok: !hasErrors, parsed: true, issues };
}

/**
 * Render a critic report as a compact, model-friendly feedback string for the
 * repair step. Keeps the format small so it fits comfortably in a short prompt.
 */
export function formatIssuesForRepair(issues: CriticIssue[]): string {
  if (issues.length === 0) return "No issues.";
  return issues
    .map((i) => {
      const loc = i.line > 0 ? `line ${i.line}` : "somewhere";
      return `- [${i.code}] ${loc}: ${i.message}`;
    })
    .join("\n");
}

function isHookName(name: string): boolean {
  if (!name.startsWith("use")) return false;
  if (name.length < 4) return false;
  const fourth = name.charAt(3);
  return fourth === fourth.toUpperCase() && fourth !== fourth.toLowerCase();
}
