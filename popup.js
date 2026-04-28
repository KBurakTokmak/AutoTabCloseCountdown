const hoursInput = document.getElementById("hoursInput");
const minutesInput = document.getElementById("minutesInput");
const startButton = document.getElementById("startButton");
const cancelButton = document.getElementById("cancelButton");
const statusText = document.getElementById("statusText");
const countdownText = document.getElementById("countdownText");

let activeTabId = null;
let refreshHandle = null;
let activeEndTime = null;
let syncTickCount = 0;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function setInputsDisabled(disabled) {
  hoursInput.disabled = disabled;
  minutesInput.disabled = disabled;
}

function setActiveUI(remainingMs) {
  statusText.textContent = "Timer is running for this tab.";
  countdownText.textContent = formatDuration(remainingMs);
  setInputsDisabled(true);
  startButton.disabled = true;
  cancelButton.disabled = false;
}

function setIdleUI(statusMessage = "No active timer on this tab.") {
  statusText.textContent = statusMessage;
  countdownText.textContent = "--:--:--";
  activeEndTime = null;
  setInputsDisabled(false);
  startButton.disabled = false;
  cancelButton.disabled = true;
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function sanitizeNumber(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

async function syncTimerState() {
  if (activeTabId === null) {
    return;
  }

  const response = await browser.runtime.sendMessage({
    type: "getTimerState",
    payload: { tabId: activeTabId }
  });

  if (!response || !response.ok) {
    setIdleUI("Unable to read timer state.");
    return;
  }

  if (!response.hasTimer) {
    setIdleUI();
    return;
  }

  activeEndTime = response.timer.endTime;
  setActiveUI(Math.max(0, activeEndTime - Date.now()));
}

function renderLocalCountdown() {
  if (activeEndTime === null) {
    return;
  }

  const remainingMs = Math.max(0, activeEndTime - Date.now());
  setActiveUI(remainingMs);

  if (remainingMs <= 0) {
    // Tab will be closed by background; pull exact state once.
    syncTimerState();
  }
}

async function startTimer() {
  if (activeTabId === null) {
    setIdleUI("No active tab selected.");
    return;
  }

  const hours = sanitizeNumber(Number(hoursInput.value));
  const minutes = sanitizeNumber(Number(minutesInput.value));
  const durationMs = (hours * 3600 + minutes * 60) * 1000;

  if (durationMs <= 0) {
    setIdleUI("Please enter a duration greater than zero.");
    return;
  }

  const response = await browser.runtime.sendMessage({
    type: "startTimer",
    payload: { tabId: activeTabId, durationMs }
  });

  if (!response || !response.ok) {
    setIdleUI("Failed to start timer.");
    return;
  }

  await syncTimerState();
}

async function cancelTimer() {
  if (activeTabId === null) {
    setIdleUI("No active tab selected.");
    return;
  }

  const response = await browser.runtime.sendMessage({
    type: "cancelTimer",
    payload: { tabId: activeTabId }
  });

  if (!response || !response.ok) {
    setIdleUI("Failed to cancel timer.");
    return;
  }

  setIdleUI("Timer canceled.");
}

async function init() {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    setIdleUI("Could not detect the active tab.");
    return;
  }

  activeTabId = tab.id;
  cancelButton.disabled = true;
  await syncTimerState();

  if (refreshHandle !== null) {
    clearInterval(refreshHandle);
  }

  syncTickCount = 0;
  refreshHandle = setInterval(() => {
    syncTickCount += 1;
    renderLocalCountdown();
    // Keep synced to background state, but not every tick.
    if (syncTickCount % 5 === 0) {
      syncTimerState();
    }
  }, 1000);
}

startButton.addEventListener("click", startTimer);
cancelButton.addEventListener("click", cancelTimer);
window.addEventListener("unload", () => {
  if (refreshHandle !== null) {
    clearInterval(refreshHandle);
    refreshHandle = null;
  }
});

init();
