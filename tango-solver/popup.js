document.getElementById('solveBtn').addEventListener('click', async () => {
  const solveBtn = document.getElementById('solveBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  solveBtn.innerText = "Solving...";
  solveBtn.disabled = true;
  stopBtn.disabled = false;

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Solving logic
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: startBot
  });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  const solveBtn = document.getElementById('solveBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  solveBtn.innerText = "Solve It!";
  solveBtn.disabled = false;
  stopBtn.disabled = true;

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Stopping logic
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: stopBot
  });
});

function stopBot() {
    window.stopTangoBot = true;
    console.log("Stop signal sent to bot.");
}

async function startBot() {
    window.stopTangoBot = false;
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Extraction of the grid initial state
    
    let cellNodes = Array.from(document.querySelectorAll('[data-cell-idx]'));
    if (cellNodes.length === 0) return;

    console.log("Tango Bot activated! Analyzing board...");

    cellNodes.sort((a, b) => parseInt(a.getAttribute('data-cell-idx')) - parseInt(b.getAttribute('data-cell-idx')));

    const totalCells = cellNodes.length;
    const N = Math.sqrt(totalCells); 

    let board = [];
    // Edge constraints
    let rightEdge = []; 
    let downEdge = [];  

    for (let i = 0; i < N; i++) {
        board.push(new Array(N).fill(0));
        rightEdge.push(new Array(N).fill(0)); 
        downEdge.push(new Array(N).fill(0));
    }

    for (let i = 0; i < totalCells; i++) {
        const cell = cellNodes[i];
        const html = cell.innerHTML; 
        const row = Math.floor(i / N);
        const col = i % N;

        // 1 will correspont to sun, 2 will correspond to moon, 0 means the cell is empty
        if (html.includes('Sun')) board[row][col] = 1;
        else if (html.includes('Moon')) board[row][col] = 2;

        // Extracting Edges constraints
        if (col < N - 1) {
            const rightEdgeDiv = cell.querySelector('.lotka-cell-edge--right');
            if (rightEdgeDiv) {
                const rightHtml = rightEdgeDiv.innerHTML;
                if (rightHtml.includes('Equal')) rightEdge[row][col] = 1;
                else if (rightHtml.includes('Cross')) rightEdge[row][col] = 2;
            }
        }

        if (row < N - 1) {
            const downEdgeDiv = cell.querySelector('.lotka-cell-edge--down');
            if (downEdgeDiv) {
                const downHtml = downEdgeDiv.innerHTML;
                if (downHtml.includes('Equal')) downEdge[row][col] = 1;
                else if (downHtml.includes('Cross')) downEdge[row][col] = 2;
            }
        }
    }

    const initialBoard = JSON.parse(JSON.stringify(board));
    console.log("Initial State Extracted:", initialBoard);

    // Solving algorithm (Backtracking with constraint checks)
    
    function isValid(b, r, c, val) {
        const half = N / 2;

        // 1. Consecutive Rules (Max 2 consequent cells with the same value)
        if (c >= 2 && b[r][c-1] === val && b[r][c-2] === val) return false;
        if (c <= N-3 && b[r][c+1] === val && b[r][c+2] === val) return false;
        if (c >= 1 && c <= N-2 && b[r][c-1] === val && b[r][c+1] === val) return false;

        if (r >= 2 && b[r-1][c] === val && b[r-2][c] === val) return false;
        if (r <= N-3 && b[r+1][c] === val && b[r+2][c] === val) return false;
        if (r >= 1 && r <= N-2 && b[r-1][c] === val && b[r+1][c] === val) return false;

        // 2. Total Count Rules (max N/2 cells with the same value in any row or column)
        let rowCount = 0;
        let colCount = 0;
        for (let i = 0; i < N; i++) {
            if (b[r][i] === val) rowCount++;
            if (b[i][c] === val) colCount++;
        }
        if (rowCount >= half) return false;
        if (colCount >= half) return false;

        // 3. Edge Constraint Rules (checking adjacent cells with constraints)
        if (c > 0 && b[r][c-1] !== 0) {
            const constraint = rightEdge[r][c-1]; 
            if (constraint === 1 && b[r][c-1] !== val) return false; 
            if (constraint === 2 && b[r][c-1] === val) return false; 
        }

        if (c < N - 1 && b[r][c+1] !== 0) {
            const constraint = rightEdge[r][c];
            if (constraint === 1 && b[r][c+1] !== val) return false; 
            if (constraint === 2 && b[r][c+1] === val) return false; 
        }

        if (r > 0 && b[r-1][c] !== 0) {
            const constraint = downEdge[r-1][c];
            if (constraint === 1 && b[r-1][c] !== val) return false;
            if (constraint === 2 && b[r-1][c] === val) return false;
        }

        if (r < N - 1 && b[r+1][c] !== 0) {
            const constraint = downEdge[r][c];
            if (constraint === 1 && b[r+1][c] !== val) return false;
            if (constraint === 2 && b[r+1][c] === val) return false;
        }

        return true;
    }

    function solve(b) {
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (b[r][c] === 0) { 
                    for (let val = 1; val <= 2; val++) { 
                        if (isValid(b, r, c, val)) {
                            b[r][c] = val; 
                            if (solve(b)) return true; 
                            b[r][c] = 0; 
                        }
                    }
                    return false; 
                }
            }
        }
        return true; 
    }

    console.log("Calculating solution...");
    if (!solve(board)) {
        console.error("Could not find a valid solution!");
        return;
    }
    console.log("Solution Found:", board);

    // After finding the solution, we now have to interact with the page to fill the cells
    // We have to wait for React to update the DOM after each click
    
    const simulateClick = (element) => {
        const opts = { bubbles: true, cancelable: true, view: window };
        element.dispatchEvent(new PointerEvent('pointerdown', opts));
        element.dispatchEvent(new MouseEvent('mousedown', opts));
        element.dispatchEvent(new PointerEvent('pointerup', opts));
        element.dispatchEvent(new MouseEvent('mouseup', opts));
        element.click();
    };

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (window.stopTangoBot) {
                console.log("Bot stopped manually.");
                return;
            }

            // Only interact with cells that were originally empty
            if (initialBoard[r][c] === 0) {
                const targetVal = board[r][c]; 
                const cellIdx = r * N + c;

                let currentVal = 0; // The cell starts empty

                // Keep clicking until the visual cell matches our math matrix
                while (currentVal !== targetVal) {
                    if (window.stopTangoBot) return;

                    let currentCellBtn = document.querySelector(`[data-cell-idx="${cellIdx}"]`);
                    
                    if (currentCellBtn) {
                        simulateClick(currentCellBtn);
                        await sleep(300); // Giving React enough time to render the new page state
                        
                        currentCellBtn = document.querySelector(`[data-cell-idx="${cellIdx}"]`);
                        if (currentCellBtn) {
                            const newHtml = currentCellBtn.innerHTML;
                            if (newHtml.includes('Sun')) currentVal = 1;
                            else if (newHtml.includes('Moon')) currentVal = 2;
                            else currentVal = 0;
                        }
                    } else {
                        break;
                    }
                }
            }
        }
    }
    
    console.log("Tango successfully solved!");
}