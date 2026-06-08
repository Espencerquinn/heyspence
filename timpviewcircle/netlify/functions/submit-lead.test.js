// submit-lead.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead } from './submit-lead.js';

test('accepts a complete lead and normalizes fields', () => {
  const r = validateLead({ name: ' Jane ', email: 'JANE@x.com', phone: '801-555-1212', interest: 'lot1' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: 'Jane', email: 'jane@x.com', phone: '801-555-1212', interest: 'lot1' });
});

test('rejects missing required fields', () => {
  const r = validateLead({ name: '', email: 'a@b.com', phone: '1', interest: 'lot1' });
  assert.equal(r.ok, false);
});

test('rejects malformed email', () => {
  const r = validateLead({ name: 'Jane', email: 'not-an-email', phone: '1', interest: 'lot1' });
  assert.equal(r.ok, false);
});

test('honeypot field set => treated as spam', () => {
  const r = validateLead({ name: 'Jane', email: 'a@b.com', phone: '1', interest: 'lot1', company: 'spammer' });
  assert.equal(r.ok, false);
  assert.equal(r.spam, true);
});
