import { Token, TokenType } from "./lexer";

export interface StringLiteralNode {
  kind: "StringLiteral";
  value: string;
}

export interface IntegerLiteralNode {
  kind: "IntegerLiteral";
  value: number;
}

export type ExpressionNode = StringLiteralNode | IntegerLiteralNode;

export interface PrintStatementNode {
  kind: "PrintStatement";
  argument: ExpressionNode;
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

      let argument: ExpressionNode;
      if (peek().type === "STRING") {
        const strToken = consume("STRING");
        argument = { kind: "StringLiteral", value: strToken.value };
      } else {
        const intToken = consume("INTEGER");
        argument = { kind: "IntegerLiteral", value: Number(intToken.value) };
      }

      consume("RPAREN");
      ast.push({ kind: "PrintStatement", argument });
    } else {
      throw new Error(`Unexpected token at root level: ${peek().type}`);
    }
  }

  return ast;
}
