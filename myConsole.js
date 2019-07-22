'use strict';

// Creates a simple extension of console with a
// new impl for assert without monkey-patching.
const myConsole = Object.setPrototypeOf({
  assert(assertion, message, ...args) {
    try {
      console.assert(assertion, message, ...args);
    } catch (err) {
      console.error(err.stack);
    }
  }
}, console);

module.exports = myConsole;
