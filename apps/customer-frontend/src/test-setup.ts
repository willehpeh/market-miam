import '@testing-library/jest-dom/vitest';

// jsdom has no <dialog> methods yet (https://github.com/jsdom/jsdom/issues/3294)
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
  // The spec queues a task to fire close rather than firing it inside close() — matched
  // here so tests see the same ordering a browser gives them.
  setTimeout(() => this.dispatchEvent(new Event('close')));
};
