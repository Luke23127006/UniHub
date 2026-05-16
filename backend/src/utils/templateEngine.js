const handlebars = require('handlebars');

// Cache compiled template functions to avoid re-parsing on every notification
const _cache = new Map();

/**
 * Compiles a Handlebars template string against the provided data object.
 * Results are cached by the raw template string as the key.
 *
 * @param {string} templateString  — raw Handlebars template, e.g. "Hello {{studentName}}"
 * @param {object} data            — key/value pairs to interpolate
 * @returns {string}               — rendered output
 */
function compileTemplate(templateString, data) {
  if (typeof templateString !== 'string') {
    throw new TypeError(`compileTemplate: templateString must be a string, got ${typeof templateString}`);
  }

  if (!_cache.has(templateString)) {
    _cache.set(templateString, handlebars.compile(templateString));
  }

  return _cache.get(templateString)(data ?? {});
}

/**
 * Clears the compiled-template cache.
 * Call this in tests or after hot-reloading templates from the database.
 */
function clearCache() {
  _cache.clear();
}

module.exports = { compileTemplate, clearCache };
