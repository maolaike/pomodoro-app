# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A desktop Pomodoro Timer application built with Electron. Features include:
- Timer with work/short break/long break modes
- Task management with pomodoro estimation
- Statistics (today/week/month)
- System tray integration
- Desktop notifications
- Persistent local storage

## Commands

```bash
npm start      # Start in development mode
npm run build  # Build for current platform
npm run build:win  # Build for Windows specifically
```

## Architecture

**Main Process (main.js)**
- Creates BrowserWindow and system tray
- Handles IPC for settings, tasks, history, and notifications
- Uses `electron-store` for JSON-based persistent storage
- Window minimizes to tray on close (not quit)

**Preload (preload.js)**
- Secure bridge exposing `window.electronAPI` to renderer
- Uses `contextBridge` and `ipcRenderer.invoke` for async communication

**Renderer (src/renderer.js)**
- Vanilla JS with state management object
- Timer logic using `setInterval`
- Task CRUD operations via electronAPI
- Statistics calculated from history records

## Data Model

**Settings:** workDuration, shortBreakDuration, longBreakDuration, longBreakInterval, autoStartBreaks

**Task:** id, name, estimatedPomodoros, completedPomodoros, completed

**History:** id, type, taskId, completedAt (ISO timestamp)

## Build Output

- Windows installer: `dist/win-unpacked/` or NSIS installer in `dist/`
- App icon: `src/assets/icon.png`
