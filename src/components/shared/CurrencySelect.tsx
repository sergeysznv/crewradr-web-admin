'use client';

import { useCurrencyContext } from '@/components/settings/CurrencyProvider';
import { CurrencyCode, CURRENCIES } from '@/lib/currency';

interface CurrencySelectProps {
  className?: string;
}

export function CurrencySelect({ className }: CurrencySelectProps) {
  const { currency, setCurrency, availableCurrencies, allCurrencies } = useCurrencyContext();

  const isCurrentInAvailable = availableCurrencies.includes(currency);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        aria-label="Currency selection"
        className={
          className ??
          'h-9 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-800 transition-colors hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer'
        }
      >
        <optgroup label="Recommended for Language">
          {availableCurrencies.map((code) => {
            const cfg = CURRENCIES[code];
            return (
              <option key={code} value={code} className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800">
                {cfg.flag} {cfg.code} ({cfg.symbol})
              </option>
            );
          })}
        </optgroup>
        {!isCurrentInAvailable && (
          <optgroup label="Selected">
            <option value={currency} className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800">
              {CURRENCIES[currency]?.flag} {currency} ({CURRENCIES[currency]?.symbol})
            </option>
          </optgroup>
        )}
        <optgroup label="All Currencies">
          {allCurrencies
            .filter((c) => !availableCurrencies.includes(c.code) && c.code !== currency)
            .map((cfg) => (
              <option key={cfg.code} value={cfg.code} className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800">
                {cfg.flag} {cfg.code} ({cfg.symbol})
              </option>
            ))}
        </optgroup>
      </select>
    </div>
  );
}
