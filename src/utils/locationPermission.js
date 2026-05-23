/**
 * Utility for managing location permissions
 * Requests permission once on landing page and stores state to avoid re-prompting
 */

const LOCATION_PERMISSION_KEY = "locationPermissionRequested";

/**
 * Check if location permission has already been requested
 */
export const hasLocationPermissionBeenRequested = () => {
  return localStorage.getItem(LOCATION_PERMISSION_KEY) === "true";
};

/**
 * Mark that location permission has been requested
 */
export const markLocationPermissionRequested = () => {
  localStorage.setItem(LOCATION_PERMISSION_KEY, "true");
};

/**
 * Check current location permission status
 * Returns a Promise that resolves to: 'granted', 'denied', 'prompt', or 'unsupported'
 */
export const getLocationPermissionStatus = () => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve("unsupported");
  }

  if (navigator.permissions && navigator.permissions.query) {
    // Modern browsers support permissions API
    return navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        return result.state; // 'granted', 'denied', or 'prompt'
      })
      .catch(() => {
        // Fallback if permissions API fails
        return "prompt";
      });
  }

  // Fallback for browsers without permissions API
  return Promise.resolve("prompt");
};

/**
 * Request location permission (triggers browser prompt)
 * Only requests if permission hasn't been requested before
 */
export const requestLocationPermission = () => {
  return new Promise((resolve, reject) => {
    // Check if we've already requested permission
    if (hasLocationPermissionBeenRequested()) {
      // Permission was already requested, just check current status
      getLocationPermissionStatus()
        .then((status) => {
          if (status === "granted") {
            resolve({ granted: true, alreadyRequested: true });
          } else {
            resolve({ granted: false, alreadyRequested: true, status });
          }
        })
        .catch(() => {
          resolve({ granted: false, alreadyRequested: true });
        });
      return;
    }

    // First time requesting - check browser support
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    // Mark that we've requested permission
    markLocationPermissionRequested();

    // Request permission by calling getCurrentPosition
    // This will trigger the browser's permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          granted: true,
          alreadyRequested: false,
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      (error) => {
        const status =
          error.code === 1 ? "denied" : error.code === 2 ? "unavailable" : "timeout";
        resolve({
          granted: false,
          alreadyRequested: false,
          status,
          error: error.message,
        });
      },
      {
        enableHighAccuracy: false, // Use less accurate for permission request
        timeout: 5000,
        maximumAge: 60000, // Accept cached location for permission check
      }
    );
  });
};

