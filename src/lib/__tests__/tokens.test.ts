import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const base = import.meta.url;
const css = readFileSync(
  fileURLToPath(new URL('../tokens.css', base)),
  'utf8',
);

const token = (name: string): string | undefined =>
  css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1]?.trim();

describe('tokens.css rendering-robustness contract', () => {
  const onTokens = [
    'on-primary', 'on-primary-container', 'on-secondary',
    'on-secondary-container', 'on-error', 'on-error-container',
    'on-warning', 'on-warning-container', 'on-success',
    'on-success-container', 'on-brand',
  ];

  it('defines every on-* token', () => {
    for (const name of onTokens) {
      expect(token(name), `--color-${name}`).toBeDefined();
    }
  });

  it('has no translucent container tokens', () => {
    const containers = [
      'primary-container', 'secondary-container', 'error-container',
      'warning-container', 'success-container',
    ];
    for (const name of containers) {
      expect(token(name)?.toLowerCase(), `--color-${name}`).not.toContain('rgba');
    }
  });
});
