export type Eol = "crlf" | "lf";

export interface E2ECase {
  name: string;
  source: string;
  expected: string;
  eol?: Eol;
}

export const E2E_CASES: E2ECase[] = [
  // values
  { name: "prints true", source: "print(true)", expected: "true\n" },
  { name: "prints false", source: "print(false)", expected: "false\n" },
  { name: "bare boolean expression", source: "true;", expected: "" },
  {
    name: "prints a string constant",
    source: 's = "hi"; print(s)',
    expected: "hi\n",
  },
  {
    name: "prints a parenthesized integer constant",
    source: "X = (2); print(X)",
    expected: "2\n",
  },

  // variables
  {
    name: "prints an integer with let",
    source: "let X = 3; print(X)",
    expected: "3\n",
  },
  {
    name: "prints a negative integer",
    source: "let X = -5; print(X)",
    expected: "-5\n",
  },
  {
    name: "computes a runtime expression",
    source: "let X = 2; let Y = X + 3; print(Y)",
    expected: "5\n",
  },
  {
    name: "reassigns an integer",
    source: "let X = 1; print(X); X := 2; print(X)",
    expected: "1\n2\n",
  },
  {
    name: "reassigns using an expression",
    source: "let X = 1; X := X + 1; X := X * 3; print(X)",
    expected: "6\n",
  },
  {
    name: "reassigns a let from an outer block",
    source: "let X = 1; { X := 2 } print(X)",
    expected: "2\n",
  },
  {
    name: "sibling let blocks",
    source: "{ let X = 1; print(X) } { let X = 5; print(X) }",
    expected: "1\n5\n",
  },
  {
    name: "prints a boolean with let",
    source: "let B = true; print(B)",
    expected: "true\n",
  },
  {
    name: "reassigns a boolean",
    source: "let B = true; print(B); B := false; print(B)",
    expected: "true\nfalse\n",
  },
  {
    name: "negates a runtime boolean",
    source: "let B = false; print(!B)",
    expected: "true\n",
  },
  {
    name: "prints a string with let",
    source: 'let s = "hi"; print(s)',
    expected: "hi\n",
  },
  {
    name: "reassigns a string",
    source: 'let s = "hi"; print(s); s := "bye"; print(s)',
    expected: "hi\nbye\n",
  },
  {
    name: "reassigns a string to a different length",
    source: 'let s = "a"; print(s); s := "longer"; print(s)',
    expected: "a\nlonger\n",
  },
  {
    name: "copies a runtime string",
    source: 'let s = "hi"; let t = s; print(t)',
    expected: "hi\n",
  },
  {
    name: "compares two runtime integers",
    source: "let A = 1; let B = 2; print(A == B)",
    expected: "false\n",
  },
  {
    name: "compares equal runtime integers",
    source: "let A = 3; let B = 3; print(A != B)",
    expected: "false\n",
  },
  {
    name: "compares a runtime string by content",
    source: 'let s = "hi"; print(s == "hi")',
    expected: "true\n",
  },
  {
    name: "runs the taken branch for a runtime condition",
    source: 'let X = 3; if (X == 3) { print("eq") } else { print("ne") }',
    expected: "eq\n",
  },
  {
    name: "runs the else branch for a runtime condition",
    source: 'let X = 4; if (X == 3) { print("eq") } else { print("ne") }',
    expected: "ne\n",
  },
  {
    name: "uses a runtime boolean as an if condition",
    source: 'let FLAG = true; if (FLAG) { print("y") }',
    expected: "y\n",
  },
  {
    name: "uses a runtime negation as an if condition",
    source: 'let FLAG = false; if (!FLAG) { print("y") }',
    expected: "y\n",
  },
  {
    name: "first matching branch in a runtime else if chain",
    source:
      'let X = 2; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
    expected: "b\n",
  },
  {
    name: "final else in a runtime else if chain",
    source:
      'let X = 9; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
    expected: "c\n",
  },
  {
    name: "nested runtime if statements",
    source:
      'let X = 3; if (X == 3) { if (X != 4) { print("a") } } else { print("b") }',
    expected: "a\n",
  },
  {
    name: "bare declaration holds a runtime value",
    source: "let Y = 1; X = Y; print(X)",
    expected: "1\n",
  },

  // expressions
  {
    name: "prints hello world",
    source: 'print("hello world")',
    expected: "hello world\n",
  },
  { name: "prints an integer", source: "print(42)", expected: "42\n" },
  {
    name: "prints multiple statements on separate lines",
    source: 'print("hello")\nprint("world")',
    expected: "hello\nworld\n",
  },
  {
    name: "mixes string and integer prints",
    source: 'print("n="); print(42)',
    expected: "n=\n42\n",
  },
  {
    name: "prints a string with lf eol",
    source: 'print("hi")',
    expected: "hi\n",
    eol: "lf",
  },
  {
    name: "prints an integer with lf eol",
    source: "print(42)",
    expected: "42\n",
    eol: "lf",
  },
  {
    name: "prints with explicit crlf eol",
    source: 'print("hi")',
    expected: "hi\n",
    eol: "crlf",
  },
  {
    name: "prints an addition result",
    source: "print(1 + 2)",
    expected: "3\n",
  },
  {
    name: "keeps 64-bit precision on overflow",
    source: "print(2147483647 + 1)",
    expected: "2147483648\n",
  },
  {
    name: "left-associative addition",
    source: "print(1 + 2 + 3)",
    expected: "6\n",
  },
  {
    name: "left-associative multiplication",
    source: "print(2 * 3 * 4)",
    expected: "24\n",
  },
  {
    name: "multiplication over addition precedence",
    source: "print(1 + 2 * 3)",
    expected: "7\n",
  },
  {
    name: "multiplication over addition precedence on the left",
    source: "print(2 * 3 + 4)",
    expected: "10\n",
  },
  {
    name: "parentheses override multiplication precedence",
    source: "print((1 + 2) * 3)",
    expected: "9\n",
  },
  {
    name: "multiplies a group against a literal",
    source: "print(3 * (2 + 4))",
    expected: "18\n",
  },
  {
    name: "mixes addition and subtraction",
    source: "print(1 - 2 + 3)",
    expected: "2\n",
  },
  {
    name: "prints a negative subtraction result",
    source: "print(3 - 5)",
    expected: "-2\n",
  },
  { name: "prints a negative literal", source: "print(-5)", expected: "-5\n" },
  {
    name: "multiplies by a negative operand",
    source: "print(2 * -3)",
    expected: "-6\n",
  },
  {
    name: "prints the value of a constant",
    source: "X = 5; print(X)",
    expected: "5\n",
  },

  // control flow
  {
    name: "runs the taken branch",
    source: 'if (true) { print("yes") }',
    expected: "yes\n",
  },
  {
    name: "runs the then branch over the else branch",
    source: 'if (true) { print("a") } else { print("b") }',
    expected: "a\n",
  },
  {
    name: "runs the else branch when the condition is false",
    source: 'if (false) { print("a") } else { print("b") }',
    expected: "b\n",
  },
  {
    name: "uses a comparison as the condition",
    source: 'if (1 == 1) { print("eq") }',
    expected: "eq\n",
  },
  {
    name: "uses a negation as the condition",
    source: 'if (!false) { print("y") }',
    expected: "y\n",
  },
  {
    name: "final else in an else if chain",
    source:
      'if (1 == 2) { print("a") } else if (1 == 3) { print("b") } else { print("c") }',
    expected: "c\n",
  },
  {
    name: "compiles a multi-statement body",
    source: "if (true) { X = 1; print(X) }",
    expected: "1\n",
  },

  // scoping
  {
    name: "prints a constant declared inside a block",
    source: "{ X = 5; print(X) }",
    expected: "5\n",
  },
  {
    name: "redeclares a constant after its block closes",
    source: "{ X = 2 }; X = 3; print(X)",
    expected: "3\n",
  },
  {
    name: "sibling constant blocks",
    source: "{ X = 2; print(X) } { X = 5; print(X) }",
    expected: "2\n5\n",
  },
  {
    name: "nested block scopes",
    source: "{ X = 1; { A = 2; print(A) } print(X) }",
    expected: "2\n1\n",
  },
  { name: "compiles an empty block", source: "{}", expected: "" },

  // comparisons
  {
    name: "prints an equality result",
    source: "print(1 == 1)",
    expected: "true\n",
  },
  {
    name: "prints the negation of true",
    source: "print(!true)",
    expected: "false\n",
  },

  // errors / edge cases
  { name: "compiles a bare semicolon", source: ";", expected: "" },
  {
    name: "prints a newline for an empty print",
    source: "print()",
    expected: "\n",
  },
  {
    name: "prints a newline for an empty print with lf eol",
    source: "print()",
    expected: "\n",
    eol: "lf",
  },
];

export function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, "\n");
}
