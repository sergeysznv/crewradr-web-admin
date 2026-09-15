import { supabase } from '@/lib/supabase/client';

export type StripeTier = 'first_mate' | 'captain' | 'admiral';
export type StripePeriod = 'monthly' | 'yearly';

/**
 * Invokes the Supabase Edge Function to create a hosted Stripe Checkout Session.
 * Redirects the user's browser to Stripe's payment page upon success.
 */
export async function startStripeCheckout(
  tier: StripeTier,
  period: StripePeriod = 'monthly',
): Promise<{ url?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { error: 'Please sign in to proceed with checkout.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return { error: 'Supabase configuration missing.' };
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${supabaseUrl}/functions/v1/create_stripe_checkout_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tier,
        period,
        success_url: `${origin}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/settings?checkout=cancel`,
      }),
    });

    const json = await res.json().catch(() => ({ error: 'Invalid response from checkout service' }));

    if (!res.ok) {
      return { error: json.error || 'Failed to initiate checkout.' };
    }

    if (json.url && typeof window !== 'undefined') {
      window.location.href = json.url;
    }

    return { url: json.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout network error';
    return { error: message };
  }
}
