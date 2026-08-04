// src/components/settings/BrandingTab.tsx
'use client';
import { useState } from 'react';
import { Upload } from 'lucide-react';

export function BrandingTab({ seedColor = null }: { seedColor?: string | null }) {
  const [color, setColor] = useState(seedColor ?? '#8EA595');

  return (
    <div className="space-y-lg">
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Primary Color</label>
        <div className="flex items-center gap-4 mt-2">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-outline cursor-pointer" />
          <div className="flex gap-2">
            {['#8EA595', '#6E8679', '#DDCFB5', '#4A90D9', '#E68A00', '#D9534F'].map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${c === color ? 'border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Logo</label>
        <div className="mt-2 border-2 border-dashed border-outline rounded-lg p-xl text-center">
          <Upload size={28} className="mx-auto mb-2 text-on-surface-variant opacity-40" />
          <p className="text-sm text-on-surface-variant">Upload a PNG or SVG (max 2MB)</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Live Preview</label>
        <div className="mt-2 bg-surface border border-outline rounded-lg p-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${color}20`, color }}>
              C
            </div>
            <div>
              <div className="text-sm font-semibold text-on-surface">Sample Crew Card</div>
              <div className="text-2xs text-on-surface-variant">This is how your crew sees the app</div>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: color }}>Button</button>
        </div>
      </div>
    </div>
  );
}
