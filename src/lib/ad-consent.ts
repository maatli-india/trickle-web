// The visitor's choice about advertising and measurement cookies (Google and
// Meta). Stored in this browser only. Ad tags must check hasAdConsent()
// before loading, and listen for AD_CONSENT_CHANGED to react to a change.
// See the Privacy Policy, section 5 (/privacy#advertising).

export type AdConsent = "granted" | "denied";

const KEY = "trickle.adConsent";
export const AD_CONSENT_CHANGED = "trickle:ad-consent-changed";
export const AD_CONSENT_OPEN = "trickle:ad-consent-open";

export function getAdConsent(): AdConsent | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function hasAdConsent(): boolean {
  return getAdConsent() === "granted";
}

export function setAdConsent(value: AdConsent) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(AD_CONSENT_CHANGED, { detail: value }));
}

/** Re-open the choice (footer "Ad preferences"). */
export function openAdConsent() {
  window.dispatchEvent(new Event(AD_CONSENT_OPEN));
}
