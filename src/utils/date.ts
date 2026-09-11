/**
 * Format a timestamp into a human-friendly string for list previews.
 * e.g., "Today, 8:32 PM", "Yesterday, 7:15 PM", "Sep 11, 2026"
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today, ${timeString}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeString}`;
  }

  const dateString = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });

  return `${dateString}, ${timeString}`;
}

/**
 * Format a timestamp for detail view.
 * e.g., "Sep 11, 2026 · 8:32 PM"
 */
export function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  const dateString = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return `${dateString} · ${timeString}`;
}
