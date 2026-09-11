import { Note } from '../types/note';

const STORAGE_KEY = 'trove_notes';

/**
 * Sequential lock to prevent race conditions during rapid concurrent storage operations
 */
let storageLock: Promise<unknown> = Promise.resolve();

function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
  const next = storageLock.then(task, task);
  storageLock = next;
  return next;
}

/**
 * Safe accessor for chrome.storage.local
 */
function getStorage(): typeof chrome.storage.local {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  throw new Error('Chrome storage API is not available.');
}

/**
 * Retrieve all notes sorted by createdAt descending (newest first).
 */
export async function getNotes(): Promise<Note[]> {
  try {
    const storage = getStorage();
    const result = await storage.get(STORAGE_KEY);
    const notes: Note[] = result[STORAGE_KEY] || [];
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to retrieve notes:', error);
    throw new Error('Unable to load notes.');
  }
}

/**
 * Save a new note to chrome.storage.local.
 */
export async function saveNote(content: string): Promise<Note> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Write something before saving.');
  }

  return withStorageLock(async () => {
    try {
      const notes = await getNotes();
      const newNote: Note = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        content: trimmed,
        createdAt: Date.now()
      };

      const updatedNotes = [newNote, ...notes];
      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: updatedNotes });
      return newNote;
    } catch (error) {
      if (error instanceof Error && error.message === 'Write something before saving.') {
        throw error;
      }
      console.error('Failed to save note:', error);
      throw new Error('Unable to save note. Please try again.');
    }
  });
}

/**
 * Delete a note by its ID from chrome.storage.local.
 */
export async function deleteNote(id: string): Promise<void> {
  return withStorageLock(async () => {
    try {
      const notes = await getNotes();
      const updatedNotes = notes.filter((note) => note.id !== id);
      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: updatedNotes });
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw new Error('Unable to delete note. Please try again.');
    }
  });
}

/**
 * Update an existing note's content in chrome.storage.local.
 */
export async function updateNote(id: string, newContent: string): Promise<Note> {
  const trimmed = newContent.trim();
  if (!trimmed) {
    throw new Error('Write something before saving.');
  }

  return withStorageLock(async () => {
    try {
      const notes = await getNotes();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) {
        throw new Error('Note not found.');
      }

      notes[index] = {
        ...notes[index],
        content: trimmed
      };

      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: notes });
      return notes[index];
    } catch (error) {
      if (error instanceof Error && (error.message === 'Write something before saving.' || error.message === 'Note not found.')) {
        throw error;
      }
      console.error('Failed to update note:', error);
      throw new Error('Unable to update note. Please try again.');
    }
  });
}


