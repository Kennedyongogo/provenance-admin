import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  Box,
  Chip,
  Button,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  ThumbUp,
  Comment,
  Share,
  Favorite,
  MoreVert,
  Delete,
  Verified,
  LocationOn,
  EmojiEmotions,
  Send,
  Close,
  ContentCopy,
  Facebook,
  Twitter,
  WhatsApp,
  Telegram,
  Link as LinkIcon,
} from "@mui/icons-material";
import EmojiPicker from "../EmojiPicker/EmojiPicker";
import Swal from "sweetalert2";

const PostCard = ({
  post,
  currentUser,
  onReaction,
  onRemoveReaction,
  onComment,
  onDelete,
}) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [emojiReactionsOpen, setEmojiReactionsOpen] = useState(false);
  const [loadingEmojiReactions, setLoadingEmojiReactions] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState({});
  const [postDetails, setPostDetails] = useState({
    ...post,
    user_reaction: post.user_reaction || null,
    reaction_count: Number(post.reaction_count || 0),
    like_count: Number(post.like_count || 0),
    emoji_reaction_count: Number(post.emoji_reaction_count || 0),
    comment_count: Number(post.comment_count || 0),
    share_count: Number(post.share_count || 0),
    recent_emoji_reactions: post.recent_emoji_reactions || [],
  });
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const sseEventSourceRef = React.useRef(null);
  const [selectedEmojis, setSelectedEmojis] = useState([]); // Emojis selected but not yet sent
  const [flyingEmojis, setFlyingEmojis] = useState([]); // For animation
  const emojiButtonRef = React.useRef(null);

  const isOwner = currentUser && post.user?.id === currentUser.id;
  const isApproved = post.moderation_status === "approved";

  // Update postDetails when post prop changes
  // But don't overwrite if we just updated locally (within last 2 seconds)
  useEffect(() => {
    const now = Date.now();
    // Only update from prop if we haven't recently updated locally
    if (now - lastUpdateTime < 2000) {
      return;
    }

    const updatedDetails = {
      ...post,
      user_reaction: post.user_reaction || null,
      reaction_count: Number(post.reaction_count || 0),
      like_count: Number(post.like_count || 0),
      emoji_reaction_count: Number(post.emoji_reaction_count || 0),
      comment_count: Number(post.comment_count || 0),
      share_count: Number(post.share_count || 0),
      recent_emoji_reactions: post.recent_emoji_reactions || [],
    };
    setPostDetails(updatedDetails);
    
    // Clear selected emojis when post changes
    setSelectedEmojis([]);
    setEmojiPickerOpen(false);
  }, [post, lastUpdateTime]);

  // Set up SSE connection for real-time updates on this specific post
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const isDev = import.meta.env.DEV;
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const apiPort = isDev ? "4000" : window.location.port || "";
      const sseUrl = isDev
        ? `${protocol}//${host}:${apiPort}/api/sse/events?token=${encodeURIComponent(token)}`
        : `${protocol}//${host}${apiPort ? `:${apiPort}` : ""}/api/sse/events?token=${encodeURIComponent(token)}`;

      // Only create one SSE connection per component instance
      if (sseEventSourceRef.current) {
        return; // Already connected
      }

      console.log("🔌 [PostCard] Setting up SSE connection for real-time updates");
      sseEventSourceRef.current = new EventSource(sseUrl);

      // Listen for post reaction updates
      const handlePostReacted = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only update if it's for this post
          if (data.postId === post.id) {
            console.log("📡 [PostCard] SSE: Post reacted event received", data);
            setPostDetails((prev) => ({
              ...prev,
              like_count: data.like_count !== undefined ? data.like_count : prev.like_count,
              emoji_reaction_count: data.emoji_reaction_count !== undefined ? data.emoji_reaction_count : prev.emoji_reaction_count,
              reaction_count: data.reaction_count !== undefined ? data.reaction_count : prev.reaction_count,
              recent_emoji_reactions: data.recent_emoji_reactions !== undefined ? data.recent_emoji_reactions : prev.recent_emoji_reactions,
            }));
            setLastUpdateTime(Date.now());
          }
        } catch (err) {
          console.error("❌ [PostCard] Error parsing SSE post reaction event:", err);
        }
      };

      // Listen for post comment updates
      const handlePostCommented = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only update if it's for this post
          if (data.postId === post.id) {
            console.log("📡 [PostCard] SSE: Post commented event received", data);
            // Silently update comment count in state - no component refresh
            setPostDetails((prev) => ({
              ...prev,
              comment_count: data.comment_count !== undefined ? data.comment_count : prev.comment_count,
            }));
            setLastUpdateTime(Date.now());
            
            // If comments dialog is open and comment was deleted, update comments list
            // For new comments, user will see them when they interact or we can enhance backend later
            if (commentsOpen && data.deleted && data.commentId) {
              // Remove deleted comment from state without fetching
              setPostDetails((prev) => ({
                ...prev,
                comments: prev.comments?.filter((c) => c.id !== data.commentId) || [],
              }));
            }
          }
        } catch (err) {
          console.error("❌ [PostCard] Error parsing SSE post comment event:", err);
        }
      };

      // Listen for comment reaction updates
      const handleCommentReacted = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only update if it's for this post
          if (data.postId === post.id) {
            console.log("📡 [PostCard] SSE: Comment reacted event received", data);
            // Silently update comment reaction count in state - no component refresh
            setPostDetails((prev) => {
              const updatedComments = prev.comments?.map((comment) => {
                // Update main comment
                if (comment.id === data.commentId) {
                  return {
                    ...comment,
                    reaction_count: data.reaction_count !== undefined ? data.reaction_count : comment.reaction_count,
                  };
                }
                // Update reply if it's a reply
                if (comment.replies) {
                  const updatedReplies = comment.replies.map((reply) =>
                    reply.id === data.commentId
                      ? {
                          ...reply,
                          reaction_count: data.reaction_count !== undefined ? data.reaction_count : reply.reaction_count,
                        }
                      : reply
                  );
                  return { ...comment, replies: updatedReplies };
                }
                return comment;
              });
              
              return {
                ...prev,
                comments: updatedComments || prev.comments,
              };
            });
            setLastUpdateTime(Date.now());
          }
        } catch (err) {
          console.error("❌ [PostCard] Error parsing SSE comment reaction event:", err);
        }
      };

      // Listen for post share updates
      const handlePostShared = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only update if it's for this post
          if (data.postId === post.id) {
            console.log("📡 [PostCard] SSE: Post shared event received", data);
            setPostDetails((prev) => ({
              ...prev,
              share_count: data.share_count !== undefined ? data.share_count : prev.share_count,
            }));
            setLastUpdateTime(Date.now());
          }
        } catch (err) {
          console.error("❌ [PostCard] Error parsing SSE post share event:", err);
        }
      };

      sseEventSourceRef.current.addEventListener("post:reacted", handlePostReacted);
      sseEventSourceRef.current.addEventListener("post:commented", handlePostCommented);
      sseEventSourceRef.current.addEventListener("comment:reacted", handleCommentReacted);
      sseEventSourceRef.current.addEventListener("post:shared", handlePostShared);

      sseEventSourceRef.current.onopen = () => {
        console.log("✅ [PostCard] SSE connection opened for post", post.id);
      };

      sseEventSourceRef.current.onerror = (error) => {
        console.warn("⚠️ [PostCard] SSE error:", error);
        if (sseEventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log("🔄 [PostCard] SSE connection closed");
          sseEventSourceRef.current = null;
        }
      };
    } catch (err) {
      console.warn("⚠️ [PostCard] SSE not available:", err);
    }

    // Cleanup: close SSE connection when component unmounts
    return () => {
      if (sseEventSourceRef.current) {
        console.log("🔌 [PostCard] Closing SSE connection");
        sseEventSourceRef.current.close();
        sseEventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]); // Re-setup if post ID changes (commentsOpen is checked inside handlers, not needed in deps)

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const handleReaction = async (reactionType, emoji) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Login Required",
          text: "Please login to react to posts",
          confirmButtonColor: "#D4AF37",
        });
        return;
      }

      const response = await fetch(`/api/posts/${post.id}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reaction_type: reactionType,
          emoji: emoji || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to add reaction";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorMessage,
          confirmButtonColor: "#D4AF37",
        });
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Update counts immediately from response if available
        if (data.data) {
          setPostDetails((prev) => {
            const updates = { ...prev };

            // Update like_count if provided (ensure it's never negative)
            if (
              data.data.like_count !== undefined &&
              data.data.like_count !== null
            ) {
              updates.like_count = Math.max(0, Number(data.data.like_count));
            }

            // Update emoji_reaction_count if provided
            if (
              data.data.emoji_reaction_count !== undefined &&
              data.data.emoji_reaction_count !== null
            ) {
              updates.emoji_reaction_count = Number(
                data.data.emoji_reaction_count
              );
            }

            // Update reaction_count if provided
            if (
              data.data.reaction_count !== undefined &&
              data.data.reaction_count !== null
            ) {
              updates.reaction_count = Number(data.data.reaction_count);
            }

            // If like was removed, clear user_reaction
            if (data.data.removed && reactionType === "like") {
              updates.user_reaction = null;
            } else if (data.data.user_reaction && reactionType === "like") {
              // If like was added, set user_reaction
              updates.user_reaction = data.data.user_reaction;
            } else if (data.data.reaction && reactionType === "like") {
              // Fallback: use reaction if user_reaction not provided
              updates.user_reaction = data.data.reaction;
            }

            setLastUpdateTime(Date.now());
            return updates;
          });
        }
        // SSE handles feed updates - no need to notify parent
        // Local state is already updated above
      }
    } catch (err) {
      // Error adding reaction
    }
  };

  const handleOpenEmojiPicker = (event) => {
    setEmojiAnchor(event.currentTarget);
    setEmojiPickerOpen(true);
    // Store button ref for animation target
    emojiButtonRef.current = event.currentTarget;
  };

  // Handle emoji selection - add to selected array with animation
  const handleEmojiSelect = (emoji, clickPosition = null) => {
    if (!emoji) return;

    // Add emoji to selected array
    setSelectedEmojis((prev) => [...prev, emoji]);

    // Trigger flying animation if click position provided
    if (clickPosition && emojiButtonRef.current) {
      const buttonRect = emojiButtonRef.current.getBoundingClientRect();
      const targetX = buttonRect.left + buttonRect.width / 2;
      const targetY = buttonRect.top + buttonRect.height / 2;

      const flyingEmoji = {
        id: Date.now() + Math.random(),
        emoji,
        startX: clickPosition.x,
        startY: clickPosition.y,
        targetX,
        targetY,
      };

      setFlyingEmojis((prev) => [...prev, flyingEmoji]);

      // Remove flying emoji after animation completes
      setTimeout(() => {
        setFlyingEmojis((prev) =>
          prev.filter((e) => e.id !== flyingEmoji.id)
        );
      }, 600);
    }

    // Update reaction state to show the most recent emoji
    setPostDetails((prev) => ({
      ...prev,
      user_reaction: { reaction_type: "emoji", emoji },
    }));
  };

  // Close emoji picker dialog
  const handleEmojiPickerClose = () => {
    setEmojiPickerOpen(false);
    setEmojiAnchor(null);
    // selectedEmojis will be sent via useEffect when picker closes
  };

  // Send all selected emojis as one reaction when dialog closes
  useEffect(() => {
    if (!emojiPickerOpen && selectedEmojis.length > 0) {
      const sendEmojisAsOneReaction = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
          setSelectedEmojis([]);
          return;
        }

        try {
          console.log("📤 [PostCard] Sending emojis as one reaction:", selectedEmojis);
          
          // Send all emojis as one reaction
          const response = await fetch(`/api/posts/${post.id}/reactions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reaction_type: "emoji",
              emojis: selectedEmojis, // Send as array
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to send reaction");
          }

          const data = await response.json();

          if (data.success && data.data) {
            // Update counts from response
            setPostDetails((prev) => ({
              ...prev,
              emoji_reaction_count: data.data.emoji_reaction_count !== undefined 
                ? data.data.emoji_reaction_count 
                : prev.emoji_reaction_count,
              reaction_count: data.data.reaction_count !== undefined 
                ? data.data.reaction_count 
                : prev.reaction_count,
            }));
            setLastUpdateTime(Date.now());
          }

          // Clear selected emojis after sending
          setSelectedEmojis([]);
        } catch (err) {
          console.error("Error sending emoji reactions:", err);
          setSelectedEmojis([]); // Clear even on error
        }
      };

      sendEmojisAsOneReaction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiPickerOpen]);

  const handleLike = () => {
    // For likes, backend handles toggle - just call handleReaction
    // Backend will check if user already liked and remove it if so
    handleReaction("like");
  };

  const fetchPostDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/posts/${post.id}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      if (data.success && data.data.post) {
        const updatedPost = data.data.post;
        const newDetails = {
          ...updatedPost,
          user_reaction: updatedPost.user_reaction || null,
          like_count: Number(updatedPost.like_count || 0),
          emoji_reaction_count: Number(updatedPost.emoji_reaction_count || 0),
          comment_count: Number(updatedPost.comment_count || 0),
          share_count: Number(updatedPost.share_count || 0),
          recent_emoji_reactions: updatedPost.recent_emoji_reactions || [],
        };
        setPostDetails(newDetails);
      }
    } catch (err) {
      // Error fetching post details
    }
  };

  const handleViewComments = async () => {
    setCommentsOpen(true);
    setLoadingComments(true);
    try {
      await fetchPostDetails();
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (parentCommentId = null, event) => {
    // Prevent form submission if called from a form
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const textToSubmit = parentCommentId ? replyText : commentText;
    if (!textToSubmit.trim() || submittingComment) return;

    try {
      if (parentCommentId) {
        setSubmittingReply((prev) => ({ ...prev, [parentCommentId]: true }));
      } else {
        setSubmittingComment(true);
      }
      const token = localStorage.getItem("token");
      if (!token) {
        // Reset submitting state before returning
        if (parentCommentId) {
          setSubmittingReply((prev) => ({ ...prev, [parentCommentId]: false }));
        } else {
          setSubmittingComment(false);
        }
        Swal.fire({
          icon: "error",
          title: "Login Required",
          text: "Please login to comment",
          confirmButtonColor: "#D4AF37",
          zIndex: 1400, // Higher than Material-UI Dialog (1300)
        });
        return;
      }

      console.log("📝 [PostCard] Submitting comment:", {
        postId: post.id,
        content: textToSubmit.trim().substring(0, 50),
        parentCommentId,
      });

      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: textToSubmit.trim(),
          parent_comment_id: parentCommentId || null,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = "Failed to add comment";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success) {
        // Close comments dialog before showing success alert
        setCommentsOpen(false);
        setReplyingTo(null);
        
        // Clear form fields
        if (parentCommentId) {
          setReplyText("");
        } else {
          setCommentText("");
        }
        
        // Optimistically update comment count - SSE will sync the actual data
        setPostDetails((prev) => ({
          ...prev,
          comment_count: (prev.comment_count || 0) + 1,
        }));
        
        // Show success alert after closing dialog
        Swal.fire({
          icon: "success",
          title: parentCommentId ? "Reply posted!" : "Comment posted!",
          text: parentCommentId 
            ? "Your reply has been posted successfully" 
            : "Your comment has been posted successfully",
          confirmButtonColor: "#D4AF37",
          timer: 2000,
          showConfirmButton: false,
        });
        
        // Don't call onComment - SSE handles feed updates
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to add comment",
          confirmButtonColor: "#D4AF37",
          zIndex: 1400, // Higher than Material-UI Dialog (1300)
        });
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to add comment. Please try again.",
        confirmButtonColor: "#D4AF37",
        zIndex: 1400, // Higher than Material-UI Dialog (1300)
      });
    } finally {
      if (parentCommentId) {
        setSubmittingReply((prev) => ({ ...prev, [parentCommentId]: false }));
      } else {
        setSubmittingComment(false);
      }
    }
  };

  const handleCommentReaction = async (
    commentId,
    reactionType = "like",
    emoji = null
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Login Required",
          text: "Please login to react",
          confirmButtonColor: "#D4AF37",
        });
        return;
      }

      const comment =
        postDetails.comments?.find((c) => c.id === commentId) ||
        postDetails.comments
          ?.flatMap((c) => c.replies || [])
          .find((r) => r.id === commentId);

      if (comment?.user_reaction) {
        // Remove reaction
        const reactionId = comment.user_reaction.id;
        const response = await fetch(
          `/api/posts/comments/${commentId}/reactions/${reactionId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          // Optimistically update - SSE will sync the actual data
          // Only refetch if comments dialog is open to show updated reactions
          if (commentsOpen) {
            await fetchPostDetails();
          }
        }
      } else {
        // Add reaction
        const response = await fetch(
          `/api/posts/comments/${commentId}/reactions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              reaction_type: reactionType,
              emoji: emoji,
            }),
          }
        );

        if (response.ok) {
          // Optimistically update - SSE will sync the actual data
          // Only refetch if comments dialog is open to show updated reactions
          if (commentsOpen) {
            await fetchPostDetails();
          }
        }
      }
    } catch (err) {
      // Error toggling comment reaction
    }
  };

  const handleViewLikes = async () => {
    setLikesOpen(true);
    await fetchPostDetails();
  };

  const handleViewEmojiReactions = async () => {
    setEmojiReactionsOpen(true);
    setLoadingEmojiReactions(true);
    try {
      await fetchPostDetails();
    } finally {
      setLoadingEmojiReactions(false);
    }
  };

  const getMediaUrl = () => {
    if (!post.media_url) return null;
    if (post.media_url.startsWith("http")) return post.media_url;
    return `/uploads/${post.media_url}`;
  };

  const getPostUrl = () => {
    const baseUrl = window.location.origin;
    // Use the post detail page route for proper link previews
    return `${baseUrl}/post/${post.id}`;
  };

  const trackShare = async (shareType) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch(`/api/posts/${post.id}/share`, {
        method: "POST",
        headers,
        body: JSON.stringify({ share_type: shareType }),
      });

      // Optimistically update share count
      setPostDetails((prev) => ({
        ...prev,
        share_count: (prev.share_count || 0) + 1,
      }));
    } catch (err) {
      console.error("Error tracking share:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const postUrl = getPostUrl();
      await navigator.clipboard.writeText(postUrl);
      await trackShare("link");
      setShareMenuAnchor(null);
      Swal.fire({
        icon: "success",
        title: "Link copied!",
        text: "Post link has been copied to clipboard",
        confirmButtonColor: "#D4AF37",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error copying link:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to copy link. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  const handleNativeShare = async () => {
    try {
      const postUrl = getPostUrl();
      let shareData = {
        title: `${post.user?.name || "Someone"}'s post on Tuvibe`,
        text: post.caption || "Check out this post on Tuvibe",
        url: postUrl,
      };

      // Try to add image if available (only works on some platforms)
      if (post.media_type === "photo" && getMediaUrl() && navigator.canShare) {
        try {
          const mediaUrl = getMediaUrl();
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          const file = new File([blob], "post-image.jpg", { type: blob.type });
          
          // Check if files can be shared
          const shareDataWithFile = { ...shareData, files: [file] };
          if (navigator.canShare(shareDataWithFile)) {
            shareData = shareDataWithFile;
          }
        } catch (e) {
          // If image fetch fails, continue without it
          console.warn("Could not include image in share:", e);
        }
      }

      if (navigator.share) {
        if (navigator.canShare && !navigator.canShare(shareData)) {
          // Fallback to copy link if share data is not shareable
          handleCopyLink();
          return;
        }
        await navigator.share(shareData);
        await trackShare("native");
        setShareMenuAnchor(null);
      } else {
        // Fallback to copy link if native share not available
        handleCopyLink();
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        // Fallback to copy link on error
        handleCopyLink();
      }
    }
  };

  const handleSocialShare = async (platform) => {
    const postUrl = encodeURIComponent(getPostUrl());
    const text = encodeURIComponent(post.caption || "Check out this post on Tuvibe");
    const title = encodeURIComponent(`${post.user?.name || "Someone"}'s post on Tuvibe`);

    let shareUrl = "";
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${postUrl}&text=${text}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${text}%20${postUrl}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${postUrl}&text=${text}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
    await trackShare(platform);
    setShareMenuAnchor(null);
  };

  const handleShareClick = (event) => {
    if (!isApproved) {
      Swal.fire({
        icon: "info",
        title: "Post Pending Approval",
        text: "You can share this post once it's approved",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }
    setShareMenuAnchor(event.currentTarget);
  };

  const getBackgroundColor = () => {
    if (post.media_type !== "text") return null;
    return (
      post.metadata?.background_color ||
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    );
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          borderRadius: "16px",
          border: "1px solid rgba(212, 175, 55, 0.2)",
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar
              src={
                post.user?.photo
                  ? `/uploads/${post.user.photo}`
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      post.user?.name || "User"
                    )}&background=D4AF37&color=fff`
              }
              sx={{ width: 40, height: 40, mr: 1.5 }}
            />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {post.user?.name || "Anonymous"}
                </Typography>
                {post.user?.isVerified && (
                  <Verified sx={{ fontSize: 16, color: "#D4AF37" }} />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(post.createdAt)}
                </Typography>
                {post.location && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      •
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <LocationOn sx={{ fontSize: 14 }} />
                      <Typography variant="caption" color="text.secondary">
                        {post.location}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
            {isOwner && (
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                <MoreVert />
              </IconButton>
            )}
          </Box>

          {/* Caption */}
          {post.caption && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              {post.caption}
            </Typography>
          )}

          {/* Media */}
          {post.media_type === "photo" && getMediaUrl() && (
            <Box
              component="img"
              src={getMediaUrl()}
              alt="Post"
              sx={{
                width: "100%",
                maxHeight: 500,
                objectFit: "contain",
                borderRadius: "12px",
                mb: 2,
              }}
            />
          )}

          {post.media_type === "video" && getMediaUrl() && (
            <Box
              component="video"
              src={getMediaUrl()}
              controls
              sx={{
                width: "100%",
                maxHeight: 500,
                borderRadius: "12px",
                mb: 2,
              }}
            />
          )}

          {post.media_type === "text" && getBackgroundColor() && (
            <Box
              sx={{
                width: "100%",
                minHeight: 200,
                borderRadius: "12px",
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                background: getBackgroundColor(),
                border: "2px solid rgba(212, 175, 55, 0.3)",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: 600,
                  wordWrap: "break-word",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {post.caption || "Text Post"}
              </Typography>
            </Box>
          )}
        </CardContent>

        {/* Actions */}
        <CardActions
          sx={{
            px: 2,
            pb: 2,
            pt: 0,
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          {/* Reaction/Comment counts above buttons */}
          {(postDetails.like_count > 0 ||
            postDetails.emoji_reaction_count > 0 ||
            postDetails.comment_count > 0) && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                {postDetails.like_count > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "pointer",
                    }}
                    onClick={handleViewLikes}
                  >
                    <ThumbUp sx={{ fontSize: 16, color: "#D4AF37" }} />
                    <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                      {postDetails.like_count}
                    </Typography>
                  </Box>
                )}
                {postDetails.emoji_reaction_count > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "pointer",
                    }}
                    onClick={handleViewEmojiReactions}
                  >
                    {/* Emoji reaction - show 1 emoji with count badge */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      {postDetails.recent_emoji_reactions?.[0] && (
                        <Box
                          sx={{
                            position: "relative",
                            display: "inline-flex",
                          }}
                        >
                          <Box
                            sx={{
                              fontSize: "1.1rem",
                              backgroundColor: "white",
                              borderRadius: "50%",
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid rgba(0,0,0,0.1)",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            {postDetails.recent_emoji_reactions[0]}
                          </Box>
                          {/* Count badge overlay */}
                          {postDetails.emoji_reaction_count > 0 && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                backgroundColor: "#D4AF37",
                                color: "#1a1a1a",
                                borderRadius: "50%",
                                minWidth: "18px",
                                height: "18px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                border: "2px solid white",
                                padding: "0 4px",
                                boxSizing: "border-box",
                              }}
                            >
                              {postDetails.emoji_reaction_count > 99 ? "99+" : postDetails.emoji_reaction_count}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
              {postDetails.comment_count > 0 && (
                <Button
                  size="small"
                  onClick={handleViewComments}
                  sx={{
                    color: "inherit",
                    textTransform: "none",
                    minWidth: "auto",
                    px: 1,
                  }}
                >
                  {postDetails.comment_count === 1
                    ? "1 comment"
                    : `${postDetails.comment_count} comments`}
                </Button>
              )}
            </Box>
          )}
          {/* Action buttons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              startIcon={<ThumbUp />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isApproved) {
                  handleLike();
                } else {
                  Swal.fire({
                    icon: "info",
                    title: "Post Pending Approval",
                    text: "You can interact with this post once it's approved",
                    confirmButtonColor: "#D4AF37",
                  });
                }
              }}
              disabled={!isApproved}
              sx={{
                color:
                  postDetails.user_reaction &&
                  postDetails.user_reaction.reaction_type === "like" &&
                  !postDetails.user_reaction.emoji
                    ? "#D4AF37"
                    : "inherit",
                minWidth: "auto",
                px: 1,
                textTransform: "none",
                opacity: isApproved ? 1 : 0.5,
              }}
            >
              Like
              {(postDetails.like_count || 0) > 0 && (
                <Typography
                  component="span"
                  sx={{ ml: 0.5, fontSize: "0.875rem", fontWeight: 500 }}
                >
                  {postDetails.like_count || 0}
                </Typography>
              )}
            </Button>
            <IconButton 
              size="small" 
              onClick={(e) => {
                if (isApproved) {
                  handleOpenEmojiPicker(e);
                } else {
                  Swal.fire({
                    icon: "info",
                    title: "Post Pending Approval",
                    text: "You can interact with this post once it's approved",
                    confirmButtonColor: "#D4AF37",
                  });
                }
              }}
              disabled={!isApproved}
              ref={emojiButtonRef}
              sx={{ 
                position: "relative",
                opacity: isApproved ? 1 : 0.5,
              }}
            >
              <EmojiEmotions />
              {selectedEmojis.length > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    bgcolor: "#D4AF37",
                    color: "#1a1a1a",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    border: "2px solid white",
                  }}
                >
                  {selectedEmojis.length}
                </Box>
              )}
            </IconButton>
            <Button
              size="small"
              startIcon={<Comment />}
              onClick={() => {
                if (isApproved) {
                  handleViewComments();
                } else {
                  Swal.fire({
                    icon: "info",
                    title: "Post Pending Approval",
                    text: "You can interact with this post once it's approved",
                    confirmButtonColor: "#D4AF37",
                  });
                }
              }}
              disabled={!isApproved}
              sx={{
                color: "inherit",
                minWidth: "auto",
                px: 1,
                textTransform: "none",
                opacity: isApproved ? 1 : 0.5,
              }}
            >
              {postDetails.comment_count > 0
                ? postDetails.comment_count
                : "Comment"}
            </Button>
            <Button
              size="small"
              startIcon={<Share />}
              onClick={handleShareClick}
              disabled={!isApproved}
              sx={{
                color: "inherit",
                minWidth: "auto",
                px: 1,
                textTransform: "none",
                opacity: isApproved ? 1 : 0.5,
              }}
            >
              Share
              {(postDetails.share_count || 0) > 0 && (
                <Typography
                  component="span"
                  sx={{ ml: 0.5, fontSize: "0.875rem", fontWeight: 500 }}
                >
                  {postDetails.share_count || 0}
                </Typography>
              )}
            </Button>
          </Box>
        </CardActions>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (onDelete) {
              onDelete(post.id);
            }
          }}
          sx={{ color: "error.main" }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete Post
        </MenuItem>
      </Menu>

      {/* Share Menu */}
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={() => setShareMenuAnchor(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {navigator.share && (
          <MenuItem onClick={handleNativeShare}>
            <Share sx={{ mr: 1 }} />
            Share via...
          </MenuItem>
        )}
        <MenuItem onClick={handleCopyLink}>
          <ContentCopy sx={{ mr: 1 }} />
          Copy Link
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleSocialShare("twitter")}>
          <Twitter sx={{ mr: 1, color: "#1DA1F2" }} />
          Twitter
        </MenuItem>
        <MenuItem onClick={() => handleSocialShare("facebook")}>
          <Facebook sx={{ mr: 1, color: "#1877F2" }} />
          Facebook
        </MenuItem>
        <MenuItem onClick={() => handleSocialShare("whatsapp")}>
          <WhatsApp sx={{ mr: 1, color: "#25D366" }} />
          WhatsApp
        </MenuItem>
        <MenuItem onClick={() => handleSocialShare("telegram")}>
          <Telegram sx={{ mr: 1, color: "#0088cc" }} />
          Telegram
        </MenuItem>
      </Menu>

      {/* Emoji Picker */}
      <EmojiPicker
        open={emojiPickerOpen}
        anchorEl={emojiAnchor}
        onClose={handleEmojiPickerClose}
        onEmojiSelect={handleEmojiSelect}
        position="top"
        keepOpenOnSelect={true}
      />

      {/* Flying Emoji Animations */}
      {flyingEmojis.map((flyingEmoji) => (
        <Box
          key={flyingEmoji.id}
          sx={{
            position: "fixed",
            left: flyingEmoji.startX,
            top: flyingEmoji.startY,
            fontSize: "2rem",
            pointerEvents: "none",
            zIndex: 9999,
            animation: `flyToButton 0.6s ease-out forwards`,
            "@keyframes flyToButton": {
              "0%": {
                transform: "translate(0, 0) scale(1)",
                opacity: 1,
              },
              "100%": {
                transform: `translate(${flyingEmoji.targetX - flyingEmoji.startX}px, ${flyingEmoji.targetY - flyingEmoji.startY}px) scale(0.3)`,
                opacity: 0,
              },
            },
          }}
        >
          {flyingEmoji.emoji}
        </Box>
      ))}

      {/* Comments Dialog */}
      <Dialog
        open={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          setCommentText("");
          setReplyingTo(null);
          setReplyText("");
          setLoadingComments(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Comments
            <IconButton
              size="small"
              onClick={() => {
                setCommentsOpen(false);
                setCommentText("");
                setReplyingTo(null);
                setReplyText("");
                setLoadingComments(false);
              }}
              sx={{
                color: "text.secondary",
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Comment Input */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                // Submit on Ctrl+Enter or Cmd+Enter
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (commentText.trim() && !submittingComment) {
                    handleSubmitComment(null, e);
                  }
                }
              }}
              multiline
              rows={3}
              variant="outlined"
              sx={{ mb: 1 }}
              disabled={submittingComment}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmitComment(null, e);
                }}
                disabled={!commentText.trim() || submittingComment}
                sx={{
                  bgcolor: "#D4AF37",
                  "&:hover": { bgcolor: "#B8941F" },
                }}
                startIcon={
                  submittingComment ? <CircularProgress size={16} /> : <Send />
                }
                type="button"
              >
                {submittingComment ? "Posting..." : "Post"}
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {loadingComments ? (
            // Skeleton loader while fetching comments
            <List>
              {[1, 2, 3, 4, 5].map((index) => (
                <React.Fragment key={index}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      minHeight: 120, // Match comment item height
                      py: 1,
                    }}
                  >
                    <ListItemAvatar>
                      <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                          <Skeleton variant="text" width={100} height={20} />
                          <Skeleton variant="circular" width={14} height={14} />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                            <Skeleton variant="text" width={60} height={24} />
                            <Skeleton variant="text" width={60} height={24} />
                          </Box>
                          {/* Reply skeleton */}
                          <Box sx={{ ml: 4, mt: 1 }}>
                            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                              <Skeleton variant="circular" width={24} height={24} />
                              <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width={80} height={16} sx={{ mb: 0.5 }} />
                                <Skeleton variant="text" width="70%" height={16} />
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < 5 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : postDetails.comments && postDetails.comments.length > 0 ? (
            <List>
              {postDetails.comments
                .filter((c) => !c.parent_comment_id)
                .map((comment, index) => (
                  <React.Fragment key={comment.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar
                          src={
                            comment.user?.photo
                              ? `/uploads/${comment.user.photo}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  comment.user?.name || "User"
                                )}&background=D4AF37&color=fff`
                          }
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Typography variant="subtitle2">
                              {comment.user?.name || "Anonymous"}
                            </Typography>
                            {comment.user?.isVerified && (
                              <Verified
                                sx={{ fontSize: 14, color: "#D4AF37" }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2">
                              {comment.content}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDate(comment.createdAt)}
                            </Typography>
                            {/* Comment actions */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              <Button
                                size="small"
                                startIcon={
                                  <ThumbUp
                                    sx={{
                                      fontSize: 14,
                                      color: comment.user_reaction
                                        ? "#D4AF37"
                                        : "inherit",
                                    }}
                                  />
                                }
                                onClick={() =>
                                  handleCommentReaction(comment.id, "like")
                                }
                                sx={{
                                  minWidth: "auto",
                                  px: 1,
                                  textTransform: "none",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {comment.reaction_count > 0
                                  ? comment.reaction_count
                                  : "Like"}
                              </Button>
                              <Button
                                size="small"
                                onClick={() =>
                                  setReplyingTo(
                                    replyingTo === comment.id
                                      ? null
                                      : comment.id
                                  )
                                }
                                sx={{
                                  minWidth: "auto",
                                  px: 1,
                                  textTransform: "none",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Reply
                              </Button>
                            </Box>
                            {/* Reply input */}
                            {replyingTo === comment.id && (
                              <Box sx={{ mt: 1 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  multiline
                                  rows={2}
                                  sx={{ mb: 1 }}
                                />
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSubmitComment(comment.id, e);
                                    }}
                                    disabled={
                                      !replyText.trim() ||
                                      submittingReply[comment.id]
                                    }
                                    sx={{
                                      bgcolor: "#D4AF37",
                                      "&:hover": { bgcolor: "#B8941F" },
                                    }}
                                    type="button"
                                  >
                                    {submittingReply[comment.id]
                                      ? "Posting..."
                                      : "Reply"}
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              </Box>
                            )}
                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <Box sx={{ ml: 4, mt: 1 }}>
                                {comment.replies.map((reply) => (
                                  <Box
                                    key={reply.id}
                                    sx={{
                                      display: "flex",
                                      gap: 1,
                                      mb: 1,
                                      pb: 1,
                                      borderLeft:
                                        "2px solid rgba(212, 175, 55, 0.3)",
                                      pl: 1,
                                    }}
                                  >
                                    <Avatar
                                      src={
                                        reply.user?.photo
                                          ? `/uploads/${reply.user.photo}`
                                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                              reply.user?.name || "User"
                                            )}&background=D4AF37&color=fff`
                                      }
                                      sx={{ width: 24, height: 24 }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          {reply.user?.name || "Anonymous"}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {reply.content}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                          mt: 0.5,
                                        }}
                                      >
                                        <Button
                                          size="small"
                                          startIcon={
                                            <ThumbUp
                                              sx={{
                                                fontSize: 12,
                                                color: reply.user_reaction
                                                  ? "#D4AF37"
                                                  : "inherit",
                                              }}
                                            />
                                          }
                                          onClick={() =>
                                            handleCommentReaction(
                                              reply.id,
                                              "like"
                                            )
                                          }
                                          sx={{
                                            minWidth: "auto",
                                            px: 0.5,
                                            textTransform: "none",
                                            fontSize: "0.7rem",
                                          }}
                                        >
                                          {reply.reaction_count > 0
                                            ? reply.reaction_count
                                            : "Like"}
                                        </Button>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {formatDate(reply.createdAt)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index <
                      postDetails.comments.filter((c) => !c.parent_comment_id)
                        .length -
                        1 && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No comments yet
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Likes Dialog */}
      <Dialog
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Likes
            <IconButton
              size="small"
              onClick={() => setLikesOpen(false)}
              sx={{
                color: "text.secondary",
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {postDetails.reactions &&
          postDetails.reactions.filter(
            (r) => r.reaction_type === "like" && !r.emoji
          ).length > 0 ? (
            <List>
              {postDetails.reactions
                .filter((r) => r.reaction_type === "like" && !r.emoji)
                .map((reaction, index, filteredReactions) => (
                  <React.Fragment key={reaction.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar
                          src={
                            reaction.user?.photo
                              ? `/uploads/${reaction.user.photo}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  reaction.user?.name || "User"
                                )}&background=D4AF37&color=fff`
                          }
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="subtitle2">
                              {reaction.user?.name || "Anonymous"}
                            </Typography>
                            <ThumbUp sx={{ fontSize: 16, color: "#D4AF37" }} />
                          </Box>
                        }
                        secondary={formatDate(reaction.createdAt)}
                      />
                    </ListItem>
                    {index < filteredReactions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No likes yet
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Emoji Reactions Dialog */}
      <Dialog
        open={emojiReactionsOpen}
        onClose={() => {
          setEmojiReactionsOpen(false);
          setLoadingEmojiReactions(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Emoji Reactions
            <IconButton
              size="small"
              onClick={() => {
                setEmojiReactionsOpen(false);
                setLoadingEmojiReactions(false);
              }}
              sx={{
                color: "text.secondary",
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingEmojiReactions ? (
            // Skeleton loader while fetching - matching exact height of actual list items
            <List>
              {[1, 2, 3, 4, 5].map((index) => (
                <React.Fragment key={index}>
                  <ListItem
                    sx={{
                      minHeight: 72, // Match ListItem default minHeight
                      py: 1, // Match ListItem padding
                    }}
                  >
                    <ListItemAvatar>
                      <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minHeight: 24, // Match subtitle2 line height
                          }}
                        >
                          <Skeleton
                            variant="text"
                            width={120}
                            height={24}
                            sx={{ fontSize: "0.875rem", lineHeight: 1.57 }} // Match subtitle2
                          />
                          <Skeleton
                            variant="text"
                            width={24}
                            height={24}
                            sx={{ fontSize: "1.25rem" }} // Match emoji fontSize 20
                          />
                        </Box>
                      }
                      secondary={
                        <Skeleton
                          variant="text"
                          width={80}
                          height={20}
                          sx={{ fontSize: "0.75rem", lineHeight: 1.66 }} // Match caption
                        />
                      }
                    />
                  </ListItem>
                  {index < 5 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : postDetails.reactions &&
            postDetails.reactions.filter(
              (r) => r.reaction_type === "emoji" && r.emoji
            ).length > 0 ? (
            <List>
              {postDetails.reactions
                .filter((r) => r.reaction_type === "emoji" && r.emoji)
                .map((reaction, index, filteredReactions) => (
                  <React.Fragment key={reaction.id}>
                    <ListItem
                      sx={{
                        minHeight: 72, // Match skeleton height
                        py: 1, // Match skeleton padding
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={
                            reaction.user?.photo
                              ? `/uploads/${reaction.user.photo}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  reaction.user?.name || "User"
                                )}&background=D4AF37&color=fff`
                          }
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              minHeight: 24, // Match skeleton height
                            }}
                          >
                            <Typography variant="subtitle2">
                              {reaction.user?.name || "Anonymous"}
                            </Typography>
                            <Typography sx={{ fontSize: 20 }}>
                              {reaction.emoji}
                            </Typography>
                          </Box>
                        }
                        secondary={formatDate(reaction.createdAt)}
                      />
                    </ListItem>
                    {index < filteredReactions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No emoji reactions yet
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostCard;
