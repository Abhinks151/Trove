# Trove — Project Documentation

> Internal technical reference. See README.md for the user-facing summary.

---

## 1. Project Overview

### Problem
When browsing the web — watching a video, reading an article, doing research — you frequently need to capture a thought, a task, or a reference. Switching to a separate notes app breaks the flow. The browser itself is where the work happens, so the capture tool should live there too.

### Motivation
Trove was built as a personal tool to scratch that itch. It is intentionally minimal: it does one or two things and does them well, without the overhead of a full productivity application.

### Target use case
- Capturing thoughts mid-browse without switching apps
- Maintaining a lightweight task list that is always one keyboard shortcut away
- Keeping data local, private, and under full control

### Design philosophy
- **Fast**: Open, capture, close. No friction.
- **Local-first**: Your data stays on your machine. No accounts, no sync, no cloud.
- **Simple scope**: Every feature addition is a deliberate decision.
- **Dark Neo-Brutalist UI**: Strong visual identity without being loud or inaccessible.

---

## 2. Product Scope

### Current — v0.1.1
- Frictionless quick-capture for Notes (`Alt + Shift + A` → Create Note → Focus → `Ctrl + Enter` save)
- Frictionless quick-capture for Todos (`Alt + Shift + S` → Focus → `Enter` add → Focus retained)
- Notes (create, view, edit, delete)
- Todos (add, inline edit, drag-and-drop reorder, complete, delete, bulk delete)
- Deterministic todo ordering (appended to bottom, position preserved on completion toggle)
- Custom scroll indicator control with native scrollbar hidden
- Local-only persistence via `chrome.storage.local`

### Explicitly excluded
- Due dates, priorities, categories, tags
- Cloud sync, authentication, collaboration
- AI features
- Notifications or reminders

---

## 3. Features

### Notes
- Frictionless quick capture via `Alt + Shift + A` opens directly to Create Note view with editor focused.
- Create a note; save with `Ctrl + Enter` or the Save button.
- Regular `Enter` key maintains normal multiline text editing.
- Notes are stored and listed newest-first.
- Click any note card to open it in detail/edit view.
- Edit note content inline; save with the Save button or `Ctrl + Enter`.
- Delete note directly via the Delete button on each note card in the list view without losing scroll position, or via Delete Note in detail view with a confirmation dialog.
- Empty or whitespace-only notes are rejected.

### Todos
- Frictionless quick capture via `Alt + Shift + S` opens directly to Todos section with input focused.
- Add a todo via the input box; press `Enter` or click Add. Input clears and immediately regains focus for consecutive entry.
- New todos are appended to the bottom of the list.
- Empty or whitespace-only todos are rejected.
- Edit existing todo inline (double-click text or click Edit); press `Enter` to save or `Esc` to cancel. Editing preserves completion state and list position.
- Drag-and-drop reorder todos manually using drag handles; new order is persisted.
- Toggle completion via checkbox; completed todos show strikethrough text without changing list position.
- Delete individual todos via the Delete button on each item without losing scroll position.
- Bulk delete via the Delete Todos button, which opens a modal with three options:
  - **Delete completed** — removes only completed todos.
  - **Delete all** — removes every todo.
  - **Cancel** — closes the modal without changes.
- Empty state shown when no todos exist.

### Custom Scroll Indicator
- Native browser scrollbars are hidden from list containers.
- Replaced with a subtle arrow control button (`↓` / `↑`) that appears only when content overflows.
- Clicking the arrow scrolls the list incrementally. When scrolled to the bottom, the arrow flips to `↑` to scroll up.

### Keyboard Shortcuts & Routing
- `Alt + Shift + A` → Triggers `notes-quick-capture` routing, opening extension directly to Create Note view with editor auto-focused.
- `Alt + Shift + S` → Triggers `todos-quick-capture` routing, opening extension directly to Todos with input auto-focused.
- Normal navigation (Home → Notes / Home → Todos) opens standard view lists without forcing quick-capture mode.
- Shortcuts are registered via native Chrome extension command API and can be customized at `brave://extensions/shortcuts`.

---

## 4. Tech Stack

| Tool | Purpose |
| --- | --- |
| TypeScript | Type-safe development |
| Vite | Build tool and dev server |
| Vitest | Unit testing |
| Chrome Extension Manifest V3 | Extension platform |
| `chrome.storage.local` | Local persistence |
| `chrome.storage.session` | Transient shortcut routing state |
| Vanilla HTML/CSS | UI, zero framework overhead |

No runtime JavaScript libraries. No React, Vue, or Angular.

---

## 5. Architecture

### Extension structure

```
Trove/
├── public/
│   ├── manifest.json       # Extension manifest (source of truth for build)
│   └── icons/              # Extension icons (16, 48, 128)
├── src/
│   ├── background/
│   │   └── background.ts   # MV3 service worker
│   ├── popup/
│   │   ├── popup.html      # Single-page popup shell
│   │   ├── popup.css       # Full design system & scroll indicator styles
│   │   └── popup.ts        # View controller and all UI logic
│   ├── storage/
│   │   ├── notes.ts        # Notes CRUD + persistence
│   │   └── todos.ts        # Todos CRUD, order management & reordering persistence
│   ├── types/
│   │   ├── note.ts         # Note interface
│   │   └── todo.ts         # Todo interface (with order property)
│   ├── utils/
│   │   └── date.ts         # Date formatting utilities
│   └── __tests__/
│       ├── notes.test.ts   # Notes storage test suite
│       └── todos.test.ts   # Todos storage test suite
├── manifest.json           # Root manifest (reference copy, not used by build)
├── vite.config.ts
├── tsconfig.json
└── vitest.config.ts
```

> **Important:** `public/manifest.json` is the file Vite copies to `dist/`.

### Popup lifecycle & Quick Capture
The popup mounts on `DOMContentLoaded`, checks for a shortcut-triggered `targetView` in session/local storage, and routes accordingly:
- `notes-quick-capture`: navigates to `note-create` and focuses `noteInput`.
- `notes`: navigates to `notes-list`.
- `todos-quick-capture` / `todos`: navigates to `todos` and focuses `todoInput`.
- Default: navigates to `home`.

### Background service worker
The MV3 service worker (`background.ts`) listens for `chrome.commands.onCommand` events. When a shortcut is triggered:
1. Sets `targetView` (`notes-quick-capture` or `todos-quick-capture`) in `chrome.storage.session` (fallback to `chrome.storage.local`).
2. Calls `chrome.action.openPopup()`.

---

## 6. Data Model

### Note

```typescript
interface Note {
  id: string;         // UUID or fallback timestamp-random
  content: string;    // Trimmed note text
  createdAt: number;  // Unix timestamp (ms)
}
```

Storage key: `trove_notes`

### Todo

```typescript
interface Todo {
  id: string;         // UUID or fallback timestamp-random
  text: string;       // Trimmed todo text
  completed: boolean; // Completion state
  createdAt: number;  // Unix timestamp (ms)
  order: number;      // Explicit sort index for drag-and-drop ordering
}
```

Storage key: `trove_todos`

---

## 7. Storage Layer

Both `storage/notes.ts` and `storage/todos.ts` follow the same pattern:

- Read from `chrome.storage.local` using a named key.
- Notes are sorted by `createdAt` descending (newest first).
- Todos are sorted by `order` ascending (new items get `maxOrder + 1` to append at the bottom).
- Write operations are serialized through a sequential Promise queue (`withStorageLock`) to prevent race conditions on rapid concurrent modifications.
- Validation (empty content rejection) happens before any storage operation.

---

## 8. Design System

### Color palette

| Token | Value | Usage |
| --- | --- | --- |
| Background | `#F5EED6` | Warm cream base |
| Text | `#111111` | Primary text, borders |
| Red | `#F20D2F` | Primary actions, accents |
| Blue | `#315C98` | Secondary actions, todos accent |
| White | `#FFFDF5` | Card surfaces |

### Borders and shadows
- Cards and interactive elements: `3px solid #111111`
- Hard offset shadow: `4px 4px 0 #111111`
- Hover state: `transform: translate(-2px, -2px)` + larger shadow
- Active/pressed state: `transform: translate(2px, 2px)` + smaller shadow

---

## 9. Performance & Resource Optimization

Trove is built to be lightweight, responsive, and resource-efficient.

### Key Performance Architecture Improvements
- **Event Delegation**: Replaced individual per-item event listeners with container-level event delegation (`notesListContainer` & `todosListContainer`), significantly reducing listener memory footprint and GC overhead.
- **DocumentFragment Batching**: List rendering batches DOM element creation into a `DocumentFragment` before appending to the container in a single layout pass.
- **Optimistic & Targeted DOM Updates**: 
  - Todo completion toggles update DOM element classes instantly (0ms latency) before completing background storage writes.
  - Item deletions target and remove specific DOM nodes directly without triggering full container tear-downs.
- **Throttled & Passive Scroll Handling**: Custom scroll indicators use `requestAnimationFrame` scheduling and `{ passive: true }` scroll event listeners to prevent forced synchronous layout reflows.
- **Cached `Intl` Date Formatters**: Replaced per-render `toLocaleTimeString`/`toLocaleDateString` calls with static, reusable `Intl.DateTimeFormat` instances in `src/utils/date.ts`.
- **$O(N)$ Algorithmic Reordering**: Replaced $O(N^2)$ array inclusion checks during todo reordering with $O(1)$ `Set` lookups in `src/storage/todos.ts`.

**Build Output:**
- `popup.html`: ~8.2 KB (gzip: ~1.8 KB)
- `assets/popup.css`: ~12.9 KB (gzip: ~2.7 KB)
- `assets/popup.js`: ~19.8 KB (gzip: ~5.0 KB)
- `background.js`: ~0.5 KB (gzip: ~0.3 KB)

---

## 10. Architectural Decisions

### Why separate `notes-quick-capture` from `notes` navigation?
Normal navigation from Home to Notes should display existing notes (`notes-list`). Quick capture shortcut (`Alt + Shift + A`) specifically targets immediate note creation without requiring mouse clicks. Differentiating `targetView` strings in background service worker enables clean context-aware routing.

### Why explicit `order` property for Todos?
Index-based sorting breaks when completing tasks or deleting items. An explicit `order` index decoupled from completion state ensures new tasks append to the bottom, drag-and-drop custom orders persist across browser restarts, and checking off tasks doesn't cause items to jump around.

### Why floating arrow scroll control instead of native scrollbars?
Native scrollbars vary across OS environments and disrupt Neo-Brutalist border aesthetics. The custom scroll indicator provides a subtle, functional visual affordance (`↓` / `↑`) that appears only when content overflows.

---

## 11. Development

```bash
pnpm install     # Install dependencies
pnpm test        # Run Vitest unit tests
pnpm build       # Type-check + production build → dist/
```

---

## 12. Release History

### v0.1.1
- Quick capture friction reduction for Notes (`Alt+Shift+A` → Create mode → focused → `Ctrl+Enter` save)
- Quick capture friction reduction for Todos (`Alt+Shift+S` → focused → `Enter` add → retained focus)
- Todo inline editing (double-click or Edit button)
- Todo drag-and-drop reordering with persistent order
- New todos appended to bottom of list
- Todo completion status no longer changes list position
- Scroll position preservation during todo state updates
- Custom scroll indicator control replacing native scrollbars
- Version synchronized across manifest.json and package.json

### v0.1.0
- Initial release
- Product renamed from Jot to Trove
- Neo-Brutalist + Memphis visual identity
- Central Home page with Notes and Todos navigation
- Notes: create, edit, delete
- Todos: add, complete, delete, bulk delete with confirmation modal
- Keyboard shortcuts: `Alt+Shift+A` (Notes), `Alt+Shift+S` (Todos)
- Background service worker for native command handling
