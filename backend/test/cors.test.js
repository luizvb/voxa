const assert = require('node:assert/strict');
const test = require('node:test');

const { isOriginAllowed } = require('../dist/config/cors');

test('local development origins are allowed independently of inherited CORS env', () => {
  assert.equal(isOriginAllowed('http://localhost:5173', ['https://voxa.example'], undefined), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:5173', [], 'development'), true);
});

test('production only allows explicit origins', () => {
  assert.equal(isOriginAllowed('http://localhost:5173', ['https://voxa.example'], 'production'), false);
  assert.equal(isOriginAllowed('https://voxa.example', ['https://voxa.example'], 'production'), true);
});
