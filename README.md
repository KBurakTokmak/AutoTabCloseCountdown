# Auto Tab Closer Countdown (Firefox)

Auto Tab Closer Countdown is a Firefox extension that lets you set a timer per tab.
When a tab's countdown reaches zero, the extension closes that tab automatically.

## Features

- Set a timer for the current tab using hours and minutes.
- Default input is **1 hour 0 minutes**.
- Live countdown in the extension popup.
- Cancel an active timer at any time.
- Independent timers for different tabs.

## Install (Recommended for Users)

1. Go to this repository's **Releases** page on GitHub.
2. Download the latest `.xpi` file (for example, `auto-tab-closer-countdown-1.0.0.xpi`).
3. Open Firefox and go to `about:addons`.
4. Click the gear icon, then choose **Install Add-on From File...**.
5. Select the downloaded `.xpi` file and confirm.

## Install for Local Testing (Developer Mode)

Use this method if you are developing or testing directly from source:

1. Clone/download this repository.
2. Open Firefox and go to `about:debugging`.
3. Click **This Firefox**.
4. Click **Load Temporary Add-on...**.
5. Select `manifest.json` from this project folder.

Note: temporary add-ons are removed when Firefox restarts. Reload from `about:debugging` when needed.

## How to Use

1. Open the tab you want to auto-close.
2. Click the extension icon in the Firefox toolbar.
3. Enter **Hours** and **Minutes** (default is 1h 0m).
4. Click **Start Countdown**.
5. Open the popup again anytime to see remaining time.
6. Click **Cancel** to stop the timer for that tab.

When the countdown reaches `00:00:00`, the extension closes that tab.

## For Contributors

- Manifest version: MV3
- Timer state is saved in `browser.storage.local`
- Timer expiry is handled in background script with alarms for accurate timing
