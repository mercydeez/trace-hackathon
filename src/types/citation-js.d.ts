/** Citation.js ships no type definitions; this covers the small surface TRACE uses. */
declare module "@citation-js/core" {
  export class Cite {
    constructor(data: unknown, options?: Record<string, unknown>);
    format(format: "bibliography" | "citation", options?: Record<string, unknown>): unknown;
  }
}

declare module "@citation-js/plugin-csl";
