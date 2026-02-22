// ===== UNDO/REDO STACK =====
export class UndoStack {
  constructor(maxSize = 50) {
    this.stack = [];
    this.index = -1;
    this.maxSize = maxSize;
  }

  push(state) {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(JSON.parse(JSON.stringify(state)));
    if (this.stack.length > this.maxSize) this.stack.shift();
    this.index = this.stack.length - 1;
  }

  undo() {
    if (this.index <= 0) return null;
    this.index--;
    return JSON.parse(JSON.stringify(this.stack[this.index]));
  }

  redo() {
    if (this.index >= this.stack.length - 1) return null;
    this.index++;
    return JSON.parse(JSON.stringify(this.stack[this.index]));
  }

  canUndo() { return this.index > 0; }
  canRedo() { return this.index < this.stack.length - 1; }
}
