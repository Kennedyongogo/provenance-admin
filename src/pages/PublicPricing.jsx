import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Button,
  Chip,
} from "@mui/material";
import {
  AttachMoney,
  FormatQuote,
  ArrowBack,
  CheckCircle,
  Verified,
  PersonAdd,
} from "@mui/icons-material";
import { Avatar, Divider, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import StarIcon from "@mui/icons-material/Star";

const categories = [
  "Regular",
  "Sugar Mummy",
  "Sponsor",
  "Ben 10",
  "Urban Chics",
];

export default function PublicPricing() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const handleSignUp = () => {
    // Navigate to home with a query parameter to trigger registration
    navigate("/?register=true");
  };

  // Helper function to get user initials
  const getUserInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Helper function to format user photo URL
  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    return `/uploads/${photoPath}`;
  };

  // Fetch testimonials from API
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoadingTestimonials(true);
        const response = await fetch("/api/ratings/testimonials?limit=10");
        const data = await response.json();

        if (data.success && data.data) {
          setTestimonials(data.data);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        px: { xs: 2, sm: 3, md: 4 },
        py: 3,
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: { xs: 1, sm: 2 },
          mb: 3,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <IconButton
              onClick={handleGoBack}
              sx={{
                color: "#D4AF37",
                backgroundColor: "rgba(212, 175, 55, 0.1)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.2)",
                  borderColor: "rgba(212, 175, 55, 0.5)",
                },
                flexShrink: 0,
              }}
            >
              <ArrowBack />
            </IconButton>
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
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <AttachMoney sx={{ color: "#D4AF37" }} />
              Pricing Plans
            </Typography>
          </Box>
        </Box>
      </Box>

      <Card
        sx={{
          borderRadius: "16px",
          background: "#ffffff",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 2px 8px rgba(212, 175, 55, 0.08)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          {/* Mobile: Dropdown Select */}
          <Box
            sx={{
              display: { xs: "block", sm: "none" },
              mb: 3,
            }}
          >
            <FormControl fullWidth>
              <InputLabel
                sx={{
                  "&.Mui-focused": {
                    color: "#D4AF37",
                  },
                }}
              >
                Select Plan
              </InputLabel>
              <Select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
                label="Select Plan"
                sx={{
                  borderRadius: "12px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(212, 175, 55, 0.3)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(212, 175, 55, 0.5)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#D4AF37",
                    borderWidth: "2px",
                  },
                  "& .MuiSelect-select": {
                    py: 1.5,
                  },
                }}
              >
                {categories.map((category, index) => (
                  <MenuItem key={index} value={index}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Desktop: Tabs */}
          <Box
            sx={{
              display: { xs: "none", sm: "block" },
              borderBottom: 1,
              borderColor: "divider",
              mb: 3,
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                "& .MuiTabs-indicator": {
                  backgroundColor: "#D4AF37",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { sm: "0.9375rem", md: "1rem" },
                  color: "rgba(0, 0, 0, 0.6)",
                  minHeight: 56,
                  px: { sm: 2, md: 3 },
                  "&:hover": {
                    color: "#D4AF37",
                    backgroundColor: "rgba(212, 175, 55, 0.08)",
                  },
                  "&.Mui-selected": {
                    color: "#D4AF37",
                    fontWeight: 700,
                  },
                },
              }}
            >
              {categories.map((category, index) => (
                <Tab key={index} label={category} />
              ))}
            </Tabs>
          </Box>

          {/* Package Cards */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 3,
            }}
          >
            {/* Silver Package */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", sm: "1 1 50%" },
                display: "flex",
                minWidth: 0,
              }}
            >
              <Card
                sx={{
                  borderRadius: "16px",
                  background:
                    "linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(230, 230, 230, 0.95) 100%)",
                  border: "2px solid rgba(169, 169, 169, 0.6)",
                  boxShadow: "0 4px 20px rgba(169, 169, 169, 0.25)",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 30px rgba(169, 169, 169, 0.35)",
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 2.5, sm: 3 },
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Chip
                      label="Silver Package"
                      sx={{
                        bgcolor: "rgba(169, 169, 169, 0.25)",
                        color: "#5a5a5a",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        mb: 2,
                        px: 2,
                        py: 0.5,
                        border: "1px solid rgba(169, 169, 169, 0.4)",
                      }}
                    />
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        background: "linear-gradient(45deg, #808080, #A9A9A9)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: { xs: "1.75rem", sm: "2rem" },
                        mb: 0.5,
                      }}
                    >
                      {selectedTab === 0 ? "KES 149" : "KES 199"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(0, 0, 0, 0.6)",
                        fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                      }}
                    >
                      /Month
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2.5,
                      flex: 1,
                    }}
                  >
                    <Box
                      component="ul"
                      sx={{
                        flex: 1,
                        pl: 0,
                        m: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      {selectedTab === 0 ? (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlock 25 WhatsApp contacts daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              3 free "who viewed your profile" daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              5 free premium profiles unlock daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Access to 40 favorite profiles
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Access to 50 unlocked profiles
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlock 35 WhatsApp contacts daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Two free 1hr – profile boost daily targeting one
                              category
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              6 free "who viewed your profile" daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              10 free premium profiles unlock daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Access to 60 favorite profiles
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Access to 60 unlocked profiles
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Private profile mode (hide some details from
                              non-premium users)
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#A9A9A9",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Premium lounge silver badge
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                    <Box sx={{ mt: "auto" }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PersonAdd />}
                        onClick={handleSignUp}
                        sx={{
                          borderRadius: "999px",
                          textTransform: "none",
                          fontWeight: 700,
                          py: 1.25,
                          background:
                            "linear-gradient(90deg, #808080 0%, #A9A9A9 100%)",
                          boxShadow: "0 4px 10px rgba(169, 169, 169, 0.4)",
                          "&:hover": {
                            background:
                              "linear-gradient(90deg, #A9A9A9 0%, #808080 100%)",
                            boxShadow: "0 6px 16px rgba(169, 169, 169, 0.5)",
                          },
                        }}
                      >
                        Sign Up to Subscribe
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Gold Package */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", sm: "1 1 50%" },
                display: "flex",
                minWidth: 0,
              }}
            >
              <Card
                sx={{
                  borderRadius: "16px",
                  background:
                    "linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)",
                  border: "2px solid rgba(212, 175, 55, 0.7)",
                  boxShadow: "0 4px 20px rgba(212, 175, 55, 0.3)",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 30px rgba(212, 175, 55, 0.45)",
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 2.5, sm: 3 },
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Chip
                      label="Gold Package"
                      sx={{
                        bgcolor: "rgba(212, 175, 55, 0.3)",
                        color: "#B8941F",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        mb: 2,
                        px: 2,
                        py: 0.5,
                        border: "1px solid rgba(212, 175, 55, 0.5)",
                      }}
                    />
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: { xs: "1.75rem", sm: "2rem" },
                        mb: 0.5,
                      }}
                    >
                      {selectedTab === 0 ? "KES 249" : "KES 349"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(0, 0, 0, 0.6)",
                        fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                      }}
                    >
                      /Month
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2.5,
                      flex: 1,
                    }}
                  >
                    <Box
                      component="ul"
                      sx={{
                        flex: 1,
                        pl: 0,
                        m: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      {selectedTab === 0 ? (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlimited WhatsApp contacts daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Three free 2hr – profile boost daily targeting
                              three categories
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlimited premium profiles unlock daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Access to unlimited saved profiles
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Gold Verification badge
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Free 4-hour access to incognito mode daily (View
                              profiles without appearing on others viewer list)
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              5 daily suggested Matches list
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlimited "who viewed your profile" daily
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlimited WhatsApp contacts daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Four free 3hr – profile boost daily targeting all
                              categories
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlimited premium profiles unlock daily
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Access to unlimited saved profiles
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Gold Verification badge
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Free 8-hour access to incognito mode daily (View
                              profiles without appearing on others viewer list)
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              10 daily suggested Matches list
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                color: "#D4AF37",
                                fontSize: "1.25rem",
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                lineHeight: 1.6,
                              }}
                            >
                              Unlimited "who viewed your profile" daily
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                    <Box sx={{ mt: "auto" }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PersonAdd />}
                        onClick={handleSignUp}
                        sx={{
                          borderRadius: "999px",
                          textTransform: "none",
                          fontWeight: 700,
                          py: 1.25,
                          background:
                            "linear-gradient(90deg, #D4AF37 0%, #B8941F 100%)",
                          boxShadow: "0 4px 10px rgba(212, 175, 55, 0.4)",
                          "&:hover": {
                            background:
                              "linear-gradient(90deg, #B8941F 0%, #D4AF37 100%)",
                            boxShadow: "0 6px 16px rgba(212, 175, 55, 0.5)",
                          },
                        }}
                      >
                        Sign Up to Subscribe
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Blurred Profiles Section */}
      <Box
        sx={{
          mt: 5,
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          {/* Blurred Profile Pictures */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: { xs: 2, sm: 3, md: 4 },
              px: { xs: 2, sm: 3 },
            }}
          >
            {/* Dummy profile pictures - hardcoded for now */}
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <Avatar
                key={index}
                sx={{
                  width: { xs: 70, sm: 80, md: 90 },
                  height: { xs: 70, sm: 80, md: 90 },
                  filter: "blur(10px)",
                  border: "2px solid rgba(212, 175, 55, 0.3)",
                  borderRadius: "50%",
                  backgroundColor: "rgba(212, 175, 55, 0.2)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    filter: "blur(8px)",
                    borderColor: "rgba(212, 175, 55, 0.5)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    background:
                      "linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(184, 148, 31, 0.2) 100%)",
                    borderRadius: "50%",
                  }}
                />
              </Avatar>
            ))}
          </Box>

          {/* Subscription Prompt Text */}
          <Typography
            sx={{
              fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.15rem" },
              fontWeight: 600,
              color: "rgba(0, 0, 0, 0.8)",
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: { xs: "90%", sm: "80%", md: "600px" },
              px: { xs: 2, sm: 0 },
            }}
          >
            To continue exploring, chatting and connecting please subscribe to
            the premium version
          </Typography>
        </Box>
      </Box>

      {/* Testimonials Section */}
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: { xs: 1, sm: 2 },
            mb: 3,
            mt: 5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <FormatQuote sx={{ color: "#D4AF37" }} />
              Testimonials
            </Typography>
          </Box>
        </Box>

        <Card
          sx={{
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            boxShadow: "0 2px 8px rgba(212, 175, 55, 0.08)",
            overflow: "hidden",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            {loadingTestimonials ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 6,
                }}
              >
                <CircularProgress sx={{ color: "#D4AF37" }} />
              </Box>
            ) : testimonials.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 6,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: "rgba(0, 0, 0, 0.6)",
                    fontSize: { xs: "0.9375rem", sm: "1rem" },
                  }}
                >
                  No testimonials yet. Be the first to share your experience!
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {testimonials.map((testimonial, index) => {
                  const user = testimonial.user || {};
                  const photoUrl = getPhotoUrl(user.photo);
                  const initials = getUserInitials(user.name || user.username);
                  const displayName =
                    user.username || user.name || "Anonymous User";
                  const category = user.category || "Member";
                  const county = user.county || "";
                  const location = county ? ` • ${county}` : "";
                  const isVerified = user.isVerified || false;

                  return (
                    <React.Fragment key={testimonial.id || index}>
                      {index > 0 && (
                        <Divider
                          sx={{ borderColor: "rgba(212, 175, 55, 0.2)" }}
                        />
                      )}
                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          <Avatar
                            src={photoUrl}
                            sx={{
                              width: { xs: 48, sm: 56 },
                              height: { xs: 48, sm: 56 },
                              bgcolor: "#D4AF37",
                              fontSize: { xs: "1.25rem", sm: "1.5rem" },
                              fontWeight: 700,
                            }}
                          >
                            {!photoUrl && initials}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: "rgba(0, 0, 0, 0.9)",
                                  fontSize: { xs: "1rem", sm: "1.125rem" },
                                }}
                              >
                                {displayName}
                              </Typography>
                              {isVerified && (
                                <Chip
                                  icon={
                                    <Verified
                                      sx={{
                                        fontSize: "0.875rem !important",
                                        color:
                                          user.badgeType === "silver"
                                            ? "#C0C0C0"
                                            : "#D4AF37",
                                      }}
                                    />
                                  }
                                  label={
                                    user.badgeType === "silver"
                                      ? "Premium Silver"
                                      : user.badgeType === "gold"
                                        ? "Gold Verified"
                                        : "Verified"
                                  }
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    backgroundColor:
                                      user.badgeType === "silver"
                                        ? "rgba(192, 192, 192, 0.15)"
                                        : "rgba(212, 175, 55, 0.15)",
                                    color:
                                      user.badgeType === "silver"
                                        ? "#5a5a5a"
                                        : "#B8941F",
                                    fontWeight: 600,
                                    border:
                                      user.badgeType === "silver"
                                        ? "1px solid rgba(192, 192, 192, 0.3)"
                                        : "1px solid rgba(212, 175, 55, 0.3)",
                                    "& .MuiChip-icon": {
                                      marginLeft: "6px",
                                    },
                                  }}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "rgba(0, 0, 0, 0.6)",
                                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                              }}
                            >
                              {category}
                              {location}
                              {testimonial.rating && (
                                <>
                                  {" • "}
                                  <Box
                                    component="span"
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 0.25,
                                    }}
                                  >
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <StarIcon
                                        key={i}
                                        sx={{
                                          fontSize: "0.875rem",
                                          color:
                                            i < testimonial.rating
                                              ? "#D4AF37"
                                              : "rgba(0, 0, 0, 0.2)",
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </>
                              )}
                            </Typography>
                          </Box>
                        </Box>
                        {testimonial.testimonial ? (
                          <Paper
                            elevation={0}
                            sx={{
                              borderRadius: "12px",
                              backgroundColor: "rgba(212, 175, 55, 0.05)",
                              border: "1px solid rgba(212, 175, 55, 0.2)",
                              p: { xs: 2, sm: 2.5 },
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{
                                color: "rgba(0, 0, 0, 0.75)",
                                fontSize: { xs: "0.9375rem", sm: "1rem" },
                                lineHeight: 1.7,
                                fontStyle: "italic",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              "{testimonial.testimonial}"
                            </Typography>
                          </Paper>
                        ) : (
                          <Paper
                            elevation={0}
                            sx={{
                              borderRadius: "12px",
                              backgroundColor: "rgba(212, 175, 55, 0.05)",
                              border: "1px solid rgba(212, 175, 55, 0.2)",
                              p: { xs: 2, sm: 2.5 },
                              textAlign: "center",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "rgba(0, 0, 0, 0.5)",
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                fontStyle: "italic",
                              }}
                            >
                              Rating only - no testimonial provided
                            </Typography>
                          </Paper>
                        )}
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </>
    </Box>
  );
}
