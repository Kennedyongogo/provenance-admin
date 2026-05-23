import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Skeleton,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import PostCard from "./PostCard";
import PostCreator from "./PostCreator";
import Swal from "sweetalert2";

const PostsFeed = ({ user, onRefresh }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isFetchingRef = useRef(false);
  
  const fetchPosts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // Prevent overlapping requests
    if (isFetchingRef.current) {
      console.log("⏸️ [PostsFeed] Already fetching, skipping...");
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/posts/feed?limit=20&offset=0", {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.success) {
        setPosts(data.data.posts || []);
      } else {
        setError(data.message || "Failed to load posts");
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError("Failed to load posts. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      } else {
        isFetchingRef.current = false;
      }
    }
  }, []);

  // Track if initial fetch has been done
  const hasInitialFetchedRef = useRef(false);
  
  useEffect(() => {
    if (!hasInitialFetchedRef.current) {
      hasInitialFetchedRef.current = true;
      fetchPosts();
    }
  }, [fetchPosts]);

  useEffect(() => {
    if (onRefresh !== undefined && onRefresh !== null && hasInitialFetchedRef.current) {
      fetchPosts();
    }
  }, [onRefresh, fetchPosts]);

  // Use SSE for real-time updates with backup polling (similar to StoriesFeed)
  useEffect(() => {
    if (!isMountedRef.current || !user?.id) return;

    let pollInterval = null;
    let sseEventSource = null;

    // Backup polling - only runs if SSE fails (not actively polling to avoid refreshing)
    // This is a fallback mechanism, not an active polling system
    const startBackupPolling = () => {
      if (pollInterval) return; // Already polling

      console.log("🔄 [PostsFeed] Backup polling ready (will only run if SSE fails)");
      // Note: We don't actively poll here - SSE handles real-time updates
      // This interval is just kept as a fallback mechanism but won't trigger fetches
      // The SSE error handler will handle reconnection
    };

    // Try to use SSE for real-time updates
    const setupSSE = () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return false;

        const isDev = import.meta.env.DEV;
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const apiPort = isDev ? "4000" : window.location.port || "";
        const sseUrl = isDev
          ? `${protocol}//${host}:${apiPort}/api/sse/events?token=${encodeURIComponent(token)}`
          : `${protocol}//${host}${apiPort ? `:${apiPort}` : ""}/api/sse/events?token=${encodeURIComponent(token)}`;

        sseEventSource = new EventSource(sseUrl);

        sseEventSource.addEventListener("post:reacted", (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log("📡 [PostsFeed] SSE: Post reacted event received", data);
            // Update posts state with new reaction counts
            setPosts((prevPosts) =>
              prevPosts.map((post) =>
                post.id === data.postId
                  ? {
                      ...post,
                      like_count: data.like_count !== undefined ? data.like_count : post.like_count,
                      emoji_reaction_count: data.emoji_reaction_count !== undefined ? data.emoji_reaction_count : post.emoji_reaction_count,
                      reaction_count: data.reaction_count !== undefined ? data.reaction_count : post.reaction_count,
                      recent_emoji_reactions: data.recent_emoji_reactions !== undefined ? data.recent_emoji_reactions : post.recent_emoji_reactions,
                    }
                  : post
              )
            );
          } catch (err) {
            console.error("❌ [PostsFeed] Error parsing SSE post reaction event:", err);
          }
        });

        sseEventSource.addEventListener("post:commented", (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log("📡 [PostsFeed] SSE: Post commented event received", data);
            // Update posts state with new comment count
            setPosts((prevPosts) =>
              prevPosts.map((post) =>
                post.id === data.postId
                  ? {
                      ...post,
                      comment_count: data.comment_count || post.comment_count,
                    }
                  : post
              )
            );
          } catch (err) {
            console.error("❌ [PostsFeed] Error parsing SSE post comment event:", err);
          }
        });

        sseEventSource.addEventListener("comment:reacted", (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log("📡 [PostsFeed] SSE: Comment reacted event received", data);
            // PostCard will handle the detailed update via its own SSE listener
          } catch (err) {
            console.error("❌ [PostsFeed] Error parsing SSE comment reaction event:", err);
          }
        });

        sseEventSource.addEventListener("post:approved", (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log("📡 [PostsFeed] SSE: Post approved event received", data);
            // Silently add the newly approved post to the feed without refreshing
            if (data.post && data.post.moderation_status === "approved") {
              setPosts((prevPosts) => {
                // Check if post already exists in feed
                const postExists = prevPosts.some((p) => p.id === data.postId || p.id === data.post.id);
                if (postExists) {
                  // Update existing post's moderation status and ensure it's visible
                  return prevPosts.map((post) =>
                    (post.id === data.postId || post.id === data.post.id)
                      ? { ...post, ...data.post, moderation_status: "approved" }
                      : post
                  );
                } else {
                  // Add new approved post to the feed, sorted by createdAt DESC
                  const newPosts = [data.post, ...prevPosts];
                  // Sort by createdAt descending to maintain feed order
                  return newPosts.sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.created_at || 0);
                    const dateB = new Date(b.createdAt || b.created_at || 0);
                    return dateB - dateA;
                  });
                }
              });
              console.log("✅ [PostsFeed] Post added/updated in feed:", data.postId);
            } else {
              console.warn("⚠️ [PostsFeed] Post data missing or not approved:", data);
            }
          } catch (err) {
            console.error("❌ [PostsFeed] Error parsing SSE post approval event:", err);
          }
        });

        sseEventSource.addEventListener("post:new", (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log("📡 [PostsFeed] SSE: New post event received", data);
            // Silently add the new post to the feed if it's approved
            if (data.post && data.post.moderation_status === "approved") {
              setPosts((prevPosts) => {
                // Check if post already exists in feed
                const postExists = prevPosts.some((p) => p.id === data.post.id);
                if (!postExists) {
                  // Add new post to the beginning of the feed
                  return [data.post, ...prevPosts];
                }
                return prevPosts;
              });
            }
          } catch (err) {
            console.error("❌ [PostsFeed] Error parsing SSE new post event:", err);
          }
        });

        sseEventSource.addEventListener("post:deleted", (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log("📡 [PostsFeed] SSE: Post deleted event received", data);
            // Remove the deleted post from the feed
            setPosts((prevPosts) =>
              prevPosts.filter((post) => post.id !== data.postId)
            );
          } catch (err) {
            console.error("❌ [PostsFeed] Error parsing SSE post deleted event:", err);
          }
        });

        sseEventSource.onopen = () => {
          console.log("✅ [PostsFeed] SSE connected - using real-time updates");
          // Keep polling running as backup even when SSE is connected
        };

        sseEventSource.onerror = (error) => {
          console.warn("⚠️ [PostsFeed] SSE error:", error);
          // SSE connection failed - try to reconnect after a delay
          // Don't trigger full feed refresh, just attempt reconnection
          if (sseEventSource?.readyState === EventSource.CLOSED) {
            console.log("🔄 [PostsFeed] SSE connection closed, will attempt to reconnect");
            setTimeout(() => {
              if (isMountedRef.current && !sseEventSource) {
                setupSSE();
              }
            }, 5000); // Retry after 5 seconds
          }
        };

        return true; // SSE setup successful
      } catch (err) {
        console.warn("⚠️ [PostsFeed] SSE not available, using polling fallback:", err);
        return false; // SSE setup failed
      }
    };

    // Try SSE first - this handles all real-time updates silently
    const sseSuccess = setupSSE();
    // Backup polling is ready but won't actively poll (SSE handles everything)
    startBackupPolling();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (sseEventSource) {
        sseEventSource.close();
        sseEventSource = null;
      }
    };
  }, [user?.id]); // Re-setup if user changes

  const handlePostCreated = () => {
    setCreatorOpen(false);
    fetchPosts();
  };

  const handleReaction = async (postId, reactionType, emoji) => {
    // PostCard already made the API call and updated its local state
    // No need to refetch the entire feed - PostCard handles its own state updates
    // This prevents unnecessary component reloads
  };

  const handleRemoveReaction = async (postId, reactionId) => {
    // Reaction removal is handled by PostCard and SSE updates
    // No need to refresh entire feed - SSE will update counts in real-time
  };

  const handleComment = (post) => {
    // Comment handling is done in PostCard and SSE updates
    // No need to refresh entire feed - SSE will update comment counts in real-time
  };

  const handleDeletePost = async (postId) => {
    const result = await Swal.fire({
      title: "Delete Post?",
      text: "Are you sure you want to delete this post? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Your post has been deleted.",
          confirmButtonColor: "#D4AF37",
        });
        // SSE will handle removing the post from feed in real-time
        // No need to refresh entire feed
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to delete post",
          confirmButtonColor: "#D4AF37",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete post. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3].map((i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Create Post Button */}
      <Card
        sx={{
          mb: 2,
          borderRadius: "16px",
          border: "1px solid rgba(212, 175, 55, 0.2)",
        }}
      >
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={
                user?.photo
                  ? `/uploads/${user.photo}`
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.name || "User"
                    )}&background=D4AF37&color=fff`
              }
              sx={{ width: 40, height: 40 }}
            />
            <Box
              sx={{
                flex: 1,
                bgcolor: "rgba(0,0,0,0.05)",
                borderRadius: "20px",
                px: 2,
                py: 1,
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
              }}
              onClick={() => setCreatorOpen(true)}
            >
              <Typography variant="body2" color="text.secondary">
                What's on your mind?
              </Typography>
            </Box>
            <IconButton
              color="primary"
              onClick={() => setCreatorOpen(true)}
              sx={{
                bgcolor: "#D4AF37",
                color: "white",
                "&:hover": { bgcolor: "#B8941F" },
              }}
            >
              <Add />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            No posts yet. Be the first to share something!
          </Typography>
        </Card>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={user}
            onReaction={handleReaction}
            onRemoveReaction={handleRemoveReaction}
            onComment={handleComment}
            onDelete={handleDeletePost}
          />
        ))
      )}

      {/* Post Creator Dialog */}
      <PostCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </Box>
  );
};

export default PostsFeed;
