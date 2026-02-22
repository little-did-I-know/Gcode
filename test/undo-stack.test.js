import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UndoStack } from '../src/undo-stack.js';

describe('UndoStack', () => {
  it('starts empty with no undo/redo', () => {
    const stack = new UndoStack();
    assert.strictEqual(stack.canUndo(), false);
    assert.strictEqual(stack.canRedo(), false);
  });

  it('push then undo returns previous state', () => {
    const stack = new UndoStack();
    stack.push({ mods: [] });
    stack.push({ mods: ['a'] });
    assert.strictEqual(stack.canUndo(), true);
    const prev = stack.undo();
    assert.deepStrictEqual(prev, { mods: [] });
  });

  it('redo returns the undone state', () => {
    const stack = new UndoStack();
    stack.push({ x: 1 });
    stack.push({ x: 2 });
    stack.undo();
    const redone = stack.redo();
    assert.deepStrictEqual(redone, { x: 2 });
  });

  it('respects maxSize', () => {
    const stack = new UndoStack(3);
    stack.push('a');
    stack.push('b');
    stack.push('c');
    stack.push('d'); // should evict 'a'
    assert.strictEqual(stack.stack.length, 3);
  });
});
