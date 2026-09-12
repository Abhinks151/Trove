import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTodos,
  saveTodo,
  toggleTodo,
  deleteTodo,
  deleteCompletedTodos,
  deleteAllTodos
} from '../storage/todos';
import { Todo } from '../types/todo';

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

  it('retrieves saved todos', async () => {
    await saveTodo('First task');
    const todos = await getTodos();

    expect(todos.length).toBe(1);
    expect(todos[0].text).toBe('First task');
  });

  it('toggles completion status of a todo', async () => {
    const todo = await saveTodo('Task to complete');
    expect(todo.completed).toBe(false);

    const toggled = await toggleTodo(todo.id);
    expect(toggled.completed).toBe(true);

    const todos = await getTodos();
    expect(todos[0].completed).toBe(true);

    const toggledBack = await toggleTodo(todo.id);
    expect(toggledBack.completed).toBe(false);
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
    expect(remaining.find(t => t.id === todo2.id)).toBeUndefined();
    expect(remaining.find(t => t.id === todo1.id)).toBeDefined();
    expect(remaining.find(t => t.id === todo3.id)).toBeDefined();
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
