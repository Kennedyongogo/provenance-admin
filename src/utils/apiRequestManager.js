/**
 * API Request Manager - Prevents duplicate simultaneous API calls
 * This helps prevent DDoS-like scenarios where multiple users make repeated requests
 */

class ApiRequestManager {
  constructor() {
    this.pendingRequests = new Map();
    this.requestCache = new Map();
    this.cacheTimeout = 1000; // 1 second cache to prevent duplicate calls
  }

  /**
   * Generate a unique key for a request
   */
  getRequestKey(url, options = {}) {
    const method = options.method || "GET";
    const body = options.body ? JSON.stringify(options.body) : "";
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if a request is already pending
   */
  isPending(key) {
    return this.pendingRequests.has(key);
  }

  /**
   * Mark a request as pending
   */
  markPending(key, promise) {
    this.pendingRequests.set(key, promise);

    // Clean up after request completes
    promise
      .finally(() => {
        this.pendingRequests.delete(key);
      })
      .catch(() => {
        // Ignore errors in cleanup
      });

    return promise;
  }

  /**
   * Get cached response if available
   */
  getCached(key) {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }
    this.requestCache.delete(key);
    return null;
  }

  /**
   * Cache a response
   */
  setCached(key, response) {
    this.requestCache.set(key, {
      response: response.clone(),
      timestamp: Date.now(),
    });
  }

  /**
   * Execute a fetch request with deduplication
   */
  async fetch(url, options = {}) {
    const key = this.getRequestKey(url, options);

    // Check if same request is already pending
    if (this.isPending(key)) {
      return this.pendingRequests.get(key);
    }

    // Check cache for recent identical requests
    const cached = this.getCached(key);
    if (cached) {
      return cached;
    }

    // Execute the request
    const promise = fetch(url, options).then((response) => {
      // Cache successful GET requests
      if (options.method === "GET" || !options.method) {
        this.setCached(key, response);
      }
      return response;
    });

    return this.markPending(key, promise);
  }

  /**
   * Clear all pending requests and cache
   */
  clear() {
    this.pendingRequests.clear();
    this.requestCache.clear();
  }
}

// Singleton instance
const apiRequestManager = new ApiRequestManager();

export default apiRequestManager;
