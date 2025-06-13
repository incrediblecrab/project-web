# Project Web - VS Code Extension

## Project Overview
A VS Code extension that visualizes workspace file structure as an interactive spiderweb graph using Cytoscape.js. Provides a unique way to explore and understand project architecture through graph visualization.

## Technology Stack
- TypeScript
- VS Code Extension API
- Cytoscape.js for graph visualization
- Custom CSS styling

## Architecture
- `src/extension.ts` - Main extension entry point
- `src/treeScanner.ts` - File system scanning and tree traversal
- `media/` - Static assets (Cytoscape.js, graph.js, styles)

## Key Features
- Interactive spiderweb-style graph visualization
- Configurable scan depth and node limits
- Customizable file exclusion patterns
- File extension filtering
- Real-time workspace analysis

## Development Commands
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run vscode:prepublish` - Prepare for publishing

## Configuration
The extension provides several configuration options:
- `projectweb.maxDepth` - Maximum folder depth to scan (default: 4)
- `projectweb.maxNodes` - Maximum number of nodes to display (default: 500)
- `projectweb.excludePatterns` - Folder patterns to exclude (default: node_modules, .git, .vscode, dist, out)
- `projectweb.fileExtensions` - Filter files by extensions (empty shows all)

## Commands
- `projectweb.showFolderGraph` - Show the interactive folder graph visualization

## Usage
Right-click in the VS Code Explorer and select "Show Folder Graph" to generate an interactive visualization of your project structure.