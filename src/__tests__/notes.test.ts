import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNotes, saveNote, updateNote, deleteNote } from '../storage/notes';
import { Note } from '../types/note';

// Mock chrome.storage.local
const mockStorageData: Record<string, any> = {};

const mockChromeStorage = {
  get: vi.fn((key: string) => {
    return Promise.resolve({ [key]: mockStorageData[key] || [] });
  }),
  set: vi.fn((items: Record<string, any>) => {
    Object.assign(mockStorageData, items);
    return Promise.resolve();
  })
};

// Inject global chrome mock
(globalThis as any).chrome = {
  storage: {
    local: mockChromeStorage
  }
};

describe('Note Storage Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockStorageData['jot_notes'];
  });

  it('rejects saving empty notes', async () => {
    await expect(saveNote('')).rejects.toThrow('Write something before saving.');
    await expect(saveNote('   ')).rejects.toThrow('Write something before saving.');
    expect(mockChromeStorage.set).not.toHaveBeenCalled();
  });

  it('creates and saves a valid note', async () => {
    const noteContent = 'Learn browser extension development';
    const note = await saveNote(noteContent);

    expect(note).toBeDefined();
    expect(note.id).toBeTruthy();
    expect(note.content).toBe(noteContent);
    expect(typeof note.createdAt).toBe('number');
    expect(mockChromeStorage.set).toHaveBeenCalledTimes(1);
  });

  it('retrieves saved notes', async () => {
    await saveNote('First Note');
    const notes = await getNotes();

    expect(notes.length).toBe(1);
    expect(notes[0].content).toBe('First Note');
  });

  it('stores multiple notes and returns them newest-first', async () => {
    const mockNotes: Note[] = [
      { id: '1', content: 'Older Note', createdAt: 1000 },
      { id: '2', content: 'Newer Note', createdAt: 2000 },
      { id: '3', content: 'Newest Note', createdAt: 3000 }
    ];
    mockStorageData['jot_notes'] = mockNotes;

    const notes = await getNotes();

    expect(notes.length).toBe(3);
    expect(notes[0].content).toBe('Newest Note');
    expect(notes[1].content).toBe('Newer Note');
    expect(notes[2].content).toBe('Older Note');
  });

  it('deletes a note by id', async () => {
    const note1 = await saveNote('Note to keep');
    const note2 = await saveNote('Note to delete');

    let notes = await getNotes();
    expect(notes.length).toBe(2);

    await deleteNote(note2.id);

    notes = await getNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].id).toBe(note1.id);
    expect(notes[0].content).toBe('Note to keep');
  });

  it('updates an existing note', async () => {
    const note = await saveNote('Original text');
    const updated = await updateNote(note.id, 'Updated text');

    expect(updated.content).toBe('Updated text');

    const notes = await getNotes();
    expect(notes[0].content).toBe('Updated text');
  });

  it('rejects updating a note with empty content', async () => {
    const note = await saveNote('Original text');
    await expect(updateNote(note.id, '   ')).rejects.toThrow('Write something before saving.');
  });

  it('handles storage retrieve errors gracefully', async () => {
    mockChromeStorage.get.mockImplementationOnce(() => Promise.reject(new Error('Storage failure')));
    await expect(getNotes()).rejects.toThrow('Unable to load notes.');
  });
});
