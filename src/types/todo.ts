export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  order: number; // explicit sort key; lower = earlier in list
}
