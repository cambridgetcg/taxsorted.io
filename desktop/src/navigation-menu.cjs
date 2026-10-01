/** Native history controls use the current window, never a saved URL or a
 * renderer bridge. They share Chromium's history, including Next.js routes. */
function createNavigationMenu({ getWindow, getMenu, platform = process.platform }) {
  const directions = [
    { id: 'navigation-back', label: 'Back', can: 'canGoBack', move: 'goBack', accelerator: platform === 'darwin' ? 'Cmd+[' : 'Alt+Left' },
    { id: 'navigation-forward', label: 'Forward', can: 'canGoForward', move: 'goForward', accelerator: platform === 'darwin' ? 'Cmd+]' : 'Alt+Right' },
  ];

  function currentHistory() {
    const window = getWindow();
    if (!window || window.isDestroyed()) return undefined;
    const contents = window.webContents;
    if (!contents || contents.isDestroyed()) return undefined;
    return contents.navigationHistory;
  }

  function refresh() {
    const history = currentHistory();
    const menu = getMenu();
    for (const direction of directions) {
      const item = menu?.getMenuItemById(direction.id);
      if (item) item.enabled = Boolean(history?.[direction.can]());
    }
  }

  const template = {
    label: 'Navigate',
    submenu: directions.map(direction => ({
      id: direction.id, label: direction.label, accelerator: direction.accelerator, enabled: false,
      click: () => {
        // Re-check at invocation: the window or its history can have changed
        // since Electron last displayed the menu's enabled state.
        const history = currentHistory();
        if (history?.[direction.can]()) history[direction.move]();
        refresh();
      },
    })),
  };

  function bind(window) {
    const contents = window.webContents;
    const inPage = (_event, _url, isMainFrame) => { if (isMainFrame) refresh(); };
    const detach = () => {
      contents.removeListener('did-navigate', refresh);
      contents.removeListener('did-navigate-in-page', inPage);
      contents.removeListener('destroyed', detach);
      window.removeListener('closed', detach);
      refresh();
    };
    contents.on('did-navigate', refresh);
    contents.on('did-navigate-in-page', inPage);
    contents.once('destroyed', detach);
    window.once('closed', detach);
    refresh();
  }

  return { template, bind };
}

module.exports = { createNavigationMenu };
