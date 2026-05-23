import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  Box,
  IconButton,
  Typography,
  Avatar,
  LinearProgress,
  Stack,
  Chip,
  TextField,
  Button,
  Menu,
  MenuItem,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Close,
  ArrowBackIos,
  ArrowForwardIos,
  Favorite,
  FavoriteBorder,
  Comment,
  Send,
  LocationOn,
  Verified,
  Delete,
  MoreVert,
  EmojiEmotions,
  Visibility,
  MusicNote,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import EmojiPicker from "../EmojiPicker/EmojiPicker";

const StoryViewer = ({
  open,
  onClose,
  storyGroup,
  onNextGroup,
  onPrevGroup,
  currentUser,
  onStoryDeleted,
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const [viewCount, setViewCount] = useState(0);
  const [reactionCount, setReactionCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewersDialogOpen, setViewersDialogOpen] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [storyReactions, setStoryReactions] = useState([]);
  const [storyComments, setStoryComments] = useState([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState([]); // Emojis selected but not yet sent
  const [flyingEmojis, setFlyingEmojis] = useState([]); // Emojis currently animating
  const progressIntervalRef = useRef(null);
  const storyTimeoutRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const mediaContainerRef = useRef(null);
  const currentStoryIdRef = useRef(null);
  const musicAudioRef = useRef(null);
  const [mediaDimensions, setMediaDimensions] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const stories = storyGroup?.stories || [];
  const currentStory = stories[currentStoryIndex];
  const user = storyGroup?.user;
  // Define these early so they can be used in useEffects and callbacks
  const isTextStory = currentStory?.media_type === "text";
  const isVideo = currentStory?.media_type === "video";
  const [deleteMenuAnchor, setDeleteMenuAnchor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Check if current user owns the story (defined early so it can be used in useEffects)
  const isStoryOwner =
    currentUser &&
    currentStory &&
    (currentUser.id === currentStory.public_user_id ||
      currentUser.id === user?.id);

  useEffect(() => {
    if (open && stories.length > 0) {
      // Always start with the first story when opening
      setCurrentStoryIndex(0);
      setProgress(0);
      setIsPaused(false); // Ensure not paused when opening
      setComment(""); // Clear comment when opening
      // Load user's reaction for current story (only if not the owner)
      const firstStory = stories[0];
      const isOwner =
        currentUser &&
        (currentUser.id === firstStory.public_user_id ||
          currentUser.id === user?.id);
      if (isOwner) {
        // Story owners cannot react to their own stories
        setReaction(null);
      } else if (firstStory.user_reaction) {
        setReaction(firstStory.user_reaction);
      } else {
        setReaction(null);
      }
    } else if (!open) {
      // Clear everything when closing
      clearProgress();
      setProgress(0);
      setIsPaused(false);
      setSelectedEmojis([]); // Clear selected emojis when closing
      setComment(""); // Clear comment when closing
      setEmojiPickerOpen(false); // Close emoji picker when viewer closes
      setEmojiPickerAnchor(null);
      // Stop music when closing
      stopMusic();
    }
    return () => {
      clearProgress();
      stopMusic();
    };
  }, [open, storyGroup, currentUser, user]);

  // Prevent body scroll when story viewer is open
  useEffect(() => {
    if (open) {
      // Save current overflow style
      const originalOverflow = document.body.style.overflow;
      // Prevent scrolling
      document.body.style.overflow = "hidden";
      // Also prevent scrolling on html element
      document.documentElement.style.overflow = "hidden";

      return () => {
        // Restore original overflow style
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  useEffect(() => {
    // Update reaction when story changes
    // Story owners cannot react to their own stories, so clear reaction for owners
    if (currentStory) {
      if (isStoryOwner) {
        setReaction(null);
      } else if (currentStory.user_reaction) {
        setReaction(currentStory.user_reaction);
      } else {
        setReaction(null);
      }

      // Clear selected emojis when story changes
      setSelectedEmojis([]);
      // Clear comment when story changes
      setComment("");
      // Close emoji picker when story changes
      setEmojiPickerOpen(false);
      setEmojiPickerAnchor(null);

      // Update view count from story data
      setViewCount(currentStory.view_count || 0);
      setReactionCount(currentStory.reaction_count || 0);
      setCommentCount(currentStory.comment_count || 0);
      // Update ref for polling (to track which story to poll)
      currentStoryIdRef.current = currentStory.id;
      console.log("🔄 [StoryViewer] Story changed, updated ref:", {
        storyId: currentStory.id,
        viewCount: currentStory.view_count,
        reactionCount: currentStory.reaction_count,
        commentCount: currentStory.comment_count,
      });

      // Load reactions and comments if story owner
      if (isStoryOwner && currentStory.id) {
        // Try to get from current story data first, otherwise fetch
        if (currentStory.reactions) {
          setStoryReactions(currentStory.reactions || []);
        } else {
          loadStoryReactions(currentStory.id);
        }

        if (currentStory.comments) {
          setStoryComments(currentStory.comments || []);
        } else {
          loadStoryComments(currentStory.id);
        }
      }

      // Play music if story has music
      if (currentStory.music || currentStory.music_id) {
        playMusic(currentStory.music || { id: currentStory.music_id });
      } else {
        stopMusic();
      }
    }
  }, [currentStoryIndex, currentStory, isStoryOwner]);

  // Group reactions by user
  const groupReactionsByUser = (reactions) => {
    const grouped = {};
    reactions.forEach((reaction) => {
      const userId = reaction.user?.id || reaction.user_id;
      if (!grouped[userId]) {
        grouped[userId] = {
          user: reaction.user,
          reactions: [],
        };
      }
      grouped[userId].reactions.push(reaction);
    });
    return Object.values(grouped);
  };

  // Helper function to calculate media dimensions for caption positioning
  const calculateMediaDimensions = useCallback(() => {
    if (mediaContainerRef.current && !isTextStory) {
      const container = mediaContainerRef.current;
      const mediaElement = container.querySelector("img, video");
      if (mediaElement) {
        const containerRect = container.getBoundingClientRect();
        const mediaRect = mediaElement.getBoundingClientRect();

        // Calculate the actual visible media area (accounting for objectFit: contain)
        const offsetX = mediaRect.left - containerRect.left;
        const offsetY = mediaRect.top - containerRect.top;

        setMediaDimensions({
          width: mediaRect.width,
          height: mediaRect.height,
          offsetX,
          offsetY,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height,
        });
      }
    }
  }, [isTextStory]);

  // Calculate media dimensions when story changes or window resizes
  useEffect(() => {
    if (!open || isTextStory) return;

    // Calculate on mount and when story changes
    const timer = setTimeout(() => {
      calculateMediaDimensions();
    }, 100);

    // Also recalculate on window resize
    const handleResize = () => {
      calculateMediaDimensions();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, currentStory, calculateMediaDimensions, isTextStory]);

  // Group comments by user
  const groupCommentsByUser = (comments) => {
    const grouped = {};
    comments.forEach((comment) => {
      const userId = comment.user?.id || comment.user_id;
      if (!grouped[userId]) {
        grouped[userId] = {
          user: comment.user,
          comments: [],
        };
      }
      grouped[userId].comments.push(comment);
    });
    return Object.values(grouped);
  };

  const loadStoryReactions = async (storyId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setLoadingReactions(true);
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.story?.reactions) {
          setStoryReactions(data.data.story.reactions || []);
        }
      }
    } catch (error) {
      console.error("Error loading reactions:", error);
    } finally {
      setLoadingReactions(false);
    }
  };

  const loadStoryComments = async (storyId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setLoadingComments(true);
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.story?.comments) {
          setStoryComments(data.data.story.comments || []);
        }
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Poll for story count updates (replaces SSE for better performance)
  useEffect(() => {
    if (!open || !currentStoryIdRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let pollInterval = null;

    // Function to fetch and update story counts
    const updateStoryCounts = async () => {
      const storyId = currentStoryIdRef.current;
      if (!storyId) return;

      try {
        const response = await fetch(`/api/stories/${storyId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.story) {
            const story = data.data.story;
            // Only update if it's still the current story
            if (storyId === currentStoryIdRef.current) {
              setViewCount(story.view_count || 0);
              setReactionCount(story.reaction_count || 0);
              setCommentCount(story.comment_count || 0);
            }
          }
        }
      } catch (error) {
        console.error("[StoryViewer] Polling error:", error);
      }
    };

    // Poll every 15 seconds - checks for updated counts while viewer is open
    const startPolling = () => {
      if (pollInterval) return; // Already polling

      pollInterval = setInterval(() => {
        if (!open || !currentStoryIdRef.current) {
          clearInterval(pollInterval);
          return;
        }

        // Only poll if page is visible
        if (document.hidden) {
          return;
        }

        // Non-blocking fetch
        updateStoryCounts().catch((err) => {
          console.error("[StoryViewer] Polling error:", err);
        });
      }, 15000); // Check every 15 seconds
    };

    // Start polling after a short delay
    const timeoutId = setTimeout(() => {
      startPolling();
    }, 1000); // Wait 1 second after viewer opens

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [open, currentStory?.id]); // Re-setup when viewer opens or story changes

  // Track view when story is displayed (only once per story, and only if not the owner)
  useEffect(() => {
    if (open && currentStory && !isStoryOwner && currentStory.id) {
      // Small delay to ensure story is actually being viewed
      const viewTimer = setTimeout(() => {
        trackStoryView(currentStory.id);
      }, 500);

      return () => clearTimeout(viewTimer);
    }
  }, [currentStoryIndex, open, currentStory?.id, isStoryOwner]);

  const trackStoryView = async (storyId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/stories/${storyId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.story) {
          // Update view count from response (backend increments it)
          setViewCount(data.data.story.view_count || 0);
        }
      }
    } catch (error) {
      console.error("Error tracking story view:", error);
    }
  };

  useEffect(() => {
    // Reset progress and restart when story index changes
    if (open && currentStory) {
      clearProgress(); // Clear any existing progress first
      setProgress(0); // Reset to 0

      // Always start progress when story changes, even if paused
      // The pause effect will pause it if needed
      const startTimer = setTimeout(() => {
        // Check if still open and current story is still valid
        if (open && currentStory) {
          // Start progress - it will be paused by pause effect if isPaused is true
          startProgress(0);

          // If paused, pause it immediately
          if (isPaused && progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }, 150);

      return () => {
        clearTimeout(startTimer);
        clearProgress();
      };
    }
    return () => clearProgress();
  }, [currentStoryIndex, open, currentStory]); // Removed isPaused from dependencies

  // Separate effect to handle pause/unpause
  useEffect(() => {
    if (open && currentStory) {
      if (isPaused) {
        // Pause: clear the progress interval but keep progress value
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        // Pause music
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
        }
      } else {
        // Unpause: start or resume progress if not already running
        if (!progressIntervalRef.current && progress < 100) {
          startProgress(progress); // Start from current progress (0 if just opened)
        }
        // Resume music
        if (musicAudioRef.current && currentStory.music) {
          musicAudioRef.current.play().catch((err) => {
            console.error("Error resuming music:", err);
          });
        }
      }
    }
  }, [isPaused, open, currentStory, progress]);

  const startProgress = (fromProgress = 0) => {
    clearProgress();
    const duration = 10000; // 10 seconds per story
    const interval = 16; // Update every ~16ms for smooth 60fps animation
    const startTime = Date.now() - (fromProgress / 100) * duration; // Adjust start time if resuming

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(
        Math.max((elapsed / duration) * 100, 0),
        100
      );

      setProgress(newProgress);

      if (newProgress >= 100) {
        clearProgress();
        // Small delay before moving to next story for smooth transition
        setTimeout(() => {
          handleNextStory();
        }, 150);
      }
    }, interval);
  };

  const clearProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (storyTimeoutRef.current) {
      clearTimeout(storyTimeoutRef.current);
      storyTimeoutRef.current = null;
    }
  };

  const handleNextStory = () => {
    clearProgress(); // Clear any running progress
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0); // Reset progress bar
    } else {
      handleNextGroupClick();
    }
  };

  const handlePrevStory = () => {
    clearProgress(); // Clear any running progress
    if (currentStoryIndex > 0) {
      setProgress(0); // Reset progress bar first
      setCurrentStoryIndex(currentStoryIndex - 1);
      // Progress will restart automatically via useEffect when currentStoryIndex changes
    } else {
      handlePrevGroupClick();
    }
  };

  const handleNextGroupClick = () => {
    if (onNextGroup) {
      onNextGroup();
    } else {
      onClose();
    }
  };

  const handlePrevGroupClick = () => {
    if (onPrevGroup) {
      onPrevGroup();
    } else {
      onClose();
    }
  };

  // Add emoji to selection and trigger animation
  const handleReaction = (emoji = null, clickPosition = null) => {
    if (!currentStory) return;

    // Prevent story owners from reacting to their own stories
    if (isStoryOwner) {
      return;
    }

    // If emoji provided, add to selected emojis array
    if (emoji) {
      setSelectedEmojis((prev) => [...prev, emoji]);

      // If click position provided, trigger flying animation
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
      setReaction({ reaction_type: "emoji", emoji });
    } else {
      // For like reactions (non-emoji), send immediately
      setReaction({ reaction_type: "like" });
      // Send like reaction immediately
      const sendLikeReaction = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
          await fetch(`/api/stories/${currentStory.id}/reactions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reaction_type: "like" }),
          });
        } catch (err) {
          console.error("Error sending like reaction:", err);
        }
      };
      sendLikeReaction();
    }
  };

  // Close emoji picker dialog
  const handleEmojiPickerClose = () => {
    setEmojiPickerOpen(false);
    setEmojiPickerAnchor(null);
    // Note: selectedEmojis are cleared in the useEffect when picker closes
    // If no emojis were selected, nothing is sent (which is correct behavior)
  };

  const handleEmojiPickerOpen = (event) => {
    setEmojiPickerAnchor(event.currentTarget);
    setEmojiPickerOpen(true);
  };

  // Send all selected emojis as one reaction when dialog closes
  useEffect(() => {
    if (!emojiPickerOpen && selectedEmojis.length > 0 && currentStory) {
      // Dialog was closed, send all selected emojis as one reaction
      const sendEmojisAsOneReaction = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
          setSelectedEmojis([]);
          return;
        }

        try {
          // Send all emojis as one reaction
          await fetch(`/api/stories/${currentStory.id}/reactions`, {
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

  const handleViewersClick = async () => {
    if (!currentStory || !isStoryOwner) return;

    setViewersDialogOpen(true);
    setLoadingViewers(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/stories/${currentStory.id}/viewers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.viewers) {
          setViewers(data.data.viewers);
        }
      }
    } catch (error) {
      console.error("Error fetching viewers:", error);
    } finally {
      setLoadingViewers(false);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !currentStory) return;

    // Prevent story owners from commenting on their own stories
    if (isStoryOwner) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setSendingComment(true);
    try {
      const response = await fetch(`/api/stories/${currentStory.id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: comment.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setComment("");

        // Show success notification
        Swal.fire({
          icon: "success",
          title: "Comment sent!",
          text: "Your message has been sent successfully",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
          width: 300,
          padding: "1rem",
          confirmButtonColor: "#D4AF37",
          customClass: {
            container: "swal-story-viewer-overlay",
            popup: "swal-comment-success",
          },
          didOpen: () => {
            const swalContainer = document.querySelector(
              ".swal-story-viewer-overlay"
            );
            const swalBackdrop = document.querySelector(".swal2-backdrop-show");
            if (swalContainer) {
              swalContainer.style.zIndex = "9999";
            }
            if (swalBackdrop) {
              swalBackdrop.style.zIndex = "9998";
            }
          },
        });
      } else {
        // Show error if comment failed
        Swal.fire({
          icon: "error",
          title: "Failed to send",
          text:
            data.message || "Unable to send your comment. Please try again.",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
          width: 300,
          padding: "1rem",
          confirmButtonColor: "#D4AF37",
          customClass: {
            container: "swal-story-viewer-overlay",
          },
          didOpen: () => {
            const swalContainer = document.querySelector(
              ".swal-story-viewer-overlay"
            );
            const swalBackdrop = document.querySelector(".swal2-backdrop-show");
            if (swalContainer) {
              swalContainer.style.zIndex = "9999";
            }
            if (swalBackdrop) {
              swalBackdrop.style.zIndex = "9998";
            }
          },
        });
      }
    } catch (err) {
      console.error("Error sending comment:", err);
      // Show error notification
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to send your comment. Please try again.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
        width: 300,
        padding: "1rem",
        confirmButtonColor: "#D4AF37",
        customClass: {
          container: "swal-story-viewer-overlay",
        },
        didOpen: () => {
          const swalContainer = document.querySelector(
            ".swal-story-viewer-overlay"
          );
          const swalBackdrop = document.querySelector(".swal2-backdrop-show");
          if (swalContainer) {
            swalContainer.style.zIndex = "9999";
          }
          if (swalBackdrop) {
            swalBackdrop.style.zIndex = "9998";
          }
        },
      });
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Login Required",
        text: "Please login to delete stories",
        confirmButtonColor: "#D4AF37",
        zIndex: 9999,
        customClass: {
          container: "swal-story-viewer-overlay",
        },
        didOpen: () => {
          const swalContainer = document.querySelector(
            ".swal-story-viewer-overlay"
          );
          const swalBackdrop = document.querySelector(".swal2-backdrop-show");
          if (swalContainer) {
            swalContainer.style.zIndex = "9999";
          }
          if (swalBackdrop) {
            swalBackdrop.style.zIndex = "9998";
          }
        },
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Story?",
      text: "This story will be permanently deleted. This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#D4AF37",
      zIndex: 9999,
      customClass: {
        container: "swal-story-viewer-overlay",
      },
      didOpen: () => {
        const swalContainer = document.querySelector(
          ".swal-story-viewer-overlay"
        );
        const swalBackdrop = document.querySelector(".swal2-backdrop-show");
        if (swalContainer) {
          swalContainer.style.zIndex = "9999";
        }
        if (swalBackdrop) {
          swalBackdrop.style.zIndex = "9998";
        }
      },
    });

    if (!result.isConfirmed) {
      setDeleteMenuAnchor(null);
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/stories/${currentStory.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Story Deleted",
          text: "Your story has been deleted successfully",
          confirmButtonColor: "#D4AF37",
          timer: 2000,
          zIndex: 9999,
          customClass: {
            container: "swal-story-viewer-overlay",
          },
          didOpen: () => {
            const swalContainer = document.querySelector(
              ".swal-story-viewer-overlay"
            );
            const swalBackdrop = document.querySelector(".swal2-backdrop-show");
            if (swalContainer) {
              swalContainer.style.zIndex = "9999";
            }
            if (swalBackdrop) {
              swalBackdrop.style.zIndex = "9998";
            }
          },
        });

        // Remove deleted story from current stories array
        const remainingStories = stories.filter(
          (s) => s.id !== currentStory.id
        );

        if (remainingStories.length === 0) {
          // No more stories in this group, close viewer
          if (onStoryDeleted) {
            onStoryDeleted();
          }
          onClose();
        } else {
          // Move to next story or previous if at the end
          const newIndex =
            currentStoryIndex >= remainingStories.length
              ? remainingStories.length - 1
              : currentStoryIndex;
          setCurrentStoryIndex(newIndex);

          // Update the storyGroup prop by calling onStoryDeleted with updated group
          if (onStoryDeleted) {
            onStoryDeleted({
              ...storyGroup,
              stories: remainingStories,
            });
          }
        }
      } else {
        throw new Error(data.message || "Failed to delete story");
      }
    } catch (err) {
      console.error("Error deleting story:", err);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: err.message || "Failed to delete story. Please try again.",
        confirmButtonColor: "#D4AF37",
        zIndex: 9999,
        customClass: {
          container: "swal-story-viewer-overlay",
        },
        didOpen: () => {
          const swalContainer = document.querySelector(
            ".swal-story-viewer-overlay"
          );
          const swalBackdrop = document.querySelector(".swal2-backdrop-show");
          if (swalContainer) {
            swalContainer.style.zIndex = "9999";
          }
          if (swalBackdrop) {
            swalBackdrop.style.zIndex = "9998";
          }
        },
      });
    } finally {
      setDeleting(false);
      setDeleteMenuAnchor(null);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/")) return imagePath;
    // Handle stories path format: "stories/filename.jpg" -> "/uploads/stories/filename.jpg"
    if (imagePath.startsWith("stories/")) return `/uploads/${imagePath}`;
    if (imagePath.startsWith("uploads/")) return `/${imagePath}`;
    if (imagePath.startsWith("profiles/")) return `/uploads/${imagePath}`;
    if (imagePath.includes("music/")) return `/uploads/${imagePath}`;
    return `/uploads/${imagePath}`;
  };

  const getAudioUrl = (audioPath) => {
    if (!audioPath) return null;
    if (audioPath.startsWith("http")) return audioPath;
    if (audioPath.startsWith("/")) return audioPath;
    if (audioPath.includes("music/")) return `/uploads/${audioPath}`;
    return audioPath;
  };

  const playMusic = (music) => {
    if (!music) return;

    // If music is just an ID, we need to fetch it or it should be included in story
    // For now, assume music object is passed or we need audio_url
    const audioUrl = music.audio_url ? getAudioUrl(music.audio_url) : null;
    if (!audioUrl) {
      console.log("No audio URL available for music:", music);
      return;
    }

    // Stop any currently playing music
    stopMusic();

    try {
      const audio = new Audio(audioUrl);
      audio.loop = true; // Loop music like Instagram/Facebook
      audio.volume = 0.5; // Set volume to 50%

      audio.addEventListener("error", (e) => {
        console.error("Error playing music:", e);
        stopMusic();
      });

      audio.addEventListener("ended", () => {
        // Restart if not paused
        if (!isPaused && musicAudioRef.current) {
          audio.currentTime = 0;
          audio.play().catch((err) => {
            console.error("Error replaying music:", err);
          });
        }
      });

      // Play music
      audio.play().catch((err) => {
        console.error("Error playing music:", err);
        // Some browsers require user interaction - music will play on next user action
      });

      musicAudioRef.current = audio;
    } catch (err) {
      console.error("Error creating audio element:", err);
    }
  };

  const stopMusic = () => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.src = "";
      musicAudioRef.current = null;
    }
  };

  if (!open || !currentStory) return null;

  const mediaUrl = getImageUrl(currentStory.media_url);
  // isTextStory and isVideo are already defined above

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: "#000",
          m: 0,
          borderRadius: 0,
          maxHeight: "100vh",
          maxWidth: "100vw",
          overflow: "hidden",
        },
      }}
      sx={{
        "& .MuiDialog-container": {
          height: "100vh",
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          maxHeight: "100vh",
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: "flex",
            gap: 0.5,
            p: 1.5,
          }}
        >
          {stories.map((_, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                height: 3,
                bgcolor: "rgba(255,255,255,0.3)",
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <LinearProgress
                variant="determinate"
                value={
                  index < currentStoryIndex
                    ? 100
                    : index === currentStoryIndex
                      ? progress
                      : 0
                }
                sx={{
                  height: "100%",
                  backgroundColor: "rgba(255,255,255,0.3)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#D4AF37",
                    transition: "transform 0.1s linear",
                  },
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Header */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            pt: 6,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              src={getImageUrl(user?.photo)}
              sx={{ width: 40, height: 40, border: "2px solid #D4AF37" }}
            >
              {user?.name?.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "white", fontWeight: 600 }}
                >
                  {user?.name || user?.username}
                </Typography>
                {user?.isVerified && (
                  <Verified sx={{ fontSize: 16, color: "#D4AF37" }} />
                )}
              </Box>
              {currentStory.location && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <LocationOn
                    sx={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {currentStory.location}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isStoryOwner && (
              <>
                <IconButton
                  onClick={(e) => setDeleteMenuAnchor(e.currentTarget)}
                  disabled={deleting}
                  sx={{
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <MoreVert />
                </IconButton>
                <Menu
                  anchorEl={deleteMenuAnchor}
                  open={Boolean(deleteMenuAnchor)}
                  onClose={() => setDeleteMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      bgcolor: "rgba(0,0,0,0.9)",
                      color: "white",
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleDeleteStory}
                    disabled={deleting}
                    sx={{
                      color: "#ff4444",
                      "&:hover": { bgcolor: "rgba(255, 68, 68, 0.1)" },
                    }}
                  >
                    <Delete sx={{ mr: 1, fontSize: 18 }} />
                    {deleting ? "Deleting..." : "Delete Story"}
                  </MenuItem>
                </Menu>
              </>
            )}
            <IconButton onClick={onClose} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Media or Text */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {isTextStory ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                position: "relative",
                background:
                  (currentStory.metadata &&
                    typeof currentStory.metadata === "object" &&
                    currentStory.metadata.background_color) ||
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                  lineHeight: 1.4,
                  maxWidth: "90%",
                  wordWrap: "break-word",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {currentStory.caption}
              </Typography>

              {/* Music Overlay for Text Stories */}
              {currentStory.music && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 80,
                    right: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "rgba(0, 0, 0, 0.7)",
                    borderRadius: 2,
                    p: 1.5,
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    maxWidth: "70%",
                    zIndex: 5,
                  }}
                >
                  {currentStory.music?.cover_image_url && (
                    <Box
                      component="img"
                      src={getImageUrl(currentStory.music.cover_image_url)}
                      alt={currentStory.music.title}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "white",
                        fontWeight: 600,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentStory.music?.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255, 255, 255, 0.8)",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentStory.music?.artist}
                    </Typography>
                  </Box>
                  <MusicNote sx={{ color: "#D4AF37", fontSize: 20 }} />
                </Box>
              )}
            </Box>
          ) : (
            <Box
              ref={mediaContainerRef}
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  // This wrapper will match the media size due to objectFit: contain
                }}
              >
                {isVideo ? (
                  <Box
                    component="video"
                    src={mediaUrl}
                    autoPlay
                    loop={false}
                    muted
                    playsInline
                    onLoadedMetadata={calculateMediaDimensions}
                    sx={{
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={mediaUrl}
                    alt="Story"
                    onLoad={calculateMediaDimensions}
                    sx={{
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                )}

                {/* Music Overlay for Media Stories */}
                {currentStory.music && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 80,
                      right: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      bgcolor: "rgba(0, 0, 0, 0.7)",
                      borderRadius: 2,
                      p: 1.5,
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      maxWidth: "70%",
                      zIndex: 5,
                    }}
                  >
                    {currentStory.music.cover_image_url && (
                      <Box
                        component="img"
                        src={getImageUrl(currentStory.music.cover_image_url)}
                        alt={currentStory.music.title}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          fontWeight: 600,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {currentStory.music.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255, 255, 255, 0.8)",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {currentStory.music.artist}
                      </Typography>
                    </Box>
                    <MusicNote sx={{ color: "#D4AF37", fontSize: 20 }} />
                  </Box>
                )}

                {/* Caption positioned relative to actual media element dimensions */}
                {currentStory.caption &&
                  currentStory.metadata?.caption_position &&
                  mediaDimensions.width > 0 && (
                    <Typography
                      variant="body2"
                      sx={{
                        position: "absolute",
                        // Calculate position based on actual media dimensions
                        // Position is stored as percentage, convert to pixels relative to media element
                        left: `${mediaDimensions.offsetX + (mediaDimensions.width * Math.max(10, Math.min(90, currentStory.metadata.caption_position.x))) / 100}px`,
                        top: `${mediaDimensions.offsetY + (mediaDimensions.height * Math.max(10, Math.min(90, currentStory.metadata.caption_position.y))) / 100}px`,
                        transform: "translate(-50%, -50%)",
                        color: "white",
                        textAlign: "center",
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        wordBreak: "break-word",
                        maxWidth: { xs: "85%", sm: "80%" },
                        fontWeight: 600,
                        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                        zIndex: 4,
                      }}
                    >
                      {currentStory.caption}
                    </Typography>
                  )}
              </Box>
            </Box>
          )}

          {/* Navigation Arrows */}
          <IconButton
            onClick={handlePrevStory}
            sx={{
              position: "absolute",
              left: 16,
              color: "white",
              bgcolor: "rgba(0,0,0,0.3)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
            }}
          >
            <ArrowBackIos />
          </IconButton>
          <IconButton
            onClick={handleNextStory}
            sx={{
              position: "absolute",
              right: 16,
              color: "white",
              bgcolor: "rgba(0,0,0,0.3)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
            }}
          >
            <ArrowForwardIos />
          </IconButton>

          {/* Story Owner Actions - Lower Left (only show for story owners) */}
          {isStoryOwner && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: "absolute",
                bottom: 120,
                left: 16,
                zIndex: 5,
              }}
            >
              {/* Viewer Count */}
              <Box
                onClick={handleViewersClick}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(0,0,0,0.6)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.75,
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.8)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Visibility sx={{ fontSize: 18, color: "white" }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {viewCount}
                </Typography>
              </Box>

              {/* Reactions Count - Always visible */}
              <Box
                onClick={() => {
                  setReactionsDialogOpen(true);
                  setLoadingReactions(true);
                  loadStoryReactions(currentStory.id);
                  setTimeout(() => setLoadingReactions(false), 500);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(0,0,0,0.6)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.75,
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.8)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Favorite sx={{ fontSize: 18, color: "#D4AF37" }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {reactionCount}
                </Typography>
              </Box>

              {/* Comments Count - Always visible */}
              <Box
                onClick={() => {
                  setCommentsDialogOpen(true);
                  setLoadingComments(true);
                  loadStoryComments(currentStory.id);
                  setTimeout(() => setLoadingComments(false), 500);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(0,0,0,0.6)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.75,
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.8)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Comment sx={{ fontSize: 18, color: "white" }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {commentCount}
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>

        {/* Caption - Only show default caption for non-text stories without custom position */}
        {currentStory.caption &&
          !isTextStory &&
          !currentStory.metadata?.caption_position && (
            <Box
              sx={{
                position: "absolute",
                bottom: { xs: isStoryOwner ? 200 : 120, sm: 120 },
                left: { xs: isStoryOwner ? 16 : 0, sm: 0 },
                right: 0,
                px: 2,
                pb: { xs: isStoryOwner ? 0.5 : 2, sm: 2 },
                pt: 2,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                zIndex: 4,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "white",
                  textAlign: {
                    xs: isStoryOwner ? "left" : "center",
                    sm: "center",
                  },
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  wordBreak: "break-word",
                  maxWidth: "100%",
                  fontWeight: 400,
                }}
              >
                {currentStory.caption}
              </Typography>
            </Box>
          )}

        {/* Actions - Only show for non-owners */}
        {!isStoryOwner && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                ref={emojiButtonRef}
                onClick={handleEmojiPickerOpen}
                sx={{
                  color: reaction ? "#D4AF37" : "white",
                  position: "relative",
                }}
              >
                {reaction?.emoji ? (
                  <Typography sx={{ fontSize: "1.5rem" }}>
                    {reaction.emoji}
                  </Typography>
                ) : (
                  <EmojiEmotions />
                )}
                {/* Badge showing selected emojis count */}
                {selectedEmojis.length > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bgcolor: "#D4AF37",
                      color: "white",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      border: "2px solid rgba(0,0,0,0.8)",
                    }}
                  >
                    {selectedEmojis.length}
                  </Box>
                )}
              </IconButton>
              <TextField
                placeholder="Send a message..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                size="small"
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "white",
                    "& fieldset": {
                      borderColor: "rgba(255,255,255,0.3)",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#D4AF37",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "white",
                    "&::placeholder": {
                      color: "rgba(255,255,255,0.5)",
                    },
                  },
                }}
              />
              <IconButton
                onClick={handleSendComment}
                disabled={!comment.trim() || sendingComment}
                sx={{ color: "#D4AF37" }}
              >
                <Send />
              </IconButton>
            </Stack>
          </Box>
        )}

        {/* Emoji Picker */}
        <EmojiPicker
          open={emojiPickerOpen}
          anchorEl={emojiPickerAnchor}
          onClose={handleEmojiPickerClose}
          onEmojiSelect={(emoji, clickPosition) =>
            handleReaction(emoji, clickPosition)
          }
          position="top"
          keepOpenOnSelect={true}
        />

        {/* Flying Emoji Animations */}
        {flyingEmojis.map((flyingEmoji) => (
          <Box
            key={flyingEmoji.id}
            sx={{
              position: "fixed",
              left: `${flyingEmoji.startX}px`,
              top: `${flyingEmoji.startY}px`,
              fontSize: "2rem",
              pointerEvents: "none",
              zIndex: 10000,
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

        {/* Viewers Dialog */}
        <Dialog
          open={viewersDialogOpen}
          onClose={() => setViewersDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: "#1a1a1a",
              color: "white",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#1a1a1a",
              color: "white",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Visibility sx={{ color: "#D4AF37" }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Story Viewers ({viewers.length})
              </Typography>
            </Box>
            <IconButton
              onClick={() => setViewersDialogOpen(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: "#1a1a1a", p: 0 }}>
            {loadingViewers ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <CircularProgress sx={{ color: "#D4AF37" }} />
              </Box>
            ) : viewers.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 4,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Visibility sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">No viewers yet</Typography>
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {viewers.map((viewer, index) => (
                  <React.Fragment key={viewer.id}>
                    <ListItem
                      sx={{
                        py: 1.5,
                        "&:hover": {
                          bgcolor: "rgba(255,255,255,0.05)",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={getImageUrl(viewer.photo)}
                          sx={{
                            width: 48,
                            height: 48,
                            border: "2px solid #D4AF37",
                          }}
                        >
                          {viewer.name?.charAt(0)?.toUpperCase() ||
                            viewer.username?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </Avatar>
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
                            <Typography
                              variant="body1"
                              sx={{ color: "white", fontWeight: 600 }}
                            >
                              {viewer.name || viewer.username}
                            </Typography>
                            {viewer.isVerified && (
                              <Verified
                                sx={{ fontSize: 16, color: "#D4AF37" }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{ color: "rgba(255,255,255,0.6)" }}
                          >
                            @{viewer.username}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < viewers.length - 1 && (
                      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
        </Dialog>

        {/* Reactions Dialog */}
        <Dialog
          open={reactionsDialogOpen}
          onClose={() => setReactionsDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: "#1a1a1a",
              color: "white",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#1a1a1a",
              color: "white",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Favorite sx={{ color: "#D4AF37" }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Reactions ({groupReactionsByUser(storyReactions).length})
              </Typography>
            </Box>
            <IconButton
              onClick={() => setReactionsDialogOpen(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: "#1a1a1a", p: 0 }}>
            {loadingReactions ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <CircularProgress sx={{ color: "#D4AF37" }} />
              </Box>
            ) : storyReactions.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 4,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Favorite sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">No reactions yet</Typography>
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {groupReactionsByUser(storyReactions).map(
                  (userGroup, groupIndex) => (
                    <React.Fragment key={userGroup.user?.id || groupIndex}>
                      <ListItem
                        sx={{
                          py: 1.5,
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.05)",
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={getImageUrl(userGroup.user?.photo)}
                            sx={{
                              width: 48,
                              height: 48,
                              border: "2px solid #D4AF37",
                            }}
                          >
                            {userGroup.user?.name?.charAt(0)?.toUpperCase() ||
                              userGroup.user?.username
                                ?.charAt(0)
                                ?.toUpperCase() ||
                              "U"}
                          </Avatar>
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
                              <Typography
                                variant="body1"
                                sx={{ color: "white", fontWeight: 600 }}
                              >
                                {userGroup.user?.name ||
                                  userGroup.user?.username}
                              </Typography>
                              {userGroup.user?.isVerified && (
                                <Verified
                                  sx={{ fontSize: 16, color: "#D4AF37" }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              {/* Display all emojis from this user */}
                              {userGroup.reactions.map((reaction, idx) => (
                                <Box
                                  key={reaction.id || idx}
                                  sx={{ display: "inline-flex", mr: 0.5 }}
                                >
                                  {reaction.emoji ? (
                                    <Typography
                                      variant="body2"
                                      sx={{ fontSize: "1.5rem" }}
                                    >
                                      {reaction.emoji}
                                    </Typography>
                                  ) : (
                                    <Favorite
                                      sx={{ fontSize: 16, color: "#D4AF37" }}
                                    />
                                  )}
                                </Box>
                              ))}
                              <Typography
                                variant="body2"
                                sx={{ color: "rgba(255,255,255,0.6)" }}
                              >
                                @{userGroup.user?.username}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {groupIndex <
                        groupReactionsByUser(storyReactions).length - 1 && (
                        <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
                      )}
                    </React.Fragment>
                  )
                )}
              </List>
            )}
          </DialogContent>
        </Dialog>

        {/* Comments Dialog */}
        <Dialog
          open={commentsDialogOpen}
          onClose={() => setCommentsDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: "#1a1a1a",
              color: "white",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#1a1a1a",
              color: "white",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Comment sx={{ color: "#D4AF37" }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Comments ({groupCommentsByUser(storyComments).length})
              </Typography>
            </Box>
            <IconButton
              onClick={() => setCommentsDialogOpen(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: "#1a1a1a", p: 0, maxHeight: 500 }}>
            {loadingComments ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <CircularProgress sx={{ color: "#D4AF37" }} />
              </Box>
            ) : storyComments.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 4,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Comment sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">No comments yet</Typography>
              </Box>
            ) : (
              <List sx={{ py: 0, overflowY: "auto", maxHeight: 500 }}>
                {groupCommentsByUser(storyComments).map(
                  (userGroup, groupIndex) => (
                    <React.Fragment key={userGroup.user?.id || groupIndex}>
                      <ListItem
                        sx={{
                          py: 1.5,
                          alignItems: "flex-start",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.05)",
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={getImageUrl(userGroup.user?.photo)}
                            sx={{
                              width: 40,
                              height: 40,
                              border: "2px solid #D4AF37",
                            }}
                          >
                            {userGroup.user?.name?.charAt(0)?.toUpperCase() ||
                              userGroup.user?.username
                                ?.charAt(0)
                                ?.toUpperCase() ||
                              "U"}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ color: "white", fontWeight: 600 }}
                              >
                                {userGroup.user?.name ||
                                  userGroup.user?.username}
                              </Typography>
                              {userGroup.user?.isVerified && (
                                <Verified
                                  sx={{ fontSize: 14, color: "#D4AF37" }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,0.5)" }}
                              >
                                {userGroup.comments.length}{" "}
                                {userGroup.comments.length === 1
                                  ? "comment"
                                  : "comments"}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              {userGroup.comments.map((comment, idx) => (
                                <Box
                                  key={comment.id || idx}
                                  sx={{
                                    mb:
                                      idx < userGroup.comments.length - 1
                                        ? 1.5
                                        : 0,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "rgba(255,255,255,0.5)",
                                      display: "block",
                                      mb: 0.5,
                                    }}
                                  >
                                    {new Date(
                                      comment.createdAt
                                    ).toLocaleDateString()}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: "rgba(255,255,255,0.8)",
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {comment.content}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          }
                        />
                      </ListItem>
                      {groupIndex <
                        groupCommentsByUser(storyComments).length - 1 && (
                        <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
                      )}
                    </React.Fragment>
                  )
                )}
              </List>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Dialog>
  );
};

export default StoryViewer;
