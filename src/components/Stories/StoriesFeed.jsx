import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Box,
  Avatar,
  Typography,
  CircularProgress,
  IconButton,
  Badge,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { Add, TextFields } from "@mui/icons-material";

// Component to handle story preview images with error fallback
const StoryPreviewImage = ({ src, alt, hasUnviewed, userInitial }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          bgcolor: hasUnviewed ? "#D4AF37" : "rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Avatar
          sx={{
            width: 50,
            height: 50,
            bgcolor: hasUnviewed ? "#1a1a1a" : "rgba(0,0,0,0.3)",
            color: "white",
            fontWeight: 700,
            fontSize: "1.5rem",
          }}
        >
          {userInitial}
        </Avatar>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setImageError(true)}
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
};

const StoriesFeed = ({
  user,
  onStoryClick,
  onCreateStory,
  onStoriesLoaded,
  refreshTrigger,
  onRefresh,
}) => {
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userImageError, setUserImageError] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track if we're currently fetching to avoid overlapping requests during polling
  const isFetchingRef = useRef(false);
  // Track component instance ID for debugging
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Reset fetching flag on unmount
      isFetchingRef.current = false;
    };
  }, []);

  // Store onStoriesLoaded in a ref to prevent unnecessary re-renders
  const onStoriesLoadedRef = useRef(onStoriesLoaded);
  useEffect(() => {
    onStoriesLoadedRef.current = onStoriesLoaded;
  }, [onStoriesLoaded]);

  const fetchStoriesFeed = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!isMountedRef.current) return;

      // Prevent overlapping requests
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      // Only show loading state if it's not a background refresh
      if (!isBackgroundRefresh) {
        setLoading(true);
        setError(null);
      }
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Get user location if available
        const userLat = user?.latitude;
        const userLng = user?.longitude;
        let url = "/api/stories/feed";
        if (userLat && userLng) {
          url += `?latitude=${userLat}&longitude=${userLng}&radius=50`;
        }

        const response = await fetch(url, { headers });
        const data = await response.json();

        if (!isMountedRef.current) return;

        if (data.success) {
          const stories = data.data?.stories || [];

          // Sort stories so current user's story appears first
          const sortedStories = [...stories].sort((a, b) => {
            const aIsCurrentUser = a?.user?.id === user?.id;
            const bIsCurrentUser = b?.user?.id === user?.id;

            // If one is current user and the other isn't, current user comes first
            if (aIsCurrentUser && !bIsCurrentUser) return -1;
            if (!aIsCurrentUser && bIsCurrentUser) return 1;

            // Otherwise maintain original order
            return 0;
          });

          setStoriesFeed(sortedStories);
          if (onStoriesLoadedRef.current && isMountedRef.current) {
            onStoriesLoadedRef.current(sortedStories);
          }
        } else {
          setError(data.message || "Failed to load stories");
          console.error("❌ [StoriesFeed] Error:", data.message);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("💥 [StoriesFeed] Error fetching stories feed:", err);
        setError("Failed to load stories");
      } finally {
        if (isMountedRef.current) {
          // Only update loading state if it's not a background refresh
          if (!isBackgroundRefresh) {
            setLoading(false);
          }
          isFetchingRef.current = false;
        } else {
          isFetchingRef.current = false;
        }
      }
    },
    [user?.latitude, user?.longitude, user?.id]
  );

  // Store the latest fetchStoriesFeed in a ref to avoid dependency issues
  const fetchStoriesFeedRef = useRef(fetchStoriesFeed);
  useEffect(() => {
    fetchStoriesFeedRef.current = fetchStoriesFeed;
  }, [fetchStoriesFeed]);

  // Expose refresh function to parent via callback
  useEffect(() => {
    if (onRefresh) {
      onRefresh(() => {
        fetchStoriesFeedRef.current();
      });
    }
  }, [onRefresh]);

  // Initial fetch - only run once per component instance
  // Note: In development with StrictMode, React intentionally mounts components twice
  // This will cause 2 requests, which is expected and normal behavior
  const hasInitialFetchedRef = useRef(false);
  useEffect(() => {
    if (
      isMountedRef.current &&
      !hasInitialFetchedRef.current &&
      !isFetchingRef.current
    ) {
      hasInitialFetchedRef.current = true;
      fetchStoriesFeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Poll for story updates (replaces SSE for better performance)
  useEffect(() => {
    if (!isMountedRef.current || !user?.id) return;

    let pollInterval = null;

    // Poll every 30 seconds - checks for new stories and approvals
    const startPolling = () => {
      if (pollInterval) return; // Already polling

      pollInterval = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(pollInterval);
          return;
        }

        // Only poll if page is visible (don't waste resources on hidden tabs)
        if (document.hidden) {
          return;
        }

        // Only refresh if not currently fetching
        if (!isFetchingRef.current) {
          fetchStoriesFeedRef.current(true);
        }
      }, 30000); // 30 seconds - to catch new stories and approvals
    };

    // Start polling after initial load (delayed to avoid blocking)
    const timeoutId = setTimeout(() => {
      startPolling();
    }, 2000); // Wait 2 seconds after mount before starting to poll

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user?.id]); // Re-setup if user changes

  // Track previous refreshTrigger value to detect when creator closes
  const prevRefreshTriggerRef = useRef(refreshTrigger);

  // Refresh feed when story creator closes (after creating a story)
  useEffect(() => {
    if (!isMountedRef.current) return;

    // If creator was open (true) and now closed (false), refresh the feed
    if (prevRefreshTriggerRef.current === true && refreshTrigger === false) {
      // Small delay to ensure backend has processed the new story
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;
        setUserImageError(false); // Reset image error state
        // Use ref to get latest function without causing re-renders
        // Pass true for background refresh since user just created the story
        fetchStoriesFeedRef.current(true);
      }, 500);

      prevRefreshTriggerRef.current = refreshTrigger;
      return () => {
        clearTimeout(timer);
      };
    }

    prevRefreshTriggerRef.current = refreshTrigger;
  }, [refreshTrigger]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/")) return imagePath;
    // Handle stories path format: "stories/filename.jpg" -> "/uploads/stories/filename.jpg"
    if (imagePath.startsWith("stories/")) return `/uploads/${imagePath}`;
    if (imagePath.startsWith("uploads/")) return `/${imagePath}`;
    if (imagePath.startsWith("profiles/")) return `/uploads/${imagePath}`;
    return `/uploads/${imagePath}`;
  };

  const getStoryPreview = (stories) => {
    if (!stories || stories.length === 0) return null;
    const firstStory = stories[0];
    if (!firstStory) return null;
    // For text stories, media_url is null, so return null to show text preview
    if (firstStory.media_type === "text") return null;
    if (!firstStory.media_url) return null;
    return getImageUrl(firstStory.media_url);
  };

  const getStoryType = (stories) => {
    if (!stories || stories.length === 0) return null;
    const firstStory = stories[0];
    return firstStory?.media_type || null;
  };

  const hasUnviewedStories = (stories) => {
    return stories?.some((story) => !story.has_viewed) || false;
  };

  // Always show the section with "Your Story" button, even during loading
  // Use useMemo to prevent unnecessary re-renders of the JSX
  return (
    <Box
      sx={{
        mb: 0,
        px: { xs: 0, sm: 0 },
        // Fixed height to prevent layout shift during loading
        minHeight: "180px", // Height of story item (140px) + gap + text + padding
        height: "180px",
        display: "flex",
        alignItems: "flex-start",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          overflowY: "hidden", // Prevent vertical overflow
          pb: 1,
          pt: 0,
          width: "100%",
          alignItems: "flex-start",
          boxSizing: "border-box",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            height: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(0,0,0,0.05)",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(212, 175, 55, 0.5)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(212, 175, 55, 0.7)",
            },
          },
        }}
      >
        {/* Create Story Button - Always visible */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 1,
              minWidth: 100,
              maxWidth: 100,
              flexShrink: 0,
              height: "100%",
            }}
          >
            <Skeleton
              variant="rectangular"
              width={100}
              height={140}
              sx={{
                borderRadius: "12px",
                flexShrink: 0,
              }}
            />
            <Skeleton
              width={60}
              height={16}
              sx={{
                flexShrink: 0,
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 1,
              minWidth: 100,
              maxWidth: 100,
              flexShrink: 0,
              height: "100%",
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
              "&:hover": {
                opacity: 0.9,
                "& .story-preview": {
                  transform: "scale(1.02)",
                },
              },
              "&:active": {
                transform: "scale(0.98)",
              },
            }}
            onClick={() => {
              if (onCreateStory) {
                onCreateStory();
              }
            }}
          >
            <Box
              className="story-preview"
              sx={{
                position: "relative",
                width: 100,
                height: 140,
                borderRadius: "12px",
                overflow: "hidden",
                border: "2px solid #D4AF37",
                bgcolor: "#D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(212, 175, 55, 0.3)",
              }}
            >
              {user?.photo && !userImageError ? (
                <Box
                  component="img"
                  src={getImageUrl(user.photo)}
                  alt="Your story"
                  onError={() => {
                    setUserImageError(true);
                  }}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <Typography
                  sx={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() ||
                    user?.username?.charAt(0)?.toUpperCase() ||
                    "U"}
                </Typography>
              )}
              {/* Plus icon overlay */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: "#D4AF37",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <Add sx={{ fontSize: 18, color: "#1a1a1a", fontWeight: 700 }} />
              </Box>
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.7rem",
                color: "rgba(26, 26, 26, 0.8)",
                textAlign: "center",
                width: "100%",
                fontWeight: 600,
                mt: 0.5,
              }}
            >
              Your Story
            </Typography>
          </Box>
        )}

        {/* Story Items Skeleton Loading */}
        {loading &&
          Array.from({ length: 5 }).map((_, index) => (
            <Box
              key={`skeleton-${index}`}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1,
                minWidth: 100,
                maxWidth: 100,
                flexShrink: 0,
                // Match exact height of actual story items
                height: "100%",
              }}
            >
              <Skeleton
                variant="rectangular"
                width={100}
                height={140}
                sx={{
                  borderRadius: "12px",
                  flexShrink: 0,
                }}
              />
              <Skeleton
                width={60}
                height={16}
                sx={{
                  flexShrink: 0,
                }}
              />
            </Box>
          ))}

        {/* Story Items */}
        {!loading &&
          storiesFeed &&
          Array.isArray(storiesFeed) &&
          storiesFeed.length > 0 &&
          storiesFeed
            .filter((storyGroup) => {
              return (
                storyGroup &&
                storyGroup.user &&
                storyGroup.user.id &&
                storyGroup.stories &&
                Array.isArray(storyGroup.stories) &&
                storyGroup.stories.length > 0
              );
            })
            .map((storyGroup) => {
              const preview = getStoryPreview(storyGroup.stories);
              const storyType = getStoryType(storyGroup.stories);
              const hasUnviewed = hasUnviewedStories(storyGroup.stories);
              const storyCount = storyGroup.stories?.length || 0;
              const userId = storyGroup.user?.id;
              const isTextStory = storyType === "text";

              return (
                <Box
                  key={`story-group-${userId}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 1,
                    minWidth: 100,
                    maxWidth: 100,
                    flexShrink: 0,
                    height: "100%",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      opacity: 0.9,
                      "& .story-item-preview": {
                        transform: "scale(1.02)",
                      },
                    },
                    "&:active": {
                      transform: "scale(0.98)",
                    },
                  }}
                  onClick={() => onStoryClick(storyGroup)}
                >
                  <Box
                    className="story-item-preview"
                    sx={{
                      position: "relative",
                      width: 100,
                      height: 140,
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: hasUnviewed
                        ? "2px solid #D4AF37"
                        : "2px solid rgba(0,0,0,0.2)",
                      transition: "all 0.2s ease",
                      boxShadow: hasUnviewed
                        ? "0 2px 8px rgba(212, 175, 55, 0.3)"
                        : "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    {isTextStory ? (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          background:
                            (storyGroup.stories?.[0]?.metadata &&
                              typeof storyGroup.stories[0].metadata ===
                                "object" &&
                              storyGroup.stories[0].metadata
                                .background_color) ||
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 1,
                          gap: 0.5,
                        }}
                      >
                        <TextFields
                          sx={{ fontSize: 32, color: "white", opacity: 0.9 }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: "white",
                            fontSize: "0.6rem",
                            textAlign: "center",
                            fontWeight: 600,
                            textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            lineHeight: 1.2,
                          }}
                        >
                          {storyGroup.stories?.[0]?.caption?.substring(0, 30) ||
                            "Text Story"}
                          {storyGroup.stories?.[0]?.caption?.length > 30
                            ? "..."
                            : ""}
                        </Typography>
                      </Box>
                    ) : preview ? (
                      <StoryPreviewImage
                        src={preview}
                        alt={storyGroup.user?.name || "Story"}
                        hasUnviewed={hasUnviewed}
                        userInitial={
                          storyGroup.user?.name?.charAt(0)?.toUpperCase() || "U"
                        }
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          bgcolor: hasUnviewed ? "#D4AF37" : "rgba(0,0,0,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Avatar
                          src={getImageUrl(storyGroup.user?.photo)}
                          sx={{
                            width: 50,
                            height: 50,
                            bgcolor: "transparent",
                          }}
                        >
                          {storyGroup.user?.name?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </Avatar>
                      </Box>
                    )}
                    {/* Story count badge */}
                    {storyCount > 1 && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          bgcolor: "#D4AF37",
                          color: "#1a1a1a",
                          borderRadius: "12px",
                          px: 1,
                          py: 0.25,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          border: "1px solid white",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        {storyCount}
                      </Box>
                    )}
                    {/* Unviewed indicator */}
                    {hasUnviewed && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "#D4AF37",
                          border: "2px solid white",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.7rem",
                      color: "rgba(26, 26, 26, 0.8)",
                      textAlign: "center",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: hasUnviewed ? 600 : 400,
                      mt: 0.5,
                    }}
                  >
                    {storyGroup.user?.id === user?.id
                      ? storyGroup.user?.name ||
                        storyGroup.user?.username ||
                        "You"
                      : storyGroup.user?.username ||
                        storyGroup.user?.name ||
                        "User"}
                  </Typography>
                </Box>
              );
            })}
      </Box>
    </Box>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(StoriesFeed);
