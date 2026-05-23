import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Server-Sent Events (SSE) Hook
 *
 * One-directional: Server sends events to client
 * Simpler than WebSockets, perfect for status updates, notifications, etc.
 *
 * @param {Object} options
 * @param {string} options.url - SSE endpoint URL
 * @param {string} options.token - Authentication token
 * @param {boolean} options.enabled - Whether to connect
 * @param {Object} options.eventHandlers - Map of event names to handler functions
 * @returns {Object} { isConnected, close }
 */
const useServerSentEvents = ({
  url,
  token,
  enabled = true,
  eventHandlers = {},
}) => {
  const eventSourceRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef(eventHandlers);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Update handlers ref when eventHandlers change
  useEffect(() => {
    handlersRef.current = eventHandlers;
  }, [eventHandlers]);

  const connect = useCallback(() => {
    if (!enabled || !url || !token) {
      return;
    }

    // Don't reconnect if already connected to the same URL
    if (
      eventSourceRef.current &&
      eventSourceRef.current.readyState === EventSource.OPEN
    ) {
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Create EventSource with authentication
      // Note: EventSource doesn't support custom headers, so we pass token as query param
      // Backend should validate this token
      const eventSourceUrl = `${url}?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(eventSourceUrl);

      eventSourceRef.current = eventSource;

      // Add connection timeout to prevent hanging connections (15 seconds)
      let connectionTimeout = null;
      connectionTimeout = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.warn("[SSE] Connection timeout after 15s - closing connection");
          eventSource.close();
          setIsConnected(false);
          // Stop reconnection attempts if connection times out
          reconnectAttemptsRef.current = maxReconnectAttempts + 1;
        }
      }, 15000);

      // Store timeout reference on eventSource for cleanup
      eventSource._connectionTimeout = connectionTimeout;

      eventSource.onopen = () => {
        // Clear connection timeout on successful connection
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
          if (eventSource._connectionTimeout) {
            eventSource._connectionTimeout = null;
          }
        }
        console.log("[SSE] Connected successfully");
        // Reset error flags on successful connection
        if (eventSourceRef.current) {
          eventSourceRef.current._connectionErrorLogged = false;
          eventSourceRef.current._retryStopped = false;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      eventSource.onerror = (error) => {
        const readyState = eventSource.readyState;

        // EventSource states:
        // 0 = CONNECTING
        // 1 = OPEN
        // 2 = CLOSED

        if (readyState === EventSource.CONNECTING) {
          // Still trying to connect - this is normal during initial connection
          // Don't log errors during initial connection attempts
          setIsConnected(false);
          return;
        }

        if (readyState === EventSource.CLOSED) {
          // Clear connection timeout if connection closed
          if (eventSource._connectionTimeout) {
            clearTimeout(eventSource._connectionTimeout);
            eventSource._connectionTimeout = null;
          }
          // Connection was closed (either failed to connect or lost connection)
          setIsConnected(false);

          // Check if this is a connection failure (backend not ready)
          const isConnectionFailure = reconnectAttemptsRef.current === 0;

          if (isConnectionFailure) {
            // First connection attempt failed - backend probably not ready
            if (!eventSourceRef.current._connectionErrorLogged) {
              console.warn(
                "[SSE] Backend SSE endpoint not available yet. " +
                  "This is expected if the backend hasn't implemented SSE yet. " +
                  "See BACKEND-SSE-SETUP.md for implementation guide."
              );
              eventSourceRef.current._connectionErrorLogged = true;
            }
          }

          reconnectAttemptsRef.current++;

          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000
            ); // Exponential backoff, max 30s

            if (!isConnectionFailure) {
              // Only log reconnection attempts if connection was previously established
              console.log(
                `[SSE] Connection lost. Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
              );
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            if (!eventSourceRef.current._retryStopped) {
              console.warn(
                "[SSE] Max reconnection attempts reached. Stopping. " +
                  "Backend SSE endpoint needs to be implemented. " +
                  "See BACKEND-SSE-SETUP.md for setup instructions."
              );
              eventSourceRef.current._retryStopped = true;
            }
          }
        } else {
          // Other error states - log for debugging
          console.error("[SSE] Connection error:", {
            readyState,
            url: eventSourceUrl,
            error: error.type || "Unknown error",
          });
          setIsConnected(false);
        }
      };

      // Register event handlers dynamically
      Object.keys(handlersRef.current).forEach((eventName) => {
        eventSource.addEventListener(eventName, (event) => {
          const handler = handlersRef.current[eventName];
          if (handler && typeof handler === "function") {
            try {
              const data = event.data ? JSON.parse(event.data) : {};
              handler(data);
            } catch (err) {
              console.error(
                `[SSE] Error parsing event data for ${eventName}:`,
                err
              );
              // Still call handler with raw data if parsing fails
              handler(event.data);
            }
          }
        });
      });

      // Handle generic 'message' event (if backend sends without event type)
      eventSource.addEventListener("message", (event) => {
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          // Try to find a handler for the event type in the data
          if (data.type && handlersRef.current[data.type]) {
            handlersRef.current[data.type](data);
          }
        } catch (err) {
          console.error("[SSE] Error handling message event:", err);
        }
      });
    } catch (error) {
      console.error("[SSE] Failed to create EventSource:", error);
      setIsConnected(false);
    }
  }, [enabled, url, token]);

  useEffect(() => {
    // Only connect if enabled and we have required params
    if (!enabled || !url || !token) {
      return;
    }

    connect();

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        // Clear connection timeout if still pending
        if (eventSourceRef.current._connectionTimeout) {
          clearTimeout(eventSourceRef.current._connectionTimeout);
          eventSourceRef.current._connectionTimeout = null;
        }
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
    // Depend on actual values, not the connect function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url, token]);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    close,
    eventSource: eventSourceRef.current,
  };
};

export default useServerSentEvents;
