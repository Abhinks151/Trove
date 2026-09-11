import { getNotes, saveNote, updateNote, deleteNote } from '../storage/notes';
import { Note } from '../types/note';
import { formatRelativeDate, formatFullDate } from '../utils/date';

// State variables
type ViewState = 'create' | 'list' | 'detail';
let currentView: ViewState = 'create';
let activeNote: Note | null = null;
let createFeedbackTimeout: number | undefined;
let detailFeedbackTimeout: number | undefined;

// DOM Element References
const viewCreate = document.getElementById('view-create') as HTMLElement;
const viewList = document.getElementById('view-list') as HTMLElement;
const viewDetail = document.getElementById('view-detail') as HTMLElement;

const noteInput = document.getElementById('note-input') as HTMLTextAreaElement;
const createFeedback = document.getElementById('create-feedback') as HTMLElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const btnSeeNotes = document.getElementById('btn-see-notes') as HTMLButtonElement;

const btnListBack = document.getElementById('btn-list-back') as HTMLButtonElement;
const notesListContainer = document.getElementById('notes-list-container') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
const btnCreateNoteEmpty = document.getElementById('btn-create-note-empty') as HTMLButtonElement;

const btnDetailBack = document.getElementById('btn-detail-back') as HTMLButtonElement;
const detailInput = document.getElementById('detail-input') as HTMLTextAreaElement;
const detailTimestamp = document.getElementById('detail-timestamp') as HTMLElement;
const detailFeedback = document.getElementById('detail-feedback') as HTMLElement;
const btnUpdateNote = document.getElementById('btn-update-note') as HTMLButtonElement;
const btnDeleteNote = document.getElementById('btn-delete-note') as HTMLButtonElement;

const deleteConfirmDialog = document.getElementById('delete-confirm-dialog') as HTMLElement;
const btnCancelDelete = document.getElementById('btn-cancel-delete') as HTMLButtonElement;
const btnConfirmDelete = document.getElementById('btn-confirm-delete') as HTMLButtonElement;

/**
 * View Navigation Manager
 */
function navigateTo(view: ViewState) {
  currentView = view;

  viewCreate.classList.add('hidden');
  viewCreate.classList.remove('active');
  viewList.classList.add('hidden');
  viewList.classList.remove('active');
  viewDetail.classList.add('hidden');
  viewDetail.classList.remove('active');

  deleteConfirmDialog.classList.add('hidden');

  if (view === 'create') {
    viewCreate.classList.remove('hidden');
    viewCreate.classList.add('active');
    noteInput.focus();
  } else if (view === 'list') {
    viewList.classList.remove('hidden');
    viewList.classList.add('active');
    loadAndRenderNotesList();
  } else if (view === 'detail') {
    viewDetail.classList.remove('hidden');
    viewDetail.classList.add('active');
    renderNoteDetail();
  }
}

/**
 * Show inline feedback on note creation
 */
function showCreateFeedback(message: string, isError = false) {
  if (createFeedbackTimeout) {
    window.clearTimeout(createFeedbackTimeout);
  }

  createFeedback.textContent = message;
  createFeedback.className = `feedback-msg ${isError ? 'error' : 'success'}`;

  createFeedbackTimeout = window.setTimeout(() => {
    createFeedback.textContent = '';
    createFeedback.className = 'feedback-msg';
  }, 3500);
}

function clearCreateFeedback() {
  if (createFeedbackTimeout) {
    window.clearTimeout(createFeedbackTimeout);
  }
  createFeedback.textContent = '';
  createFeedback.className = 'feedback-msg';
}

/**
 * Show inline feedback on note update
 */
function showDetailFeedback(message: string, isError = false) {
  if (detailFeedbackTimeout) {
    window.clearTimeout(detailFeedbackTimeout);
  }

  detailFeedback.textContent = message;
  detailFeedback.className = `feedback-msg ${isError ? 'error' : 'success'}`;

  detailFeedbackTimeout = window.setTimeout(() => {
    detailFeedback.textContent = '';
    detailFeedback.className = 'feedback-msg';
  }, 3500);
}

function clearDetailFeedback() {
  if (detailFeedbackTimeout) {
    window.clearTimeout(detailFeedbackTimeout);
  }
  detailFeedback.textContent = '';
  detailFeedback.className = 'feedback-msg';
}

/**
 * Handle Save Note Action (Create)
 */
async function handleSaveNote() {
  const content = noteInput.value;
  clearCreateFeedback();

  try {
    await saveNote(content);
    noteInput.value = '';
    showCreateFeedback('✓ Note saved', false);
    noteInput.focus();
  } catch (err) {
    if (err instanceof Error) {
      showCreateFeedback(err.message, true);
    } else {
      showCreateFeedback('Unable to save note. Please try again.', true);
    }
  }
}

/**
 * Handle Update Note Action (Detail / Edit)
 */
async function handleUpdateNote() {
  if (!activeNote) return;
  const content = detailInput.value;
  clearDetailFeedback();

  try {
    const updated = await updateNote(activeNote.id, content);
    activeNote = updated;
    showDetailFeedback('✓ Note saved', false);
  } catch (err) {
    if (err instanceof Error) {
      showDetailFeedback(err.message, true);
    } else {
      showDetailFeedback('Unable to update note. Please try again.', true);
    }
  }
}

/**
 * Load and render notes list
 */
async function loadAndRenderNotesList() {
  notesListContainer.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    const notes = await getNotes();

    if (notes.length === 0) {
      emptyState.classList.remove('hidden');
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
        navigateTo('detail');
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeNote = note;
          navigateTo('detail');
        }
      });

      notesListContainer.appendChild(card);
    });
  } catch (err) {
    console.error('Error rendering notes list:', err);
    notesListContainer.innerHTML = `<div class="feedback-msg error">Unable to load notes.</div>`;
  }
}

/**
 * Render selected note detail in editable textarea
 */
function renderNoteDetail() {
  if (!activeNote) {
    navigateTo('list');
    return;
  }

  clearDetailFeedback();
  detailInput.value = activeNote.content;
  detailTimestamp.textContent = formatFullDate(activeNote.createdAt);
  detailInput.focus();
}

/**
 * Delete Active Note Action
 */
async function handleConfirmDelete() {
  if (!activeNote) return;

  try {
    await deleteNote(activeNote.id);
    activeNote = null;
    deleteConfirmDialog.classList.add('hidden');
    navigateTo('list');
  } catch (err) {
    console.error('Failed to delete note:', err);
    showDetailFeedback('Unable to delete note. Please try again.', true);
  }
}

/**
 * Setup Event Listeners
 */
function initEvents() {
  // Create note events
  btnSave.addEventListener('click', handleSaveNote);
  noteInput.addEventListener('input', () => {
    if (createFeedback.classList.contains('error')) {
      clearCreateFeedback();
    }
  });

  // See Notes / Navigation events
  btnSeeNotes.addEventListener('click', () => navigateTo('list'));
  btnCreateNoteEmpty.addEventListener('click', () => navigateTo('create'));

  // Back buttons
  btnListBack.addEventListener('click', () => navigateTo('create'));
  btnDetailBack.addEventListener('click', () => navigateTo('list'));

  // Detail / Edit note events
  btnUpdateNote.addEventListener('click', handleUpdateNote);
  detailInput.addEventListener('input', () => {
    if (detailFeedback.classList.contains('error')) {
      clearDetailFeedback();
    }
  });

  // Delete note confirmation dialog handlers
  btnDeleteNote.addEventListener('click', () => {
    deleteConfirmDialog.classList.remove('hidden');
  });

  btnCancelDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteConfirmDialog.classList.add('hidden');
  });

  btnConfirmDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    handleConfirmDelete();
  });
}

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  navigateTo('create');
});
