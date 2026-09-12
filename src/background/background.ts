chrome.commands.onCommand.addListener(async (command) => {
  let targetView: string | null = null;
  if (command === 'open-notes') {
    targetView = 'notes';
  } else if (command === 'open-todos') {
    targetView = 'todos';
  }

  if (targetView) {
    try {
      if (chrome.storage && chrome.storage.session) {
        await chrome.storage.session.set({ targetView });
      } else if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ targetView });
      }
    } catch (err) {
      console.error('Failed to set targetView on shortcut command:', err);
    }

    if (chrome.action && typeof chrome.action.openPopup === 'function') {
      try {
        await chrome.action.openPopup();
      } catch (err) {
        // openPopup may fail if popup is already open or browser restricts focus
      }
    }
  }
});
