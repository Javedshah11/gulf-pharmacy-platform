export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    new URL(
      '/api' + path,
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    ),
    {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Gulf-Request': 'admin',
        ...options.headers,
      },
      signal: options.signal ?? AbortSignal.timeout(12000),
    },
  );
  if (!response.ok) {
    let message = 'The request could not be completed. Please try again.';
    try {
      const body = await response.json();
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join('. ');
    } catch {
      /* Keep a safe fallback for non-JSON errors. */
    }
    throw new AdminApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
