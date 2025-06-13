(function() {
    // Initialize Cytoscape
    let cy;
    let currentTheme = loadTheme();
    let searchResults = [];
    let currentSearchIndex = 0;
    
    // Load settings from localStorage
    function loadSettings() {
        const saved = localStorage.getItem('projectWebSettings');
        return saved ? JSON.parse(saved) : {
            maxDepth: 4,
            maxNodes: 1000,
            excludePatterns: ['node_modules', '.git', '.vscode', 'dist', 'out'],
            fileExtensions: []
        };
    }
    
    // Load theme from localStorage
    function loadTheme() {
        const saved = localStorage.getItem('projectWebTheme');
        return saved ? JSON.parse(saved) : {
            fileNodeColor: '#7ed321',
            folderNodeColor: '#4a90e2',
            edgeColor: '#cccccc',
            fontSize: 10,
            fontColor: '#ffffff',
            backgroundColor: '#1e1e1e'
        };
    }
    
    // Save theme to localStorage
    function saveTheme(theme) {
        localStorage.setItem('projectWebTheme', JSON.stringify(theme));
        currentTheme = theme;
    }
    
    // Truncate long labels
    function truncateLabel(label, maxLength = 20) {
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength - 3) + '...';
    }
    
    // Initialize the graph
    function initGraph(data) {
        // Apply background color
        const cyContainer = document.getElementById('cy');
        cyContainer.style.backgroundColor = currentTheme.backgroundColor || '#1e1e1e';
        
        cy = cytoscape({
            container: cyContainer,
            
            elements: {
                nodes: data.nodes.map(node => ({
                    data: { 
                        id: node.id, 
                        label: truncateLabel(node.label),
                        fullLabel: node.label,
                        type: node.type,
                        fullPath: node.fullPath
                    }
                })),
                edges: data.edges.map(edge => ({
                    data: { 
                        source: edge.source, 
                        target: edge.target 
                    }
                }))
            },
            
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': currentTheme.fontSize + 'px',
                        'color': currentTheme.fontColor || '#ffffff',
                        'text-wrap': 'wrap',
                        'text-max-width': '80px',
                        'border-width': 2,
                        'border-opacity': 0.8
                    }
                },
                {
                    selector: 'node[type="folder"]',
                    style: {
                        'background-color': currentTheme.folderNodeColor,
                        'border-color': darkenColor(currentTheme.folderNodeColor, 20),
                        'shape': 'roundrectangle',
                        'width': '50px',
                        'height': '50px'
                    }
                },
                {
                    selector: 'node[type="file"]',
                    style: {
                        'background-color': currentTheme.fileNodeColor,
                        'border-color': darkenColor(currentTheme.fileNodeColor, 20),
                        'shape': 'ellipse',
                        'width': '40px',
                        'height': '40px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1.5,
                        'line-color': currentTheme.edgeColor,
                        'target-arrow-color': currentTheme.edgeColor,
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'opacity': 0.6
                    }
                },
                {
                    selector: 'node:selected',
                    style: {
                        'border-width': 4,
                        'border-color': '#ff6b6b',
                        'overlay-opacity': 0.2,
                        'overlay-color': '#ff6b6b',
                        'overlay-padding': 6
                    }
                },
                {
                    selector: 'node.highlight',
                    style: {
                        'border-width': 4,
                        'border-color': '#ffd93d',
                        'background-color': '#fff3cd',
                        'transition-property': 'border-width, border-color, background-color',
                        'transition-duration': '0.3s'
                    }
                },
                {
                    selector: 'node[type="file"].highlight',
                    style: {
                        'background-color': '#fff3cd'
                    }
                },
                {
                    selector: 'node[type="folder"].highlight',
                    style: {
                        'background-color': '#cce5ff'
                    }
                },
                {
                    selector: 'node.current-search',
                    style: {
                        'border-width': 6,
                        'border-color': '#ff4444',
                        'overlay-opacity': 0.3,
                        'overlay-color': '#ff4444'
                    }
                }
            ],
            
            layout: {
                name: 'breadthfirst',
                directed: true,
                spacingFactor: 1.5,
                animate: true,
                animationDuration: 800,
                avoidOverlap: true,
                nodeDimensionsIncludeLabels: false
            },
            
            minZoom: 0.1,
            maxZoom: 4,
            wheelSensitivity: 0.2
        });
        
        // Update node and edge counts
        updateCounts();
        
        // Add event listeners
        setupEventListeners();
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // File click to open
        cy.on('tap', 'node[type="file"]', function(evt) {
            const node = evt.target;
            const filePath = node.data('fullPath');
            
            vscode.postMessage({
                command: 'openFile',
                filePath: filePath
            });
        });
        
        // Node hover for tooltip
        cy.on('mouseover', 'node', function(evt) {
            const node = evt.target;
            const fullLabel = node.data('fullLabel');
            const truncated = node.data('label');
            
            if (fullLabel !== truncated) {
                showTooltip(evt.renderedPosition, fullLabel);
            }
        });
        
        cy.on('mouseout', 'node', function() {
            hideTooltip();
        });
        
        // Search functionality
        const searchInput = document.getElementById('search');
        const prevButton = document.getElementById('prevResult');
        const nextButton = document.getElementById('nextResult');
        const searchDropdown = document.getElementById('searchResultsDropdown');
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            performSearch(query);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (searchResults.length > 0) {
                    centerOnSearchResult(currentSearchIndex);
                }
            }
        });
        
        prevButton.addEventListener('click', () => {
            if (searchResults.length > 0) {
                currentSearchIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
                centerOnSearchResult(currentSearchIndex);
                updateSearchNavigation();
            }
        });
        
        nextButton.addEventListener('click', () => {
            if (searchResults.length > 0) {
                currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
                centerOnSearchResult(currentSearchIndex);
                updateSearchNavigation();
            }
        });
        
        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                hideSearchDropdown();
            }
        });
        
        // Panel management
        const panels = {
            visuals: document.getElementById('visualsPanel'),
            export: document.getElementById('exportPanel'),
            settings: document.getElementById('settingsPanel')
        };
        
        const toggles = {
            visuals: document.getElementById('visualsToggle'),
            export: document.getElementById('exportToggle'),
            settings: document.getElementById('settingsToggle')
        };
        
        // Panel toggle handler
        function togglePanel(panelName) {
            const isCurrentlyOpen = !panels[panelName].classList.contains('hidden');
            
            // Close all panels
            Object.values(panels).forEach(panel => panel.classList.add('hidden'));
            
            // Toggle the requested panel
            if (!isCurrentlyOpen) {
                panels[panelName].classList.remove('hidden');
            }
        }
        
        // Add click listeners to panel toggles
        Object.entries(toggles).forEach(([name, toggle]) => {
            toggle.addEventListener('click', () => togglePanel(name));
        });
        
        // Settings panel
        const applySettings = document.getElementById('applySettings');
        const resetTheme = document.getElementById('resetTheme');
        const fontSizeInput = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        
        fontSizeInput.addEventListener('input', (e) => {
            fontSizeValue.textContent = e.target.value + 'px';
        });
        
        applySettings.addEventListener('click', () => {
            const settings = {
                maxDepth: parseInt(document.getElementById('maxDepth').value),
                fileExtensions: document.getElementById('fileExtensions').value
                    .split(',')
                    .map(ext => ext.trim())
                    .filter(ext => ext),
                excludePatterns: document.getElementById('excludePatterns').value
                    .split('\n')
                    .map(pattern => pattern.trim())
                    .filter(pattern => pattern),
                includeFileNames: document.getElementById('includeFileNames').value
                    .split(',')
                    .map(name => name.trim())
                    .filter(name => name),
                excludeFileNames: document.getElementById('excludeFileNames').value
                    .split(',')
                    .map(name => name.trim())
                    .filter(name => name),
                includeFolders: document.getElementById('includeFolders').value
                    .split(',')
                    .map(folder => folder.trim())
                    .filter(folder => folder),
                excludeFolders: document.getElementById('excludeFolders').value
                    .split(',')
                    .map(folder => folder.trim())
                    .filter(folder => folder)
            };
            
            // Theme settings
            const theme = {
                fileNodeColor: document.getElementById('fileNodeColor').value,
                folderNodeColor: document.getElementById('folderNodeColor').value,
                edgeColor: document.getElementById('edgeColor').value,
                fontSize: parseInt(document.getElementById('fontSize').value),
                fontColor: document.getElementById('fontColor').value,
                backgroundColor: document.getElementById('backgroundColor').value
            };
            
            localStorage.setItem('projectWebSettings', JSON.stringify(settings));
            saveTheme(theme);
            applyThemeToGraph(theme);
            
            vscode.postMessage({
                command: 'updateSettings',
                settings: settings
            });
            
            panels.settings.classList.add('hidden');
        });
        
        resetTheme.addEventListener('click', () => {
            const defaultTheme = {
                fileNodeColor: '#7ed321',
                folderNodeColor: '#4a90e2',
                edgeColor: '#cccccc',
                fontSize: 10,
                fontColor: '#ffffff',
                backgroundColor: '#1e1e1e'
            };
            
            saveTheme(defaultTheme);
            applyThemeToGraph(defaultTheme);
            
            // Update UI
            document.getElementById('fileNodeColor').value = defaultTheme.fileNodeColor;
            document.getElementById('folderNodeColor').value = defaultTheme.folderNodeColor;
            document.getElementById('edgeColor').value = defaultTheme.edgeColor;
            document.getElementById('fontSize').value = defaultTheme.fontSize;
            document.getElementById('fontColor').value = defaultTheme.fontColor;
            document.getElementById('backgroundColor').value = defaultTheme.backgroundColor;
            fontSizeValue.textContent = defaultTheme.fontSize + 'px';
        });
        
        // Export functionality (in Export panel)
        const exportButtons = document.querySelectorAll('.export-btn');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.getAttribute('data-format');
                exportGraph(format);
            });
        });
        
        // Close buttons for panels
        document.getElementById('visualsClose').addEventListener('click', () => {
            document.getElementById('visualsPanel').classList.add('hidden');
        });
        
        document.getElementById('exportClose').addEventListener('click', () => {
            document.getElementById('exportPanel').classList.add('hidden');
        });
        
        document.getElementById('settingsClose').addEventListener('click', () => {
            document.getElementById('settingsPanel').classList.add('hidden');
        });
        
        // Layout buttons (in Visuals panel)
        const layoutButtons = document.querySelectorAll('.layout-btn');
        layoutButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const layoutName = btn.getAttribute('data-layout');
                let layoutOptions = {
                    animate: true,
                    animationDuration: 800,
                    nodeDimensionsIncludeLabels: false
                };
                
                switch(layoutName) {
                    case 'cose':
                        layoutOptions = {
                            ...layoutOptions,
                            name: 'cose',
                            animationDuration: 1000,
                            nodeRepulsion: 8000,
                            idealEdgeLength: 100,
                            edgeElasticity: 100,
                            nestingFactor: 5
                        };
                        break;
                    case 'breadthfirst':
                        layoutOptions = {
                            ...layoutOptions,
                            name: 'breadthfirst',
                            directed: true,
                            spacingFactor: 1.5
                        };
                        break;
                    case 'circle':
                        layoutOptions = {
                            ...layoutOptions,
                            name: 'circle',
                            avoidOverlap: true
                        };
                        break;
                    case 'grid':
                        layoutOptions = {
                            ...layoutOptions,
                            name: 'grid',
                            avoidOverlap: true
                        };
                        break;
                    case 'concentric':
                        layoutOptions = {
                            ...layoutOptions,
                            name: 'concentric',
                            levelWidth: function() { return 2; },
                            concentric: function(node) {
                                return node.degree();
                            }
                        };
                        break;
                    case 'dagre':
                        layoutOptions = {
                            ...layoutOptions,
                            name: 'breadthfirst',
                            directed: true,
                            spacingFactor: 2.5,
                            avoidOverlap: true,
                            fit: true,
                            padding: 30,
                            grid: false,
                            nodeDimensionsIncludeLabels: true
                        };
                        break;
                }
                
                cy.layout(layoutOptions).run();
            });
        });
        
        document.getElementById('fitToScreen').addEventListener('click', () => {
            cy.fit();
        });
    }
    
    // Search functionality
    function performSearch(query) {
        clearSearch();
        hideSearchDropdown();
        
        if (!query) {
            updateSearchNavigation();
            return;
        }
        
        searchResults = cy.nodes().filter(node => {
            const label = node.data('fullLabel').toLowerCase();
            return label.includes(query);
        });
        
        if (searchResults.length > 0) {
            highlightSearchResults();
            if (searchResults.length === 1) {
                // Single result - focus immediately
                currentSearchIndex = 0;
                centerOnSearchResult(0);
            } else {
                // Multiple results - show dropdown
                showSearchDropdown(searchResults);
                // Focus on first result
                currentSearchIndex = 0;
                centerOnSearchResult(0);
            }
        }
        
        updateSearchNavigation();
    }
    
    function clearSearch() {
        cy.nodes().removeClass('highlight');
        cy.nodes().removeClass('current-search');
        searchResults = [];
        currentSearchIndex = 0;
        updateSearchNavigation();
    }
    
    function highlightSearchResults() {
        searchResults.forEach(node => node.addClass('highlight'));
    }
    
    function centerOnSearchResult(index) {
        if (searchResults.length > 0 && index < searchResults.length) {
            const node = searchResults[index];
            cy.animate({
                center: { eles: node },
                zoom: 2
            }, {
                duration: 500
            });
            
            // Update which result is currently selected
            cy.nodes().removeClass('current-search');
            node.addClass('current-search');
        }
    }
    
    function updateSearchNavigation() {
        const prevButton = document.getElementById('prevResult');
        const nextButton = document.getElementById('nextResult');
        const searchInfo = document.getElementById('searchInfo');
        
        if (searchResults.length === 0) {
            prevButton.disabled = true;
            nextButton.disabled = true;
            searchInfo.textContent = '';
        } else {
            prevButton.disabled = false;
            nextButton.disabled = false;
            searchInfo.textContent = `${currentSearchIndex + 1} / ${searchResults.length}`;
        }
    }
    
    // Search dropdown functions
    function showSearchDropdown(results) {
        const dropdown = document.getElementById('searchResultsDropdown');
        dropdown.innerHTML = '';
        
        results.forEach((node, index) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const label = document.createElement('div');
            label.className = 'search-result-label';
            label.textContent = node.data('fullLabel');
            
            const path = document.createElement('div');
            path.className = 'search-result-path';
            path.textContent = node.data('fullPath');
            
            item.appendChild(label);
            item.appendChild(path);
            
            item.addEventListener('click', () => {
                hideSearchDropdown();
                // Clear previous search but keep this node
                cy.nodes().removeClass('highlight');
                cy.nodes().removeClass('current-search');
                searchResults = [node];
                currentSearchIndex = 0;
                highlightSearchResults();
                centerOnSearchResult(0);
                updateSearchNavigation();
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.style.display = 'block';
    }
    
    function hideSearchDropdown() {
        const dropdown = document.getElementById('searchResultsDropdown');
        dropdown.style.display = 'none';
    }
    
    // Theme application
    function applyThemeToGraph(theme) {
        // Apply background color
        const cyContainer = document.getElementById('cy');
        if (cyContainer && theme.backgroundColor) {
            cyContainer.style.backgroundColor = theme.backgroundColor;
        }
        
        cy.style()
            .selector('node[type="file"]')
            .style({
                'background-color': theme.fileNodeColor,
                'border-color': darkenColor(theme.fileNodeColor, 20)
            })
            .selector('node[type="folder"]')
            .style({
                'background-color': theme.folderNodeColor,
                'border-color': darkenColor(theme.folderNodeColor, 20)
            })
            .selector('edge')
            .style({
                'line-color': theme.edgeColor,
                'target-arrow-color': theme.edgeColor
            })
            .selector('node')
            .style({
                'font-size': theme.fontSize + 'px',
                'color': theme.fontColor || '#ffffff'
            })
            .update();
            
        // Update background color
        document.getElementById('cy').style.backgroundColor = theme.backgroundColor || '#1e1e1e';
    }
    
    // Export functionality
    function exportGraph(format) {
        if (format === 'svg') {
            const svgContent = cy.svg({ scale: 1, full: true });
            downloadFile('graph.svg', svgContent, 'image/svg+xml');
        } else if (format === 'png') {
            const pngData = cy.png({ scale: 2, full: true });
            downloadDataUri('graph.png', pngData);
        } else if (format === 'json') {
            const jsonData = {
                nodes: cy.nodes().map(n => n.data()),
                edges: cy.edges().map(e => e.data())
            };
            downloadFile('graph.json', JSON.stringify(jsonData, null, 2), 'application/json');
        }
    }
    
    // Download helpers
    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function downloadDataUri(filename, dataUri) {
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        a.click();
    }
    
    // Utility functions
    function darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }
    
    function updateCounts() {
        document.getElementById('nodeCount').textContent = `Nodes: ${cy.nodes().length}`;
        document.getElementById('edgeCount').textContent = `Edges: ${cy.edges().length}`;
    }
    
    // Tooltip functionality
    let tooltip = null;
    
    function showTooltip(position, text) {
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'node-tooltip';
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        tooltip.style.left = position.x + 10 + 'px';
        tooltip.style.top = position.y - 30 + 'px';
        tooltip.style.display = 'block';
    }
    
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'updateGraph':
                cy.elements().remove();
                const newElements = {
                    nodes: message.graphData.nodes.map(node => ({
                        data: { 
                            id: node.id, 
                            label: truncateLabel(node.label),
                            fullLabel: node.label,
                            type: node.type,
                            fullPath: node.fullPath
                        }
                    })),
                    edges: message.graphData.edges.map(edge => ({
                        data: { 
                            source: edge.source, 
                            target: edge.target 
                        }
                    }))
                };
                cy.add(newElements);
                cy.layout({
                    name: 'breadthfirst',
                    directed: true,
                    spacingFactor: 1.5,
                    animate: true,
                    animationDuration: 800,
                    nodeDimensionsIncludeLabels: false
                }).run();
                updateCounts();
                break;
        }
    });
    
    // Initialize settings UI with saved values
    function initSettingsUI() {
        const settings = loadSettings();
        document.getElementById('maxDepth').value = settings.maxDepth;
        document.getElementById('fileExtensions').value = settings.fileExtensions.join(', ');
        document.getElementById('excludePatterns').value = settings.excludePatterns.join('\n');
        document.getElementById('includeFileNames').value = (settings.includeFileNames || []).join(', ');
        document.getElementById('excludeFileNames').value = (settings.excludeFileNames || []).join(', ');
        document.getElementById('includeFolders').value = (settings.includeFolders || []).join(', ');
        document.getElementById('excludeFolders').value = (settings.excludeFolders || []).join(', ');
        
        // Initialize theme UI
        document.getElementById('fileNodeColor').value = currentTheme.fileNodeColor;
        document.getElementById('folderNodeColor').value = currentTheme.folderNodeColor;
        document.getElementById('edgeColor').value = currentTheme.edgeColor;
        document.getElementById('fontSize').value = currentTheme.fontSize;
        document.getElementById('fontSizeValue').textContent = currentTheme.fontSize + 'px';
        document.getElementById('fontColor').value = currentTheme.fontColor || '#ffffff';
        document.getElementById('backgroundColor').value = currentTheme.backgroundColor || '#1e1e1e';
    }
    
    // Initialize everything
    initGraph(graphData);
    initSettingsUI();
})();