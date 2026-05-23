/**
 * Enhanced fetch wrapper with request deduplication
 * Prevents multiple simultaneous identical API calls
 * This helps prevent DDoS-like scenarios in production
 */

import apiRequestManager from "./apiRequestManager";

/**
 * Wrapper around fetch that prevents duplicate simultaneous requests
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
export const fetchWithDeduplication = async (url, options = {}) => {
  // Use the API request manager to handle deduplication
  return apiRequestManager.fetch(url, options);
};

/**
 * Default export for convenience
 */
export default fetchWithDeduplication;
