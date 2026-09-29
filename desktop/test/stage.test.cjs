const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertClosedPublicationGate } = require('../scripts/stage.cjs');

const worker = state => `const manifest = ${JSON.stringify({ schema: 'taxsorted.uk.professional-opportunity-edge-gate/1', state })};\nexport default {};`;

test('offline staging admits only a closed, recognised research publication gate', () => {
  assert.doesNotThrow(() => assertClosedPublicationGate(worker('closed')));
  for (const source of [worker('open'), worker('admitted'), worker(null), '', 'const manifest = {};', 'const manifest = {broken};']) {
    assert.throws(() => assertClosedPublicationGate(source));
  }
});
