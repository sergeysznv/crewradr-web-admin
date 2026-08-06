// @vitest-environment node
//
// SSR behavior: react-dom's client renderer needs a real `window`, so we
// can't fake "no window" inside the jsdom suite. Instead render the hook via
// react-dom/server, where `typeof window === 'undefined'` holds naturally.
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';

vi.mock('@/hooks/queries/useAccountProfile', () => ({
  useAccountProfile: () => ({ data: { profile: null, crews: [] } }),
}));

function Probe() {
  const { system } = useMeasurementSystem();
  return <span>{system}</span>;
}

describe('useMeasurementSystem (SSR)', () => {
  it('defaults to metric when rendering without a window', () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('metric');
    expect(html).not.toContain('imperial');
  });
});
