const LOCAL_URL = 'http://localhost:8000';
const RENDER_URL = 'https://netheal-backend.onrender.com';

/**
 * Base URL resolution:
 * 1. Explicit environment variable (VITE_API_BASE_URL)
 * 2. In production builds: https://netheal-backend.onrender.com
 * 3. In local development: http://localhost:8000 (with automatic failover to Render if local is offline)
 */
export let API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? RENDER_URL : LOCAL_URL);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function executeRequest<T>(
  baseUrl: string,
  endpoint: string,
  options: RequestInit,
  timeoutMs: number
): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `Server error ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {
        if (response.statusText) {
          errorMsg = response.statusText;
        }
      }
      throw new ApiError(errorMsg, response.status);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs}ms`, 408);
    }
    const message = err instanceof Error ? err.message : 'Unknown network failure';
    throw new ApiError(message, 0);
  }
}

/**
 * Standard typed JSON request wrapper with timeout, robust error extraction,
 * and automatic fallback from localhost:8000 to Render if the local backend is unreachable.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  try {
    return await executeRequest<T>(API_BASE_URL, endpoint, options, timeoutMs);
  } catch (err) {
    // If targeting localhost:8000 fails with a network error (offline/refused),
    // automatically fall back to the live Render backend
    if (
      API_BASE_URL === LOCAL_URL &&
      err instanceof ApiError &&
      err.status === 0
    ) {
      console.warn(
        `Local backend (${LOCAL_URL}) offline or unreachable. Falling back to Render: ${RENDER_URL}`
      );
      API_BASE_URL = RENDER_URL;
      return await executeRequest<T>(RENDER_URL, endpoint, options, timeoutMs);
    }
    throw err;
  }
}
