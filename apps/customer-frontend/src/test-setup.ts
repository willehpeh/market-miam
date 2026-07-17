import '@testing-library/jest-dom/vitest';

// jsdom has no <dialog> methods yet (https://github.com/jsdom/jsdom/issues/3294)
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};
