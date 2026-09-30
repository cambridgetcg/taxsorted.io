const { app, BrowserWindow, dialog, Menu, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { LOCAL_ORIGIN, isLocalUrl, isLocalBlob, externalWebUrl } = require('./local-policy.cjs');
const { createLocalHandler } = require('./local-protocol.cjs');
const { createNavigationMenu } = require('./navigation-menu.cjs');

app.setName('TaxSorted Local');
app.enableSandbox();
protocol.registerSchemesAsPrivileged([{ scheme: 'taxsorted', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

// Separate from browsers and the source tree; keep this path stable on upgrades.
// A disposable profile is accepted only by an unpackaged development/test run.
const profileArgument = !app.isPackaged && process.argv.find(argument => argument.startsWith('--profile-dir='));
const dataDirectory = profileArgument ? path.resolve(profileArgument.slice('--profile-dir='.length)) : path.join(app.getPath('appData'), 'TaxSorted Local');
fs.mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
app.setPath('userData', dataDirectory);
app.setPath('sessionData', dataDirectory);

let mainWindow;
let externalPromptOpen = false;
const navigation = createNavigationMenu({ getWindow: () => mainWindow, getMenu: () => Menu.getApplicationMenu() });

async function openWebsite(value) {
  const url = externalWebUrl(value);
  if (!url || externalPromptOpen || !mainWindow || mainWindow.isDestroyed()) return;
  externalPromptOpen = true;
  try {
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'question', title: 'Open a website?', message: 'This will leave the offline app.',
      detail: `Your browser will connect to:\n\n${url}\n\nTaxSorted does not attach your saved records. The website has its own privacy practices.`,
      buttons: ['Cancel', 'Open website'], defaultId: 0, cancelId: 0, noLink: true,
    });
    if (choice.response === 1) await shell.openExternal(url);
  } finally { externalPromptOpen = false; }
}

function openPage(route) {
  if (mainWindow && !mainWindow.isDestroyed()) void mainWindow.loadURL(`${LOCAL_ORIGIN}${route}`);
}

function createWindow(localSession) {
  mainWindow = new BrowserWindow({
    title: 'TaxSorted Local', width: 1240, height: 900, minWidth: 360, minHeight: 600, show: false,
    backgroundColor: '#f7f4ee',
    webPreferences: { session: localSession, sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false, webviewTag: false, webSecurity: true, allowRunningInsecureContent: false, devTools: !app.isPackaged, spellcheck: false },
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isLocalUrl(url)) { event.preventDefault(); void openWebsite(url).catch(() => undefined); }
  });
  mainWindow.webContents.on('will-redirect', (event, url) => { if (!isLocalUrl(url)) event.preventDefault(); });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openWebsite(url).catch(() => undefined);
    return { action: 'deny' };
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = undefined; });
  navigation.bind(mainWindow);
  openPage('/');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(() => {
    const bundle = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'bundle');
    if (!fs.existsSync(path.join(bundle, 'index.html'))) {
      dialog.showErrorBox('TaxSorted Local needs its pages', 'Run npm run desktop:build from the project folder before starting the local app.');
      app.quit(); return;
    }
    const localSession = session.defaultSession;
    localSession.protocol.handle('taxsorted', createLocalHandler(bundle));
    // No HTTP(S), WebSocket, file://, or remote custom-origin requests from the app.
    // This is an app-session boundary, not a firewall for the person's whole device.
    localSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !isLocalUrl(details.url) && !isLocalBlob(details.url) && !details.url.startsWith('data:') }));
    localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    localSession.setPermissionCheckHandler(() => false);
    localSession.on('will-download', (event, item) => {
      if (!isLocalBlob(item.getURL()) && !isLocalUrl(item.getURL())) { event.preventDefault(); return; }
      item.setSaveDialogOptions({ title: 'Save your TaxSorted export', buttonLabel: 'Save export', defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      { label: 'File', submenu: [
        { label: 'Home', click: () => openPage('/') },
        { label: 'My tax year', click: () => openPage('/checkup/') },
        { label: 'Money records', click: () => openPage('/books/workspace/') },
        { label: 'Back up or restore Books', click: () => openPage('/books/workspace/backups/') },
        { type: 'separator' }, { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ] },
      { role: 'editMenu' },
      navigation.template,
      { label: 'View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
      { label: 'Help', submenu: [
        { label: 'Your data and local setup', click: () => openPage('/download/#your-data') },
        { label: 'Show app data folder', click: () => { void shell.openPath(dataDirectory); } },
      ] },
    ]));
    createWindow(localSession);
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(localSession); });
  }).catch(() => {
    dialog.showErrorBox('TaxSorted Local could not start', 'The local app could not open. Your saved records were not removed. Reinstall the application without deleting its data folder.');
    app.quit();
  });
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
