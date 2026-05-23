import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Close,
  CameraAlt,
  Image,
  VideoLibrary,
  LocationOn,
  TextFields,
  EmojiEmotions,
  MusicNote,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import EmojiPicker from "../EmojiPicker/EmojiPicker";
import MusicPicker from "./MusicPicker";

// Predefined background colors for text stories (similar to Facebook)
const TEXT_STORY_COLORS = [
  {
    name: "Purple",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    name: "Blue",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    name: "Pink",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    name: "Orange",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    name: "Green",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    name: "Red",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    name: "Teal",
    gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  },
  {
    name: "Gold",
    gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  },
  {
    name: "Dark Blue",
    gradient: "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)",
  },
  {
    name: "Coral",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  },
  {
    name: "Lavender",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    name: "Sunset",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  },
];

const StoryCreator = ({ open, onClose, onStoryCreated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [storyType, setStoryType] = useState("media"); // "media" or "text"
  const [textBackgroundColor, setTextBackgroundColor] = useState(
    TEXT_STORY_COLORS[0].gradient
  );
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationCoords, setLocationCoords] = useState({
    latitude: null,
    longitude: null,
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const [captionPosition, setCaptionPosition] = useState({ x: 50, y: 50 }); // Position as percentages
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const previewContainerRef = useRef(null);
  const dialogRef = useRef(null);
  const [dialogContainer, setDialogContainer] = useState(null);
  const [mediaDimensions, setMediaDimensions] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });

  // Get user's current location when location toggle is enabled
  useEffect(() => {
    let isMounted = true;

    if (locationEnabled && !locationCoords.latitude && !gettingLocation) {
      setGettingLocation(true);
      console.log("📍 [StoryCreator] Requesting user location...");

      if (!navigator.geolocation) {
        console.log("❌ [StoryCreator] Geolocation not supported");
        if (isMounted) {
          Swal.fire({
            icon: "error",
            title: "Location Not Supported",
            text: "Your browser doesn't support location services",
            confirmButtonColor: "#D4AF37",
          });
          setLocationEnabled(false);
          setGettingLocation(false);
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          const { latitude, longitude } = position.coords;
          console.log("✅ [StoryCreator] Location obtained:", {
            latitude,
            longitude,
          });
          setLocationCoords({ latitude, longitude });
          setGettingLocation(false);
        },
        (error) => {
          if (!isMounted) return;
          console.error("❌ [StoryCreator] Location error:", error);
          let errorMessage = "Unable to get your location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location permission denied. Please enable location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
          Swal.fire({
            icon: "error",
            title: "Location Error",
            text: errorMessage,
            confirmButtonColor: "#D4AF37",
          });
          setLocationEnabled(false);
          setLocationCoords({ latitude: null, longitude: null });
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else if (!locationEnabled && locationCoords.latitude) {
      // Reset location when toggle is turned off
      if (isMounted) {
        setLocationCoords({ latitude: null, longitude: null });
        setGettingLocation(false);
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [locationEnabled]);

  // Reset caption position when file changes or dialog closes
  useEffect(() => {
    if (!file) {
      setCaptionPosition({ x: 50, y: 50 });
    }
  }, [file]);

  // Reset caption position when dialog closes
  useEffect(() => {
    if (!open) {
      setCaptionPosition({ x: 50, y: 50 });
      setCaption("");
      setIsDraggingCaption(false);
      setMediaDimensions({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
      setDialogContainer(null);
    }
  }, [open]);

  // Find Dialog Paper element when dialog opens
  useEffect(() => {
    if (open) {
      // Find the Dialog's Paper element (Material-UI Dialog uses this class)
      const findDialogPaper = () => {
        const papers = document.querySelectorAll('[role="dialog"]');
        if (papers.length > 0) {
          // Get the most recent dialog (should be this one)
          const dialogPaper = Array.from(papers).find(
            (paper) => paper.querySelector('[aria-labelledby*="dialog-title"]')
          ) || papers[papers.length - 1];
          if (dialogPaper) {
            setDialogContainer(dialogPaper);
          }
        }
      };
      // Small delay to ensure Dialog is rendered
      const timer = setTimeout(findDialogPaper, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Calculate media dimensions for caption positioning
  const calculateMediaDimensions = () => {
    if (previewContainerRef.current && file) {
      const container = previewContainerRef.current;
      const mediaElement = container.querySelector("img, video");
      if (mediaElement) {
        const containerRect = container.getBoundingClientRect();
        const mediaRect = mediaElement.getBoundingClientRect();
        const offsetX = mediaRect.left - containerRect.left;
        const offsetY = mediaRect.top - containerRect.top;
        setMediaDimensions({
          width: mediaRect.width,
          height: mediaRect.height,
          offsetX,
          offsetY,
        });
      }
    }
  };

  // Recalculate dimensions when preview changes
  useEffect(() => {
    if (preview) {
      // Wait for media to load
      const timer = setTimeout(() => {
        calculateMediaDimensions();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [preview, file]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const isImage = selectedFile.type.startsWith("image/");
    const isVideo = selectedFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Please select an image or video file",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "File size must be less than 50MB",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    setFile(selectedFile);

    // Create preview
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPreview(canvas.toDataURL());
      };
      video.src = URL.createObjectURL(selectedFile);
    }
  };

  // Handle caption dragging (mouse and touch)
  const handleCaptionMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingCaption(true);
  };

  const handleCaptionTouchStart = (e) => {
    e.preventDefault();
    setIsDraggingCaption(true);
  };

  // Add global mouse and touch event listeners for dragging
  useEffect(() => {
    if (!isDraggingCaption) return;

    const handleMove = (clientX, clientY) => {
      if (!previewContainerRef.current) return;

      const container = previewContainerRef.current;
      const containerRect = container.getBoundingClientRect();

      // Find the actual img or video DOM element (not the Box wrapper)
      const mediaElement = container.querySelector("img, video");

      if (mediaElement) {
        const mediaRect = mediaElement.getBoundingClientRect();

        // Calculate position relative to the actual rendered media element
        const relativeX = clientX - mediaRect.left;
        const relativeY = clientY - mediaRect.top;

        // Calculate as percentage of media element dimensions
        const x = (relativeX / mediaRect.width) * 100;
        const y = (relativeY / mediaRect.height) * 100;

        // Clamp values with margins to keep caption within visible media bounds
        // Use tighter margins (10%) to ensure caption doesn't go outside
        setCaptionPosition({
          x: Math.max(10, Math.min(90, x)),
          y: Math.max(10, Math.min(90, y)),
        });
      } else {
        // Fallback to container if no media element found
        const x = ((clientX - containerRect.left) / containerRect.width) * 100;
        const y = ((clientY - containerRect.top) / containerRect.height) * 100;
        setCaptionPosition({
          x: Math.max(10, Math.min(90, x)),
          y: Math.max(10, Math.min(90, y)),
        });
      }
    };

    const handleMouseMove = (e) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDraggingCaption(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDraggingCaption]);

  const handleCreateStory = async () => {
    console.log("📸 [StoryCreator] Share Story button clicked");

    // For text stories, caption is required
    if (storyType === "text" && !caption.trim()) {
      console.log("❌ [StoryCreator] No text provided for text story");
      Swal.fire({
        icon: "warning",
        title: "Text Required",
        text: "Please enter some text for your story",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    // For media stories, file is required
    if (storyType === "media" && !file) {
      console.log("❌ [StoryCreator] No file selected");
      Swal.fire({
        icon: "warning",
        title: "No Media Selected",
        text: "Please select a photo or video",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.log("❌ [StoryCreator] No token found");
      Swal.fire({
        icon: "error",
        title: "Login Required",
        text: "Please login to create a story",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    console.log("📤 [StoryCreator] Starting story upload...", {
      storyType,
      fileName: file?.name || "N/A (text story)",
      fileType: file?.type || "text",
      fileSize: file?.size || 0,
      hasCaption: !!caption.trim(),
      locationEnabled,
      locationCoords,
    });

    setUploading(true);
    try {
      const formData = new FormData();

      // Only append file if it's a media story
      if (storyType === "media" && file) {
        formData.append("story_media", file);
      }

      // Caption is required for text stories, optional for media
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      // Add background color for text stories
      if (storyType === "text") {
        formData.append("background_color", textBackgroundColor);
      }

      // Add location coordinates if location toggle is enabled
      if (
        locationEnabled &&
        locationCoords.latitude &&
        locationCoords.longitude
      ) {
        formData.append("latitude", locationCoords.latitude.toString());
        formData.append("longitude", locationCoords.longitude.toString());
        console.log("📍 [StoryCreator] Adding location coordinates:", {
          lat: locationCoords.latitude,
          lng: locationCoords.longitude,
        });
      }

      // Add music_id if music is selected
      if (selectedMusic?.id) {
        formData.append("music_id", selectedMusic.id);
        console.log("🎵 [StoryCreator] Adding music:", selectedMusic.title);
      }

      // Add caption position to metadata if caption exists and it's a media story
      if (storyType === "media" && caption.trim()) {
        const metadata = {
          caption_position: {
            x: captionPosition.x,
            y: captionPosition.y,
          },
        };
        if (selectedMusic?.id) {
          metadata.music_id = selectedMusic.id;
        }
        formData.append("metadata", JSON.stringify(metadata));
        console.log(
          "📍 [StoryCreator] Adding caption position:",
          captionPosition
        );
      } else if (selectedMusic?.id) {
        // Add music to metadata for text stories too
        const metadata = {
          music_id: selectedMusic.id,
        };
        formData.append("metadata", JSON.stringify(metadata));
      }

      console.log("🚀 [StoryCreator] Sending POST request to /api/stories");
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("📥 [StoryCreator] Response received:", {
        status: response.status,
        statusText: response.statusText,
      });

      const data = await response.json();
      console.log("📦 [StoryCreator] Response data:", data);

      if (data.success) {
        console.log("✅ [StoryCreator] Story created successfully!", data.data);
        Swal.fire({
          icon: "success",
          title: "Story Created!",
          text: "Your story will be visible for 24 hours",
          confirmButtonColor: "#D4AF37",
          timer: 2000,
        });
        handleClose();
        if (onStoryCreated) {
          console.log("🔄 [StoryCreator] Calling onStoryCreated callback");
          onStoryCreated();
        }
      } else {
        console.error("❌ [StoryCreator] Story creation failed:", data.message);
        throw new Error(data.message || "Failed to create story");
      }
    } catch (err) {
      console.error("💥 [StoryCreator] Error creating story:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Create Story",
        text: err.message || "Please try again later",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setUploading(false);
      console.log("🏁 [StoryCreator] Upload process finished");
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setStoryType("media");
    setTextBackgroundColor(TEXT_STORY_COLORS[0].gradient);
    setLocationEnabled(false);
    setLocationCoords({ latitude: null, longitude: null });
    setGettingLocation(false);
    setUploading(false);
    setSelectedMusic(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/")) return imagePath;
    if (imagePath.includes("music/")) {
      return `/uploads/${imagePath}`;
    }
    return imagePath;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          position: "relative",
          overflow: "visible",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(45deg, #D4AF37, #B8941F)",
          color: "#1a1a1a",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
        }}
      >
        Create Story
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {!preview && storyType === "media" ? (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 3, mt: 2 }}>
              <Button
                variant={storyType === "media" ? "contained" : "outlined"}
                onClick={() => setStoryType("media")}
                startIcon={<CameraAlt />}
                sx={{
                  flex: 1,
                  bgcolor: storyType === "media" ? "#D4AF37" : "transparent",
                  color: storyType === "media" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      storyType === "media"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Photo/Video
              </Button>
              <Button
                variant={storyType === "text" ? "contained" : "outlined"}
                onClick={() => {
                  setStoryType("text");
                  setFile(null);
                  setPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                startIcon={<TextFields />}
                sx={{
                  flex: 1,
                  bgcolor: storyType === "text" ? "#D4AF37" : "transparent",
                  color: storyType === "text" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      storyType === "text"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Text Story
              </Button>
            </Box>
            <Box
              sx={{
                border: "2px dashed #D4AF37",
                borderRadius: "16px",
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "rgba(212, 175, 55, 0.05)",
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraAlt sx={{ fontSize: 64, color: "#D4AF37", mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Select Photo or Video
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(26,26,26,0.6)", mb: 2 }}
              >
                Choose a photo or video to share as your story
              </Typography>
              <Button
                variant="contained"
                startIcon={<Image />}
                sx={{
                  bgcolor: "#D4AF37",
                  color: "#1a1a1a",
                  fontWeight: 600,
                  mr: 1,
                  "&:hover": {
                    bgcolor: "#B8941F",
                  },
                }}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </Box>
          </Box>
        ) : storyType === "text" ? (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 3, mt: 2 }}>
              <Button
                variant={storyType === "media" ? "contained" : "outlined"}
                onClick={() => {
                  setStoryType("media");
                  setCaption("");
                }}
                startIcon={<CameraAlt />}
                sx={{
                  flex: 1,
                  bgcolor: storyType === "media" ? "#D4AF37" : "transparent",
                  color: storyType === "media" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      storyType === "media"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Photo/Video
              </Button>
              <Button
                variant={storyType === "text" ? "contained" : "outlined"}
                onClick={() => setStoryType("text")}
                startIcon={<TextFields />}
                sx={{
                  flex: 1,
                  bgcolor: storyType === "text" ? "#D4AF37" : "transparent",
                  color: storyType === "text" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      storyType === "text"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Text Story
              </Button>
            </Box>
            {/* Text Preview with Background */}
            <Box
              sx={{
                width: "100%",
                minHeight: 200,
                borderRadius: 2,
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                background: textBackgroundColor,
                border: "2px solid rgba(212, 175, 55, 0.3)",
                position: "relative",
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
                  fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
                }}
              >
                {caption || "Your text will appear here"}
              </Typography>

              {/* Music Overlay for Text Stories */}
              {selectedMusic && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "rgba(0, 0, 0, 0.7)",
                    borderRadius: 2,
                    p: 1.5,
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    maxWidth: "70%",
                  }}
                >
                  {selectedMusic.cover_image_url && (
                    <Box
                      component="img"
                      src={getImageUrl(selectedMusic.cover_image_url)}
                      alt={selectedMusic.title}
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
                      {selectedMusic.title}
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
                      {selectedMusic.artist}
                    </Typography>
                  </Box>
                  <MusicNote sx={{ color: "#D4AF37", fontSize: 20 }} />
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Write your story"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                multiline
                rows={4}
                required
                inputProps={{ maxLength: 500 }}
                helperText={`${caption.length}/500 characters`}
                placeholder="Share what's on your mind..."
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <IconButton
                  ref={emojiButtonRef}
                  onClick={(e) => {
                    setEmojiPickerAnchor(e.currentTarget);
                    setEmojiPickerOpen(true);
                  }}
                  sx={{ color: "#D4AF37" }}
                >
                  <EmojiEmotions />
                </IconButton>
              </Box>
            </Box>

            {/* Background Color Selector */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 600, color: "rgba(26,26,26,0.8)" }}
              >
                Choose Background Color
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                {TEXT_STORY_COLORS.map((color, index) => (
                  <Box
                    key={index}
                    onClick={() => setTextBackgroundColor(color.gradient)}
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: color.gradient,
                      cursor: "pointer",
                      border:
                        textBackgroundColor === color.gradient
                          ? "3px solid #D4AF37"
                          : "3px solid transparent",
                      boxShadow:
                        textBackgroundColor === color.gradient
                          ? "0 0 0 2px white, 0 2px 8px rgba(212, 175, 55, 0.5)"
                          : "0 2px 4px rgba(0,0,0,0.1)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "scale(1.1)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box
              ref={previewContainerRef}
              sx={{
                position: "relative",
                width: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "transparent",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {file?.type.startsWith("video/") ? (
                  <Box
                    component="video"
                    src={preview}
                    controls
                    onLoadedMetadata={calculateMediaDimensions}
                    sx={{
                      width: "100%",
                      height: "auto",
                      maxHeight: { xs: 300, sm: 400 },
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={preview}
                    alt="Preview"
                    onLoad={calculateMediaDimensions}
                    sx={{
                      width: "100%",
                      height: "auto",
                      maxHeight: { xs: 300, sm: 400 },
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                )}

                {/* Music Overlay - Bottom Left */}
                {selectedMusic && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 16,
                      left: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      bgcolor: "rgba(0, 0, 0, 0.7)",
                      borderRadius: 2,
                      p: 1.5,
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      maxWidth: "70%",
                      zIndex: 10,
                    }}
                  >
                    {selectedMusic.cover_image_url && (
                      <Box
                        component="img"
                        src={getImageUrl(selectedMusic.cover_image_url)}
                        alt={selectedMusic.title}
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
                        {selectedMusic.title}
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
                        {selectedMusic.artist}
                      </Typography>
                    </Box>
                    <MusicNote sx={{ color: "#D4AF37", fontSize: 20 }} />
                  </Box>
                )}

                {/* Draggable Caption Overlay - positioned relative to media element */}
                {caption.trim() && mediaDimensions.width > 0 && (
                  <Box
                    onMouseDown={handleCaptionMouseDown}
                    onTouchStart={handleCaptionTouchStart}
                    sx={{
                      position: "absolute",
                      // Use pixel values based on actual media dimensions (same as StoryViewer)
                      left: `${mediaDimensions.offsetX + (mediaDimensions.width * Math.max(10, Math.min(90, captionPosition.x))) / 100}px`,
                      top: `${mediaDimensions.offsetY + (mediaDimensions.height * Math.max(10, Math.min(90, captionPosition.y))) / 100}px`,
                      transform: "translate(-50%, -50%)",
                      cursor: isDraggingCaption ? "grabbing" : "grab",
                      userSelect: "none",
                      p: { xs: 1, sm: 1.5 },
                      bgcolor: "rgba(0, 0, 0, 0.6)",
                      borderRadius: 2,
                      backdropFilter: "blur(10px)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      maxWidth: { xs: "85%", sm: "80%" },
                      maxHeight: "40%",
                      overflow: "hidden",
                      zIndex: 10,
                      "&:hover": {
                        bgcolor: "rgba(0, 0, 0, 0.7)",
                        borderColor: "rgba(255, 255, 255, 0.5)",
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "white",
                        fontWeight: 600,
                        textAlign: "center",
                        wordBreak: "break-word",
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                      }}
                    >
                      {caption}
                    </Typography>
                  </Box>
                )}
              </Box>

              <IconButton
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: "rgba(0,0,0,0.5)",
                  color: "white",
                  zIndex: 11,
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.7)",
                  },
                }}
              >
                <Close />
              </IconButton>
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                multiline
                rows={3}
                inputProps={{ maxLength: 200 }}
                helperText={
                  caption.trim()
                    ? `${caption.length}/200 characters - Drag the caption on the preview to position it`
                    : `${caption.length}/200 characters`
                }
                placeholder="Add a caption to your story..."
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <IconButton
                  onClick={(e) => {
                    setEmojiPickerAnchor(e.currentTarget);
                    setEmojiPickerOpen(true);
                  }}
                  sx={{ color: "#D4AF37" }}
                >
                  <EmojiEmotions />
                </IconButton>
              </Box>
            </Box>

            {/* Music Selection */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                mb: 2,
                borderRadius: "12px",
                bgcolor: selectedMusic
                  ? "rgba(212, 175, 55, 0.1)"
                  : "rgba(0,0,0,0.02)",
                border: `1px solid ${selectedMusic ? "#D4AF37" : "rgba(0,0,0,0.1)"}`,
                transition: "all 0.3s ease",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: selectedMusic
                    ? "rgba(212, 175, 55, 0.15)"
                    : "rgba(0,0,0,0.05)",
                },
              }}
              onClick={() => setMusicPickerOpen(true)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MusicNote
                  sx={{
                    color: selectedMusic ? "#D4AF37" : "rgba(0,0,0,0.5)",
                    transition: "color 0.3s ease",
                  }}
                />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Add Music
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(0,0,0,0.6)" }}
                  >
                    {selectedMusic
                      ? `${selectedMusic.title} - ${selectedMusic.artist}`
                      : "Add music to your story"}
                  </Typography>
                </Box>
              </Box>
              {selectedMusic && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMusic(null);
                  }}
                  sx={{ color: "#D4AF37" }}
                >
                  <Close />
                </IconButton>
              )}
            </Box>

            {/* Location Selection */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                mb: 2,
                borderRadius: "12px",
                bgcolor: locationEnabled
                  ? "rgba(212, 175, 55, 0.1)"
                  : "rgba(0,0,0,0.02)",
                border: `1px solid ${locationEnabled ? "#D4AF37" : "rgba(0,0,0,0.1)"}`,
                transition: "all 0.3s ease",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationOn
                  sx={{
                    color: locationEnabled ? "#D4AF37" : "rgba(0,0,0,0.5)",
                    transition: "color 0.3s ease",
                  }}
                />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Include Location
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(0,0,0,0.6)" }}
                  >
                    {locationEnabled
                      ? locationCoords.latitude
                        ? "Location will be shared with your story"
                        : gettingLocation
                          ? "Getting your location..."
                          : "Enable to share your current location"
                      : "Your story will be discoverable by location"}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {gettingLocation && (
                  <CircularProgress size={20} sx={{ color: "#D4AF37" }} />
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={locationEnabled}
                      onChange={(e) => setLocationEnabled(e.target.checked)}
                      disabled={gettingLocation}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": {
                          color: "#D4AF37",
                        },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                          {
                            backgroundColor: "#D4AF37",
                          },
                      }}
                    />
                  }
                  label=""
                />
              </Box>
            </Box>

            <Alert severity="info" sx={{ borderRadius: "12px" }}>
              Your story will be visible for 24 hours. Make it count!
            </Alert>
          </Box>
        )}
      </DialogContent>

      {/* Music Picker */}
      <MusicPicker
        open={musicPickerOpen}
        onClose={() => setMusicPickerOpen(false)}
        onSelectMusic={(music) => {
          setSelectedMusic(music);
          setMusicPickerOpen(false);
        }}
        selectedMusicId={selectedMusic?.id}
      />

      {/* Emoji Picker */}
      <EmojiPicker
        open={emojiPickerOpen}
        anchorEl={emojiPickerAnchor}
        container={dialogContainer}
        onClose={() => {
          setEmojiPickerOpen(false);
          setEmojiPickerAnchor(null);
        }}
        onEmojiSelect={(emoji) => {
          setCaption((prev) => prev + emoji);
          setEmojiPickerOpen(false);
          setEmojiPickerAnchor(null);
        }}
        position="top"
      />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        {(preview || (storyType === "text" && caption.trim())) && (
          <Button
            onClick={handleCreateStory}
            variant="contained"
            disabled={uploading}
            sx={{
              bgcolor: "#D4AF37",
              color: "#1a1a1a",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "#B8941F",
              },
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: "#1a1a1a" }} />
                {storyType === "text" ? "Creating..." : "Uploading..."}
              </>
            ) : (
              "Share Story"
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StoryCreator;
