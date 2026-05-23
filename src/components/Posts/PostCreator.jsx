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
} from "@mui/icons-material";
import Swal from "sweetalert2";
import EmojiPicker from "../EmojiPicker/EmojiPicker";

const TEXT_POST_COLORS = [
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
    name: "Gold",
    gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  },
  {
    name: "Dark Blue",
    gradient: "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)",
  },
];

const PostCreator = ({ open, onClose, onPostCreated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState("media");
  const [textBackgroundColor, setTextBackgroundColor] = useState(
    TEXT_POST_COLORS[0].gradient
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
  const [dialogPaper, setDialogPaper] = useState(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Find dialog paper element when dialog opens
  useEffect(() => {
    if (open) {
      // Find the Dialog paper element
      const findDialogPaper = () => {
        const dialogContainer = document.querySelector('.MuiDialog-container');
        if (dialogContainer) {
          const paper = dialogContainer.querySelector('.MuiDialog-paper');
          if (paper) {
            setDialogPaper(paper);
            return true;
          }
        }
        return false;
      };
      
      // Try immediately, then retry once after a short delay if needed
      if (!findDialogPaper()) {
        const timeoutId = setTimeout(() => {
          findDialogPaper();
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    } else {
      setDialogPaper(null);
    }
  }, [open]);

  useEffect(() => {
    let isMounted = true;

    if (locationEnabled && !locationCoords.latitude && !gettingLocation) {
      setGettingLocation(true);
      if (!navigator.geolocation) {
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
          setLocationCoords({ latitude, longitude });
          setGettingLocation(false);
        },
        (error) => {
          if (!isMounted) return;
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
      if (isMounted) {
        setLocationCoords({ latitude: null, longitude: null });
        setGettingLocation(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [locationEnabled]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

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

  const handleCreatePost = async () => {
    if (postType === "text" && !caption.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Text Required",
        text: "Please enter some text for your post",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    if (postType === "media" && !file) {
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
      Swal.fire({
        icon: "error",
        title: "Login Required",
        text: "Please login to create a post",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();

      if (postType === "media" && file) {
        formData.append("post_media", file);
      }

      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      if (postType === "text") {
        formData.append("background_color", textBackgroundColor);
      }

      if (
        locationEnabled &&
        locationCoords.latitude &&
        locationCoords.longitude
      ) {
        formData.append("latitude", locationCoords.latitude.toString());
        formData.append("longitude", locationCoords.longitude.toString());
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Post Created!",
          text: "Your post has been shared",
          confirmButtonColor: "#D4AF37",
          timer: 2000,
        });
        handleClose();
        if (onPostCreated) {
          onPostCreated();
        }
      } else {
        throw new Error(data.message || "Failed to create post");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to Create Post",
        text: err.message || "Please try again later",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setPostType("media");
    setTextBackgroundColor(TEXT_POST_COLORS[0].gradient);
    setLocationEnabled(false);
    setLocationCoords({ latitude: null, longitude: null });
    setGettingLocation(false);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
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
        }}
      >
        Create Post
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {!preview && postType === "media" ? (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 3, mt: 2 }}>
              <Button
                variant={postType === "media" ? "contained" : "outlined"}
                onClick={() => setPostType("media")}
                startIcon={<CameraAlt />}
                sx={{
                  flex: 1,
                  bgcolor: postType === "media" ? "#D4AF37" : "transparent",
                  color: postType === "media" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      postType === "media"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Photo/Video
              </Button>
              <Button
                variant={postType === "text" ? "contained" : "outlined"}
                onClick={() => {
                  setPostType("text");
                  setFile(null);
                  setPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                startIcon={<TextFields />}
                sx={{
                  flex: 1,
                  bgcolor: postType === "text" ? "#D4AF37" : "transparent",
                  color: postType === "text" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      postType === "text"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Text Post
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
                Choose a photo or video to share
              </Typography>
              <Button
                variant="contained"
                startIcon={<Image />}
                sx={{
                  bgcolor: "#D4AF37",
                  color: "#1a1a1a",
                  fontWeight: 600,
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
        ) : postType === "text" ? (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 3, mt: 2 }}>
              <Button
                variant={postType === "media" ? "contained" : "outlined"}
                onClick={() => {
                  setPostType("media");
                  setCaption("");
                }}
                startIcon={<CameraAlt />}
                sx={{
                  flex: 1,
                  bgcolor: postType === "media" ? "#D4AF37" : "transparent",
                  color: postType === "media" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      postType === "media"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Photo/Video
              </Button>
              <Button
                variant={postType === "text" ? "contained" : "outlined"}
                onClick={() => setPostType("text")}
                startIcon={<TextFields />}
                sx={{
                  flex: 1,
                  bgcolor: postType === "text" ? "#D4AF37" : "transparent",
                  color: postType === "text" ? "#1a1a1a" : "#D4AF37",
                  borderColor: "#D4AF37",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor:
                      postType === "text"
                        ? "#B8941F"
                        : "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Text Post
              </Button>
            </Box>
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
                {caption || "Your text will appear here"}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Write your post"
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
                {TEXT_POST_COLORS.map((color, index) => (
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
              sx={{
                position: "relative",
                width: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                mb: 2,
              }}
            >
              {file?.type.startsWith("video/") ? (
                <Box
                  component="video"
                  src={preview}
                  controls
                  sx={{
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Box
                  component="img"
                  src={preview}
                  alt="Preview"
                  sx={{
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "contain",
                  }}
                />
              )}
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
                inputProps={{ maxLength: 500 }}
                helperText={`${caption.length}/500 characters`}
                placeholder="Add a caption..."
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
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationOn
                  sx={{
                    color: locationEnabled ? "#D4AF37" : "rgba(0,0,0,0.5)",
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
                        ? "Location will be shared"
                        : gettingLocation
                          ? "Getting your location..."
                          : "Enable to share location"
                      : "Add location to your post"}
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
          </Box>
        )}
      </DialogContent>

      <EmojiPicker
        open={emojiPickerOpen}
        anchorEl={emojiPickerAnchor}
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
        container={dialogPaper}
      />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        {(preview || (postType === "text" && caption.trim())) && (
          <Button
            onClick={handleCreatePost}
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
                {postType === "text" ? "Creating..." : "Uploading..."}
              </>
            ) : (
              "Share Post"
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PostCreator;
