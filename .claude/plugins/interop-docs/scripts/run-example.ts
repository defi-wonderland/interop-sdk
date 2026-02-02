#!/usr/bin/env pnpm tsx
/**
 * Example Runner for Documentation Verification
 *
 * Usage:
 *   pnpm tsx run-example.ts <code-string>
 *   pnpm tsx run-example.ts --file <path-to-file>
 *   pnpm tsx run-example.ts --async <code-string>
 *
 * Options:
 *   --async    Wrap code in async function
 *   --file     Read code from file instead of argument
 *   --timeout  Execution timeout in ms (default: 10000)
 *   --expect   Expected output to match
 */

import { spawn } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

interface RunOptions {
  async: boolean;
  timeout: number;
  expect?: string;
}

function parseArgs(): { code: string; options: RunOptions } {
  const args = process.argv.slice(2);
  const options: RunOptions = {
    async: false,
    timeout: 10000,
  };

  let code = "";
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === "--async") {
      options.async = true;
    } else if (arg === "--file") {
      i++;
      code = readFileSync(args[i], "utf-8");
    } else if (arg === "--timeout") {
      i++;
      options.timeout = parseInt(args[i], 10);
    } else if (arg === "--expect") {
      i++;
      options.expect = args[i];
    } else if (!arg.startsWith("--")) {
      code = arg;
    }

    i++;
  }

  return { code, options };
}

function wrapCode(code: string, options: RunOptions): string {
  // Check if code already has top-level await or async main
  const hasTopLevelAwait = /^(?!.*function).*await\s/m.test(code);
  const hasAsyncMain = /async\s+function\s+main/.test(code);
  const needsAsyncWrap = options.async || (hasTopLevelAwait && !hasAsyncMain);

  // Ensure imports are at the top
  const lines = code.split("\n");
  const imports: string[] = [];
  const rest: string[] = [];

  for (const line of lines) {
    if (
      line.trim().startsWith("import ") ||
      line.trim().startsWith("import{")
    ) {
      imports.push(line);
    } else {
      rest.push(line);
    }
  }

  const importBlock = imports.join("\n");
  const codeBlock = rest.join("\n").trim();

  if (needsAsyncWrap && !hasAsyncMain) {
    return `${importBlock}

async function __runExample() {
  ${codeBlock}
}

__runExample()
  .then(result => {
    if (result !== undefined) {
      console.log("__RESULT__:", JSON.stringify(result, null, 2));
    }
  })
  .catch(error => {
    console.error("__ERROR__:", error.message);
    process.exit(1);
  });
`;
  }

  // If it has async main, just call it
  if (hasAsyncMain) {
    return `${code}

main()
  .then(result => {
    if (result !== undefined) {
      console.log("__RESULT__:", JSON.stringify(result, null, 2));
    }
  })
  .catch(error => {
    console.error("__ERROR__:", error.message);
    process.exit(1);
  });
`;
  }

  // Synchronous code
  return `${importBlock}

try {
  ${codeBlock}
} catch (error) {
  console.error("__ERROR__:", error.message);
  process.exit(1);
}
`;
}

async function runCode(
  code: string,
  options: RunOptions
): Promise<{ success: boolean; output: string; error?: string }> {
  const tmpDir = mkdtempSync(join(tmpdir(), "interop-docs-"));
  const tmpFile = join(tmpDir, "example.ts");

  const wrappedCode = wrapCode(code, options);
  writeFileSync(tmpFile, wrappedCode);

  return new Promise((resolve) => {
    const proc = spawn("pnpm", ["tsx", tmpFile], {
      timeout: options.timeout,
      cwd: process.cwd(),
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (exitCode) => {
      // Cleanup
      try {
        unlinkSync(tmpFile);
      } catch {
        // Ignore cleanup errors
      }

      if (exitCode === 0) {
        resolve({
          success: true,
          output: stdout.trim(),
        });
      } else {
        resolve({
          success: false,
          output: stdout.trim(),
          error: stderr.trim() || `Exit code: ${exitCode}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: "",
        error: err.message,
      });
    });
  });
}

async function main() {
  const { code, options } = parseArgs();

  if (!code) {
    console.error("Usage: run-example.ts <code> [--async] [--timeout ms]");
    process.exit(1);
  }

  console.log("=== Running Example ===");
  console.log("Options:", JSON.stringify(options, null, 2));
  console.log("Code:\n", code.slice(0, 200) + (code.length > 200 ? "..." : ""));
  console.log("======================\n");

  const result = await runCode(code, options);

  if (result.success) {
    console.log("SUCCESS");
    console.log("Output:", result.output);

    if (options.expect) {
      const matches = result.output.includes(options.expect);
      console.log(
        "Expected output match:",
        matches ? "YES" : "NO (expected: " + options.expect + ")"
      );
      if (!matches) {
        process.exit(1);
      }
    }
  } else {
    console.log("FAILED");
    console.log("Output:", result.output);
    console.log("Error:", result.error);
    process.exit(1);
  }
}

main();
