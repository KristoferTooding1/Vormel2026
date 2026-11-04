const test = require('node:test');
const assert = require('node:assert');

const { createApp } = require('./server');

test('createApp returns an Express app instance', () => {
  const app = createApp();
  assert.ok(app);
  assert.strictEqual(typeof app.get, 'function');
});
