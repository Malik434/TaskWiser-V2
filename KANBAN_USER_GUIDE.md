# Kanban Board - Quick User Guide

## 🎯 Key Features Overview

### Selection Mode & Batch Operations

**Enter Selection Mode:**
- Click the "Select Tasks" button in the header, OR
- Press **Ctrl+Shift+S**

**Select Tasks:**
- Click individual task cards to select them (tasks must have rewards)
- Click "Select All" in the Done column to select all completed tasks with rewards
- Selected tasks show with purple border and checkmark

**Batch Payment:**
- With tasks selected, click "Pay Selected (n)" button, OR
- Press **Ctrl+Shift+P**
- Review payment summary and confirm

**Clear Selection:**
- Click "Cancel" button, OR
- Press **Escape**

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Selection Mode | **Ctrl+Shift+S** |
| Open Batch Payment | **Ctrl+Shift+P** (with tasks selected) |
| Clear Selection | **Escape** |
| Undo Last Action | (UI button available when history exists) |

---

## 📥 Import/Export

**Export Selected Tasks to CSV:**
- Select tasks in Selection Mode
- Look for "Export" button in selection toolbar
- CSV file downloads with task details (Title, Description, Status, Priority, Reward, Amount, Assignee, Paid)

---

## 🔄 Undo Functionality

**Undo Last Action:**
- Click the "↶ Undo" button (appears when history is available)
- Maintains up to 10 actions in history
- Works for task updates, status changes, etc.

---

## 💡 Tips & Tricks

1. **Batch Processing**
   - Use "Select All" in Done column for quick completion of multiple tasks
   - Perfect for end-of-day batch payments

2. **Keyboard Navigation**
   - Use Ctrl+Shift+S to quickly toggle between normal and selection mode
   - Press Escape to quickly exit selection mode

3. **Performance**
   - Searching/filtering is optimized and won't slow down the UI
   - Fetch operations are debounced to prevent API spam

4. **Safety**
   - Race conditions are handled automatically
   - Task versions are tracked to prevent conflicts
   - Failed operations are logged with helpful error messages

5. **Memory Management**
   - Component automatically cleans up on unmount
   - No memory leaks from event listeners or timeouts

---

## 🐛 Error Handling

All Firebase operations are wrapped with safe error handlers:
- Failed operations show toast notifications
- Errors are logged to console for debugging
- UI remains responsive even if operations fail

---

## 🎨 Visual Indicators

- **Selection Mode Active:** Blue "Select Tasks" button becomes highlighted
- **Tasks Selected:** Purple border, filled checkbox, "X selected" badge
- **Selection Summary:** Fixed bottom bar shows total selected and payment amounts
- **Keyboard Shortcut Hints:** Help icon (?) in header shows all shortcuts

---

## ⚡ Performance Notes

- **Memoized Filtering:** Search and priority filter results are cached
- **Debounced Fetching:** Multiple fetch requests within 300ms are consolidated into one
- **Optimistic Updates:** UI updates immediately while Firebase syncs in background
- **Efficient Re-renders:** Only affected components re-render on state changes

---

## 🔐 Data Integrity

- Version tracking prevents overwriting recent changes
- Undo history preserves previous states
- Safe Firebase wrapper ensures proper error handling
- All operations properly logged for debugging

---

*Last Updated: November 17, 2025*
