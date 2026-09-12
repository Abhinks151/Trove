import { getNotes, saveNote, updateNote, deleteNote } from '../storage/notes';
import { getTodos, saveTodo, toggleTodo, deleteTodo, deleteCompletedTodos, deleteAllTodos } from '../storage/todos';
import { Note } from '../types/note';
import { Todo } from '../types/todo';
import { formatRelativeDate, formatFullDate } from '../utils/date';

// View states
type ViewState = 'home' | 'notes-list' | 'note-create' | 'note-detail' | 'todos';
let currentView: ViewState = 'home';

// Active Note state
let activeNote: Note | null = null;

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

    if (targetView === 'notes') {
      navigateTo('notes-list');
    } else if (targetView === 'todos') {
      navigateTo('todos');
    } else {
      navigateTo('home');
    }
  } catch (err) {
    console.error('Error checking shortcut launch:', err);
    navigateTo('home');
  }
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
    const notes = await getNotes();

    if (notes.length === 0) {
      notesEmptyState.classList.remove('hidden');
      return;
    }

    notes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Read note from ${formatRelativeDate(note.createdAt)}`);

      const preview = document.createElement('div');
      preview.className = 'note-preview';
      preview.textContent = note.content;

      const time = document.createElement('div');
      time.className = 'note-time';
      time.textContent = formatRelativeDate(note.createdAt);

      card.appendChild(preview);
      card.appendChild(time);

      card.addEventListener('click', () => {
        activeNote = note;
        navigateTo('note-detail');
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeNote = note;
          navigateTo('note-detail');
        }
      });

      notesListContainer.appendChild(card);
    });
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

async function loadAndRenderTodosList() {
  todosListContainer.innerHTML = '';
  todosEmptyState.classList.add('hidden');

  try {
    const todos = await getTodos();

    if (todos.length === 0) {
      todosEmptyState.classList.remove('hidden');
      return;
    }

    todos.forEach((todo) => {
      const item = document.createElement('div');
      item.className = `todo-item ${todo.completed ? 'completed' : ''}`;

      const left = document.createElement('div');
      left.className = 'todo-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'completed'}`);

      checkbox.addEventListener('change', async () => {
        try {
          await toggleTodo(todo.id);
          loadAndRenderTodosList();
        } catch (err) {
          console.error('Failed to toggle todo:', err);
          showTodoFeedback('Unable to update task.', true);
        }
      });

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;

      left.appendChild(checkbox);
      left.appendChild(text);

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'btn-delete-todo';
      btnDelete.textContent = 'Delete';
      btnDelete.setAttribute('aria-label', `Delete todo "${todo.text}"`);

      btnDelete.addEventListener('click', async () => {
        try {
          await deleteTodo(todo.id);
          loadAndRenderTodosList();
        } catch (err) {
          console.error('Failed to delete todo:', err);
          showTodoFeedback('Unable to delete task.', true);
        }
      });

      item.appendChild(left);
      item.appendChild(btnDelete);

      todosListContainer.appendChild(item);
    });
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
        navigateTo('notes-list');
      } else if (e.code === 'KeyS' || e.key === 'S' || e.key === 's') {
        e.preventDefault();
        navigateTo('todos');
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
  noteInput.addEventListener('input', () => {
    if (createFeedback.classList.contains('error')) clearCreateNoteFeedback();
  });

  // Note Detail
  btnDetailBack.addEventListener('click', () => navigateTo('notes-list'));
  btnUpdateNote.addEventListener('click', handleUpdateNote);
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

  // Global popup shortcut listener
  setupKeyboardShortcuts();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  checkShortcutLaunch();
});
