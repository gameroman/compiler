import { CompilerError } from "./errors";
import type { Token, TokenType } from "./lexer";

interface StringLiteralNode {
  kind: "StringLiteral";
  value: string;
}

interface BooleanLiteralNode {
  kind: "BooleanLiteral";
  value: boolean;
}

interface IntegerLiteralNode {
  kind: "IntegerLiteral";
  value: number;
}

export type IntegerExprNode =
  | IntegerLiteralNode
  | BinaryExprNode
  | UnaryExprNode
  | IdentifierNode;

interface IdentifierNode {
  kind: "Identifier";
  name: string;
}

interface BinaryExprNode {
  kind: "BinaryExpr";
  operator: "+" | "-" | "*";
  left: IntegerExprNode;
  right: IntegerExprNode;
}

interface UnaryExprNode {
  kind: "UnaryExpr";
  operator: "-" | "+";
  operand: IntegerExprNode;
}

interface ComparisonExprNode {
  kind: "ComparisonExpr";
  operator: "==" | "!=";
  left: ExpressionNode;
  right: ExpressionNode;
}

interface NotExprNode {
  kind: "NotExpr";
  operand: ExpressionNode;
}

export type ExpressionNode =
  | StringLiteralNode
  | IntegerExprNode
  | BooleanLiteralNode
  | ComparisonExprNode
  | NotExprNode;

export interface PrintStatementNode {
  kind: "PrintStatement";
  argument?: ExpressionNode;
}

interface ExpressionStatementNode {
  kind: "ExpressionStatement";
  argument: ExpressionNode;
}

interface ConstDeclNode {
  kind: "ConstDecl";
  name: string;
  value: ExpressionNode;
}

interface RuntimeDeclNode {
  kind: "RuntimeDecl";
  name: string;
  value: ExpressionNode;
}

interface LetDeclNode {
  kind: "LetDecl";
  name: string;
  value: ExpressionNode;
}

interface ReassignNode {
  kind: "Reassign";
  name: string;
  value: ExpressionNode;
}

export interface BlockStatementNode {
  kind: "BlockStatement";
  body: ASTNode[];
}

export interface IfStatementNode {
  kind: "IfStatement";
  condition: ExpressionNode;
  thenBlock: BlockStatementNode;
  elseBranch?: BlockStatementNode | IfStatementNode;
}

export type ASTNode =
  | PrintStatementNode
  | ExpressionStatementNode
  | ConstDeclNode
  | RuntimeDeclNode
  | LetDeclNode
  | ReassignNode
  | BlockStatementNode
  | IfStatementNode;

interface ParserState {
  tokens: Token[];
  current: number;
}

export function parse(tokens: Token[]): ASTNode[] {
  const state: ParserState = { tokens, current: 0 };
  return parseStatements(state, "EOF");
}

function parseStatements(state: ParserState, terminator: TokenType): ASTNode[] {
  const statements: ASTNode[] = [];
  while (peek(state).type !== terminator) {
    if (peek(state).type === "SEMICOLON") {
      consume(state, "SEMICOLON");
      continue;
    }
    statements.push(parseStatement(state));
  }
  return statements;
}

function parseStatement(state: ParserState): ASTNode {
  if (peek(state).type === "PRINT") {
    consume(state, "PRINT");
    consume(state, "LPAREN");
    const statement: PrintStatementNode = { kind: "PrintStatement" };
    if (peek(state).type !== "RPAREN") {
      statement.argument = parseExpression(state);
    }
    consume(state, "RPAREN");
    return statement;
  }
  if (peek(state).type === "LBRACE") {
    return parseBlock(state);
  }
  if (peek(state).type === "IF") {
    return parseIfStatement(state);
  }
  if (peek(state).type === "CONST") {
    return parseVariableDecl(state, "ConstDecl");
  }
  if (peek(state).type === "LET") {
    return parseVariableDecl(state, "LetDecl");
  }
  if (peek(state).type === "IDENT" && peekNext(state)?.type === "EQUAL") {
    return parseVariableDecl(state, "RuntimeDecl");
  }
  if (peek(state).type === "IDENT" && peekNext(state)?.type === "COLONEQUAL") {
    return parseVariableDecl(state, "Reassign");
  }
  return {
    kind: "ExpressionStatement",
    argument: parseExpression(state),
  };
}

function parseVariableDecl(
  state: ParserState,
  kind: "ConstDecl" | "RuntimeDecl" | "LetDecl" | "Reassign",
): ConstDeclNode | RuntimeDeclNode | LetDeclNode | ReassignNode {
  const isReassign = kind === "Reassign";
  if (isReassign) {
    const nameToken = consume(state, "IDENT");
    consume(state, "COLONEQUAL");
    const value = parseExpression(state);
    return { kind, name: nameToken.value, value };
  }
  if (kind === "ConstDecl") consume(state, "CONST");
  if (kind === "LetDecl") consume(state, "LET");
  const nameToken = consume(state, "IDENT");
  consume(state, "EQUAL");
  const value = parseExpression(state);
  return { kind, name: nameToken.value, value };
}

function parseBlock(state: ParserState): BlockStatementNode {
  consume(state, "LBRACE");
  const body = parseStatements(state, "RBRACE");
  consume(state, "RBRACE");
  return { kind: "BlockStatement", body };
}

function parseIfStatement(state: ParserState): IfStatementNode {
  consume(state, "IF");
  consume(state, "LPAREN");
  const condition = requireBoolean(parseExpression(state));
  consume(state, "RPAREN");
  const thenBlock = parseBlock(state);
  if (peek(state).type === "ELSE") {
    consume(state, "ELSE");
    if (peek(state).type === "IF") {
      return {
        kind: "IfStatement",
        condition,
        thenBlock,
        elseBranch: parseIfStatement(state),
      };
    }
    return {
      kind: "IfStatement",
      condition,
      thenBlock,
      elseBranch: parseBlock(state),
    };
  }
  return { kind: "IfStatement", condition, thenBlock };
}

function peekNext(state: ParserState): Token | undefined {
  return state.tokens[state.current + 1];
}

function parseExpression(state: ParserState): ExpressionNode {
  return parseComparison(state);
}

function parseComparison(state: ParserState): ExpressionNode {
  const left = parseAdditiveExpression(state);
  const tokenType = peek(state).type;
  if (tokenType !== "EQEQ" && tokenType !== "NOTEQ") {
    return left;
  }
  consume(state, tokenType);
  const right = parseAdditiveExpression(state);
  if (peek(state).type === "EQEQ" || peek(state).type === "NOTEQ") {
    throw new CompilerError("Comparison operators cannot be chained");
  }
  return {
    kind: "ComparisonExpr",
    operator: tokenType === "EQEQ" ? "==" : "!=",
    left,
    right,
  };
}

function peek(state: ParserState): Token {
  const token = state.tokens[state.current];
  if (token === undefined) {
    throw new CompilerError("Unexpected end of input");
  }
  return token;
}

function consume(state: ParserState, expectedType: TokenType): Token {
  const token = state.tokens[state.current];
  if (token === undefined) {
    throw new CompilerError("Unexpected end of input");
  }
  if (token.type !== expectedType) {
    throw new CompilerError(
      `Expected token ${expectedType}, got ${token.type}`,
    );
  }
  state.current++;
  return token;
}

function parsePrimary(state: ParserState): ExpressionNode {
  if (peek(state).type === "LPAREN") {
    consume(state, "LPAREN");
    const inner = parseExpression(state);
    consume(state, "RPAREN");
    return inner;
  }
  if (peek(state).type === "STRING") {
    const strToken = consume(state, "STRING");
    return { kind: "StringLiteral", value: strToken.value };
  }
  if (peek(state).type === "TRUE") {
    consume(state, "TRUE");
    return { kind: "BooleanLiteral", value: true };
  }
  if (peek(state).type === "FALSE") {
    consume(state, "FALSE");
    return { kind: "BooleanLiteral", value: false };
  }
  if (peek(state).type === "IDENT") {
    const token = consume(state, "IDENT");
    return { kind: "Identifier", name: token.value };
  }
  const token = consume(state, "INTEGER");
  return { kind: "IntegerLiteral", value: Number(token.value) };
}

function requireInteger(node: ExpressionNode): IntegerExprNode {
  if (node.kind === "StringLiteral") {
    throw new CompilerError("A string cannot be used in an integer expression");
  }
  if (node.kind === "BooleanLiteral") {
    throw new CompilerError(
      "A boolean cannot be used in an integer expression",
    );
  }
  if (node.kind === "ComparisonExpr") {
    throw new CompilerError(
      "A comparison cannot be used in an integer expression",
    );
  }
  if (node.kind === "NotExpr") {
    throw new CompilerError(
      "A boolean cannot be used in an integer expression",
    );
  }
  return node;
}

function requireBoolean(node: ExpressionNode): ExpressionNode {
  if (node.kind === "StringLiteral") {
    throw new CompilerError("A string cannot be used in a boolean expression");
  }
  if (node.kind === "IntegerLiteral") {
    throw new CompilerError(
      "An integer cannot be used in a boolean expression",
    );
  }
  if (node.kind === "UnaryExpr" || node.kind === "BinaryExpr") {
    throw new CompilerError(
      "An integer expression cannot be used in a boolean expression",
    );
  }
  return node;
}

function parseUnary(state: ParserState): ExpressionNode {
  const tokenType = peek(state).type;
  if (tokenType === "MINUS" || tokenType === "PLUS") {
    consume(state, tokenType);
    return {
      kind: "UnaryExpr",
      operator: tokenType === "MINUS" ? "-" : "+",
      operand: requireInteger(parseUnary(state)),
    };
  }
  if (tokenType === "BANG") {
    consume(state, "BANG");
    return {
      kind: "NotExpr",
      operand: requireBoolean(parseUnary(state)),
    };
  }
  return parsePrimary(state);
}

function parseMultiplicativeExpression(state: ParserState): ExpressionNode {
  return parseMultiplicativeContinuation(state, parseUnary(state));
}

function parseMultiplicativeContinuation(
  state: ParserState,
  left: ExpressionNode,
): ExpressionNode {
  let result = left;
  while (peek(state).type === "MUL") {
    consume(state, "MUL");
    const right = requireInteger(parseUnary(state));
    result = {
      kind: "BinaryExpr",
      operator: "*",
      left: requireInteger(result),
      right,
    };
  }
  return result;
}

function parseAdditiveExpression(state: ParserState): ExpressionNode {
  return parseAdditiveContinuation(state, parseMultiplicativeExpression(state));
}

function parseAdditiveContinuation(
  state: ParserState,
  left: ExpressionNode,
): ExpressionNode {
  let result = left;
  while (peek(state).type === "PLUS" || peek(state).type === "MINUS") {
    const operator = peek(state).type === "PLUS" ? "+" : "-";
    consume(state, peek(state).type);
    const right = requireInteger(parseMultiplicativeExpression(state));
    result = {
      kind: "BinaryExpr",
      operator,
      left: requireInteger(result),
      right,
    };
  }
  return result;
}
