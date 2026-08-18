import { access, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function prepareGitHubPages({ outputDir, basePath }) {
  if (!/^\/[A-Za-z0-9._-]+$/.test(basePath)) {
    throw new Error(
      "NEXT_PUBLIC_BASE_PATH must start with a single slash and contain one repository name",
    );
  }

  const resolvedOutputDir = resolve(outputDir);
  const nestedAssets = resolve(
    resolvedOutputDir,
    basePath.slice(1),
    "_next",
  );
  const pagesAssets = resolve(resolvedOutputDir, "_next");

  await access(resolve(resolvedOutputDir, "index.html"));
  await access(nestedAssets);

  try {
    await access(pagesAssets);
    throw new Error(`GitHub Pages asset directory already exists: ${pagesAssets}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  await rename(nestedAssets, pagesAssets);
  await writeFile(resolve(resolvedOutputDir, ".nojekyll"), "");
}

const isCommandLine =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCommandLine) {
  await prepareGitHubPages({
    outputDir: process.argv[2] ?? "dist/client",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  });
  console.log("Prepared dist/client for GitHub Pages.");
}
