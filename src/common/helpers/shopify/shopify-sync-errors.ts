/** Product/handle lookup miss — expected when creating a new Shopify listing. */
export function isNotFoundError(err: unknown): boolean {
  const e = err as { response?: { status?: number }; status?: number; networkStatusCode?: number; message?: string };
  const status = e?.response?.status ?? e?.status ?? e?.networkStatusCode;
  if (status === 404) return true;
  const msg = String(e?.message || err || '');
  return /\bnot found\b/i.test(msg) && !/throttl/i.test(msg);
}

/** Create rejected because the handle is already taken — existing listing should be updated. */
export function isHandleInUseError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '').toLowerCase();
  return /handle.*already in use|already in use.*handle|handle has already been taken/.test(msg);
}

/** Worth re-queuing: throttle, server errors, transient network — not 404/validation. */
export function isRetryableShopifySyncError(err: unknown): boolean {
  if (!err) return false;
  if (isNotFoundError(err)) return false;

  const e = err as { response?: { status?: number }; status?: number; networkStatusCode?: number; message?: string };
  const status = e?.response?.status ?? e?.status ?? e?.networkStatusCode;
  const msg = String(e?.message || err || '').toLowerCase();

  if (status === 429 || /throttl|rate limit|exceeded.*calls per second/.test(msg)) return true;
  if (typeof status === 'number' && status >= 500 && status < 600) return true;
  if (/econnreset|etimedout|socket hang up|network error|eai_again/.test(msg)) return true;

  return false;
}
