export interface SignupResultData {
  session: unknown | null;
  user: { identities?: unknown[] } | null;
}

export function signupOutcome(data: SignupResultData) {
  if (data.session) return 'signed-in';
  // Auth deliberately returns an empty identity list for an existing confirmed
  // account. It does not send another confirmation email in this case.
  if (data.user?.identities?.length === 0) return 'existing-account';
  return data.user ? 'confirmation-required' : 'incomplete';
}

// Auth subscribers run while the auth client's session lock is held. Schedule
// database work after the subscriber returns, and ignore stale/unmounted reads.
export function deferredAuthUpdate<T>(apply: (value: T, isCurrent: () => boolean) => Promise<void>) {
  let revision = 0;
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule(value: T) {
      const currentRevision = ++revision;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void apply(value, () => active && currentRevision === revision);
      }, 0);
    },
    dispose() {
      active = false;
      ++revision;
      clearTimeout(timer);
    },
  };
}