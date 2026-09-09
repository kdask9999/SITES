import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("keeps development preview metadata in the application shell", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /["']codex-preview["']\s*:\s*["']development["']/);
  assert.ok(developmentPreviewMeta.test('<meta name="codex-preview" content="development">'));
});
