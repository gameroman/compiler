import { Token, TokenType } from "./lexer";

export interface StringLiteralNode {
  kind: "StringLiteral";
  value: string;
}

export interface IntegerLiteralNode {
  kind: "IntegerLiteral";
  value: number;
}

export type IntegerExprNode = IntegerLiteralNode | BinaryExprNode;

export interface BinaryExprNode {
  kind: "BinaryExpr";
  operator: "+";
  left: IntegerExprNode;
  right: IntegerExprNode;
}

export type ExpressionNode = StringLiteralNode | IntegerExprNode;

export interface PrintStatementNode {
  kind: "PrintStatement";
  argument: ExpressionNode;
}

export type ASTNode = PrintStatementNode;

interface ParserState {
  tokens: Token[];
  current: number;
}

export function parse(tokens: Token[]): ASTNode[] {
  const state: ParserState = { tokens, current: 0 };
  const ast: ASTNode[] = [];

  while (peek(state).type !== "EOF") {
    if (peek(state).type === "SEMICOLON") {
      consume(state, "SEMICOLON");
      continue;
    }

    if (peek(state).type === "PRINT") {
      consume(state, "PRINT");
      consume(state, "LPAREN");

      let argument: ExpressionNode;
      if (peek(state).type === "STRING") {
        const strToken = consume(state, "STRING");
        argument = { kind: "StringLiteral", value: strToken.value };
      } else {
        argument = parseAdditiveExpression(state);
      }

      consume(state, "RPAREN");
      ast.push({ kind: "PrintStatement", argument });
    } else {
      throw new Error(`Unexpected token at root level: ${peek(state).type}`);
    }
  }

  return ast;
}

function peek(state: ParserState): Token {
  return state.tokens[state.current];
}

function consume(state: ParserState, expectedType: TokenType): Token {
  const token = state.tokens[state.current];
  if (token.type !== expectedType) {
    throw new Error(`Expected token ${expectedType}, got ${token.type}`);
  }
  state.current++;
  return token;
}

function parseTerm(state: ParserState): IntegerLiteralNode {
  const token = consume(state, "INTEGER");
  return { kind: "IntegerLiteral", value: Number(token.value) };
}

function parseAdditiveExpression(state: ParserState): IntegerExprNode {
  let left: IntegerExprNode = parseTerm(state);
  while (peek(state).type === "PLUS") {
    consume(state, "PLUS");
    const right = parseTerm(state);
    left = { kind: "BinaryExpr", operator: "+", left, right };
  }
  return left;
}
