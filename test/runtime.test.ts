import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyFatalExit,
  buildBrowserArgs,
  getBrowserChannels,
} from '../src/runtime';

test('getBrowserChannels defaults to chrome then msedge', () => {
  assert.deepEqual(getBrowserChannels(undefined), ['chrome', 'msedge']);
});

test('getBrowserChannels puts preferred channel first without duplicates', () => {
  assert.deepEqual(getBrowserChannels('msedge'), ['msedge', 'chrome']);
});

test('buildBrowserArgs keeps base flags and adds profile directory', () => {
  assert.deepEqual(buildBrowserArgs('Profile 1'), [
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--no-first-run',
    '--no-default-browser-check',
    '--profile-directory=Profile 1',
  ]);
});

test('buildBrowserArgs skips empty profile names', () => {
  assert.deepEqual(buildBrowserArgs(''), [
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--no-first-run',
    '--no-default-browser-check',
  ]);
});

test('applyFatalExit logs error details and sets non-zero exit code', () => {
  const logs: string[] = [];
  const previousExitCode = process.exitCode;

  try {
    process.exitCode = 0;
    applyFatalExit(new Error('boom'), (message?: unknown) => {
      logs.push(String(message ?? ''));
    });

    assert.equal(process.exitCode, 1);
    assert.match(logs.join('\n'), /boom/);
  } finally {
    process.exitCode = previousExitCode;
  }
});
