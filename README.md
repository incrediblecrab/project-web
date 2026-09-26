# project-web

![Version](https://img.shields.io/visual-studio-marketplace/v/maxs-lab-of-things.projectweb) ![MLoT](https://img.shields.io/badge/MLoT-ai-blue)

Project Web is a VS Code extension that visualizes the current workspace as an interactive Cytoscape.js folder graph. It is published on the VS Code Marketplace as [`maxs-lab-of-things.projectweb`](https://marketplace.visualstudio.com/items?itemName=maxs-lab-of-things.projectweb); the Marketplace version is 1.5.1, matching this repository.

![Demo](https://raw.githubusercontent.com/incrediblecrab/mlot-developer-media/main/gifs/project-web.gif)

**Objective:** help a developer inspect a workspace's file and folder shape through a local graph view with search, layout, filter and export controls.

**Inputs:** VS Code 1.74.0 or newer and an open workspace folder. The extension scans local file and folder names; the webview stores its UI settings in webview `localStorage`.

**Files:**

- [`src/extension.ts`](src/extension.ts): command registration, workspace scan setup and webview message handling
- [`src/treeScanner.ts`](src/treeScanner.ts): recursive folder scan and filtering logic
- [`media/`](media/): Cytoscape.js bundle, graph UI script and styles
- [`package.json`](package.json): extension manifest, Marketplace metadata, command, settings and scripts
- [`CHANGELOG.md`](CHANGELOG.md): release notes
- [`tsconfig.json`](tsconfig.json): TypeScript compiler settings

**Try it:** install with `ext install maxs-lab-of-things.projectweb`, open a workspace and run **Project Web: Show Folder Graph** from the Command Palette.

## Usage

Run **Project Web: Show Folder Graph**. The extension scans the first workspace folder and opens a webview graph where folders are rounded rectangles, files are circles and edges show parent-child relationships.

In the graph, drag to pan, scroll to zoom and click a file node to open that file in VS Code. Use search to find files and folders, then use the previous and next buttons to move through matches.

The Visuals panel can switch layouts among force-directed, tree, circle, grid, concentric and dagre-style tree layout. The Settings panel changes scan depth, node limit, file extensions, include and exclude file names, include and exclude folders, and graph colors. The Export panel saves SVG, PNG or JSON from the current graph.

## Command and settings

| Contribution | Identifier | What it does |
| --- | --- | --- |
| Command | `projectweb.showFolderGraph` | scans the first workspace folder and opens the folder graph webview |

| Setting | Default | What it controls |
| --- | --- | --- |
| `projectweb.maxDepth` | `4` | maximum folder depth contributed in the manifest |
| `projectweb.maxNodes` | `500` | maximum node count contributed in the manifest |
| `projectweb.excludePatterns` | `["node_modules", ".git", ".vscode", "dist", "out"]` | folder names or `*` patterns skipped by the scanner |
| `projectweb.fileExtensions` | `[]` | file extension filter; empty means all files |

The current command implementation supplies its own default `maxNodes` value of `1000` when opening the webview. The manifest still contributes `500` as the VS Code Settings default.

Example `settings.json`:

```json
{
  "projectweb.maxDepth": 5,
  "projectweb.maxNodes": 1000,
  "projectweb.excludePatterns": ["node_modules", ".git", "coverage", "build"],
  "projectweb.fileExtensions": [".ts", ".js", ".json"]
}
```

## Scanner behavior

The scanner stops when it passes the configured depth or reaches the configured node limit. `excludePatterns` skip folder names before scanning, extension filters accept entries with or without a leading dot, and the webview Settings panel can add include and exclude lists for exact file and folder names.

## Development

The repository includes the scripts `npm run compile`, `npm run watch`, `npm run lint`, `npm run test` and `npm run vscode:prepublish`. The extension entry point is configured as `./out/extension.js`.

## Links

- [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=maxs-lab-of-things.projectweb)
- [Demo video](https://youtu.be/85x_4uAXccw)
- [MLoT product page](https://mlot.ai/project-web/)
- [Privacy policy](https://mlot.ai/privacy)
- Publisher: [Max's Lab of Things](https://mlot.ai/)

## License

MIT. See [`LICENSE`](LICENSE).
