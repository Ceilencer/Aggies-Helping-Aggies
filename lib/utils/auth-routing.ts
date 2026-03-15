/**
 * auth-routing.ts
 *
 * Modular, provider-agnostic routing logic for post-authentication redirects.
 *
 * Add a new provider entry to PROVIDER_ROUTING to customise its behaviour.
 * By default, any provider not listed falls through to the domain-based check.
 *
 * Current rules
 * ─────────────
 * Google  →  domain @tamu.edu         → fast-track (active)
 *            any other domain          → manual verification (pending_approval)
 *
 * Facebook (future) → always manual verification (no educational domain check)
 */

export type OAuthProvider = 'google' | 'facebook' | string

export type AuthRouteDecision =
  | { route: 'dashboard'; accountStatus: 'active' }
  | { route: 'verification-questionnaire'; accountStatus: 'pending_approval' }

/**
 * Per-provider overrides.
 * Return `null` to fall back to the default domain-based logic.
 */
const PROVIDER_ROUTING: Partial<
  Record<OAuthProvider, (email: string) => AuthRouteDecision | null>
> = {
  // Google: TAMU addresses are fast-tracked; everything else is manual.
  google: (email: string): AuthRouteDecision | null => {
    if (email.toLowerCase().trim().endsWith('@tamu.edu')) {
      return { route: 'dashboard', accountStatus: 'active' }
    }
    return { route: 'verification-questionnaire', accountStatus: 'pending_approval' }
  },

  // Facebook: always manual – Facebook accounts are not educational-domain-keyed.
  facebook: (_email: string): AuthRouteDecision => ({
    route: 'verification-questionnaire',
    accountStatus: 'pending_approval',
  }),
}

/** Default fallback: any unrecognised provider is treated as manual verification. */
function defaultRoute(_email: string): AuthRouteDecision {
  return { route: 'verification-questionnaire', accountStatus: 'pending_approval' }
}

/**
 * Determine where to send a user after OAuth authentication completes.
 *
 * @param provider  The OAuth provider identifier (e.g. "google", "facebook").
 * @param email     The authenticated user's email address.
 * @returns         A decision object with the target route and the account status to persist.
 */
export function resolveAuthRoute(
  provider: OAuthProvider,
  email: string
): AuthRouteDecision {
  const providerFn = PROVIDER_ROUTING[provider]
  if (providerFn) {
    const decision = providerFn(email)
    if (decision !== null) return decision
  }
  return defaultRoute(email)
}
