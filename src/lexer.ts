import { CompilerError } from "./errors";

export type TokenType =
  | "PRINT"
  | "STRING"
  | "INTEGER"
  | "IDENT"
  | "PLUS"
  | "MINUS"
  | "MUL"
  | "LPAREN"
  | "RPAREN"
  | "LBRACE"
  | "RBRACE"
  | "EQUAL"
  | "SEMICOLON"
  | "TRUE"
  | "FALSE"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    // Skip whitespace
    if (char !== undefined && /\s/.test(char)) {
      i++;
      continue;
    }

    // Match '(' and ')'
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "LBRACE", value: "{" });
      i++;
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "RBRACE", value: "}" });
      i++;
      continue;
    }
    if (char === ";") {
      tokens.push({ type: "SEMICOLON", value: ";" });
      i++;
      continue;
    }
    if (char === "+") {
      tokens.push({ type: "PLUS", value: "+" });
      i++;
      continue;
    }
    if (char === "-") {
      tokens.push({ type: "MINUS", value: "-" });
      i++;
      continue;
    }
    if (char === "*") {
      tokens.push({ type: "MUL", value: "*" });
      i++;
      continue;
    }
    if (char === "=") {
      tokens.push({ type: "EQUAL", value: "=" });
      i++;
      continue;
    }

    // Match String Literals: "hello world"
    if (char === '"') {
      let value = "";
      i++; // Skip opening quote
      while (i < source.length && source[i] !== '"') {
        value += source[i];
        i++;
      }
      if (i >= source.length) {
        throw new CompilerError("Unterminated string literal");
      }
      i++; // Skip closing quote
      tokens.push({ type: "STRING", value });
      continue;
    }

    // Match Integer Literals: 42
    if (char !== undefined && /[0-9]/.test(char)) {
      let value = "";
      while (i < source.length) {
        const next = source[i];
        if (next === undefined || !/[0-9]/.test(next)) break;
        value += next;
        i++;
      }
      tokens.push({ type: "INTEGER", value });
      continue;
    }

    // Match Keywords / Identifiers: print
    if (char !== undefined && /[a-zA-Z_]/.test(char)) {
      let ident = "";
      while (i < source.length) {
        const next = source[i];
        if (next === undefined || !/[a-zA-Z0-9_]/.test(next)) break;
        ident += next;
        i++;
      }
      if (ident === "print") {
        tokens.push({ type: "PRINT", value: "print" });
      } else if (ident === "true") {
        tokens.push({ type: "TRUE", value: "true" });
      } else if (ident === "false") {
        tokens.push({ type: "FALSE", value: "false" });
      } else {
        tokens.push({ type: "IDENT", value: ident });
      }
      continue;
    }

    throw new CompilerError(`Unexpected character: ${char}`);
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}
