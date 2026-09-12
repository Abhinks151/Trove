import { getNotes, saveNote, updateNote, deleteNote } from '../storage/notes';
import {
  getTodos,
  saveTodo,
  toggleTodo,
  updateTodo as updateTodoStorage,
  reorderTodos,
  deleteTodo,
  deleteCompletedTodos,
  deleteAllTodos
} from '../storage/todos';
import { Note } from '../types/note';
import { Todo } from '../types/todo';
import { formatRelativeDate, formatFullDate } from '../utils/date';

// View states
type ViewState = 'home' | 'notes-list' | 'note-create' | 'note-detail' | 'todos';
let currentView: ViewState = 'home';

// Active Note state
let activeNote: Note | null = null;

// Currently editing Todo ID
let editingTodoId: string | null = null;

// Cached list data for fast lookup without extra storage calls
let cachedNotes: Note[] = [];
let cachedTodos: Todo[] = [];

// Timeouts for feedback messages
let createNoteFeedbackTimeout: number | undefined;
let detailNoteFeedbackTimeout: number | undefined;
let todoFeedbackTimeout: number | undefined;

// DOM Elements: Views
const viewHome = document.getElementById('view-home') as HTMLElement;
const viewNotesList = document.getElementById('view-notes-list') as HTMLElement;
const viewNoteCreate = document.getElementById('view-note-create') as HTMLElement;
const viewNoteDetail = document.getElementById('view-note-detail') as HTMLElement;
const viewTodos = document.getElementById('view-todos') as HTMLElement;

// DOM Elements: Scroll containers & indicators
const notesScrollContainer = document.getElementById('notes-scroll-container') as HTMLElement;
const notesScrollUp = document.getElementById('notes-scroll-up') as HTMLButtonElement;
const notesScrollDown = document.getElementById('notes-scroll-down') as HTMLButtonElement;

const todosScrollContainer = document.getElementById('todos-scroll-container') as HTMLElement;
const todoScrollUp = document.getElementById('todo-scroll-up') as HTMLButtonElement;
const todoScrollDown = document.getElementById('todo-scroll-down') as HTMLButtonElement;

// DOM Elements: Home
const btnHomeNotes = document.getElementById('btn-home-notes') as HTMLButtonElement;
const btnHomeTodos = document.getElementById('btn-home-todos') as HTMLButtonElement;

// DOM Elements: Notes List
const btnNotesBack = document.getElementById('btn-notes-back') as HTMLButtonElement;
const btnCreateNoteHeader = document.getElementById('btn-create-note-header') as HTMLButtonElement;
const notesListContainer = document.getElementById('notes-list-container') as HTMLElement;
const notesEmptyState = document.getElementById('notes-empty-state') as HTMLElement;
const btnCreateNoteEmpty = document.getElementById('btn-create-note-empty') as HTMLButtonElement;

// DOM Elements: Create Note
const btnCreateBack = document.getElementById('btn-create-back') as HTMLButtonElement;
const noteInput = document.getElementById('note-input') as HTMLTextAreaElement;
const createFeedback = document.getElementById('create-feedback') as HTMLElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;

// DOM Elements: Note Detail
const btnDetailBack = document.getElementById('btn-detail-back') as HTMLButtonElement;
const detailInput = document.getElementById('detail-input') as HTMLTextAreaElement;
const detailTimestamp = document.getElementById('detail-timestamp') as HTMLElement;
const detailFeedback = document.getElementById('detail-feedback') as HTMLElement;
const btnUpdateNote = document.getElementById('btn-update-note') as HTMLButtonElement;
const btnDeleteNote = document.getElementById('btn-delete-note') as HTMLButtonElement;

// DOM Elements: Note Delete Dialog
const deleteConfirmDialog = document.getElementById('delete-confirm-dialog') as HTMLElement;
const btnCancelDelete = document.getElementById('btn-cancel-delete') as HTMLButtonElement;
const btnConfirmDelete = document.getElementById('btn-confirm-delete') as HTMLButtonElement;

// DOM Elements: Todos
const btnTodosBack = document.getElementById('btn-todos-back') as HTMLButtonElement;
const btnClearTodos = document.getElementById('btn-clear-todos') as HTMLButtonElement;
const todoInput = document.getElementById('todo-input') as HTMLInputElement;
const btnAddTodo = document.getElementById('btn-add-todo') as HTMLButtonElement;
const todoFeedback = document.getElementById('todo-feedback') as HTMLElement;
const todosListContainer = document.getElementById('todos-list-container') as HTMLElement;
const todosEmptyState = document.getElementById('todos-empty-state') as HTMLElement;

// DOM Elements: Todo Delete Dialog
const todoDeleteDialog = document.getElementById('todo-delete-dialog') as HTMLElement;
const btnDeleteCompleted = document.getElementById('btn-delete-completed') as HTMLButtonElement;
const btnDeleteAll = document.getElementById('btn-delete-all') as HTMLButtonElement;
const btnCancelTodoDelete = document.getElementById('btn-cancel-todo-delete') as HTMLButtonElement;

/**
 * View Navigation Handler
 */
function navigateTo(view: ViewState) {
  currentView = view;

  // Hide all views
  const allViews = [viewHome, viewNotesList, viewNoteCreate, viewNoteDetail, viewTodos];
  allViews.forEach((v) => {
    if (v) {
      v.classList.add('hidden');
      v.classList.remove('active');
    }
  });

  // Hide all modals
  if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden');
  if (todoDeleteDialog) todoDeleteDialog.classList.add('hidden');

  if (view === 'home') {
    viewHome.classList.remove('hidden');
    viewHome.classList.add('active');
  } else if (view === 'notes-list') {
    viewNotesList.classList.remove('hidden');
    viewNotesList.classList.add('active');
    loadAndRenderNotesList();
  } else if (view === 'note-create') {
    viewNoteCreate.classList.remove('hidden');
    viewNoteCreate.classList.add('active');
    noteInput.value = '';
    clearCreateNoteFeedback();
    noteInput.focus();
  } else if (view === 'note-detail') {
    viewNoteDetail.classList.remove('hidden');
    viewNoteDetail.classList.add('active');
    renderNoteDetail();
  } else if (view === 'todos') {
    viewTodos.classList.remove('hidden');
    viewTodos.classList.add('active');
    clearTodoFeedback();
    loadAndRenderTodosList();
    todoInput.focus();
  }
}

/**
 * Check if extension was launched via command shortcut
 */
async function checkShortcutLaunch() {
  try {
    let targetView: string | undefined;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      if (chrome.storage.session) {
        const sessionData = await chrome.storage.session.get('targetView');
        targetView = sessionData.targetView;
        if (targetView) {
          await chrome.storage.session.remove('targetView');
        }
      }

      if (!targetView && chrome.storage.local) {
        const localData = await chrome.storage.local.get('targetView');
        targetView = localData.targetView;
        if (targetView) {
          await chrome.storage.local.remove('targetView');
        }
      }
    }

    if (targetView === 'notes-quick-capture') {
      navigateTo('note-create');
      noteInput.focus();
    } else if (targetView === 'notes') {
      navigateTo('notes-list');
    } else if (targetView === 'todos-quick-capture' || targetView === 'todos') {
      navigateTo('todos');
      todoInput.focus();
    } else {
      navigateTo('home');
    }
  } catch (err) {
    console.error('Error checking shortcut launch:', err);
    navigateTo('home');
  }
}

/**
 * Custom Scroll Indicator Helper
 * Manages separate Top (↑) and Bottom (↓) scroll arrows when content overflows
 */
function updateScrollIndicators(
  container: HTMLElement | null,
  upBtn: HTMLButtonElement | null,
  downBtn: HTMLButtonElement | null
) {
  if (!container) return;

  const scrollTop = container.scrollTop;
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;

  // Show arrows only when content genuinely overflows
  const isScrollable = scrollHeight > clientHeight + 4;
  if (!isScrollable) {
    if (upBtn) upBtn.classList.add('hidden');
    if (downBtn) downBtn.classList.add('hidden');
    return;
  }

  // Show UP arrow if scrolled down from top
  const canScrollUp = scrollTop > 6;
  if (upBtn) {
    if (canScrollUp) {
      upBtn.classList.remove('hidden');
    } else {
      upBtn.classList.add('hidden');
    }
  }

  // Show DOWN arrow if more content below
  const canScrollDown = Math.ceil(scrollTop + clientHeight) < scrollHeight - 6;
  if (downBtn) {
    if (canScrollDown) {
      downBtn.classList.remove('hidden');
    } else {
      downBtn.classList.add('hidden');
    }
  }
}

// Throttled scroll indicators to avoid forced synchronous layout reflows
let notesScrollRafPending = false;
function scheduleNotesScrollUpdate() {
  if (!notesScrollRafPending) {
    notesScrollRafPending = true;
    requestAnimationFrame(() => {
      updateScrollIndicators(notesScrollContainer, notesScrollUp, notesScrollDown);
      notesScrollRafPending = false;
    });
  }
}

let todosScrollRafPending = false;
function scheduleTodosScrollUpdate() {
  if (!todosScrollRafPending) {
    todosScrollRafPending = true;
    requestAnimationFrame(() => {
      updateScrollIndicators(todosScrollContainer, todoScrollUp, todoScrollDown);
      todosScrollRafPending = false;
    });
  }
}

function handleScrollClick(container: HTMLElement | null, direction: 'up' | 'down') {
  if (!container) return;
  const scrollAmount = direction === 'up' ? -150 : 150;
  container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
}

/**
 * Create Note Feedback Helpers
 */
function showCreateNoteFeedback(message: string, isError = false) {
  if (createNoteFeedbackTimeout) window.clearTimeout(createNoteFeedbackTimeout);
  createFeedback.textContent = message;
  createFeedback.className = `feedback-msg ${isError ? 'error' : 'success'}`;
  createNoteFeedbackTimeout = window.setTimeout(() => {
    clearCreateNoteFeedback();
  }, 3500);
}

function clearCreateNoteFeedback() {
  if (createNoteFeedbackTimeout) window.clearTimeout(createNoteFeedbackTimeout);
  createFeedback.textContent = '';
  createFeedback.className = 'feedback-msg';
}

/**
 * Detail Note Feedback Helpers
 */
function showDetailNoteFeedback(message: string, isError = false) {
  if (detailNoteFeedbackTimeout) window.clearTimeout(detailNoteFeedbackTimeout);
  detailFeedback.textContent = message;
  detailFeedback.className = `feedback-msg ${isError ? 'error' : 'success'}`;
  detailNoteFeedbackTimeout = window.setTimeout(() => {
    clearDetailNoteFeedback();
  }, 3500);
}

function clearDetailNoteFeedback() {
  if (detailNoteFeedbackTimeout) window.clearTimeout(detailNoteFeedbackTimeout);
  detailFeedback.textContent = '';
  detailFeedback.className = 'feedback-msg';
}

/**
 * Todo Feedback Helpers
 */
function showTodoFeedback(message: string, isError = false) {
  if (todoFeedbackTimeout) window.clearTimeout(todoFeedbackTimeout);
  todoFeedback.textContent = message;
  todoFeedback.className = `feedback-msg ${isError ? 'error' : 'success'}`;
  todoFeedbackTimeout = window.setTimeout(() => {
    clearTodoFeedback();
  }, 3500);
}

function clearTodoFeedback() {
  if (todoFeedbackTimeout) window.clearTimeout(todoFeedbackTimeout);
  todoFeedback.textContent = '';
  todoFeedback.className = 'feedback-msg';
}

/**
 * Notes Logic
 */
async function handleSaveNote() {
  const content = noteInput.value;
  clearCreateNoteFeedback();

  try {
    await saveNote(content);
    noteInput.value = '';
    showCreateNoteFeedback('✓ Note saved', false);
    setTimeout(() => {
      navigateTo('notes-list');
    }, 600);
  } catch (err) {
    if (err instanceof Error) {
      showCreateNoteFeedback(err.message, true);
    } else {
      showCreateNoteFeedback('Unable to save note. Please try again.', true);
    }
  }
}

async function handleUpdateNote() {
  if (!activeNote) return;
  const content = detailInput.value;
  clearDetailNoteFeedback();

  try {
    const updated = await updateNote(activeNote.id, content);
    activeNote = updated;
    showDetailNoteFeedback('✓ Note saved', false);
  } catch (err) {
    if (err instanceof Error) {
      showDetailNoteFeedback(err.message, true);
    } else {
      showDetailNoteFeedback('Unable to update note. Please try again.', true);
    }
  }
}

async function loadAndRenderNotesList() {
  notesListContainer.innerHTML = '';
  notesEmptyState.classList.add('hidden');

  try {
    cachedNotes = await getNotes();

    if (cachedNotes.length === 0) {
      notesEmptyState.classList.remove('hidden');
      scheduleNotesScrollUpdate();
      return;
    }

    // Use DocumentFragment to batch DOM insertions in a single reflow
    const fragment = document.createDocumentFragment();

    cachedNotes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('data-id', note.id);
      card.setAttribute('aria-label', `Read note from ${formatRelativeDate(note.createdAt)}`);

      const preview = document.createElement('div');
      preview.className = 'note-preview';
      preview.textContent = note.content;

      const time = document.createElement('div');
      time.className = 'note-time';
      time.textContent = formatRelativeDate(note.createdAt);

      card.appendChild(preview);
      card.appendChild(time);
      fragment.appendChild(card);
    });

    notesListContainer.appendChild(fragment);
    scheduleNotesScrollUpdate();
  } catch (err) {
    console.error('Error rendering notes list:', err);
    notesListContainer.innerHTML = `<div class="feedback-msg error">Unable to load notes.</div>`;
  }
}

function renderNoteDetail() {
  if (!activeNote) {
    navigateTo('notes-list');
    return;
  }

  clearDetailNoteFeedback();
  detailInput.value = activeNote.content;
  detailTimestamp.textContent = formatFullDate(activeNote.createdAt);
  detailInput.focus();
}

async function handleConfirmDeleteNote() {
  if (!activeNote) return;

  try {
    await deleteNote(activeNote.id);
    activeNote = null;
    deleteConfirmDialog.classList.add('hidden');
    navigateTo('notes-list');
  } catch (err) {
    console.error('Failed to delete note:', err);
    showDetailNoteFeedback('Unable to delete note. Please try again.', true);
  }
}

/**
 * Todos Logic
 */
async function handleAddTodo() {
  const text = todoInput.value;
  clearTodoFeedback();

  try {
    await saveTodo(text);
    todoInput.value = '';
    await loadAndRenderTodosList();
    todoInput.focus();
  } catch (err) {
    if (err instanceof Error) {
      showTodoFeedback(err.message, true);
    } else {
      showTodoFeedback('Unable to save todo.', true);
    }
  }
}

let draggedTodoId: string | null = null;

function createTodoItemElement(todo: Todo): HTMLElement {
  const item = document.createElement('div');
  item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
  item.setAttribute('data-id', todo.id);
  item.setAttribute('draggable', 'true');

  // Drag handle
  const dragHandle = document.createElement('span');
  dragHandle.className = 'drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.setAttribute('aria-label', 'Drag to reorder');
  dragHandle.setAttribute('title', 'Drag to reorder');

  const left = document.createElement('div');
  left.className = 'todo-left';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'completed'}`);

  left.appendChild(checkbox);

  if (editingTodoId === todo.id) {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = todo.text;
    left.appendChild(editInput);
    setTimeout(() => editInput.focus(), 0);
  } else {
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;
    textSpan.setAttribute('title', 'Double-click to edit');
    left.appendChild(textSpan);
  }

  // Actions container (Edit & Delete)
  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.className = 'btn-edit-todo';
  btnEdit.textContent = 'Edit';
  btnEdit.setAttribute('aria-label', `Edit todo "${todo.text}"`);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.className = 'btn-delete-todo';
  btnDelete.textContent = 'Delete';
  btnDelete.setAttribute('aria-label', `Delete todo "${todo.text}"`);

  actions.appendChild(btnEdit);
  actions.appendChild(btnDelete);

  item.appendChild(dragHandle);
  item.appendChild(left);
  item.appendChild(actions);

  // Drag and drop events per item (standard HTML5 DnD requirement)
  item.addEventListener('dragstart', (e) => {
    draggedTodoId = todo.id;
    item.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', todo.id);
    }
  });

  item.addEventListener('dragend', () => {
    draggedTodoId = null;
    item.classList.remove('dragging');
    document.querySelectorAll('.todo-item').forEach((el) => el.classList.remove('drag-over'));
  });

  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (draggedTodoId && draggedTodoId !== todo.id) {
      item.classList.add('drag-over');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }
  });

  item.addEventListener('dragleave', () => {
    item.classList.remove('drag-over');
  });

  item.addEventListener('drop', async (e) => {
    e.preventDefault();
    item.classList.remove('drag-over');
    if (!draggedTodoId || draggedTodoId === todo.id) return;

    const currentTodos = cachedTodos.length ? cachedTodos : await getTodos();
    const currentIds = currentTodos.map((t) => t.id);
    const fromIndex = currentIds.indexOf(draggedTodoId);
    const toIndex = currentIds.indexOf(todo.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      currentIds.splice(fromIndex, 1);
      currentIds.splice(toIndex, 0, draggedTodoId);
      await reorderTodos(currentIds);
      await loadAndRenderTodosList(true);
    }
  });

  return item;
}

async function loadAndRenderTodosList(preserveScroll = false) {
  const savedScrollTop = todosScrollContainer ? todosScrollContainer.scrollTop : 0;
  todosListContainer.innerHTML = '';
  todosEmptyState.classList.add('hidden');

  try {
    cachedTodos = await getTodos();

    if (cachedTodos.length === 0) {
      todosEmptyState.classList.remove('hidden');
      scheduleTodosScrollUpdate();
      return;
    }

    // Batch element insertion into DocumentFragment
    const fragment = document.createDocumentFragment();
    cachedTodos.forEach((todo) => {
      fragment.appendChild(createTodoItemElement(todo));
    });

    todosListContainer.appendChild(fragment);

    if (preserveScroll && todosScrollContainer) {
      todosScrollContainer.scrollTop = savedScrollTop;
    }

    scheduleTodosScrollUpdate();
  } catch (err) {
    console.error('Error rendering todos:', err);
    todosListContainer.innerHTML = `<div class="feedback-msg error">Unable to load tasks.</div>`;
  }
}

async function handleDeleteCompletedTodos() {
  try {
    await deleteCompletedTodos();
    todoDeleteDialog.classList.add('hidden');
    loadAndRenderTodosList();
  } catch (err) {
    console.error('Failed to delete completed todos:', err);
    showTodoFeedback('Unable to clear completed tasks.', true);
  }
}

async function handleDeleteAllTodos() {
  try {
    await deleteAllTodos();
    todoDeleteDialog.classList.add('hidden');
    loadAndRenderTodosList();
  } catch (err) {
    console.error('Failed to delete all todos:', err);
    showTodoFeedback('Unable to clear all tasks.', true);
  }
}

/**
 * Target-level Event Delegation for Notes List Container
 */
function setupNotesDelegation() {
  notesListContainer.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.note-card') as HTMLElement | null;
    if (!card) return;
    const noteId = card.getAttribute('data-id');
    const note = cachedNotes.find((n) => n.id === noteId);
    if (note) {
      activeNote = note;
      navigateTo('note-detail');
    }
  });

  notesListContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = (e.target as HTMLElement).closest('.note-card') as HTMLElement | null;
      if (!card) return;
      e.preventDefault();
      const noteId = card.getAttribute('data-id');
      const note = cachedNotes.find((n) => n.id === noteId);
      if (note) {
        activeNote = note;
        navigateTo('note-detail');
      }
    }
  });
}

/**
 * Target-level Event Delegation for Todos List Container
 */
function setupTodosDelegation() {
  // Checkbox state change (Optimistic DOM update)
  todosListContainer.addEventListener('change', async (e) => {
    const checkbox = e.target as HTMLInputElement;
    if (!checkbox.classList.contains('todo-checkbox')) return;

    const item = checkbox.closest('.todo-item') as HTMLElement | null;
    if (!item) return;

    const id = item.getAttribute('data-id');
    if (!id) return;

    // Optimistically update DOM state immediately for 0ms latency
    const isCompleted = checkbox.checked;
    item.classList.toggle('completed', isCompleted);
    checkbox.setAttribute('aria-label', `Mark "${item.querySelector('.todo-text')?.textContent || ''}" as ${isCompleted ? 'incomplete' : 'completed'}`);

    try {
      await toggleTodo(id);
      // Update local cache without rebuilding full DOM
      const cached = cachedTodos.find((t) => t.id === id);
      if (cached) cached.completed = isCompleted;
    } catch (err) {
      console.error('Failed to toggle todo:', err);
      // Revert optimistic update on failure
      checkbox.checked = !isCompleted;
      item.classList.toggle('completed', !isCompleted);
      showTodoFeedback('Unable to update task.', true);
    }
  });

  // Action clicks (Delete & Edit buttons)
  todosListContainer.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    if (target.classList.contains('btn-delete-todo')) {
      const item = target.closest('.todo-item') as HTMLElement | null;
      if (!item) return;
      const id = item.getAttribute('data-id');
      if (!id) return;

      try {
        await deleteTodo(id);
        // Targeted DOM node removal instead of wiping full list
        item.remove();
        cachedTodos = cachedTodos.filter((t) => t.id !== id);
        if (cachedTodos.length === 0) {
          todosEmptyState.classList.remove('hidden');
        }
        scheduleTodosScrollUpdate();
      } catch (err) {
        console.error('Failed to delete todo:', err);
        showTodoFeedback('Unable to delete task.', true);
      }
    } else if (target.classList.contains('btn-edit-todo')) {
      const item = target.closest('.todo-item') as HTMLElement | null;
      if (!item) return;
      const id = item.getAttribute('data-id');
      if (!id) return;

      editingTodoId = editingTodoId === id ? null : id;
      loadAndRenderTodosList(true);
    }
  });

  // Double click to edit text
  todosListContainer.addEventListener('dblclick', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('todo-text')) {
      const item = target.closest('.todo-item') as HTMLElement | null;
      if (!item) return;
      const id = item.getAttribute('data-id');
      if (!id) return;

      editingTodoId = id;
      loadAndRenderTodosList(true);
    }
  });

  // Keydown listener for inline editing (Enter to save, Escape to cancel)
  todosListContainer.addEventListener('keydown', async (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.classList.contains('todo-edit-input')) return;

    const item = input.closest('.todo-item') as HTMLElement | null;
    if (!item) return;
    const id = item.getAttribute('data-id');
    if (!id) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      const newText = input.value;
      try {
        await updateTodoStorage(id, newText);
        editingTodoId = null;
        loadAndRenderTodosList(true);
      } catch (err) {
        if (err instanceof Error) {
          showTodoFeedback(err.message, true);
        } else {
          showTodoFeedback('Unable to update todo.', true);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingTodoId = null;
      loadAndRenderTodosList(true);
    }
  });

  // Blur listener for inline edit auto-save
  todosListContainer.addEventListener('focusout', async (e) => {
    const input = e.target as HTMLInputElement;
    if (!input || !input.classList || !input.classList.contains('todo-edit-input')) return;

    // Small delay to allow Escape key or Enter key to process first if pressed
    setTimeout(async () => {
      if (editingTodoId === null) return;
      const item = input.closest('.todo-item') as HTMLElement | null;
      if (!item) return;
      const id = item.getAttribute('data-id');
      if (!id || id !== editingTodoId) return;

      const newText = input.value;
      try {
        await updateTodoStorage(id, newText);
        editingTodoId = null;
        loadAndRenderTodosList(true);
      } catch (err) {
        if (err instanceof Error) {
          showTodoFeedback(err.message, true);
        }
      }
    }, 100);
  });
}

/**
 * Global Keyboard Shortcut Listeners (In-Popup & Accessibility)
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
      if (!deleteConfirmDialog.classList.contains('hidden')) {
        deleteConfirmDialog.classList.add('hidden');
        return;
      }
      if (!todoDeleteDialog.classList.contains('hidden')) {
        todoDeleteDialog.classList.add('hidden');
        return;
      }
    }

    // Direct in-popup keyboard shortcuts: Alt+Shift+A (Notes) & Alt+Shift+S (Todos)
    if (e.altKey && e.shiftKey) {
      if (e.code === 'KeyA' || e.key === 'A' || e.key === 'a') {
        e.preventDefault();
        navigateTo('note-create');
        noteInput.focus();
      } else if (e.code === 'KeyS' || e.key === 'S' || e.key === 's') {
        e.preventDefault();
        navigateTo('todos');
        todoInput.focus();
      }
    }
  });
}

/**
 * Bind All Event Listeners
 */
function initEvents() {
  // Home buttons
  btnHomeNotes.addEventListener('click', () => navigateTo('notes-list'));
  btnHomeTodos.addEventListener('click', () => navigateTo('todos'));

  // Notes List Navigation
  btnNotesBack.addEventListener('click', () => navigateTo('home'));
  btnCreateNoteHeader.addEventListener('click', () => navigateTo('note-create'));
  btnCreateNoteEmpty.addEventListener('click', () => navigateTo('note-create'));

  // Create Note
  btnCreateBack.addEventListener('click', () => navigateTo('notes-list'));
  btnSave.addEventListener('click', handleSaveNote);
  noteInput.addEventListener('keydown', (e) => {
    // Ctrl + Enter (or Cmd + Enter) saves Note; regular Enter creates newlines normally
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveNote();
    }
  });
  noteInput.addEventListener('input', () => {
    if (createFeedback.classList.contains('error')) clearCreateNoteFeedback();
  });

  // Note Detail
  btnDetailBack.addEventListener('click', () => navigateTo('notes-list'));
  btnUpdateNote.addEventListener('click', handleUpdateNote);
  detailInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleUpdateNote();
    }
  });
  detailInput.addEventListener('input', () => {
    if (detailFeedback.classList.contains('error')) clearDetailNoteFeedback();
  });
  btnDeleteNote.addEventListener('click', () => {
    deleteConfirmDialog.classList.remove('hidden');
  });

  // Note Delete Dialog
  btnCancelDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteConfirmDialog.classList.add('hidden');
  });
  btnConfirmDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    handleConfirmDeleteNote();
  });

  // Todos
  btnTodosBack.addEventListener('click', () => navigateTo('home'));
  btnAddTodo.addEventListener('click', handleAddTodo);
  todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodo();
    }
  });
  todoInput.addEventListener('input', () => {
    if (todoFeedback.classList.contains('error')) clearTodoFeedback();
  });
  btnClearTodos.addEventListener('click', () => {
    todoDeleteDialog.classList.remove('hidden');
  });

  // Todo Delete Dialog
  btnDeleteCompleted.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDeleteCompletedTodos();
  });
  btnDeleteAll.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDeleteAllTodos();
  });
  btnCancelTodoDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    todoDeleteDialog.classList.add('hidden');
  });

  // Passive, rAF-throttled scroll listeners to eliminate layout thrashing
  if (notesScrollContainer) {
    notesScrollContainer.addEventListener('scroll', scheduleNotesScrollUpdate, { passive: true });
  }
  if (notesScrollUp) {
    notesScrollUp.addEventListener('click', () => handleScrollClick(notesScrollContainer, 'up'));
  }
  if (notesScrollDown) {
    notesScrollDown.addEventListener('click', () => handleScrollClick(notesScrollContainer, 'down'));
  }

  if (todosScrollContainer) {
    todosScrollContainer.addEventListener('scroll', scheduleTodosScrollUpdate, { passive: true });
  }
  if (todoScrollUp) {
    todoScrollUp.addEventListener('click', () => handleScrollClick(todosScrollContainer, 'up'));
  }
  if (todoScrollDown) {
    todoScrollDown.addEventListener('click', () => handleScrollClick(todosScrollContainer, 'down'));
  }

  // Delegated event listeners for containers
  setupNotesDelegation();
  setupTodosDelegation();

  // Global popup shortcut listener
  setupKeyboardShortcuts();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  checkShortcutLaunch();
});
