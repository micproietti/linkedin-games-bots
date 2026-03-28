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
    window.stopSudokuBot = true;
    console.log("Stop signal sent to bot.");
}

async function startBot() {
    window.stopSudokuBot = false; 

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const getRandom = (min, max) => Math.random() * (max - min) + min;

    function getByXPath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    if (!getByXPath("//*[@data-control-btn='hint']")) {
        console.log("Hint button not found. Are you on the right frame?");
        return;
    }

    console.log("Bot activated! Solving Sudoku...");

    // Checking if the stop flag has been triggered
    while (!window.stopSudokuBot) {
        try {
            const hintBtn = getByXPath("//*[@data-control-btn='hint']");
            if (!hintBtn) {
                console.log("Game finished or hint button gone.");
                break; 
            }
            hintBtn.click();
            
            let numElement = null;
            for(let i = 0; i < 10; i++) { 
                if (window.stopSudokuBot) break; // Checking flag while waiting
                await sleep(50 * getRandom(1, 5));
                numElement = document.querySelector(".sudoku-under-board-scrim-message-text b");
                if (numElement) break;
            }
            
            // Other checks before clicking the numbers
            if (window.stopSudokuBot) break; 
            if (!numElement) break; 
            
            const correctNumber = numElement.innerText.trim();
            
            const closeBtn = getByXPath("//*[@aria-label='Close hint message']");
            if (closeBtn) closeBtn.click();
            
            await sleep(50 * getRandom(1, 5)); 
            if (window.stopSudokuBot) break;
            
            const numberBtn = getByXPath(`//*[@data-number='${correctNumber}']`);
            if (numberBtn) numberBtn.click();
            
            await sleep(100 * getRandom(1, 5)); 

        } catch (e) {
            console.error("Bot stopped due to error:", e);
            break;
        }
    }
    
    console.log("Bot successfully stopped.");
}
