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
 * Retrieve raw todos array from storage (unsorted).
 * Internal helper — preserves array ordering for mutations.
 */
async function getRawTodos(): Promise<Todo[]> {
  const storage = getStorage();
  const result = await storage.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Todo[]) || [];
}

/**
 * Retrieve all todos sorted by `order` ascending (lowest order = top of list).
 * Todos with no `order` field fall back to `createdAt` for backwards compatibility.
 */
export async function getTodos(): Promise<Todo[]> {
  try {
    const todos = await getRawTodos();
    return todos.slice().sort((a, b) => {
      const aOrder = a.order ?? a.createdAt;
      const bOrder = b.order ?? b.createdAt;
      return aOrder - bOrder;
    });
  } catch (error) {
    console.error('Failed to retrieve todos:', error);
    throw new Error('Unable to load todos.');
  }
}

/**
 * Save a new todo to chrome.storage.local.
 * New todos are appended to the bottom (highest order value).
 */
export async function saveTodo(text: string): Promise<Todo> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Write something before saving.');
  }

  return withStorageLock(async () => {
    try {
      const todos = await getRawTodos();

      // Determine the next order value (max existing + 1, or 0 if empty)
      const maxOrder = todos.reduce((max, t) => Math.max(max, t.order ?? t.createdAt), -1);

      const newTodo: Todo = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        text: trimmed,
        completed: false,
        createdAt: Date.now(),
        order: maxOrder + 1
      };

      const updatedTodos = [...todos, newTodo];
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
 * Does NOT change order.
 */
export async function toggleTodo(id: string): Promise<Todo> {
  return withStorageLock(async () => {
    try {
      const todos = await getRawTodos();
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
 * Update the text of an existing todo by ID.
 * Does NOT change order or completion state.
 */
export async function updateTodo(id: string, text: string): Promise<Todo> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Write something before saving.');
  }

  return withStorageLock(async () => {
    try {
      const todos = await getRawTodos();
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error('Todo not found.');
      }

      todos[index] = {
        ...todos[index],
        text: trimmed
      };

      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: todos });
      return todos[index];
    } catch (error) {
      if (error instanceof Error && (error.message === 'Write something before saving.' || error.message === 'Todo not found.')) {
        throw error;
      }
      console.error('Failed to update todo:', error);
      throw new Error('Unable to update todo. Please try again.');
    }
  });
}

/**
 * Reorder todos by providing new ordered array of IDs.
 * Assigns compact sequential order values.
 */
export async function reorderTodos(orderedIds: string[]): Promise<void> {
  return withStorageLock(async () => {
    try {
      const todos = await getRawTodos();
      const idToTodo = new Map(todos.map((t) => [t.id, t]));

      const reordered: Todo[] = [];
      orderedIds.forEach((id, index) => {
        const todo = idToTodo.get(id);
        if (todo) {
          reordered.push({ ...todo, order: index });
        }
      });

      // Include any todos not in orderedIds (safety net)
      todos.forEach((t) => {
        if (!orderedIds.includes(t.id)) {
          reordered.push({ ...t, order: reordered.length });
        }
      });

      const storage = getStorage();
      await storage.set({ [STORAGE_KEY]: reordered });
    } catch (error) {
      console.error('Failed to reorder todos:', error);
      throw new Error('Unable to reorder todos. Please try again.');
    }
  });
}

/**
 * Delete a todo by ID.
 */
export async function deleteTodo(id: string): Promise<void> {
  return withStorageLock(async () => {
    try {
      const todos = await getRawTodos();
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
      const todos = await getRawTodos();
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
