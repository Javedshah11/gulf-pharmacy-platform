export async function publicEngagement<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    new URL(
      '/api/engagement/' + path,
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    ),
    {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers:
        body === undefined
          ? {}
          : { 'Content-Type': 'application/json', 'X-Gulf-Request': 'public' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join('. ')
        : (error?.message ?? 'Service temporarily unavailable'),
    );
  }
  return response.json();
}
export function recordSignal(context: string, eventType: string) {
  void publicEngagement('events', { context, eventType }).catch(
    () => undefined,
  );
}
