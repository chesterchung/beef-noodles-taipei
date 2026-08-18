import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prepareGitHubPages } from "../scripts/prepare-github-pages.mjs";

test("moves vinext assets to the GitHub Pages artifact root", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "beef-noodles-pages-"));

  try {
    const nestedAsset = join(
      outputDir,
      "beef-noodles-taipei",
      "_next",
      "static",
      "app.js",
    );
    await mkdir(join(nestedAsset, ".."), { recursive: true });
    await writeFile(nestedAsset, "export {};\n");
    await writeFile(join(outputDir, "index.html"), "<!doctype html>\n");

    await prepareGitHubPages({
      outputDir,
      basePath: "/beef-noodles-taipei",
    });

    assert.equal(
      await readFile(join(outputDir, "_next", "static", "app.js"), "utf8"),
      "export {};\n",
    );
    await access(join(outputDir, ".nojekyll"));
    await assert.rejects(access(nestedAsset));
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("rejects an unsafe or missing repository base path", async () => {
  await assert.rejects(
    prepareGitHubPages({ outputDir: "dist/client", basePath: "../escape" }),
    /must start with a single slash/,
  );
});
