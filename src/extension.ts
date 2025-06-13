import * as vscode from 'vscode';
import { TreeScanner } from './treeScanner';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('ProjectWeb extension activated');
    
    const disposable = vscode.commands.registerCommand('projectweb.showFolderGraph', async () => {
        console.log('Show Folder Graph command triggered');
        
        async function createWebviewPanel(scannerOptions?: any) {
            const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!rootPath) {
                vscode.window.showErrorMessage('No workspace folder open.');
                return;
            }

            const options = scannerOptions || {
                maxDepth: 4,
                maxNodes: 1000,
                excludePatterns: ['node_modules', '.git', '.vscode', 'dist', 'out'],
                fileExtensions: []
            };

            const scanner = new TreeScanner(rootPath, options);
            const graphData = await scanner.scan();
            console.log('Graph data loaded:', graphData);

            const panel = vscode.window.createWebviewPanel(
                'folderGraph',
                'Folder Graph',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
                }
            );

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'openFile':
                            const filePath = message.filePath;
                            try {
                                const doc = await vscode.workspace.openTextDocument(filePath);
                                await vscode.window.showTextDocument(doc);
                            } catch (error) {
                                vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
                            }
                            break;
                        
                        case 'updateSettings':
                            // Re-scan with new settings
                            const newOptions = {
                                maxDepth: message.settings.maxDepth || 4,
                                maxNodes: message.settings.maxNodes || 1000,
                                excludePatterns: message.settings.excludePatterns || ['node_modules', '.git'],
                                fileExtensions: message.settings.fileExtensions || [],
                                includeFileNames: message.settings.includeFileNames || [],
                                excludeFileNames: message.settings.excludeFileNames || [],
                                includeFolders: message.settings.includeFolders || [],
                                excludeFolders: message.settings.excludeFolders || []
                            };
                            
                            const newScanner = new TreeScanner(rootPath, newOptions);
                            const newGraphData = await newScanner.scan();
                            
                            // Send updated data back to webview
                            panel.webview.postMessage({
                                command: 'updateGraph',
                                graphData: newGraphData
                            });
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );

            const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'graph.js'));
            const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'style.css'));
            const cytoscapeUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'cytoscape.min.js'));

            panel.webview.html = getWebviewContent(scriptUri, styleUri, cytoscapeUri, graphData);
        }

        await createWebviewPanel();
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(scriptUri: vscode.Uri, styleUri: vscode.Uri, cytoscapeUri: vscode.Uri, graphData: any): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Folder Graph</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}">
        <script src="${cytoscapeUri}"></script>
        <script>
            const vscode = acquireVsCodeApi();
            const graphData = ${JSON.stringify(graphData)};
        </script>
    </head>
    <body>
        <!-- Search Bar with Navigation -->
        <div class="search-container">
            <input type="text" id="search" placeholder="Search files and folders..." />
            <div class="search-nav">
                <button id="prevResult" disabled>&lt;</button>
                <span class="search-count" id="searchInfo"></span>
                <button id="nextResult" disabled>&gt;</button>
            </div>
            <div class="search-results-dropdown" id="searchResultsDropdown"></div>
        </div>

        <!-- Bottom Toolbar - Standardized 3 buttons -->
        <div class="bottom-toolbar">
            <button id="visualsToggle">Visuals</button>
            <button id="exportToggle">Export</button>
            <button id="settingsToggle">Settings</button>
        </div>

        <!-- Visuals Panel -->
        <div id="visualsPanel" class="panel hidden">
            <button class="panel-close" id="visualsClose">&times;</button>
            <h3>Layout Options</h3>
            <div class="layout-options">
                <button class="layout-btn" data-layout="cose">Force-directed</button>
                <button class="layout-btn" data-layout="breadthfirst">Tree</button>
                <button class="layout-btn" data-layout="circle">Circle</button>
                <button class="layout-btn" data-layout="grid">Grid</button>
                <button class="layout-btn" data-layout="concentric">Concentric</button>
                <button class="layout-btn" data-layout="dagre">Dagre</button>
                <button class="layout-btn full-width" id="fitToScreen">Fit to Screen</button>
            </div>
        </div>

        <!-- Export Panel -->
        <div id="exportPanel" class="panel hidden">
            <button class="panel-close" id="exportClose">&times;</button>
            <h3>Export Options</h3>
            <div class="export-options">
                <button class="export-btn" data-format="svg">Export as SVG</button>
                <button class="export-btn" data-format="png">Export as PNG</button>
                <button class="export-btn" data-format="json">Export as JSON</button>
            </div>
        </div>

        <!-- Settings Panel (Unified) -->
        <div id="settingsPanel" class="panel hidden">
            <button class="panel-close" id="settingsClose">&times;</button>
            <h3>Settings</h3>
            
            <!-- Graph Settings -->
            <div class="setting-group">
                <label for="maxDepth">Max Depth:</label>
                <input type="number" id="maxDepth" value="4" min="1" max="10" />
            </div>
            
            <div class="setting-group">
                <label for="fileExtensions">File Extensions (comma-separated):</label>
                <input type="text" id="fileExtensions" placeholder="e.g., .js,.ts,.json" />
            </div>
            
            <div class="setting-group">
                <label for="excludePatterns">Exclude Patterns:</label>
                <textarea id="excludePatterns" rows="3">node_modules
.git
.vscode
dist
out</textarea>
            </div>
            
            <div class="setting-group">
                <label for="includeFileNames">Include File Names (comma-separated):</label>
                <input type="text" id="includeFileNames" placeholder="e.g., README.md, package.json" />
            </div>
            
            <div class="setting-group">
                <label for="excludeFileNames">Exclude File Names (comma-separated):</label>
                <input type="text" id="excludeFileNames" placeholder="e.g., .DS_Store, thumbs.db" />
            </div>
            
            <div class="setting-group">
                <label for="includeFolders">Include Folders (comma-separated):</label>
                <input type="text" id="includeFolders" placeholder="e.g., src, lib, components" />
            </div>
            
            <div class="setting-group">
                <label for="excludeFolders">Exclude Folders (comma-separated):</label>
                <input type="text" id="excludeFolders" placeholder="e.g., temp, cache, logs" />
            </div>

            <!-- Theme Customization -->
            <h4>Theme Customization</h4>
            
            <div class="theme-group">
                <label>File Node Color:</label>
                <input type="color" id="fileNodeColor" value="#7ed321" />
            </div>
            
            <div class="theme-group">
                <label>Folder Node Color:</label>
                <input type="color" id="folderNodeColor" value="#4a90e2" />
            </div>
            
            <div class="theme-group">
                <label>Edge Color:</label>
                <input type="color" id="edgeColor" value="#cccccc" />
            </div>
            
            <div class="theme-group">
                <label>Font Size:</label>
                <input type="range" id="fontSize" min="8" max="16" value="10" />
                <span id="fontSizeValue">10px</span>
            </div>
            
            <div class="theme-group">
                <label>Font Color:</label>
                <input type="color" id="fontColor" value="#ffffff" />
            </div>
            
            <div class="theme-group">
                <label>Background Color:</label>
                <input type="color" id="backgroundColor" value="#1e1e1e" />
            </div>
            
            <button class="panel-button" id="applySettings">Apply Settings</button>
            <button class="panel-button secondary" id="resetTheme">Reset Theme</button>
        </div>

        <!-- Graph Container -->
        <div id="cy"></div>

        <!-- Info Panel -->
        <div class="info-panel">
            <span id="nodeCount">Nodes: 0</span> | 
            <span id="edgeCount">Edges: 0</span> | 
            <span class="hint">Click files to open</span>
        </div>

        <script src="${scriptUri}"></script>
    </body>
    </html>
    `;
}

export function deactivate() { }