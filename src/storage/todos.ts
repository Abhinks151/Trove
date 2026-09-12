import { Todo } from '../types/todo';

const STORAGE_KEY = 'trove_todos';

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
 * Retrieve all todos sorted by createdAt descending (newest first).
 */
export async function getTodos(): Promise<Todo[]> {
  try {
    const storage = getStorage();
    const result = await storage.get(STORAGE_KEY);
    const todos: Todo[] = result[STORAGE_KEY] || [];
    return todos.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to retrieve todos:', error);
    throw new Error('Unable to load todos.');
  }
}

/**
 * Save a new todo to chrome.storage.local.
 */
export async function saveTodo(text: string): Promise<Todo> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Write something before saving.');
  }

  return withStorageLock(async () => {
    try {
      const todos = await getTodos();
      const newTodo: Todo = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        text: trimmed,
        completed: false,
        createdAt: Date.now()
      };

      const updatedTodos = [newTodo, ...todos];
      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: updatedTodos });
      return newTodo;
    } catch (error) {
      if (error instanceof Error && error.message === 'Write something before saving.') {
        throw error;
      }
      console.error('Failed to save todo:', error);
      throw new Error('Unable to save todo. Please try again.');
    }
  });
}

/**
 * Toggle completion state of a todo by ID.
 */
export async function toggleTodo(id: string): Promise<Todo> {
  return withStorageLock(async () => {
    try {
      const todos = await getTodos();
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error('Todo not found.');
      }

      todos[index] = {
        ...todos[index],
        completed: !todos[index].completed
      };

      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: todos });
      return todos[index];
    } catch (error) {
      if (error instanceof Error && error.message === 'Todo not found.') {
        throw error;
      }
      console.error('Failed to toggle todo:', error);
      throw new Error('Unable to toggle todo. Please try again.');
    }
  });
}

/**
 * Delete a todo by ID.
 */
export async function deleteTodo(id: string): Promise<void> {
  return withStorageLock(async () => {
    try {
      const todos = await getTodos();
      const updatedTodos = todos.filter((todo) => todo.id !== id);
      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: updatedTodos });
    } catch (error) {
      console.error('Failed to delete todo:', error);
      throw new Error('Unable to delete todo. Please try again.');
    }
  });
}

/**
 * Delete all completed todos.
 */
export async function deleteCompletedTodos(): Promise<void> {
  return withStorageLock(async () => {
    try {
      const todos = await getTodos();
      const updatedTodos = todos.filter((todo) => !todo.completed);
      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: updatedTodos });
    } catch (error) {
      console.error('Failed to delete completed todos:', error);
      throw new Error('Unable to delete completed todos. Please try again.');
    }
  });
}

/**
 * Delete all todos.
 */
export async function deleteAllTodos(): Promise<void> {
  return withStorageLock(async () => {
    try {
      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: [] });
    } catch (error) {
      console.error('Failed to delete all todos:', error);
      throw new Error('Unable to delete all todos. Please try again.');
    }
  });
}
