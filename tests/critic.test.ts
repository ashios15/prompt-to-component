import { describe, it, expect } from "vitest";
import { critique, formatIssuesForRepair } from "../src/lib/critic";

const GOOD = `
export default function Card() {
  return <div style={{ padding: 16 }}>hi</div>;
}
`;

describe("critique — happy path", () => {
  it("accepts a clean default-exported function component", () => {
    const r = critique(GOOD);
    expect(r.ok).toBe(true);
    expect(r.parsed).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("accepts react-only imports", () => {
    const code = `import { useState } from "react";
export default function C() { const [n] = useState(0); return <div>{n}</div>; }`;
    expect(critique(code).ok).toBe(true);
  });
});

describe("critique — syntax", () => {
  it("reports parse errors without running further checks", () => {
    const r = critique("export default function() { return <div></di ");
    expect(r.parsed).toBe(false);
    expect(r.ok).toBe(false);
    expect(r.issues[0]?.code).toBe("syntax");
  });
});

describe("critique — exports", () => {
  it("flags missing default export", () => {
    const r = critique(`function C() { return <div/>; }`);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("no-default-export");
  });

  it("flags multiple default exports", () => {
    const code = `export default function A() { return <div/>; }
      export default function B() { return <div/>; }`;
    const r = critique(code);
    // babel parse itself rejects double default; should still surface a syntax error.
    expect(r.ok).toBe(false);
  });
});

describe("critique — imports", () => {
  it("rejects non-allowlisted imports", () => {
    const code = `import _ from "lodash";
      export default function C() { return <div/>; }`;
    const r = critique(code);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("import-not-allowed");
  });

  it("accepts user-supplied allowlist", () => {
    const code = `import { motion } from "framer-motion";
      export default function C() { return <motion.div/>; }`;
    const r = critique(code, { allowedImports: ["framer-motion"] });
    expect(r.ok).toBe(true);
  });
});

describe("critique — hooks", () => {
  it("flags a hook inside an if-statement", () => {
    const code = `import { useState } from "react";
      export default function C({ x }) {
        if (x) { const [n] = useState(0); return <div>{n}</div>; }
        return null;
      }`;
    const r = critique(code);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("hook-conditional");
  });

  it("flags a hook inside a ternary", () => {
    const code = `import { useState } from "react";
      export default function C({ x }) {
        const [n] = x ? useState(0) : [null];
        return <div>{n}</div>;
      }`;
    expect(critique(code).issues.map((i) => i.code)).toContain("hook-conditional");
  });
});

describe("critique — dangerous html", () => {
  it("flags dangerouslySetInnerHTML by default", () => {
    const code = `export default function C() {
      return <div dangerouslySetInnerHTML={{ __html: "<p>x</p>" }} />;
    }`;
    const r = critique(code);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("dangerous-html");
  });

  it("permits it when explicitly allowed", () => {
    const code = `export default function C() {
      return <div dangerouslySetInnerHTML={{ __html: "<p>x</p>" }} />;
    }`;
    expect(critique(code, { allowDangerousHtml: true }).ok).toBe(true);
  });
});

describe("formatIssuesForRepair", () => {
  it("produces a compact bullet list", () => {
    const issues = [
      { code: "x", severity: "error" as const, message: "oops", line: 5 },
      { code: "y", severity: "error" as const, message: "also oops", line: -1 },
    ];
    const out = formatIssuesForRepair(issues);
    expect(out).toContain("[x] line 5: oops");
    expect(out).toContain("[y] somewhere: also oops");
  });

  it("returns a sentinel when there are no issues", () => {
    expect(formatIssuesForRepair([])).toBe("No issues.");
  });
});
