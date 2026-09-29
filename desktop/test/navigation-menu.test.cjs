const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createNavigationMenu } = require('../src/navigation-menu.cjs');

function fakeWindow() {
  const window = new EventEmitter();
  const contents = new EventEmitter();
  window.webContents = contents;
  let closed = false;
  let destroyed = false;
  let entries = [];
  let index = -1;
  let movements = 0;
  window.isDestroyed = () => closed;
  contents.isDestroyed = () => destroyed;
  const committed = () => contents.emit('did-navigate-in-page', {}, entries[index], true);
  contents.navigationHistory = {
    canGoBack: () => index > 0,
    canGoForward: () => index >= 0 && index < entries.length - 1,
    goBack: () => { assert.ok(index > 0); index--; movements++; committed(); },
    goForward: () => { assert.ok(index < entries.length - 1); index++; movements++; committed(); },
  };
  return {
    window, contents,
    visit(url, inPage = false) {
      entries = [...entries.slice(0, index + 1), url];
      index = entries.length - 1;
      if (inPage) committed();
      else contents.emit('did-navigate', {}, url, -1, '');
    },
    current: () => entries[index],
    movements: () => movements,
    destroyContents() { destroyed = true; contents.emit('destroyed'); },
    close() { closed = true; window.emit('closed'); },
  };
}

function harness(platform = 'darwin') {
  let window;
  let menu;
  const navigation = createNavigationMenu({ platform, getWindow: () => window, getMenu: () => menu });
  // Electron materializes separate MenuItem objects from the template.
  const items = new Map(navigation.template.submenu.map(item => [item.id, { ...item }]));
  menu = { getMenuItemById: id => items.get(id) };
  return {
    back: items.get('navigation-back'), forward: items.get('navigation-forward'),
    attach(fake) { window = fake.window; navigation.bind(window); },
    forgetWindow() { window = undefined; },
    hideMenu() { menu = undefined; },
  };
}

test('native history commands are disabled for a new window and safely ignore an empty history', () => {
  const h = harness();
  assert.equal(h.back.enabled, false);
  assert.equal(h.forward.enabled, false);
  assert.doesNotThrow(() => { h.back.click(); h.forward.click(); });
  const w = fakeWindow();
  h.attach(w);
  h.back.click(); h.forward.click();
  w.visit('taxsorted://app/');
  assert.equal(h.back.enabled, false);
  assert.equal(h.forward.enabled, false);
  assert.equal(w.movements(), 0);
});

test('full-page and in-page route history retain activity and update both directions', () => {
  const h = harness();
  const w = fakeWindow();
  h.attach(w);
  const money = 'taxsorted://app/books/workspace/money/?activity=uk-property';
  const tax = 'taxsorted://app/books/workspace/tax/?activity=uk-property';
  w.visit(money);
  w.visit(tax, true);
  assert.equal(h.back.enabled, true);
  assert.equal(h.forward.enabled, false);
  h.back.click();
  assert.equal(w.current(), money);
  assert.equal(h.back.enabled, false);
  assert.equal(h.forward.enabled, true);
  h.forward.click();
  assert.equal(w.current(), tax);
  assert.equal(h.back.enabled, true);
  assert.equal(h.forward.enabled, false);
  w.visit('taxsorted://app/learn/');
  h.back.click();
  assert.equal(w.current(), tax);
  assert.equal(h.forward.enabled, true);
});

test('a new route after Back discards Forward history and stale clicks recheck availability', () => {
  const h = harness();
  const w = fakeWindow();
  h.attach(w);
  w.visit('taxsorted://app/');
  w.visit('taxsorted://app/checkup/', true);
  h.back.click();
  assert.equal(h.forward.enabled, true);
  w.visit('taxsorted://app/books/workspace/backups/', true);
  assert.equal(h.forward.enabled, false);
  const count = w.movements();
  // Invoking an old menu callback must not move beyond available history.
  h.forward.click();
  assert.equal(w.movements(), count);
  assert.equal(w.current(), 'taxsorted://app/books/workspace/backups/');
});

test('destroying a window clears controls and reopening binds only the new history', () => {
  const h = harness();
  const first = fakeWindow();
  h.attach(first);
  first.visit('taxsorted://app/');
  first.visit('taxsorted://app/checkup/');
  assert.equal(h.back.enabled, true);
  first.close();
  assert.equal(h.back.enabled, false);
  assert.equal(h.forward.enabled, false);
  assert.equal(first.contents.listenerCount('did-navigate'), 0);
  assert.equal(first.contents.listenerCount('did-navigate-in-page'), 0);
  assert.doesNotThrow(() => { h.back.click(); h.forward.click(); });
  const second = fakeWindow();
  h.attach(second);
  second.visit('taxsorted://app/');
  assert.equal(h.back.enabled, false);
  second.visit('taxsorted://app/books/workspace/', true);
  h.back.click();
  assert.equal(second.current(), 'taxsorted://app/');
  assert.equal(first.current(), 'taxsorted://app/checkup/');
  assert.equal(first.movements(), 0);
});

test('destroyed contents, a missing window or missing menu cannot trigger navigation errors', () => {
  const h = harness();
  const w = fakeWindow();
  h.attach(w);
  w.visit('taxsorted://app/');
  w.visit('taxsorted://app/checkup/');
  w.destroyContents();
  assert.equal(h.back.enabled, false);
  assert.equal(h.forward.enabled, false);
  assert.equal(w.contents.listenerCount('did-navigate-in-page'), 0);
  assert.doesNotThrow(() => { h.back.click(); h.forward.click(); });
  h.forgetWindow();
  h.hideMenu();
  assert.doesNotThrow(() => { h.back.click(); h.forward.click(); });
  assert.equal(w.movements(), 0);
});

test('native accelerators follow macOS and Windows/Linux navigation conventions', () => {
  const mac = harness('darwin');
  assert.equal(mac.back.accelerator, 'Cmd+[');
  assert.equal(mac.forward.accelerator, 'Cmd+]');
  for (const platform of ['win32', 'linux']) {
    const h = harness(platform);
    assert.equal(h.back.accelerator, 'Alt+Left');
    assert.equal(h.forward.accelerator, 'Alt+Right');
  }
});
