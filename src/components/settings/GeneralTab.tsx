// src/components/settings/GeneralTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { tierLabel, tierColor, tierRank } from '@/lib/utils';
import { startStripeCheckout, type StripeTier, type StripePeriod } from '@/lib/stripe';
import type { CrewSettings } from '@/types/rpc';
import {
  CreditCard,
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface TierOption {
  id: StripeTier;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  description: string;
  badge?: string;
  features: string[];
}

const TIERS: TierOption[] = [
  {
    id: 'first_mate',
    name: 'First Mate',
    monthlyPrice: '$4.99/mo',
    yearlyPrice: '$53.99/yr',
    description: 'Perfect for small teams and families',
    features: [
      'Up to 20 crew members',
      '15-second live GPS tracking',
      '30-day location & trip history',
      'Safe Landing geofence zones',
      'Driver safety scoring & coaching',
    ],
  },
  {
    id: 'captain',
    name: 'Captain',
    monthlyPrice: '$9.99/mo',
    yearlyPrice: '$107.99/yr',
    description: 'For professional crews and active fleets',
    badge: 'Most Popular',
    features: [
      'Up to 50 crew members',
      '15-second tracking & 90-day history',
      'Unlimited Safe Landing zones',
      'Speed & fatigue fleet policy',
      'Webhooks & API integrations',
      'Priority email & chat support',
    ],
  },
  {
    id: 'admiral',
    name: 'Admiral',
    monthlyPrice: '$19.99/mo',
    yearlyPrice: '$215.99/yr',
    description: 'Complete compliance & enterprise fleet tools',
    badge: 'Enterprise',
    features: [
      'Up to 250 crew members',
      'DOT & OSHA compliance reports',
      'Automated SOS & crash SMS dispatch',
      '365-day history & audit logs',
      'Custom branding & domain support',
      'Dedicated account manager',
    ],
  },
];

export function GeneralTab({
  subscription,
}: {
  subscription: CrewSettings['subscription'];
}) {
  const { t } = useT();
  const { crewName, tier } = useCrew();
  const currentRank = tierRank(tier);

  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'cancel' | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<StripePeriod>('monthly');
  const [loadingTier, setLoadingTier] = useState<StripeTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('checkout');
      if (status === 'success' || status === 'cancel') {
        setCheckoutStatus(status);
        // Clean URL search query without triggering full reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  async function handleCheckout(tierId: StripeTier) {
    setLoadingTier(tierId);
    setCheckoutError(null);
    try {
      const res = await startStripeCheckout(tierId, billingPeriod);
      if (res.error) {
        setCheckoutError(res.error);
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Checkout Status Notifications */}
      {checkoutStatus === 'success' && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Stripe Checkout Completed Successfully!</p>
            <p className="mt-1 text-xs opacity-90">
              Your subscription is being activated by Stripe webhooks. It will take a few moments to reflect across the web portal and mobile devices.
            </p>
          </div>
        </div>
      )}

      {checkoutStatus === 'cancel' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Checkout Cancelled</p>
            <p className="mt-1 text-xs opacity-90">
              No payment was processed. You can retry or choose a different tier anytime.
            </p>
          </div>
        </div>
      )}

      {checkoutError && (
        <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="flex-1 font-medium">{checkoutError}</p>
          <button
            type="button"
            onClick={() => setCheckoutError(null)}
            className="text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Crew Name */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webSettingsCrewName')}
        </label>
        <input
          defaultValue={crewName}
          readOnly
          className="mt-1 w-full px-4 py-2 rounded-lg border border-outline bg-surface-container text-sm text-on-surface cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-on-surface-variant">
          {t('webSettingsCrewNameHint')}
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <div className="rounded-xl border border-outline bg-surface-container p-sz-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-on-surface">{t('webSettingsSubscriptionTier')}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t('webSettingsCurrentPlan')}</div>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: `${tierColor(tier)}20`, color: tierColor(tier) }}
          >
            {tierLabel(tier, t)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-outline/50">
          <div>
            <span className="text-xs text-on-surface-variant">{t('webSettingsStatus')}</span>
            <p className="text-sm font-semibold text-on-surface capitalize">
              {subscription?.status ?? (currentRank === 0 ? 'Free' : 'Active')}
            </p>
          </div>
          <div>
            <span className="text-xs text-on-surface-variant">Billing Cadence</span>
            <p className="text-sm font-semibold text-on-surface capitalize">
              {subscription?.billing_interval ?? (currentRank === 0 ? 'None (Free)' : 'Monthly')}
            </p>
          </div>
          <div>
            <span className="text-xs text-on-surface-variant">{t('webSettingsMaxMembers')}</span>
            <p className="text-sm font-semibold text-on-surface">
              {subscription?.max_capacity && subscription.max_capacity > 0
                ? subscription.max_capacity
                : currentRank === 0
                ? 10
                : currentRank === 1
                ? 20
                : currentRank === 2
                ? 50
                : 250}
            </p>
          </div>
        </div>
      </div>

      {/* Payment & Billing Provider Notice */}
      <div className="rounded-xl border border-outline bg-surface-container p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-on-surface">{t('webSettingsBilling')} Provider</div>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {currentRank === 0
                ? 'Your crew is currently on the free Deckhand tier. You can subscribe directly below using Stripe to unlock high-frequency live tracking and fleet management tools.'
                : 'Your crew can be billed via Apple App Store, Google Play, or directly through Stripe Web Billing. You can upgrade or switch plans anytime using Stripe secure checkout below.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Upgrade & Plans Section */}
      <div className="rounded-xl border border-outline bg-surface p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--brand-accent,#D4A017)]" />
              <h3 className="text-base font-bold text-on-surface">Upgrade & Web Billing (Stripe)</h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Select a tier to subscribe or upgrade with secure Stripe hosted checkout.
            </p>
          </div>

          {/* Billing Cadence Toggle */}
          <div className="inline-flex items-center rounded-lg border border-outline bg-surface-container p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('yearly')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Yearly</span>
              <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tItem) => {
            const isCurrent = (tItem.id === 'first_mate' && currentRank === 1) ||
                              (tItem.id === 'captain' && currentRank === 2) ||
                              (tItem.id === 'admiral' && currentRank === 3);
            const isDowngrade = (tItem.id === 'first_mate' && currentRank > 1) ||
                                (tItem.id === 'captain' && currentRank > 2);
            const isLoading = loadingTier === tItem.id;
            const price = billingPeriod === 'monthly' ? tItem.monthlyPrice : tItem.yearlyPrice;

            return (
              <div
                key={tItem.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? 'border-primary/40 bg-primary-container/20 ring-1 ring-primary/20'
                    : 'border-outline bg-surface-container hover:border-outline-variant'
                }`}
              >
                {tItem.badge && !isCurrent && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary shadow-sm">
                    {tItem.badge}
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    Current Tier
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-on-surface">{tItem.name}</h4>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-on-surface">{price}</span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{tItem.description}</p>

                  <ul className="mt-4 space-y-2 border-t border-outline/40 pt-3">
                    {tItem.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-on-surface-variant">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-3">
                  <button
                    type="button"
                    disabled={isCurrent || !!loadingTier}
                    onClick={() => handleCheckout(tItem.id)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                      isCurrent
                        ? 'border border-outline bg-surface text-on-surface-variant cursor-default'
                        : 'bg-primary text-on-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-sm'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrent ? (
                      <span>Active Plan</span>
                    ) : (
                      <>
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{isDowngrade ? `Switch to ${tItem.name}` : `Upgrade to ${tItem.name}`}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-on-surface-variant opacity-80">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Encrypted 256-bit Stripe checkout. Manage, cancel, or switch plans at any time.</span>
        </div>
      </div>
    </div>
  );
}
