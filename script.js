// Global variables
let currentNodes = [];
let currentGraph = {};
let currentRoute = [];
let currentCost = 0;
let solveSteps = [];

// Main TSP Algorithm (converted from Python) - Now supports disconnected graphs
function greedyTSP(graph, start, allowDisconnected = true) {
    if (!graph || Object.keys(graph).length === 0) {
        return { route: [], cost: 0, error: "Graph is empty" };
    }

    if (!(start in graph)) {
        return { route: [], cost: 0, error: `Start node ${start} not in graph` };
    }

    const nodes = new Set(Object.keys(graph));
    const route = [start];
    let totalCost = 0;
    let current = start;
    const unvisited = new Set([...nodes]);
    unvisited.delete(start);
    
    const steps = [];
    let hasInfiniteCost = false;

    if (unvisited.size === 0) {
        return { route: [start, start], cost: 0, steps: [] };
    }

    while (unvisited.size > 0) {
        const neighbors = graph[current];
        const candidates = [];
        
        // Collect all candidates, including those with infinite cost
        for (const node of unvisited) {
            if (node in neighbors) {
                let cost = neighbors[node];
                // Treat very large numbers as infinity for disconnected nodes
                if (cost >= 999999) {
                    cost = Infinity;
                }
                candidates.push({ node, cost });
            } else if (allowDisconnected) {
                // If no direct connection and we allow disconnected graphs,
                // add with infinite cost
                candidates.push({ node: node, cost: Infinity });
            }
        }

        if (candidates.length === 0) {
            if (allowDisconnected) {
                // If no candidates but we allow disconnected, pick any unvisited with inf cost
                const nextNode = [...unvisited][0];
                candidates.push({ node: nextNode, cost: Infinity });
            } else {
                return { 
                    route: [], 
                    cost: 0, 
                    error: `Graph is disconnected from node ${current}; cannot complete tour`,
                    steps: []
                };
            }
        }

        // Find minimum cost candidate
        const nextCandidate = candidates.reduce((min, candidate) => 
            candidate.cost < min.cost ? candidate : min
        );

        const nextNode = nextCandidate.node;
        const edgeCost = nextCandidate.cost;

        if (edgeCost === Infinity) {
            hasInfiniteCost = true;
        }

        route.push(nextNode);
        totalCost += edgeCost;
        unvisited.delete(nextNode);
        
        steps.push({
            from: current,
            to: nextNode,
            cost: edgeCost,
            totalCost: totalCost,
            remaining: [...unvisited],
            isInfinite: edgeCost === Infinity
        });
        
        current = nextNode;
    }

    // Return to start
    let returnCost = Infinity;
    if (start in graph[current]) {
        returnCost = graph[current][start];
        // Treat very large numbers as infinity
        if (returnCost >= 999999) {
            returnCost = Infinity;
        }
    } else if (allowDisconnected) {
        returnCost = Infinity;
    } else {
        return { 
            route: [], 
            cost: 0, 
            error: `No edge from ${current} back to start ${start}; cannot close tour`,
            steps: []
        };
    }
    
    if (returnCost === Infinity) {
        hasInfiniteCost = true;
    }

    totalCost += returnCost;
    route.push(start);
    
    steps.push({
        from: current,
        to: start,
        cost: returnCost,
        totalCost: totalCost,
        remaining: [],
        isReturn: true,
        isInfinite: returnCost === Infinity
    });

    return { 
        route, 
        cost: totalCost, 
        steps, 
        error: null, 
        hasInfiniteCost: hasInfiniteCost 
    };
}

// Helper function to format cost for display
function formatCost(cost) {
    if (cost === Infinity || cost >= 999999) {
        return "∞";
    }
    return cost.toString();
}

// Generate node name inputs
function generateNodeInputs() {
    const nodeCount = parseInt(document.getElementById('nodeCount').value);
    
    if (nodeCount < 2 || nodeCount > 10) {
        alert('Jumlah node harus antara 2 dan 10');
        return;
    }

    const container = document.getElementById('nodeNamesContainer');
    container.innerHTML = '';

    for (let i = 0; i < nodeCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'node-input-group';
        
        inputGroup.innerHTML = `
            <label for="node${i}">Node ${i + 1}:</label>
            <input type="text" id="node${i}" placeholder="Contoh: Jakarta" required>
        `;
        
        container.appendChild(inputGroup);
    }

    document.getElementById('nodeNamesSection').style.display = 'block';
    
    // Scroll to the new section
    document.getElementById('nodeNamesSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Generate cost matrix
function generateCostMatrix() {
    const nodeCount = parseInt(document.getElementById('nodeCount').value);
    const nodeNames = [];

    // Collect node names
    for (let i = 0; i < nodeCount; i++) {
        const nodeName = document.getElementById(`node${i}`).value.trim();
        if (!nodeName) {
            alert(`Mohon isi nama untuk Node ${i + 1}`);
            return;
        }
        nodeNames.push(nodeName);
    }

    // Check for duplicate names
    const uniqueNames = new Set(nodeNames);
    if (uniqueNames.size !== nodeNames.length) {
        alert('Nama node tidak boleh sama!');
        return;
    }

    currentNodes = nodeNames;

    // Create cost matrix table
    const container = document.getElementById('costMatrixContainer');
    const matrixDiv = document.createElement('div');
    matrixDiv.className = 'cost-matrix';
    
    let tableHTML = '<table class="cost-table"><thead><tr><th>From \\ To</th>';
    
    // Header row
    nodeNames.forEach(name => {
        tableHTML += `<th>${name}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Matrix rows
    nodeNames.forEach((fromNode, i) => {
        tableHTML += `<tr><th>${fromNode}</th>`;
        nodeNames.forEach((toNode, j) => {
            const cellClass = i === j ? 'diagonal-cell' : '';
            const value = i === j ? '0' : '';
            const disabled = i === j ? 'readonly' : '';
            
            tableHTML += `
                <td class="${cellClass}">
                    <input type="text" 
                           id="cost_${i}_${j}" 
                           value="${value}" 
                           ${disabled}
                           placeholder="${i === j ? '0' : 'Cost atau inf'}">
                </td>
            `;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    matrixDiv.innerHTML = tableHTML;
    container.innerHTML = '';
    container.appendChild(matrixDiv);

    // Populate start node select
    const startNodeSelect = document.getElementById('startNode');
    startNodeSelect.innerHTML = '';
    nodeNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        startNodeSelect.appendChild(option);
    });

    document.getElementById('costMatrixSection').style.display = 'block';
    
    // Scroll to the new section
    document.getElementById('costMatrixSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Solve TSP
function solveTSP() {
    // Build graph from cost matrix
    const graph = {};
    const nodeCount = currentNodes.length;

    // Initialize graph
    currentNodes.forEach(node => {
        graph[node] = {};
    });

    // Fill graph with costs
    let hasEmptyCell = false;
    for (let i = 0; i < nodeCount; i++) {
        for (let j = 0; j < nodeCount; j++) {
            const costInput = document.getElementById(`cost_${i}_${j}`);
            let costValue = costInput.value.trim();
            
            if (i === j) {
                // Diagonal elements should be 0
                graph[currentNodes[i]][currentNodes[j]] = 0;
                continue;
            }
            
            let cost;
            
            // Handle infinity inputs
            if (costValue.toLowerCase() === 'inf' || 
                costValue.toLowerCase() === 'infinity' || 
                costValue === '∞' || 
                costValue === '') {
                cost = Infinity;
            } else {
                cost = parseFloat(costValue);
                if (isNaN(cost) || cost < 0) {
                    hasEmptyCell = true;
                    costInput.style.borderColor = '#e53e3e';
                    continue;
                } else if (cost >= 999999) {
                    cost = Infinity;
                }
            }
            
            costInput.style.borderColor = '#e2e8f0';
            graph[currentNodes[i]][currentNodes[j]] = cost;
        }
    }

    if (hasEmptyCell) {
        alert('Mohon isi cost dengan nilai yang valid (≥ 0) atau "inf" untuk tidak terhubung');
        return;
    }

    const startNode = document.getElementById('startNode').value;
    currentGraph = graph;

    // Solve TSP with disconnected graph support
    const result = greedyTSP(graph, startNode, true);
    
    if (result.error) {
        alert(`Error: ${result.error}`);
        return;
    }

    currentRoute = result.route;
    currentCost = result.cost;
    solveSteps = result.steps;

    // Display results
    displayResults(result.hasInfiniteCost);
    
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    
    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Display results
function displayResults(hasInfiniteCost = false) {
    // Display route
    const routeElement = document.getElementById('routeResult');
    routeElement.innerHTML = `
        <h3>🛤️ Rute Optimal:</h3>
        <div style="font-size: 1.3rem; margin-top: 10px;">
            ${currentRoute.join(' → ')}
        </div>
    `;

    // Display total cost
    const costElement = document.getElementById('costResult');
    const costDisplay = formatCost(currentCost);
    const costColor = currentCost === Infinity ? '#e53e3e' : '#744210';
    
    costElement.innerHTML = `
        <h3>💰 Total Cost:</h3>
        <div style="font-size: 1.8rem; margin-top: 10px; color: ${costColor};">
            ${costDisplay}
        </div>
        ${hasInfiniteCost ? '<p style="color: #e53e3e; font-size: 0.9rem; margin-top: 10px;">⚠️ Graph tidak sepenuhnya terhubung</p>' : ''}
    `;

    // Display step by step
    const stepsElement = document.getElementById('stepByStep');
    let stepsHTML = '<h4>📝 Langkah-langkah Perhitungan:</h4>';
    
    if (hasInfiniteCost) {
        stepsHTML += `
            <div style="background: #fed7d7; border: 1px solid #fc8181; border-radius: 8px; padding: 15px; margin: 10px 0;">
                <strong>⚠️ Peringatan:</strong> Graph mengandung node yang tidak terhubung langsung. 
                Beberapa langkah menggunakan cost infinite (∞).
            </div>
        `;
    }
    
    solveSteps.forEach((step, index) => {
        const stepType = step.isReturn ? '🔄 Kembali ke start' : `🚶 Langkah ${index + 1}`;
        const costDisplay = formatCost(step.cost);
        const totalDisplay = formatCost(step.totalCost);
        const infiniteWarning = step.isInfinite ? ' ⚠️' : '';
        
        stepsHTML += `
            <div class="step-item">
                <span>
                    <strong>${stepType}:</strong> 
                    ${step.from} → ${step.to}${infiniteWarning}
                </span>
                <div>
                    <span class="step-cost" style="background: ${step.isInfinite ? '#e53e3e' : '#667eea'}">
                        Cost: ${costDisplay}
                    </span>
                    <span class="step-cost" style="background: ${step.totalCost === Infinity ? '#e53e3e' : '#48bb78'}; margin-left: 5px;">
                        Total: ${totalDisplay}
                    </span>
                </div>
            </div>
        `;
    });
    
    stepsElement.innerHTML = stepsHTML;

    // Display route visualization
    displayRouteVisualization();
}

// Display route visualization
function displayRouteVisualization() {
    const vizElement = document.getElementById('routeVisualization');
    let vizHTML = '';

    currentRoute.forEach((node, index) => {
        vizHTML += `<div class="route-node">${node}</div>`;
        if (index < currentRoute.length - 1) {
            vizHTML += `<div class="route-arrow">→</div>`;
        }
    });

    vizElement.innerHTML = vizHTML;
}

// Reset all
function resetAll() {
    // Clear all sections
    document.getElementById('nodeNamesSection').style.display = 'none';
    document.getElementById('costMatrixSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';

    // Clear containers
    document.getElementById('nodeNamesContainer').innerHTML = '';
    document.getElementById('costMatrixContainer').innerHTML = '';
    
    // Reset input values
    document.getElementById('nodeCount').value = '3';
    
    // Clear global variables
    currentNodes = [];
    currentGraph = {};
    currentRoute = [];
    currentCost = 0;
    solveSteps = [];

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Example functions
function loadExample1() {
    // Set node count
    document.getElementById('nodeCount').value = '3';
    generateNodeInputs();

    // Wait a bit for the inputs to be created
    setTimeout(() => {
        // Set node names
        document.getElementById('node0').value = 'Jakarta';
        document.getElementById('node1').value = 'Bandung';
        document.getElementById('node2').value = 'Surabaya';
        
        generateCostMatrix();
        
        // Wait a bit more for the cost matrix to be created
        setTimeout(() => {
            // Set costs
            document.getElementById('cost_0_1').value = '150';  // Jakarta → Bandung
            document.getElementById('cost_0_2').value = '800';  // Jakarta → Surabaya
            document.getElementById('cost_1_0').value = '150';  // Bandung → Jakarta
            document.getElementById('cost_1_2').value = '700';  // Bandung → Surabaya
            document.getElementById('cost_2_0').value = '800';  // Surabaya → Jakarta
            document.getElementById('cost_2_1').value = '700';  // Surabaya → Bandung
            
            // Set start node
            document.getElementById('startNode').value = 'Jakarta';
        }, 100);
    }, 100);
}

function loadExample2() {
    // Set node count
    document.getElementById('nodeCount').value = '4';
    generateNodeInputs();

    // Wait a bit for the inputs to be created
    setTimeout(() => {
        // Set node names
        document.getElementById('node0').value = 'A';
        document.getElementById('node1').value = 'B';
        document.getElementById('node2').value = 'C';
        document.getElementById('node3').value = 'D';
        
        generateCostMatrix();
        
        // Wait a bit more for the cost matrix to be created
        setTimeout(() => {
            // Set random costs for 4x4 matrix
            const costs = [
                [0, 20, 42, 25],
                [20, 0, 30, 34],
                [42, 30, 0, 10],
                [25, 34, 10, 0]
            ];
            
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    document.getElementById(`cost_${i}_${j}`).value = costs[i][j];
                }
            }
            
            // Set start node
            document.getElementById('startNode').value = 'A';
        }, 100);
    }, 100);
}

function loadExample3() {
    // Set node count for non-connected graph example
    document.getElementById('nodeCount').value = '4';
    generateNodeInputs();

    // Wait a bit for the inputs to be created
    setTimeout(() => {
        // Set node names
        document.getElementById('node0').value = 'P';
        document.getElementById('node1').value = 'Q';
        document.getElementById('node2').value = 'R';
        document.getElementById('node3').value = 'S';
        
        generateCostMatrix();
        
        // Wait a bit more for the cost matrix to be created
        setTimeout(() => {
            // Set costs for non-connected graph
            // P connected to Q and R, but not directly to S
            // Q connected to P and S, but not directly to R
            // R connected to P and S, but not directly to Q  
            // S connected to Q and R, but not directly to P
            const costs = [
                ['0', '15', '25', 'inf'],  // P to others
                ['15', '0', 'inf', '20'],  // Q to others
                ['25', 'inf', '0', '30'],  // R to others
                ['inf', '20', '30', '0']   // S to others
            ];
            
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    document.getElementById(`cost_${i}_${j}`).value = costs[i][j];
                }
            }
            
            // Set start node
            document.getElementById('startNode').value = 'P';
            
            // Show explanation
            setTimeout(() => {
                alert('Contoh Graph Non-Connected:\n\n' +
                      'P ↔ Q (15), P ↔ R (25)\n' +
                      'Q ↔ S (20), R ↔ S (30)\n' +
                      'P tidak terhubung langsung ke S\n' +
                      'Q tidak terhubung langsung ke R\n\n' +
                      'TSP akan tetap mencari solusi dengan cost infinite untuk koneksi yang tidak ada.');
            }, 500);
        }, 100);
    }, 100);
}

// Add some interactive enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Add enter key support for node count input
    document.getElementById('nodeCount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateNodeInputs();
        }
    });

    // Add validation for node count
    document.getElementById('nodeCount').addEventListener('input', function(e) {
        const value = parseInt(e.target.value);
        if (value < 2 || value > 10) {
            e.target.style.borderColor = '#e53e3e';
        } else {
            e.target.style.borderColor = '#e2e8f0';
        }
    });

    // Show loading animations
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const originalText = this.textContent;
            if (this.textContent.includes('Solve TSP')) {
                this.textContent = '🔄 Calculating...';
                this.disabled = true;
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                }, 1000);
            }
        });
    });
});

// Add some utility functions
function validateInput(input) {
    const value = parseInt(input.value);
    if (isNaN(value) || value < 0) {
        input.style.borderColor = '#e53e3e';
        return false;
    } else {
        input.style.borderColor = '#e2e8f0';
        return true;
    }
}

// Add auto-calculation for symmetric matrices (optional feature)
function makeMatrixSymmetric() {
    const nodeCount = currentNodes.length;
    
    for (let i = 0; i < nodeCount; i++) {
        for (let j = 0; j < nodeCount; j++) {
            if (i !== j) {
                const costInput = document.getElementById(`cost_${i}_${j}`);
                const symmetricInput = document.getElementById(`cost_${j}_${i}`);
                
                costInput.addEventListener('input', function() {
                    if (this.value && !symmetricInput.value) {
                        symmetricInput.value = this.value;
                    }
                });
            }
        }
    }
}