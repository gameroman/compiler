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
  | "EQEQ"
  | "NOTEQ"
  | "BANG"
  | "SEMICOLON"
  | "TRUE"
  | "FALSE"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
}

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  "(": "LPAREN",
  ")": "RPAREN",
  "{": "LBRACE",
  "}": "RBRACE",
  ";": "SEMICOLON",
  "+": "PLUS",
  "-": "MINUS",
  "*": "MUL",
  "=": "EQUAL",
  "!": "BANG",
};

const TWO_CHAR_TOKENS: Record<string, TokenType> = {
  "==": "EQEQ",
  "!=": "NOTEQ",
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];
    if (char === undefined) break;

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    const twoChar = source.slice(i, i + 2);
    const twoCharTokenType = TWO_CHAR_TOKENS[twoChar];
    if (twoCharTokenType !== undefined) {
      tokens.push({ type: twoCharTokenType, value: twoChar });
      i += 2;
      continue;
    }

    const tokenType = SINGLE_CHAR_TOKENS[char];
    if (tokenType !== undefined) {
      tokens.push({ type: tokenType, value: char });
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
    if (/[0-9]/.test(char)) {
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
    if (/[a-zA-Z_]/.test(char)) {
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
