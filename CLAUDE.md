# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and GitHub Copilot CLI when working in this repository.

Project Web is a VS Code extension that draws the workspace's folder structure as an interactive Cytoscape.js graph in a webview. The folder and repository are `project-web`, but the Marketplace extension is `maxs-lab-of-things.projectweb` (no hyphen). The repository is public.

## Commands

```bash
npm run compile      # tsc -p ./ -> out/
npm run watch
npm run lint         # eslint src --ext ts
npx vsce package     # read the printed file list before publishing
```

Run the extension with F5 from VS Code and invoke "Show Folder Graph" from the Command Palette; it has no Explorer menu entry. `npm test` points at `out/test/runTest.js`, which does not exist, so it fails after compiling and linting.

## Structure

`projectweb.showFolderGraph` in `src/extension.ts` reads the four `projectweb.*` settings, calls `src/treeScanner.ts` to walk the workspace into `GraphData` (nodes and edges, capped by `maxDepth` and `maxNodes`, skipping `excludePatterns`), and builds the webview HTML in `getWebviewContent`. The graph data is inlined into the page as a `graphData` constant; the page then loads `media/cytoscape.min.js` (vendored, no npm dependency), `media/graph.js` (layout and interaction) and `media/style.css` through `asWebviewUri`. Changing the data shape means changing `treeScanner.ts` and `media/graph.js` together; the media files are plain JavaScript and are not compiled.

## Releasing

`media/` must ship, so never exclude it in `.vscodeignore`, which is the only control over what goes in the `.vsix` (`vsce` ignores `.gitignore`). The managed block in `.vscodeignore` is rewritten by a standardizing script, so add project-specific exclusions outside it. The README states the Marketplace version, so bump it with `package.json` and `CHANGELOG.md`. The publishing procedure is in `../README.md`.
