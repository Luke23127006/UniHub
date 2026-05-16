const { compileTemplate, clearCache } = require('./templateEngine');

// Clear the module-level cache between tests so compile counts are accurate
beforeEach(() => clearCache());

describe('compileTemplate', () => {
  describe('variable interpolation', () => {
    it('replaces a single {{variable}} with its value', () => {
      expect(compileTemplate('Hello {{studentName}}', { studentName: 'Luan' }))
        .toBe('Hello Luan');
    });

    it('replaces multiple variables in one template', () => {
      const result = compileTemplate(
        'Hi {{studentName}}, your QR token is {{qrToken}}.',
        { studentName: 'An', qrToken: 'QR-ABC-123' },
      );
      expect(result).toBe('Hi An, your QR token is QR-ABC-123.');
    });

    it('renders a workshop confirmation template end-to-end', () => {
      const template = 'Your registration for {{workshopName}} is confirmed. Token: {{qrToken}}';
      const data     = { workshopName: 'Systems Design 101', qrToken: 'XYZ-789' };
      expect(compileTemplate(template, data))
        .toBe('Your registration for Systems Design 101 is confirmed. Token: XYZ-789');
    });

    it('leaves unmatched variables as empty string (Handlebars default)', () => {
      expect(compileTemplate('Hello {{missingVar}}', {})).toBe('Hello ');
    });

    it('treats a null data argument as an empty object', () => {
      expect(compileTemplate('Value: {{x}}', null)).toBe('Value: ');
    });

    it('treats an undefined data argument as an empty object', () => {
      expect(compileTemplate('Value: {{x}}', undefined)).toBe('Value: ');
    });

    it('returns the template unchanged when it contains no variables', () => {
      expect(compileTemplate('No variables here.', { foo: 'bar' }))
        .toBe('No variables here.');
    });

    it('handles numeric values', () => {
      expect(compileTemplate('Seats left: {{seats}}', { seats: 42 }))
        .toBe('Seats left: 42');
    });
  });

  describe('compiled-template cache', () => {
    it('returns the same output on repeated calls with the same template', () => {
      const tmpl = 'Hi {{name}}';
      expect(compileTemplate(tmpl, { name: 'Alice' })).toBe('Hi Alice');
      expect(compileTemplate(tmpl, { name: 'Bob' })).toBe('Hi Bob');
    });

    it('clearCache allows the template to be recompiled without error', () => {
      compileTemplate('Cached {{val}}', { val: 'first' });
      clearCache();
      // After clearing, a new compilation run should still produce the correct output
      expect(compileTemplate('Cached {{val}}', { val: 'second' })).toBe('Cached second');
    });
  });

  describe('input validation', () => {
    it('throws TypeError when templateString is not a string', () => {
      expect(() => compileTemplate(42, {}))
        .toThrow(TypeError);
    });

    it('throws TypeError with a descriptive message', () => {
      expect(() => compileTemplate(null, {}))
        .toThrow('compileTemplate: templateString must be a string, got object');
    });
  });
});
