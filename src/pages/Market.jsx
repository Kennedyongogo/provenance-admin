import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Store as StoreIcon,
  WhatsApp as WhatsAppIcon,
  Star as StarIcon,
  LocalOffer as TagIcon,
  AccountCircle,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const Market = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState({}); // Track current image index for each item
  const [dialogImageIndex, setDialogImageIndex] = useState(0); // Track current image index in dialog
  const tabs = [
    { label: "All Items", value: "all" },
    { label: "Hot Deals", value: "hot_deals" },
    { label: "Weekend Picks", value: "weekend_picks" },
  ];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  // Auto-transition images for each market item
  useEffect(() => {
    if (items.length === 0) return;

    const intervals = {};
    const newIndices = {};

    items.forEach((item) => {
      const images = item.images || [];
      const itemId = item.id;

      // Preload all images for smooth transitions
      images.forEach((imagePath) => {
        const img = new Image();
        img.src = getImageUrl(imagePath);
      });

      // Always reset to 0 for new items
      newIndices[itemId] = 0;

      if (images.length > 1) {
        const imageCount = images.length;

        // Set up interval for this item
        intervals[itemId] = setInterval(() => {
          setCurrentImageIndex((prev) => {
            const currentIdx = prev[itemId] || 0;
            const nextIdx = (currentIdx + 1) % imageCount;
            return { ...prev, [itemId]: nextIdx };
          });
        }, 3000); // Change image every 3 seconds
      }
    });

    // Set all indices to 0
    setCurrentImageIndex(newIndices);

    // Cleanup intervals on unmount or when items change
    return () => {
      Object.values(intervals).forEach((interval) => clearInterval(interval));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Auto-transition images in dialog
  useEffect(() => {
    if (!selectedItem || !dialogOpen) return;

    const images = selectedItem.images || [];
    if (images.length <= 1) return;

    setDialogImageIndex(0);
    const interval = setInterval(() => {
      setDialogImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedItem, dialogOpen]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentTab = tabs[activeTab]?.value;
      let url = "/api/market";
      if (currentTab && currentTab !== "all") {
        url += `?tag=${currentTab}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Sort: featured first, then by tag priority, then by date
        const sorted = (data.data || []).sort((a, b) => {
          if (a.is_featured !== b.is_featured) {
            return b.is_featured - a.is_featured;
          }
          if (a.tag !== b.tag) {
            if (a.tag === "hot_deals") return -1;
            if (b.tag === "hot_deals") return 1;
            if (a.tag === "weekend_picks") return -1;
            if (b.tag === "weekend_picks") return 1;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setItems(sorted);
      } else {
        setError(data.message || "Failed to fetch items");
      }
    } catch (err) {
      setError("Error fetching items: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/")) return imagePath;
    return `/uploads/${imagePath}`;
  };

  const handleWhatsAppClick = (item) => {
    const phoneNumber = item.whatsapp_number || "";
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(
      `Hi! I'm interested in ${item.title} (KES ${parseFloat(item.price).toLocaleString()}). Can you provide more details?`
    );

    if (cleanedNumber) {
      const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${message}`;
      window.open(whatsappUrl, "_blank");
    } else {
      Swal.fire({
        icon: "warning",
        title: "No WhatsApp Number",
        text: "This item doesn't have a WhatsApp contact. Please contact support.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  if (error && items.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
          p: { xs: 3, sm: 4 },
          borderRadius: "16px",
          mb: 4,
          color: "#1a1a1a",
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
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.5rem", sm: "2.125rem" },
                  lineHeight: 1.2,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                TuVibe Market
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
                <Tooltip title="Profile" arrow>
                  <span>
                    <IconButton
                      onClick={() => navigate("/profile")}
                      sx={{
                        backgroundColor: "rgba(26, 26, 26, 0.15)",
                        border: "1px solid rgba(26, 26, 26, 0.3)",
                        color: "#1a1a1a",
                        "&:hover": {
                          backgroundColor: "rgba(26, 26, 26, 0.25)",
                        },
                        flexShrink: 0,
                        width: { xs: "36px", sm: "40px" },
                        height: { xs: "36px", sm: "40px" },
                        p: { xs: 0.75, sm: 1 },
                      }}
                    >
                      <AccountCircle
                        sx={{
                          color: "#1a1a1a",
                          fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        }}
                      />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: "0.8125rem", sm: "1rem" }, lineHeight: 1.4 }}>
              Browse our curated collection of items. Contact sellers directly via
              WhatsApp.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: "#D4AF37",
              height: 3,
            },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "#666",
              "&.Mui-selected": {
                color: "#D4AF37",
              },
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Items Grid */}
      {loading && items.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <CircularProgress sx={{ color: "#D4AF37" }} />
        </Box>
      ) : items.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: "16px",
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
          }}
        >
          <StoreIcon
            sx={{ fontSize: 64, color: "#D4AF37", mb: 2, opacity: 0.5 }}
          />
          <Typography variant="h6" sx={{ color: "#666", mb: 1 }}>
            No items available
          </Typography>
          <Typography variant="body2" sx={{ color: "#999" }}>
            Check back later for new listings!
          </Typography>
        </Card>
      ) : (
        <Box sx={{ position: "relative" }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "rgba(255, 255, 255, 0.8)",
                zIndex: 10,
                borderRadius: "16px",
              }}
            >
              <CircularProgress sx={{ color: "#D4AF37" }} />
            </Box>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((item) => (
              <Card
                key={item.id}
                sx={{
                  height: "100%",
                  minHeight: { xs: "auto", sm: "250px" },
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  borderRadius: "16px",
                  background:
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 30px rgba(212, 175, 55, 0.2)",
                  },
                  overflow: "hidden",
                }}
              >
                {/* Photo Section */}
                <Box
                  sx={{
                    position: "relative",
                    width: { xs: "100%", sm: "250px", md: "300px" },
                    minWidth: { xs: "100%", sm: "250px", md: "300px" },
                    height: { xs: "250px", sm: "250px" },
                    minHeight: { xs: "250px", sm: "250px" },
                    backgroundColor: "rgba(212, 175, 55, 0.1)",
                    overflow: "visible",
                    flexShrink: 0,
                  }}
                >
                  {/* Image Container */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    {item.images && item.images.length > 0 ? (
                      <>
                        {item.images.map((imagePath, index) => {
                          const currentIdx = currentImageIndex[item.id] || 0;
                          return (
                            <Box
                              key={`${item.id}-img-${index}`}
                              component="img"
                              src={getImageUrl(imagePath)}
                              loading="lazy"
                              decoding="async"
                              fetchpriority="low"
                              alt={item.title}
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: currentIdx === index ? 1 : 0,
                                transition: "opacity 1.5s ease-in-out",
                                zIndex: currentIdx === index ? 1 : 0,
                                cursor: "pointer",
                              }}
                              onClick={() => handleViewDetails(item)}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          );
                        })}
                        {item.images.length > 1 && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              backgroundColor: "rgba(0, 0, 0, 0.7)",
                              color: "white",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              zIndex: 2,
                            }}
                          >
                            +{item.images.length - 1} more
                          </Box>
                        )}
                      </>
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleViewDetails(item)}
                      >
                        <StoreIcon
                          sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3 }}
                        />
                      </Box>
                    )}
                  </Box>

                  {/* Featured Badge */}
                  {item.is_featured && (
                    <Chip
                      icon={
                        <StarIcon
                          sx={{
                            fontSize: "1rem !important",
                            color: "#FFD700 !important",
                          }}
                        />
                      }
                      label="Featured"
                      size="small"
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        bgcolor: "rgba(255, 255, 255, 0.95)",
                        fontWeight: 600,
                        fontSize: { xs: "0.65rem", sm: "0.7rem" },
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        zIndex: 25,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      }}
                    />
                  )}

                  {/* Tag Badge */}
                  {item.tag !== "none" && (
                    <Chip
                      label={
                        item.tag === "hot_deals"
                          ? "🔥 Hot Deal"
                          : "⭐ Weekend Pick"
                      }
                      size="small"
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        bgcolor:
                          item.tag === "hot_deals"
                            ? "rgba(255, 107, 107, 0.95)"
                            : "rgba(78, 205, 196, 0.95)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: { xs: "0.65rem", sm: "0.7rem" },
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        zIndex: 25,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      }}
                    />
                  )}
                </Box>

                {/* Content Section */}
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                      color: "#1a1a1a",
                      mb: 1,
                      lineHeight: 1.2,
                      cursor: "pointer",
                      "&:hover": {
                        color: "#D4AF37",
                      },
                    }}
                    onClick={() => handleViewDetails(item)}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(26, 26, 26, 0.7)",
                      mb: 2,
                      flexGrow: 1,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontSize: { xs: "0.875rem", sm: "0.95rem" },
                    }}
                  >
                    {item.description || "No description available"}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: "#D4AF37",
                        fontSize: { xs: "1.25rem", sm: "1.5rem" },
                      }}
                    >
                      KES {parseFloat(item.price).toLocaleString()}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    onClick={() => handleWhatsAppClick(item)}
                    sx={{
                      background: "linear-gradient(135deg, #25D366, #128C7E)",
                      color: "white",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      py: 1,
                      fontSize: { xs: "0.875rem", sm: "0.95rem" },
                      "&:hover": {
                        background: "linear-gradient(135deg, #128C7E, #25D366)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    Contact via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Item Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedItem(null);
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid rgba(212, 175, 55, 0.3)",
          },
        }}
      >
        {selectedItem && (
          <>
            <DialogTitle
              sx={{
                background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                color: "#1a1a1a",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <StoreIcon />
                {selectedItem.title}
              </Box>
              {selectedItem.is_featured && (
                <Chip
                  icon={<StarIcon sx={{ color: "#FFD700 !important" }} />}
                  label="Featured"
                  size="small"
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                    color: "#1a1a1a",
                    fontWeight: 600,
                  }}
                />
              )}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              {selectedItem.images && selectedItem.images.length > 0 && (
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: 300,
                    borderRadius: "12px",
                    overflow: "hidden",
                    mb: 3,
                  }}
                >
                  {selectedItem.images.map((imagePath, index) => (
                    <Box
                      key={`dialog-img-${index}`}
                      component="img"
                      src={getImageUrl(imagePath)}
                      loading="lazy"
                      decoding="async"
                      fetchpriority="low"
                      alt={selectedItem.title}
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: dialogImageIndex === index ? 1 : 0,
                        transition: "opacity 1.5s ease-in-out",
                        zIndex: dialogImageIndex === index ? 1 : 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ))}
                  {selectedItem.images.length > 1 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        zIndex: 2,
                      }}
                    >
                      {dialogImageIndex + 1} / {selectedItem.images.length}
                    </Box>
                  )}
                </Box>
              )}
              {selectedItem.tag !== "none" && (
                <Chip
                  label={
                    selectedItem.tag === "hot_deals"
                      ? "🔥 Hot Deal"
                      : "⭐ Weekend Pick"
                  }
                  sx={{
                    mb: 2,
                    bgcolor:
                      selectedItem.tag === "hot_deals"
                        ? "rgba(255, 107, 107, 0.2)"
                        : "rgba(78, 205, 196, 0.2)",
                    color: "#1a1a1a",
                    fontWeight: 600,
                  }}
                />
              )}
              <Typography
                variant="body1"
                sx={{
                  color: "#1a1a1a",
                  mb: 2,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedItem.description || "No description available"}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#D4AF37",
                  mb: 2,
                }}
              >
                KES {parseFloat(selectedItem.price).toLocaleString()}
              </Typography>
            </DialogContent>
            <DialogActions
              sx={{
                p: 2,
                borderTop: "1px solid rgba(212, 175, 55, 0.2)",
                backgroundColor: "rgba(212, 175, 55, 0.05)",
              }}
            >
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  setSelectedItem(null);
                }}
                sx={{
                  color: "#1a1a1a",
                  textTransform: "none",
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={() => {
                  handleWhatsAppClick(selectedItem);
                  setDialogOpen(false);
                  setSelectedItem(null);
                }}
                sx={{
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  color: "white",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "12px",
                  "&:hover": {
                    background: "linear-gradient(135deg, #128C7E, #25D366)",
                  },
                }}
              >
                Contact via WhatsApp
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Market;
