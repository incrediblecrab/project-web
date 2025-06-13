import * as fs from 'fs';
import * as path from 'path';

export interface ScanOptions {
    maxDepth: number;
    maxNodes: number;
    excludePatterns: string[];
    fileExtensions: string[];
    includeFileNames?: string[];
    excludeFileNames?: string[];
    includeFolders?: string[];
    excludeFolders?: string[];
}

export interface GraphNode {
    id: string;
    label: string;
    type: 'file' | 'folder';
    fullPath: string;
}

export interface GraphEdge {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export class TreeScanner {
    private rootPath: string;
    private options: ScanOptions;
    private nodeCount: number = 0;
    private nodeIdMap: Map<string, string> = new Map();

    constructor(rootPath: string, options: ScanOptions) {
        this.rootPath = rootPath;
        this.options = options;
    }

    async scan(): Promise<GraphData> {
        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];
        
        await this.scanDirectory(this.rootPath, nodes, edges, 0, null);
        
        return { nodes, edges };
    }

    private async scanDirectory(
        dirPath: string,
        nodes: GraphNode[],
        edges: GraphEdge[],
        depth: number,
        parentId: string | null
    ): Promise<string | null> {
        if (depth > this.options.maxDepth || this.nodeCount >= this.options.maxNodes) {
            return null;
        }

        const dirName = path.basename(dirPath);
        
        if (this.shouldExclude(dirName)) {
            return null;
        }

        const nodeId = this.generateNodeId(dirPath);
        this.nodeCount++;

        nodes.push({
            id: nodeId,
            label: dirName || path.basename(this.rootPath),
            type: 'folder',
            fullPath: dirPath
        });

        if (parentId) {
            edges.push({
                source: parentId,
                target: nodeId
            });
        }

        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (this.nodeCount >= this.options.maxNodes) {
                    break;
                }

                const entryPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    if (this.shouldIncludeFolder(entry.name)) {
                        await this.scanDirectory(entryPath, nodes, edges, depth + 1, nodeId);
                    }
                } else if (entry.isFile()) {
                    if (this.shouldIncludeFile(entry.name)) {
                        const fileId = this.generateNodeId(entryPath);
                        this.nodeCount++;

                        nodes.push({
                            id: fileId,
                            label: entry.name,
                            type: 'file',
                            fullPath: entryPath
                        });

                        edges.push({
                            source: nodeId,
                            target: fileId
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }

        return nodeId;
    }

    private shouldExclude(name: string): boolean {
        return this.options.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(name);
            }
            return name === pattern;
        });
    }

    private shouldIncludeFile(fileName: string): boolean {
        // Check file name filtering first
        if (!this.shouldIncludeByName(fileName)) {
            return false;
        }

        // Then check extension filtering
        if (this.options.fileExtensions.length === 0) {
            return true;
        }

        const ext = path.extname(fileName).toLowerCase();
        return this.options.fileExtensions.some(extension => {
            const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
            return ext === normalizedExt.toLowerCase();
        });
    }

    private shouldIncludeByName(fileName: string): boolean {
        const fileNameLower = fileName.toLowerCase();
        
        // If include list is specified, file must be in it
        if (this.options.includeFileNames && this.options.includeFileNames.length > 0) {
            return this.options.includeFileNames.some(name => 
                name.toLowerCase() === fileNameLower
            );
        }
        
        // If exclude list is specified, file must not be in it
        if (this.options.excludeFileNames && this.options.excludeFileNames.length > 0) {
            return !this.options.excludeFileNames.some(name => 
                name.toLowerCase() === fileNameLower
            );
        }
        
        // If neither list is specified, include the file
        return true;
    }

    private shouldIncludeFolder(folderName: string): boolean {
        const folderNameLower = folderName.toLowerCase();
        
        // If include list is specified, folder must be in it
        if (this.options.includeFolders && this.options.includeFolders.length > 0) {
            return this.options.includeFolders.some(name => 
                name.toLowerCase() === folderNameLower
            );
        }
        
        // If exclude list is specified, folder must not be in it
        if (this.options.excludeFolders && this.options.excludeFolders.length > 0) {
            return !this.options.excludeFolders.some(name => 
                name.toLowerCase() === folderNameLower
            );
        }
        
        // If neither list is specified, include the folder
        return true;
    }

    private generateNodeId(filePath: string): string {
        if (this.nodeIdMap.has(filePath)) {
            return this.nodeIdMap.get(filePath)!;
        }

        const id = `node_${this.nodeCount}`;
        this.nodeIdMap.set(filePath, id);
        return id;
    }
}