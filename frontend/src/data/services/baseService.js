import { USE_MOCK } from '../../config/env';

export async function handleRequest(mockFn, endpoint, options = {}) {
    if (USE_MOCK) {
        return mockFn();
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}