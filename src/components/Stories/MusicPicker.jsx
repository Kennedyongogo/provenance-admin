import React, { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  Close,
  Search,
  PlayArrow,
  Pause,
  MusicNote,
} from "@mui/icons-material";

const MusicPicker = ({ open, onClose, onSelectMusic, selectedMusicId }) => {
  const [musicTracks, setMusicTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [audioRef, setAudioRef] = useState(null);

  useEffect(() => {
    if (open) {
      fetchMusicTracks();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }
    };
  }, [audioRef]);

  const fetchMusicTracks = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stories/music/available");
      const data = await response.json();

      if (data.success) {
        setMusicTracks(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching music tracks:", err);
    } finally {
      setLoading(false);
    }
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

  const getAudioUrl = (audioPath) => {
    if (!audioPath) return null;
    if (audioPath.startsWith("http")) return audioPath;
    if (audioPath.startsWith("/")) return audioPath;
    if (audioPath.includes("music/")) {
      return `/uploads/${audioPath}`;
    }
    return audioPath;
  };

  const handlePlayPause = (track) => {
    if (playingTrackId === track.id) {
      // Pause
      if (audioRef) {
        audioRef.pause();
        setAudioRef(null);
      }
      setPlayingTrackId(null);
    } else {
      // Stop current and play new
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }

      const audioUrl = getAudioUrl(track.audio_url);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.addEventListener("ended", () => {
          setPlayingTrackId(null);
          setAudioRef(null);
        });
        audio.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
        setAudioRef(audio);
        setPlayingTrackId(track.id);
      }
    }
  };

  const handleSelectMusic = (track) => {
    onSelectMusic(track);
    // Stop playing when selecting
    if (audioRef) {
      audioRef.pause();
      audioRef.src = "";
      setAudioRef(null);
    }
    setPlayingTrackId(null);
  };

  const filteredTracks = musicTracks.filter((track) => {
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          pb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MusicNote sx={{ color: "#D4AF37" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Music
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <TextField
          fullWidth
          placeholder="Search for music..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredTracks.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <MusicNote sx={{ fontSize: 64, color: "rgba(0,0,0,0.3)", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {searchQuery ? "No music found" : "No music available"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery
                ? "Try a different search term"
                : "Check back later for new tracks"}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredTracks.map((track) => (
              <Grid item xs={12} sm={6} key={track.id}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border:
                      selectedMusicId === track.id
                        ? "2px solid #D4AF37"
                        : "1px solid rgba(0,0,0,0.1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => handleSelectMusic(track)}
                >
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={
                        track.cover_image_url
                          ? getImageUrl(track.cover_image_url)
                          : "/placeholder-music.jpg"
                      }
                      alt={track.title}
                      sx={{
                        objectFit: "cover",
                        bgcolor: "rgba(212, 175, 55, 0.1)",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        bgcolor: "rgba(0,0,0,0.7)",
                        borderRadius: "50%",
                        width: 40,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.9)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(track);
                      }}
                    >
                      {playingTrackId === track.id ? (
                        <Pause sx={{ color: "white", fontSize: 20 }} />
                      ) : (
                        <PlayArrow sx={{ color: "white", fontSize: 20 }} />
                      )}
                    </Box>
                  </Box>
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {track.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {track.artist}
                    </Typography>
                    {selectedMusicId === track.id && (
                      <Box
                        sx={{
                          mt: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: "rgba(212, 175, 55, 0.1)",
                        }}
                      >
                        <MusicNote sx={{ fontSize: 16, color: "#D4AF37" }} />
                        <Typography
                          variant="caption"
                          sx={{ color: "#D4AF37", fontWeight: 600 }}
                        >
                          Selected
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MusicPicker;

