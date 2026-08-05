import { Token, TokenType } from "./lexer";

export interface PrintStatementNode {
  kind: "PrintStatement";
  textToPrint: string;
}

export type ASTNode = PrintStatementNode;

export function parse(tokens: Token[]): ASTNode[] {
  let current = 0;

  function peek(): Token {
    return tokens[current];
  }
  function consume(expectedType: TokenType): Token {
    const token = tokens[current];
    if (token.type !== expectedType) {
      throw new Error(`Expected token ${expectedType}, got ${token.type}`);
    }
    current++;
    return token;
  }

  const ast: ASTNode[] = [];

  while (peek().type !== "EOF") {
    if (peek().type === "PRINT") {
      consume("PRINT");
      consume("LPAREN");
      const strToken = consume("STRING");
      consume("RPAREN");

      ast.push({
        kind: "PrintStatement",
        textToPrint: strToken.value,
      });
    } else {
      throw new Error(`Unexpected token at root level: ${peek().type}`);
    }
  }

  return ast;
}
