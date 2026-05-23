import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Avatar,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  Close,
  Verified,
  LocationOn,
  Cake,
  Person,
  ChevronLeft,
  ChevronRight,
  PhotoCamera,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { getDisplayInitial, getDisplayName } from "../utils/userDisplay";

export default function ViewProfile({ open, onClose, userId, user }) {
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (open && userId && userId !== user?.id) {
      fetchProfile();
    }
  }, [open, userId, user?.id]);

  // Reset image index when profile user changes
  useEffect(() => {
    if (profileUser) {
      setCurrentImageIndex(0);
    }
  }, [profileUser]);

  const fetchProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/public/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 402) {
        // Subscription required
        Swal.fire({
          icon: "warning",
          title: "Subscription Required",
          html: `<p>Active subscription required to view profiles.</p><p>Please subscribe to a plan to continue.</p>`,
          confirmButtonText: "View Plans",
          cancelButtonText: "Cancel",
          showCancelButton: true,
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/pricing";
          }
        });
        onClose();
        return;
      }

      if (data.success) {
        setProfileUser(data.data);
        // Track profile view
        trackView();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to load profile",
          confirmButtonColor: "#D4AF37",
        });
        onClose();
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load profile",
        confirmButtonColor: "#D4AF37",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/public/users/${userId}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Silently track - no need to show message
    } catch (error) {
      console.error("Error tracking view:", error);
      // Don't show error to user - tracking is optional
    }
  };

  const buildImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("uploads/")) return `/${imagePath}`;
    if (imagePath.startsWith("/uploads/")) return imagePath;
    if (imagePath.startsWith("profiles/")) return `/uploads/${imagePath}`;
    return imagePath;
  };

  // Get all images for a user (main photo + photos array)
  const getAllImages = (userData) => {
    const images = [];
    // Add main photo if it exists
    if (userData.photo) {
      images.push(buildImageUrl(userData.photo));
    }
    // Add photos from array if they exist (only approved photos)
    if (userData.photos && Array.isArray(userData.photos)) {
      userData.photos.forEach((photo) => {
        // Only include approved photos
        if (photo.path && photo.moderation_status === "approved") {
          images.push(buildImageUrl(photo.path));
        }
      });
    }
    return images;
  };

  if (!open || !userId) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(212, 175, 55, 0.3)",
          border: "2px solid rgba(212, 175, 55, 0.3)",
          maxHeight: "95vh",
          margin: { xs: 2, sm: 4 },
          maxWidth: "500px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
          pt: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            background: "linear-gradient(45deg, #D4AF37, #B8941F)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
          }}
        >
          Profile
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
            }}
          >
            <CircularProgress sx={{ color: "#D4AF37" }} />
          </Box>
        ) : profileUser ? (
          <Box>
            {/* Profile Header */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Avatar
                src={buildImageUrl(profileUser.photo)}
                sx={{
                  width: { xs: 80, sm: 100 },
                  height: { xs: 80, sm: 100 },
                  bgcolor: "#D4AF37",
                  fontSize: { xs: "2rem", sm: "2.5rem" },
                  fontWeight: 700,
                  border: "3px solid rgba(212, 175, 55, 0.3)",
                  boxShadow: "0 8px 24px rgba(212, 175, 55, 0.2)",
                  mx: "auto",
                  mb: 2,
                }}
              >
                {!profileUser.photo &&
                  getDisplayInitial(profileUser, { fallback: "U" })}
              </Avatar>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: "#1a1a1a",
                }}
              >
                {getDisplayName(profileUser, { fallback: "Member" })}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}
              >
                {profileUser.isVerified && (
                  <Chip
                    icon={<Verified sx={{ color: "#D4AF37 !important" }} />}
                    label="Verified"
                    sx={{
                      bgcolor: "rgba(212, 175, 55, 0.15)",
                      color: "#1a1a1a",
                      fontWeight: 600,
                    }}
                  />
                )}
                <Chip
                  label={profileUser.category || "Regular"}
                  sx={{
                    bgcolor: "rgba(212, 175, 55, 0.15)",
                    color: "#1a1a1a",
                    fontWeight: 600,
                  }}
                />
                {profileUser.is_online ? (
                  <Chip
                    label="Online"
                    sx={{
                      bgcolor: "rgba(199, 233, 208, 0.3)",
                      color: "#1a1a1a",
                      fontWeight: 600,
                    }}
                  />
                ) : (
                  <Chip
                    label="Offline"
                    sx={{
                      bgcolor: "rgba(26, 26, 26, 0.1)",
                      color: "rgba(26, 26, 26, 0.7)",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Stack>
            </Box>

            <Divider sx={{ my: 2, borderColor: "rgba(212, 175, 55, 0.2)" }} />

            {/* Profile Information */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {profileUser.age && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Cake sx={{ color: "#D4AF37" }} />
                  <Typography variant="body1">
                    <strong>Age:</strong> {profileUser.age}
                  </Typography>
                </Box>
              )}

              {profileUser.gender && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Person sx={{ color: "#D4AF37" }} />
                  <Typography variant="body1">
                    <strong>Gender:</strong> {profileUser.gender}
                  </Typography>
                </Box>
              )}

              {profileUser.county && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LocationOn sx={{ color: "#D4AF37" }} />
                  <Typography variant="body1">
                    <strong>County:</strong> {profileUser.county}
                  </Typography>
                </Box>
              )}

              {profileUser.bio && (
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(26, 26, 26, 0.7)", mb: 1 }}
                  >
                    <strong>Bio:</strong>
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: "rgba(212, 175, 55, 0.05)",
                      border: "1px solid rgba(212, 175, 55, 0.2)",
                    }}
                  >
                    {profileUser.bio}
                  </Typography>
                </Box>
              )}

              {profileUser.createdAt && (
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(26, 26, 26, 0.7)" }}
                  >
                    <strong>Member since:</strong>{" "}
                    {new Date(profileUser.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Photo Gallery Section */}
            {(() => {
              const allImages = getAllImages(profileUser);
              if (allImages.length === 0) return null;

              return (
                <>
                  <Divider
                    sx={{ my: 3, borderColor: "rgba(212, 175, 55, 0.2)" }}
                  />
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        mb: 2,
                        fontSize: { xs: "1rem", sm: "1.125rem" },
                      }}
                    >
                      Gallery ({allImages.length}{" "}
                      {allImages.length === 1 ? "photo" : "photos"})
                    </Typography>

                    {/* Gallery Container */}
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        borderRadius: "12px",
                        overflow: "hidden",
                        bgcolor: "rgba(212, 175, 55, 0.05)",
                        minHeight: { xs: "150px", sm: "200px" },
                        maxHeight: { xs: "200px", sm: "250px" },
                        aspectRatio: "1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* Main Image Display */}
                      {allImages.map((image, index) => (
                        <Box
                          key={`gallery-img-${index}`}
                          component="img"
                          src={image}
                          loading="lazy"
                          decoding="async"
                          fetchpriority="low"
                          alt={`Gallery photo ${index + 1}`}
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: currentImageIndex === index ? 1 : 0,
                            transition: "opacity 0.5s ease-in-out",
                            zIndex: currentImageIndex === index ? 1 : 0,
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ))}

                      {/* Navigation Arrows */}
                      {allImages.length > 1 && (
                        <>
                          <IconButton
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === 0 ? allImages.length - 1 : prev - 1
                              )
                            }
                            sx={{
                              position: "absolute",
                              left: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              bgcolor: "rgba(255, 255, 255, 0.9)",
                              color: "#1a1a1a",
                              zIndex: 10,
                              "&:hover": {
                                bgcolor: "rgba(255, 255, 255, 1)",
                                transform: "translateY(-50%) scale(1.1)",
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <ChevronLeft />
                          </IconButton>
                          <IconButton
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === allImages.length - 1 ? 0 : prev + 1
                              )
                            }
                            sx={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              bgcolor: "rgba(255, 255, 255, 0.9)",
                              color: "#1a1a1a",
                              zIndex: 10,
                              "&:hover": {
                                bgcolor: "rgba(255, 255, 255, 1)",
                                transform: "translateY(-50%) scale(1.1)",
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <ChevronRight />
                          </IconButton>
                        </>
                      )}

                      {/* Image Counter */}
                      {allImages.length > 1 && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 12,
                            left: "50%",
                            transform: "translateX(-50%)",
                            bgcolor: "rgba(0, 0, 0, 0.6)",
                            color: "#fff",
                            px: 2,
                            py: 0.5,
                            borderRadius: "16px",
                            zIndex: 10,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {currentImageIndex + 1} / {allImages.length}
                        </Box>
                      )}

                      {/* No Image Placeholder */}
                      {allImages.length === 0 && (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(26, 26, 26, 0.5)",
                          }}
                        >
                          <PhotoCamera
                            sx={{ fontSize: 48, mb: 1, opacity: 0.3 }}
                          />
                          <Typography variant="body2">
                            No photos available
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Thumbnail Strip (if more than 1 image) */}
                    {allImages.length > 1 && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mt: 2,
                          overflowX: "auto",
                          pb: 1,
                          "&::-webkit-scrollbar": {
                            height: "6px",
                          },
                          "&::-webkit-scrollbar-track": {
                            background: "rgba(212, 175, 55, 0.1)",
                            borderRadius: "3px",
                          },
                          "&::-webkit-scrollbar-thumb": {
                            background: "rgba(212, 175, 55, 0.5)",
                            borderRadius: "3px",
                            "&:hover": {
                              background: "rgba(212, 175, 55, 0.7)",
                            },
                          },
                          scrollbarWidth: "thin",
                        }}
                      >
                        {allImages.map((image, index) => (
                          <Box
                            key={`thumb-${index}`}
                            onClick={() => setCurrentImageIndex(index)}
                            sx={{
                              position: "relative",
                              flexShrink: 0,
                              width: 60,
                              height: 60,
                              borderRadius: "8px",
                              overflow: "hidden",
                              cursor: "pointer",
                              border:
                                currentImageIndex === index
                                  ? "2px solid #D4AF37"
                                  : "2px solid transparent",
                              opacity: currentImageIndex === index ? 1 : 0.7,
                              transition: "all 0.2s ease",
                              "&:hover": {
                                opacity: 1,
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            <Box
                              component="img"
                              src={image}
                              loading="lazy"
                              decoding="async"
                              fetchpriority="low"
                              alt={`Thumbnail ${index + 1}`}
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </>
              );
            })()}
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
