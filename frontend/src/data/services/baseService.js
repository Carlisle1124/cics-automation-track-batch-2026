export async function handleRequest(mockFn, endpoint, options = {}) {
    // Always use mock data for non-user services
    return mockFn();
}