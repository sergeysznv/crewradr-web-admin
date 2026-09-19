'use client';

import { useLocale, LANGUAGES } from '@/hooks/use-translations';
import { supabase } from '@/lib/supabase/client';

interface LanguageSelectProps {
  className?: string;
  onLanguageChange?: (code: string) => Promise<void> | void;
}

export function LanguageSelect({ className, onLanguageChange }: LanguageSelectProps) {
  const { locale, setLocale } = useLocale();

  async function handleChange(newLocale: string) {
    if (newLocale === locale) return;
    setLocale(newLocale);
    if (onLanguageChange) {
      await onLanguageChange(newLocale);
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('profiles').upsert({
            user_id: user.id,
            language_preference: newLocale,
          });
        }
      } catch {
        // Fallback to local storage preference
      }
    }
  }

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Language selection"
      className={className ?? "h-9 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-800 transition-colors hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800">
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
