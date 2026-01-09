/**
 * API utility with session token support
 */

/**
 * Get session token from URL query params
 */
export function getSessionToken(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('sessiontoken');
}

/**
 * Create headers with session token
 */
export function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const sessionToken = getSessionToken();
    if (sessionToken) {
        headers['x-session-token'] = sessionToken;
    }

    return headers;
}

/**
 * Fetch with session token
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {}),
    };

    return fetch(url, {
        ...options,
        headers,
    });
}

/**
 * GET request with session token
 */
export async function apiGet<T>(url: string): Promise<T> {
    const response = await apiFetch(url);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

/**
 * POST request with session token
 */
export async function apiPost<T>(url: string, data: unknown): Promise<T> {
    const response = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

/**
 * PUT request with session token
 */
export async function apiPut<T>(url: string, data: unknown): Promise<T> {
    const response = await apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

/**
 * DELETE request with session token
 */
export async function apiDelete<T>(url: string): Promise<T> {
    const response = await apiFetch(url, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}
