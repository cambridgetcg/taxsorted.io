export type StrictJsonErrorCode =
  | "duplicate_json_key"
  | "invalid_json"
  | "json_too_deep";

export class StrictJsonError extends SyntaxError {
  readonly code: StrictJsonErrorCode;

  constructor(code: StrictJsonErrorCode, message: string) {
    super(message);
    this.name = "StrictJsonError";
    this.code = code;
  }
}

/**
 * A small validation-only JSON reader. JSON.parse keeps the last duplicate
 * object key, which can make a tax fact look different to different systems.
 * This reader rejects duplicates before the normal schema parser sees them.
 */
class JsonShapeReader {
  private position = 0;

  constructor(private readonly text: string) {}

  read(): void {
    this.whitespace();
    this.value(0);
    this.whitespace();
    if (this.position !== this.text.length) this.invalid();
  }

  private value(depth: number): void {
    if (depth > 128) {
      throw new StrictJsonError("json_too_deep", "JSON nesting is too deep");
    }
    this.whitespace();
    const token = this.text[this.position];
    if (token === "{") return this.object(depth + 1);
    if (token === "[") return this.array(depth + 1);
    if (token === '"') {
      this.string();
      return;
    }
    if (token === "t") return this.literal("true");
    if (token === "f") return this.literal("false");
    if (token === "n") return this.literal("null");
    if (token === "-" || (token >= "0" && token <= "9")) return this.number();
    this.invalid();
  }

  private object(depth: number): void {
    this.position += 1;
    this.whitespace();
    if (this.text[this.position] === "}") {
      this.position += 1;
      return;
    }
    const keys = new Set<string>();
    while (this.position < this.text.length) {
      this.whitespace();
      if (this.text[this.position] !== '"') this.invalid();
      const key = this.string();
      if (keys.has(key)) {
        throw new StrictJsonError("duplicate_json_key", "JSON objects must not contain duplicate fields");
      }
      keys.add(key);
      this.whitespace();
      if (this.text[this.position] !== ":") this.invalid();
      this.position += 1;
      this.value(depth);
      this.whitespace();
      const token = this.text[this.position];
      if (token === "}") {
        this.position += 1;
        return;
      }
      if (token !== ",") this.invalid();
      this.position += 1;
    }
    this.invalid();
  }

  private array(depth: number): void {
    this.position += 1;
    this.whitespace();
    if (this.text[this.position] === "]") {
      this.position += 1;
      return;
    }
    while (this.position < this.text.length) {
      this.value(depth);
      this.whitespace();
      const token = this.text[this.position];
      if (token === "]") {
        this.position += 1;
        return;
      }
      if (token !== ",") this.invalid();
      this.position += 1;
    }
    this.invalid();
  }

  private string(): string {
    const start = this.position;
    this.position += 1;
    while (this.position < this.text.length) {
      const token = this.text[this.position];
      if (token === '"') {
        this.position += 1;
        try {
          return JSON.parse(this.text.slice(start, this.position)) as string;
        } catch {
          this.invalid();
        }
      }
      if (token === "\\") {
        this.position += 1;
        const escape = this.text[this.position];
        if (escape === "u") {
          const code = this.text.slice(this.position + 1, this.position + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(code)) this.invalid();
          this.position += 5;
          continue;
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape)) this.invalid();
        this.position += 1;
        continue;
      }
      if (token.charCodeAt(0) < 0x20) this.invalid();
      this.position += 1;
    }
    this.invalid();
  }

  private number(): void {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      this.text.slice(this.position),
    );
    if (!match) this.invalid();
    this.position += match[0].length;
  }

  private literal(expected: "true" | "false" | "null"): void {
    if (!this.text.startsWith(expected, this.position)) this.invalid();
    this.position += expected.length;
  }

  private whitespace(): void {
    while (true) {
      const token = this.text[this.position];
      // RFC 8259 JSON whitespace is exactly SP, HTAB, LF and CR. JavaScript's
      // \s also accepts NBSP, BOM and line separators that JSON forbids.
      if (token !== " " && token !== "\t" && token !== "\n" && token !== "\r") return;
      this.position += 1;
    }
  }

  private invalid(): never {
    throw new StrictJsonError("invalid_json", "The request body is not valid JSON");
  }
}

export function assertNoDuplicateJsonKeys(text: string): void {
  new JsonShapeReader(text).read();
}
