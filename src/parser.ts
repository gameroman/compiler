import { CompilerError } from "./errors";
import { Token, TokenType } from "./lexer";

export interface StringLiteralNode {
  kind: "StringLiteral";
  value: string;
}

export interface IntegerLiteralNode {
  kind: "IntegerLiteral";
  value: number;
}

export type IntegerExprNode =
  | IntegerLiteralNode
  | BinaryExprNode
  | UnaryExprNode;

export interface BinaryExprNode {
  kind: "BinaryExpr";
  operator: "+" | "-" | "*";
  left: IntegerExprNode;
  right: IntegerExprNode;
}

export interface UnaryExprNode {
  kind: "UnaryExpr";
  operator: "-" | "+";
  operand: IntegerExprNode;
}

export type ExpressionNode = StringLiteralNode | IntegerExprNode;

export interface PrintStatementNode {
  kind: "PrintStatement";
  argument?: ExpressionNode;
}

export interface ExpressionStatementNode {
  kind: "ExpressionStatement";
  argument: ExpressionNode;
}

export type ASTNode = PrintStatementNode | ExpressionStatementNode;

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
      const statement: PrintStatementNode = { kind: "PrintStatement" };
      if (peek(state).type !== "RPAREN") {
        statement.argument = parseExpression(state);
      }
      consume(state, "RPAREN");
      ast.push(statement);
    } else {
      ast.push({
        kind: "ExpressionStatement",
        argument: parseExpression(state),
      });
    }
  }

  return ast;
}

function parseExpression(state: ParserState): ExpressionNode {
  if (peek(state).type === "STRING") {
    const strToken = consume(state, "STRING");
    return { kind: "StringLiteral", value: strToken.value };
  }
  if (peek(state).type === "LPAREN") {
    consume(state, "LPAREN");
    const inner = parseExpression(state);
    consume(state, "RPAREN");
    if (inner.kind === "StringLiteral") return inner;
    return parseAdditiveContinuation(
      state,
      parseMultiplicativeContinuation(state, inner),
    );
  }
  return parseAdditiveExpression(state);
}

function peek(state: ParserState): Token {
  return state.tokens[state.current];
}

function consume(state: ParserState, expectedType: TokenType): Token {
  const token = state.tokens[state.current];
  if (token.type !== expectedType) {
    throw new CompilerError(
      `Expected token ${expectedType}, got ${token.type}`,
    );
  }
  state.current++;
  return token;
}

function parsePrimary(state: ParserState): IntegerExprNode {
  if (peek(state).type === "LPAREN") {
    consume(state, "LPAREN");
    const inner = parseAdditiveExpression(state);
    consume(state, "RPAREN");
    return inner;
  }
  const token = consume(state, "INTEGER");
  return { kind: "IntegerLiteral", value: Number(token.value) };
}

function parseUnary(state: ParserState): IntegerExprNode {
  const tokenType = peek(state).type;
  if (tokenType === "MINUS" || tokenType === "PLUS") {
    consume(state, tokenType);
    return {
      kind: "UnaryExpr",
      operator: tokenType === "MINUS" ? "-" : "+",
      operand: parseUnary(state),
    };
  }
  return parsePrimary(state);
}

function parseMultiplicativeExpression(state: ParserState): IntegerExprNode {
  return parseMultiplicativeContinuation(state, parseUnary(state));
}

function parseMultiplicativeContinuation(
  state: ParserState,
  left: IntegerExprNode,
): IntegerExprNode {
  let result = left;
  while (peek(state).type === "MUL") {
    consume(state, "MUL");
    const right = parseUnary(state);
    result = { kind: "BinaryExpr", operator: "*", left: result, right };
  }
  return result;
}

function parseAdditiveExpression(state: ParserState): IntegerExprNode {
  return parseAdditiveContinuation(state, parseMultiplicativeExpression(state));
}

function parseAdditiveContinuation(
  state: ParserState,
  left: IntegerExprNode,
): IntegerExprNode {
  let result = left;
  while (peek(state).type === "PLUS" || peek(state).type === "MINUS") {
    const operator = peek(state).type === "PLUS" ? "+" : "-";
    consume(state, peek(state).type);
    const right = parseMultiplicativeExpression(state);
    result = { kind: "BinaryExpr", operator, left: result, right };
  }
  return result;
}
