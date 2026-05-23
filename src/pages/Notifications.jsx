import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Badge,
  Chip,
  Divider,
  CircularProgress,
  Button,
  Paper,
  Tooltip,
  Checkbox,
  Skeleton,
} from "@mui/material";
import {
  NotificationsActive,
  NotificationsOff,
  Favorite,
  Comment,
  CheckCircle,
  AutoStories,
  Delete,
  CreditCard,
  Warning,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

export default function Notifications({ user }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const token = localStorage.getItem("token");

  // Refs for background polling
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const fetchNotificationsRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!isMountedRef.current) return;
      if (!token) return;

      // Prevent overlapping requests
      if (isFetchingRef.current) {
        console.log("⏸️ [Notifications] Already fetching, skipping...");
        return;
      }

      isFetchingRef.current = true;
      console.log("🔄 [Notifications] Fetching notifications...", {
        isBackgroundRefresh,
      });

      // Only show loading state if it's not a background refresh
      if (!isBackgroundRefresh) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (!isMountedRef.current) return;

        if (data.success) {
          const newNotifications = data.data || [];
          
          // During background refresh, only update if notifications actually changed
          if (isBackgroundRefresh) {
            setNotifications((prevNotifications) => {
              // Quick check: if count is different, definitely update
              if (prevNotifications.length !== newNotifications.length) {
                return newNotifications;
              }
              
              // Check if any notification IDs changed or if any notification content changed
              const prevIds = new Set(prevNotifications.map((n) => n.id));
              const newIds = new Set(newNotifications.map((n) => n.id));
              
              // If IDs are different, update
              if (prevIds.size !== newIds.size || 
                  !Array.from(prevIds).every(id => newIds.has(id))) {
                return newNotifications;
              }
              
              // Check if any notification properties changed (isRead, message, etc.)
              const hasChanges = prevNotifications.some((prevNotif) => {
                const newNotif = newNotifications.find((n) => n.id === prevNotif.id);
                if (!newNotif) return true; // Notification was removed
                
                // Compare key properties that might change
                return (
                  prevNotif.isRead !== newNotif.isRead ||
                  prevNotif.message !== newNotif.message ||
                  prevNotif.title !== newNotif.title ||
                  prevNotif.createdAt !== newNotif.createdAt
                );
              });
              
              // Only update if there are actual changes
              if (hasChanges) {
                return newNotifications;
              }
              
              // No changes detected, return previous array to prevent re-render
              return prevNotifications;
            });
            
            // During background refresh, preserve selections for notifications that still exist
            setSelectedIds((prevSelected) => {
              if (prevSelected.size === 0) return prevSelected; // No selections to preserve
              
              const newNotificationIds = new Set(newNotifications.map((n) => n.id));
              const filteredSelected = new Set(
                Array.from(prevSelected).filter((id) => newNotificationIds.has(id))
              );
              
              // Only update if the size changed (some notifications were removed)
              // This prevents unnecessary re-renders when all selections are still valid
              if (filteredSelected.size !== prevSelected.size) {
                return filteredSelected;
              }
              
              // If all selections are still valid, return the same Set to prevent re-render
              return prevSelected;
            });
            // Keep selection mode active during background refresh if it was already active
            // Don't change selectionMode state during background refresh
          } else {
            // Initial load or manual refresh - always update
            setNotifications(newNotifications);
            setSelectedIds(new Set());
            setSelectionMode(false);
          }
        } else {
          // Only set error if it's not a background refresh
          if (!isBackgroundRefresh) {
            setError("Failed to load notifications");
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("Error fetching notifications:", err);
        // Only set error if it's not a background refresh
        if (!isBackgroundRefresh) {
          setError("Failed to load notifications");
        }
      } finally {
        if (isMountedRef.current) {
          // Only update loading state if it's not a background refresh
          if (!isBackgroundRefresh) {
            setLoading(false);
          }
          isFetchingRef.current = false;
          console.log("🏁 [Notifications] Fetch completed");
        }
      }
    },
    [token]
  );

  // Store the latest fetchNotifications in a ref to avoid dependency issues
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  // Initial fetch - only run once on mount
  useEffect(() => {
    if (isMountedRef.current) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Poll for new notifications every 30 seconds (background refresh)
  useEffect(() => {
    if (!isMountedRef.current) return;

    const pollInterval = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(pollInterval);
        return;
      }
      // Only refresh if not currently fetching
      if (!isFetchingRef.current) {
        console.log(
          "🔄 [Notifications] Polling for new notifications (background refresh)..."
        );
        // Pass true to indicate this is a background refresh (no loading state)
        fetchNotificationsRef.current(true);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, []); // Only set up once on mount

  const markAsRead = async (notificationId) => {
    if (!token) return;

    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    const unreadNotifications = notifications.filter((n) => !n.isRead);
    const promises = unreadNotifications.map((notif) => markAsRead(notif.id));
    await Promise.all(promises);
  };

  // Bulk selection functions
  const toggleSelection = (notificationId) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectionMode(true);
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
      setSelectionMode(false);
    } else {
      setSelectionMode(true);
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const isAllSelected = notifications.length > 0 && selectedIds.size === notifications.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < notifications.length;
  
  // Check if any selected notifications are unread
  const hasUnreadSelected = notifications.some(
    (notif) => selectedIds.has(notif.id) && !notif.isRead
  );

  // Bulk delete selected notifications
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const result = await Swal.fire({
      title: `Delete ${count} notification${count > 1 ? "s" : ""}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, delete ${count}`,
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

    if (!result.isConfirmed) return;

    const idsToDelete = Array.from(selectedIds);
    setDeletingIds(new Set(idsToDelete));
    
    // Optimistically remove from UI
    const notificationsToDelete = notifications.filter((n) =>
      selectedIds.has(n.id)
    );
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());

    try {
      const deletePromises = idsToDelete.map((id) =>
        fetch(`/api/notifications/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
      );

      const responses = await Promise.all(deletePromises);
      const results = await Promise.all(
        responses.map((r) => r.json())
      );

      const successCount = results.filter((r) => r.success).length;
      const failedCount = count - successCount;

      if (failedCount === 0) {
        // Small delay to ensure confirmation dialog is fully closed and UI updated
        setTimeout(() => {
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: `${successCount} notification${successCount > 1 ? "s" : ""} deleted successfully.`,
            confirmButtonColor: "#D4AF37",
            timer: 3000,
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
        }, 200);
      } else {
        // Revert optimistic update for failed deletions
        setNotifications((prev) => {
          const failedIds = idsToDelete.filter(
            (id, index) => !results[index].success
          );
          const failedNotifications = notificationsToDelete.filter((n) =>
            failedIds.includes(n.id)
          );
          return [...prev, ...failedNotifications].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
        });

        Swal.fire({
          icon: "warning",
          title: "Partial success",
          text: `${successCount} deleted, ${failedCount} failed.`,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
          width: 300,
          padding: "1rem",
          confirmButtonColor: "#D4AF37",
        });
      }
    } catch (err) {
      console.error("Error deleting notifications:", err);
      // Revert optimistic update
      setNotifications((prev) => {
        return [...prev, ...notificationsToDelete].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      });

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to delete notifications. Please try again.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
        width: 300,
        padding: "1rem",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setDeletingIds(new Set());
    }
  };

  // Bulk mark selected as read
  const markSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    const idsToMark = Array.from(selectedIds);
    const promises = idsToMark.map((id) => markAsRead(id));
    await Promise.all(promises);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const deleteNotification = async (notificationId) => {
    if (!token) return;

    // Show confirmation dialog
    const result = await Swal.fire({
      title: "Delete notification?",
      text: "This action cannot be undone.",
      icon: "warning",
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

    if (!result.isConfirmed) return;

    // Optimistically remove from UI
    const notificationToDelete = notifications.find(
      (n) => n.id === notificationId
    );
    const originalIndex = notifications.findIndex((n) => n.id === notificationId);
    
    setDeletingIds((prev) => new Set(prev).add(notificationId));
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    // Remove from selection if it was selected
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Notification has been deleted successfully",
          confirmButtonColor: "#D4AF37",
          timer: 3000,
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
      } else {
        // Revert optimistic update on error - restore to original position
        setNotifications((prev) => {
          const newList = [...prev];
          newList.splice(originalIndex, 0, notificationToDelete);
          return newList;
        });

        Swal.fire({
          icon: "error",
          title: "Failed to delete",
          text: data.message || "Unable to delete notification. Please try again.",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
          width: 300,
          padding: "1rem",
          confirmButtonColor: "#D4AF37",
          customClass: {
            popup: "swal-notification-toast",
          },
          didOpen: () => {
            const swal = document.querySelector(".swal-notification-toast");
            if (swal) {
              swal.style.borderRadius = "12px";
              swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
            }
          },
        });
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      // Revert optimistic update on error - restore to original position
      setNotifications((prev) => {
        const newList = [...prev];
        newList.splice(originalIndex, 0, notificationToDelete);
        return newList;
      });

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to delete notification. Please try again.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
        width: 300,
        padding: "1rem",
        confirmButtonColor: "#D4AF37",
        customClass: {
          popup: "swal-notification-toast",
        },
        didOpen: () => {
          const swal = document.querySelector(".swal-notification-toast");
          if (swal) {
            swal.style.borderRadius = "12px";
            swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
          }
        },
      });
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const getNotificationIcon = (title) => {
    if (title?.includes("Reaction")) {
      return <Favorite sx={{ color: "#e91e63" }} />;
    }
    if (title?.includes("Comment")) {
      return <Comment sx={{ color: "#2196f3" }} />;
    }
    if (title?.includes("Story")) {
      return <AutoStories sx={{ color: "#D4AF37" }} />;
    }
    if (title?.includes("Subscription") || title?.includes("Expiring") || title?.includes("Expired")) {
      return title?.includes("Expired") ? (
        <Warning sx={{ color: "#d32f2f" }} />
      ) : (
        <CreditCard sx={{ color: "#D4AF37" }} />
      );
    }
    return <NotificationsActive sx={{ color: "#D4AF37" }} />;
  };

  const handleNotificationClick = (notification) => {
    // If it's a subscription notification, navigate to pricing page
    if (
      notification.title?.includes("Subscription") ||
      notification.title?.includes("Expiring") ||
      notification.title?.includes("Expired")
    ) {
      navigate("/pricing");
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Box>
      <Card
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: { xs: 1, sm: 2 },
            mb: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 0.5,
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsActive
                  sx={{
                    fontSize: { xs: "1.25rem", sm: "1.5rem" },
                    color: "#D4AF37",
                  }}
                />
              </Badge>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.5rem", sm: "2.125rem" },
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1.2,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                Notifications
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: { xs: 0.75, sm: 1.25 },
                  flexShrink: 0,
                }}
              >
                {loading && notifications.length === 0 ? (
                  <Skeleton
                    variant="rectangular"
                    width={80}
                    height={32}
                    sx={{
                      borderRadius: "4px",
                      minWidth: { xs: "auto", sm: "64px" },
                    }}
                  />
                ) : notifications.length > 0 ? (
                  <>
                    {selectionMode ? (
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isSomeSelected}
                        onChange={toggleSelectionMode}
                        sx={{
                          color: "#D4AF37",
                          "&.Mui-checked": {
                            color: "#D4AF37",
                          },
                          "&.MuiCheckbox-indeterminate": {
                            color: "#D4AF37",
                          },
                          "& .MuiSvgIcon-root": {
                            fontSize: { xs: "1rem", sm: "1.5rem" },
                          },
                        }}
                      />
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectionMode(true);
                          selectAll();
                        }}
                        sx={{
                          bgcolor: "#D4AF37",
                          color: "white",
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          px: { xs: 0.5, sm: 2 },
                          py: { xs: 0.25, sm: 0.75 },
                          minWidth: { xs: "auto", sm: "64px" },
                          whiteSpace: "nowrap",
                          lineHeight: 1.2,
                          "&:hover": {
                            bgcolor: "#B8941F",
                          },
                        }}
                      >
                        Select All
                      </Button>
                    )}
                    {selectionMode && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: "0.625rem", sm: "0.875rem" },
                          color: "rgba(26, 26, 26, 0.7)",
                          display: { xs: "none", sm: "block" },
                        }}
                      >
                        {selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : "Select all"}
                      </Typography>
                    )}
                  </>
                ) : null}
              </Box>
            </Box>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(26, 26, 26, 0.7)",
                fontSize: { xs: "0.8125rem", sm: "1rem" },
                lineHeight: 1.4,
              }}
            >
              Stay updated with your latest activity
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: { xs: 1, sm: 1.5 },
              flexWrap: "wrap",
              width: { xs: "100%", sm: "auto" },
              mb: { xs: 2, sm: 3 },
              mt: { xs: 1, sm: 1.5 },
            }}
          >
            {selectedIds.size > 0 ? (
              <>
                {hasUnreadSelected && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={markSelectedAsRead}
                    sx={{
                      bgcolor: "#D4AF37",
                      color: "white",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      "&:hover": {
                        bgcolor: "#B8941F",
                      },
                    }}
                  >
                    Mark Read ({selectedIds.size})
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="small"
                  onClick={deleteSelected}
                  sx={{
                    bgcolor: "#D4AF37",
                    color: "white",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    "&:hover": {
                      bgcolor: "#B8941F",
                    },
                  }}
                >
                  Delete ({selectedIds.size})
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    deselectAll();
                    setSelectionMode(false);
                  }}
                  sx={{
                    borderColor: "rgba(26, 26, 26, 0.3)",
                    color: "rgba(26, 26, 26, 0.8)",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    "&:hover": {
                      borderColor: "rgba(26, 26, 26, 0.5)",
                      bgcolor: "rgba(26, 26, 26, 0.05)",
                    },
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              unreadCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={markAllAsRead}
                  sx={{
                    borderColor: "#D4AF37",
                    color: "#D4AF37",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    "&:hover": {
                      borderColor: "#B8941F",
                      backgroundColor: "rgba(212, 175, 55, 0.1)",
                    },
                  }}
                >
                  Mark all as read
                </Button>
              )
            )}
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading && notifications.length === 0 ? (
          <List sx={{ p: 0 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <React.Fragment key={`skeleton-${index}`}>
                <Paper
                  elevation={0}
                  sx={{
                    mb: { xs: 0.5, sm: 1 },
                    backgroundColor: "transparent",
                    border: "2px solid transparent",
                  }}
                >
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      px: { xs: 1, sm: 2 },
                      py: { xs: 1.5, sm: 2 },
                    }}
                    secondaryAction={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: { xs: 0.5, sm: 1 },
                        }}
                      >
                        <Skeleton
                          variant="circular"
                          width={32}
                          height={32}
                          sx={{ mr: { xs: 0.5, sm: 1 } }}
                        />
                        <Skeleton variant="circular" width={32} height={32} />
                      </Box>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: { xs: 44, sm: 56 } }}>
                      <Skeleton
                        variant="circular"
                        width={48}
                        height={48}
                        sx={{
                          width: { xs: 40, sm: 48 },
                          height: { xs: 40, sm: 48 },
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      sx={{
                        pr: { xs: "48px", sm: "56px" },
                      }}
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "flex-start", sm: "center" },
                            gap: { xs: 0.5, sm: 1 },
                            mb: 0.5,
                          }}
                        >
                          <Skeleton
                            variant="text"
                            width="60%"
                            height={24}
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          />
                          <Skeleton
                            variant="rectangular"
                            width={40}
                            height={18}
                            sx={{
                              borderRadius: "4px",
                              height: { xs: 16, sm: 18 },
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Skeleton
                            variant="text"
                            width="90%"
                            height={20}
                            sx={{
                              fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                              mb: 0.5,
                            }}
                          />
                          <Skeleton
                            variant="text"
                            width="40%"
                            height={16}
                            sx={{
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
                {index < 4 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : notifications.length === 0 ? (
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: { xs: 4, sm: 6 },
                color: "rgba(26, 26, 26, 0.5)",
              }}
            >
              <NotificationsOff sx={{ fontSize: { xs: 48, sm: 64 }, mb: 2 }} />
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                  mb: 1,
                  textAlign: "center",
                }}
              >
                No notifications
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                  textAlign: "center",
                  px: { xs: 2, sm: 0 },
                }}
              >
                You're all caught up! New notifications will appear here.
              </Typography>
            </Box>
          </CardContent>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <Paper
                  elevation={0}
                  onClick={() => {
                    if (!selectionMode) {
                      handleNotificationClick(notification);
                    }
                  }}
                  sx={{
                    mb: { xs: 0.5, sm: 1 },
                    backgroundColor: selectedIds.has(notification.id)
                      ? "rgba(212, 175, 55, 0.15)"
                      : notification.isRead
                      ? "transparent"
                      : "rgba(212, 175, 55, 0.05)",
                    border: selectedIds.has(notification.id)
                      ? "2px solid #D4AF37"
                      : "2px solid transparent",
                    transition: "all 0.3s ease-in-out",
                    opacity: deletingIds.has(notification.id) ? 0.5 : 1,
                    transform: deletingIds.has(notification.id)
                      ? "scale(0.95)"
                      : "scale(1)",
                    cursor:
                      (notification.title?.includes("Subscription") ||
                        notification.title?.includes("Expiring") ||
                        notification.title?.includes("Expired")) &&
                      !selectionMode
                        ? "pointer"
                        : "default",
                    "&:hover": {
                      backgroundColor: selectedIds.has(notification.id)
                        ? "rgba(212, 175, 55, 0.2)"
                        : "rgba(212, 175, 55, 0.1)",
                    },
                  }}
                >
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      px: { xs: 1, sm: 2 },
                      py: { xs: 1.5, sm: 2 },
                    }}
                    secondaryAction={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: { xs: 0.5, sm: 1 },
                        }}
                      >
                        {deletingIds.has(notification.id) ? (
                          <CircularProgress
                            size={20}
                            sx={{ color: "#D4AF37", mr: { xs: 0.5, sm: 1 } }}
                          />
                        ) : (
                          <>
                            {!notification.isRead && (
                              <Tooltip title="Mark as read" arrow>
                                <IconButton
                                  edge="end"
                                  onClick={() => markAsRead(notification.id)}
                                  sx={{
                                    color: "#D4AF37",
                                    p: { xs: 0.75, sm: 1 },
                                    "&:hover": {
                                      backgroundColor: "rgba(212, 175, 55, 0.1)",
                                    },
                                  }}
                                  size="small"
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete notification" arrow>
                              <IconButton
                                edge="end"
                                onClick={() => deleteNotification(notification.id)}
                                sx={{
                                  color: "rgba(26, 26, 26, 0.6)",
                                  p: { xs: 0.75, sm: 1 },
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    color: "#d32f2f",
                                    backgroundColor: "rgba(211, 47, 47, 0.1)",
                                    transform: "scale(1.1)",
                                  },
                                }}
                                size="small"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    }
                  >
                    {selectionMode && (
                      <Checkbox
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          color: "#D4AF37",
                          "&.Mui-checked": {
                            color: "#D4AF37",
                          },
                          mr: { xs: 1, sm: 1.5 },
                          p: 0.5,
                        }}
                      />
                    )}
                    <ListItemAvatar sx={{ minWidth: { xs: 44, sm: 56 } }}>
                      <Avatar
                        sx={{
                          bgcolor: notification.isRead
                            ? "rgba(212, 175, 55, 0.2)"
                            : "#D4AF37",
                          width: { xs: 40, sm: 48 },
                          height: { xs: 40, sm: 48 },
                          "& svg": {
                            fontSize: { xs: "20px", sm: "24px" },
                          },
                        }}
                      >
                        {getNotificationIcon(notification.title)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{
                        pr: {
                          xs: selectionMode ? "88px" : "48px",
                          sm: selectionMode ? "96px" : "56px",
                        },
                      }}
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "flex-start", sm: "center" },
                            gap: { xs: 0.5, sm: 1 },
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                              fontWeight: notification.isRead ? 500 : 700,
                              color: notification.isRead
                                ? "rgba(26, 26, 26, 0.9)"
                                : "#000000",
                              lineHeight: 1.4,
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.isRead && (
                            <Chip
                              label="New"
                              size="small"
                              sx={{
                                height: { xs: 16, sm: 18 },
                                fontSize: { xs: "0.6rem", sm: "0.65rem" },
                                bgcolor: "#D4AF37",
                                color: "white",
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                              fontWeight: notification.isRead ? 400 : 600,
                              color: notification.isRead
                                ? "rgba(26, 26, 26, 0.7)"
                                : "#000000",
                              mb: 0.5,
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                              color: "rgba(26, 26, 26, 0.5)",
                            }}
                          >
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}
