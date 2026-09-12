import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTodos,
  saveTodo,
  toggleTodo,
  updateTodo,
  reorderTodos,
  deleteTodo,
  deleteCompletedTodos,
  deleteAllTodos
} from '../storage/todos';

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

// Inject global chrome mock if not present
if (!(globalThis as any).chrome) {
  (globalThis as any).chrome = {
    storage: {
      local: mockChromeStorage
    }
  };
}

describe('Todo Storage Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockStorageData['trove_todos'];
  });

  it('rejects saving empty todos', async () => {
    await expect(saveTodo('')).rejects.toThrow('Write something before saving.');
    await expect(saveTodo('   ')).rejects.toThrow('Write something before saving.');
    expect(mockChromeStorage.set).not.toHaveBeenCalled();
  });

  it('creates and saves a valid todo', async () => {
    const todoText = 'Buy groceries';
    const todo = await saveTodo(todoText);

    expect(todo).toBeDefined();
    expect(todo.id).toBeTruthy();
    expect(todo.text).toBe(todoText);
    expect(todo.completed).toBe(false);
    expect(typeof todo.createdAt).toBe('number');
    expect(mockChromeStorage.set).toHaveBeenCalledTimes(1);
  });

  it('appends new todos to the bottom of the list', async () => {
    const todoA = await saveTodo('Todo A');
    const todoB = await saveTodo('Todo B');
    const todoC = await saveTodo('Todo C');

    const todos = await getTodos();

    expect(todos.length).toBe(3);
    expect(todos[0].text).toBe('Todo A');
    expect(todos[1].text).toBe('Todo B');
    expect(todos[2].text).toBe('Todo C');
  });

  it('edits an existing todo text without changing completion or order', async () => {
    const todo1 = await saveTodo('Todo A');
    const todo2 = await saveTodo('Todo B');

    const updated = await updateTodo(todo1.id, 'Todo A Modified');

    expect(updated.text).toBe('Todo A Modified');

    const todos = await getTodos();
    expect(todos[0].text).toBe('Todo A Modified');
    expect(todos[1].text).toBe('Todo B');
  });

  it('rejects updating a todo with empty text', async () => {
    const todo = await saveTodo('Todo A');
    await expect(updateTodo(todo.id, '   ')).rejects.toThrow('Write something before saving.');
  });

  it('persists manual drag-and-drop reordering', async () => {
    const todoA = await saveTodo('Todo A');
    const todoB = await saveTodo('Todo B');
    const todoC = await saveTodo('Todo C');

    // Reorder C, A, B
    await reorderTodos([todoC.id, todoA.id, todoB.id]);

    const reorderedTodos = await getTodos();
    expect(reorderedTodos[0].text).toBe('Todo C');
    expect(reorderedTodos[1].text).toBe('Todo A');
    expect(reorderedTodos[2].text).toBe('Todo B');
  });

  it('toggles completion status of a todo without changing order', async () => {
    const todoA = await saveTodo('Todo A');
    const todoB = await saveTodo('Todo B');
    const todoC = await saveTodo('Todo C');

    // Complete Todo B (in middle)
    await toggleTodo(todoB.id);

    const todos = await getTodos();
    expect(todos[0].text).toBe('Todo A');
    expect(todos[1].text).toBe('Todo B');
    expect(todos[1].completed).toBe(true);
    expect(todos[2].text).toBe('Todo C');
  });

  it('deletes an individual todo by id', async () => {
    const todo1 = await saveTodo('Keep this');
    const todo2 = await saveTodo('Delete this');

    let todos = await getTodos();
    expect(todos.length).toBe(2);

    await deleteTodo(todo2.id);

    todos = await getTodos();
    expect(todos.length).toBe(1);
    expect(todos[0].id).toBe(todo1.id);
  });

  it('deletes only completed todos', async () => {
    const todo1 = await saveTodo('Incomplete 1');
    const todo2 = await saveTodo('Completed 1');
    const todo3 = await saveTodo('Incomplete 2');

    await toggleTodo(todo2.id);

    await deleteCompletedTodos();

    const remaining = await getTodos();
    expect(remaining.length).toBe(2);
    expect(remaining.find((t) => t.id === todo2.id)).toBeUndefined();
    expect(remaining.find((t) => t.id === todo1.id)).toBeDefined();
    expect(remaining.find((t) => t.id === todo3.id)).toBeDefined();
  });

  it('deletes all todos', async () => {
    await saveTodo('Task 1');
    await saveTodo('Task 2');

    let todos = await getTodos();
    expect(todos.length).toBe(2);

    await deleteAllTodos();

    todos = await getTodos();
    expect(todos.length).toBe(0);
  });
});
