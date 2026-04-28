const TIMERS_KEY = "tabTimers";
const ALARM_PREFIX = "tab-timer-";

let timerByTabId = {};

async function saveTimers() {
  await browser.storage.local.set({ [TIMERS_KEY]: timerByTabId });
}

function getRemainingMs(endTime) {
  return Math.max(0, endTime - Date.now());
}

function getAlarmName(tabId) {
  return `${ALARM_PREFIX}${tabId}`;
}

function parseAlarmTabId(alarmName) {
  if (!alarmName.startsWith(ALARM_PREFIX)) {
    return null;
  }

  const rawId = alarmName.slice(ALARM_PREFIX.length);
  if (!/^\d+$/.test(rawId)) {
    return null;
  }

  return rawId;
}

async function scheduleAlarm(tabId, endTime) {
  await browser.alarms.clear(getAlarmName(tabId));
  await browser.alarms.create(getAlarmName(tabId), { when: endTime });
}

async function removeTimer(tabId) {
  if (!timerByTabId[tabId]) {
    return;
  }

  delete timerByTabId[tabId];
  await browser.alarms.clear(getAlarmName(tabId));
  await saveTimers();
}

async function closeTab(tabId) {
  try {
    await browser.tabs.remove(Number(tabId));
  } catch (_error) {
    // Tab may already be closed or not closable; safe to ignore.
  } finally {
    await removeTimer(tabId);
  }
}

async function loadTimers() {
  const stored = await browser.storage.local.get(TIMERS_KEY);
  timerByTabId = stored[TIMERS_KEY] || {};

  for (const [tabId, timer] of Object.entries(timerByTabId)) {
    const remainingMs = getRemainingMs(timer.endTime);
    if (remainingMs <= 0) {
      await closeTab(tabId);
      continue;
    }

    await scheduleAlarm(tabId, timer.endTime);
  }
}

browser.runtime.onInstalled.addListener(loadTimers);
browser.runtime.onStartup.addListener(loadTimers);
loadTimers();

browser.tabs.onRemoved.addListener(async (tabId) => {
  await removeTimer(String(tabId));
});

browser.alarms.onAlarm.addListener(async (alarm) => {
  const tabId = parseAlarmTabId(alarm.name);
  if (!tabId) {
    return;
  }

  const timer = timerByTabId[tabId];
  if (!timer) {
    return;
  }

  const remainingMs = getRemainingMs(timer.endTime);
  if (remainingMs > 0) {
    // If alarm fired early for any reason, reschedule to exact end.
    await scheduleAlarm(tabId, timer.endTime);
    return;
  }

  await closeTab(tabId);
});

browser.runtime.onMessage.addListener(async (message) => {
  if (!message || !message.type) {
    return { ok: false, error: "Invalid message." };
  }

  if (message.type === "startTimer") {
    const { tabId, durationMs } = message.payload || {};
    if (!Number.isInteger(tabId) || !Number.isFinite(durationMs) || durationMs <= 0) {
      return { ok: false, error: "Invalid timer payload." };
    }

    const endTime = Date.now() + durationMs;
    timerByTabId[String(tabId)] = {
      endTime,
      createdAt: Date.now()
    };

    await saveTimers();
    await scheduleAlarm(String(tabId), endTime);

    return {
      ok: true,
      timer: timerByTabId[String(tabId)]
    };
  }

  if (message.type === "cancelTimer") {
    const { tabId } = message.payload || {};
    if (!Number.isInteger(tabId)) {
      return { ok: false, error: "Invalid tabId." };
    }

    await removeTimer(String(tabId));
    return { ok: true };
  }

  if (message.type === "getTimerState") {
    const { tabId } = message.payload || {};
    if (!Number.isInteger(tabId)) {
      return { ok: false, error: "Invalid tabId." };
    }

    const timer = timerByTabId[String(tabId)];
    if (!timer) {
      return { ok: true, hasTimer: false, remainingMs: 0 };
    }

    const remainingMs = getRemainingMs(timer.endTime);
    if (remainingMs <= 0) {
      await closeTab(String(tabId));
      return { ok: true, hasTimer: false, remainingMs: 0 };
    }

    return {
      ok: true,
      hasTimer: true,
      remainingMs,
      timer
    };
  }

  return { ok: false, error: "Unknown message type." };
});
