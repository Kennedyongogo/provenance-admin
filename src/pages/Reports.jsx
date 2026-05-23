import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  IconButton,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Report,
  Add,
  Visibility,
  CheckCircle,
  Schedule,
  Cancel,
  Close,
  Message,
  Person,
  Category as CategoryIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getDisplayInitial } from "../utils/userDisplay";

const INITIAL_REPORT_FORM = {
  category: "",
  subject: "",
  description: "",
  reported_user_id: null,
  priority: "medium",
};

export default function Reports({ user }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_REPORT_FORM });
  const [selectedReportedUser, setSelectedReportedUser] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchOptions, setUserSearchOptions] = useState([]);
  const [loadingUserOptions, setLoadingUserOptions] = useState(false);
  const userSearchAbortController = useRef(null);

  const categories = React.useMemo(
    () => [
      {
        value: "inappropriate_content",
        label: "Inappropriate Content",
        taggable: true,
      },
      { value: "harassment", label: "Harassment", taggable: true },
      { value: "scam", label: "Scam/Fraud", taggable: true },
      { value: "fake_profile", label: "Fake Profile", taggable: true },
      { value: "spam", label: "Spam", taggable: true },
      { value: "payment_issue", label: "Payment Issue", taggable: false },
      { value: "technical_issue", label: "Technical Issue", taggable: false },
      { value: "other", label: "Other", taggable: true },
    ],
    []
  );
  const taggableCategories = React.useMemo(
    () =>
      new Set([
        "inappropriate_content",
        "harassment",
        "scam",
        "fake_profile",
        "spam",
        "other",
      ]),
    []
  );
  const canSelectReportedUser =
    Boolean(formData.category) && taggableCategories.has(formData.category);

  const buildImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    if (imageUrl.startsWith("/")) return imageUrl;
    return `/uploads/${imageUrl.replace(/^uploads\//, "")}`;
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (!canSelectReportedUser) {
      setUserSearchOptions([]);
      if (userSearchAbortController.current) {
        userSearchAbortController.current.abort();
        userSearchAbortController.current = null;
      }
      return;
    }

    const trimmed = userSearchTerm.trim();
    if (trimmed.length < 2) {
      setUserSearchOptions([]);
      if (userSearchAbortController.current) {
        userSearchAbortController.current.abort();
        userSearchAbortController.current = null;
      }
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    if (userSearchAbortController.current) {
      userSearchAbortController.current.abort();
    }
    const controller = new AbortController();
    userSearchAbortController.current = controller;

    const loadUsers = async () => {
      setLoadingUserOptions(true);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          pageSize: "10",
        });
        const response = await fetch(`/api/public?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.data)) {
          const filtered = data.data.filter(
            (candidate) => candidate.id !== user?.id
          );
          if (
            selectedReportedUser &&
            !filtered.some(
              (candidate) => candidate.id === selectedReportedUser.id
            )
          ) {
            filtered.unshift(selectedReportedUser);
          }
          setUserSearchOptions(filtered);
        } else {
          setUserSearchOptions([]);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error searching profiles for report tagging:", error);
          setUserSearchOptions([]);
        }
      } finally {
        setLoadingUserOptions(false);
        if (userSearchAbortController.current === controller) {
          userSearchAbortController.current = null;
        }
      }
    };

    const timeoutId = setTimeout(loadUsers, 300);

    return () => {
      clearTimeout(timeoutId);
      if (userSearchAbortController.current === controller) {
        controller.abort();
        userSearchAbortController.current = null;
      }
    };
  }, [userSearchTerm, canSelectReportedUser, user?.id, selectedReportedUser]);

  useEffect(() => {
    if (!createDialogOpen) {
      setSelectedReportedUser(null);
      setUserSearchTerm("");
      setUserSearchOptions([]);
      setFormData({ ...INITIAL_REPORT_FORM });
    }
  }, [createDialogOpen]);

  useEffect(() => {
    if (!canSelectReportedUser && formData.reported_user_id) {
      setFormData((prev) => ({
        ...prev,
        reported_user_id: null,
      }));
      setSelectedReportedUser(null);
    }
  }, [canSelectReportedUser, formData.reported_user_id]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/reports/my-reports", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setReports(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all required fields",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: formData.category,
          subject: formData.subject,
          description: formData.description,
          reported_user_id: formData.reported_user_id || null,
          priority: formData.priority,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Report Submitted",
          text: "Your report has been submitted successfully. We'll review it soon.",
          confirmButtonColor: "#D4AF37",
        });
        setCreateDialogOpen(false);
        setFormData({
          category: "",
          subject: "",
          description: "",
          reported_user_id: null,
          priority: "medium",
        });
        setSelectedReportedUser(null);
        setUserSearchTerm("");
        setUserSearchOptions([]);
        fetchReports();
      } else {
        throw new Error(data.message || "Failed to submit report");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to submit report. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "in_review":
        return "info";
      case "resolved":
        return "success";
      case "rejected":
        return "error";
      case "closed":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Schedule />;
      case "in_review":
        return <Message />;
      case "resolved":
        return <CheckCircle />;
      case "rejected":
      case "closed":
        return <Close />;
      default:
        return <Schedule />;
    }
  };

  const getStatusLabel = (status) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getCategoryLabel = (category) => {
    const found = categories.find((c) => c.value === category);
    return found ? found.label : category;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 3 }}>
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
            <Report sx={{ color: "#D4AF37" }} />
            My Reports
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-end", sm: "center" },
            gap: { xs: 1, sm: 1.25 },
            flexShrink: 0,
          }}
        >
          {/* Icons - shown next to title on large screens, below button on small screens */}
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              justifyContent: "flex-end",
              alignItems: "center",
              gap: { xs: 0.75, sm: 1.25 },
            }}
          >
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: "#D4AF37",
              color: "#fff",
              "&:hover": { bgcolor: "#B8941F" },
              textTransform: "none",
              px: { xs: 1.5, sm: 2.5 },
              py: { xs: 0.5, sm: 0.8 },
              fontSize: { xs: "0.65rem", sm: "0.85rem" },
              gap: { xs: 0.5, sm: 1 },
              flexShrink: 0,
            }}
          >
            New Report
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#D4AF37" }} />
        </Box>
      ) : reports.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: "16px",
            border: "1px solid rgba(212, 175, 55, 0.2)",
          }}
        >
          <Report
            sx={{ fontSize: 64, color: "#D4AF37", mb: 2, opacity: 0.5 }}
          />
          <Typography variant="h6" sx={{ mb: 1, color: "#1a1a1a" }}>
            No Reports Yet
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(26, 26, 26, 0.6)", mb: 3 }}
          >
            You haven't submitted any reports. Click "New Report" to report an
            issue.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {reports.map((report) => (
            <Card
              key={report.id}
              sx={{
                borderRadius: "16px",
                background: "#ffffff",
                border: "1px solid rgba(212, 175, 55, 0.2)",
                boxShadow: "0 2px 8px rgba(212, 175, 55, 0.08)",
                transition: "all 0.3s ease",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px rgba(212, 175, 55, 0.15)",
                  borderColor: "rgba(212, 175, 55, 0.4)",
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                {/* Header Section */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2.5,
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        mb: 1.5,
                        fontSize: { xs: "1rem", sm: "1.125rem" },
                        lineHeight: 1.3,
                      }}
                    >
                      {report.subject}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: "wrap", gap: 1 }}
                    >
                      <Chip
                        icon={getStatusIcon(report.status)}
                        label={getStatusLabel(report.status)}
                        color={getStatusColor(report.status)}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                          height: "28px",
                          "& .MuiChip-icon": {
                            fontSize: "1rem",
                          },
                        }}
                      />
                      <Chip
                        icon={<CategoryIcon />}
                        label={getCategoryLabel(report.category)}
                        size="small"
                        sx={{
                          bgcolor: "rgba(212, 175, 55, 0.12)",
                          color: "#D4AF37",
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                          height: "28px",
                          border: "1px solid rgba(212, 175, 55, 0.3)",
                          "& .MuiChip-icon": {
                            color: "#D4AF37",
                            fontSize: "1rem",
                          },
                        }}
                      />
                      {report.reportedUser && (
                        <Chip
                          avatar={
                            <Avatar
                              src={buildImageUrl(report.reportedUser.photo)}
                              alt={
                                report.reportedUser?.username ||
                                report.reportedUser?.name ||
                                "Tagged user"
                              }
                            >
                              {getDisplayInitial(report.reportedUser, {
                                fallback: "T",
                              })}
                            </Avatar>
                          }
                          label={`Tagged: ${
                            report.reportedUser?.username ||
                            report.reportedUser?.name ||
                            "Profile"
                          }`}
                          size="small"
                          sx={{
                            bgcolor: "rgba(255, 107, 107, 0.12)",
                            color: "#b71c1c",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            height: "28px",
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>

                {/* Description Section */}
                <Box
                  sx={{
                    mb: 2.5,
                    p: 2,
                    borderRadius: "8px",
                    background: "rgba(212, 175, 55, 0.03)",
                    border: "1px solid rgba(212, 175, 55, 0.1)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(26, 26, 26, 0.75)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                      lineHeight: 1.6,
                    }}
                  >
                    {report.description}
                  </Typography>
                </Box>

                <Divider
                  sx={{
                    my: 2,
                    borderColor: "rgba(212, 175, 55, 0.15)",
                    borderWidth: "1px",
                  }}
                />

                {/* Footer Section */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.6)",
                        fontWeight: 500,
                        fontSize: "0.8125rem",
                      }}
                    >
                      Submitted:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#1a1a1a",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                      }}
                    >
                      {formatDate(report.createdAt)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => {
                      setSelectedReport(report);
                      setViewDialogOpen(true);
                    }}
                    sx={{
                      color: "#D4AF37",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      borderRadius: "8px",
                      px: 2,
                      py: 0.75,
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                      background: "rgba(212, 175, 55, 0.05)",
                      "&:hover": {
                        bgcolor: "rgba(212, 175, 55, 0.12)",
                        borderColor: "rgba(212, 175, 55, 0.5)",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 8px rgba(212, 175, 55, 0.2)",
                      },
                      transition: "all 0.2s ease",
                      "& .MuiButton-startIcon": {
                        marginRight: "6px",
                      },
                    }}
                  >
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Report Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !submitting && setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "#D4AF37",
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pb: 2.5,
          }}
        >
          <Report />
          Submit a Report
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 6,
            "& .MuiTypography-root": {
              fontSize: {
                xs: "0.65rem",
                sm: "0.75rem",
                md: "0.85rem",
                lg: "0.9rem",
              },
            },
            "& .MuiTextField-root": {
              "& input, & textarea": {
                fontSize: {
                  xs: "0.65rem",
                  sm: "0.75rem",
                  md: "0.85rem",
                  lg: "0.9rem",
                },
              },
              "& label": {
                fontSize: {
                  xs: "0.65rem",
                  sm: "0.75rem",
                  md: "0.85rem",
                  lg: "0.9rem",
                },
              },
            },
            "& .MuiSelect-select": {
              fontSize: {
                xs: "0.65rem",
                sm: "0.75rem",
                md: "0.85rem",
                lg: "0.9rem",
              },
            },
            "& .MuiFormHelperText-root": {
              fontSize: {
                xs: "0.6rem",
                sm: "0.7rem",
                md: "0.8rem",
                lg: "0.85rem",
              },
            },
            "& .MuiChip-root": {
              fontSize: {
                xs: "0.6rem",
                sm: "0.7rem",
                md: "0.8rem",
                lg: "0.85rem",
              },
            },
            "& .MuiButtonBase-root": {
              fontSize: {
                xs: "0.65rem",
                sm: "0.75rem",
                md: "0.85rem",
                lg: "0.9rem",
              },
            },
          }}
        >
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                label="Category"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Subject"
              required
              fullWidth
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Brief summary of your report"
            />

            <TextField
              label="Description"
              required
              fullWidth
              multiline
              rows={6}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Provide detailed information about the issue..."
            />

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: "#1a1a1a",
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <Person sx={{ fontSize: 20, color: "#D4AF37" }} />
                Tag a Profile (optional)
              </Typography>
              <Autocomplete
                disabled={!canSelectReportedUser}
                loading={loadingUserOptions}
                options={userSearchOptions}
                value={selectedReportedUser}
                onChange={(_event, newValue) => {
                  setSelectedReportedUser(newValue);
                  setFormData((prev) => ({
                    ...prev,
                    reported_user_id: newValue ? newValue.id : null,
                  }));
                }}
                onInputChange={(_event, newValue, reason) => {
                  if (reason === "reset" && newValue === "") {
                    setUserSearchTerm("");
                    return;
                  }
                  if (reason === "input" || reason === "clear") {
                    setUserSearchTerm(newValue || "");
                  }
                }}
                getOptionLabel={(option) => option?.username || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    key={option.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.5,
                    }}
                  >
                    <Avatar
                      src={buildImageUrl(option.photo)}
                      alt={option?.username || option?.name || "User"}
                      sx={{ width: 32, height: 32 }}
                    >
                      {getDisplayInitial(option, { fallback: "U" })}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#1a1a1a" }}
                        noWrap
                      >
                        {option?.username || option?.name || "Unnamed user"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(26, 26, 26, 0.65)" }}
                        noWrap
                      >
                        {option.county ? `${option.county} • ` : ""}
                        {option.category || "Member"}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={
                      canSelectReportedUser
                        ? "Search by username"
                        : "Tagging disabled for this category"
                    }
                    placeholder={
                      canSelectReportedUser
                        ? "Type a username to find a profile"
                        : "Choose a supported category to tag a user"
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingUserOptions ? (
                            <CircularProgress color="inherit" size={16} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                noOptionsText={
                  canSelectReportedUser
                    ? userSearchTerm.trim().length < 2
                      ? "Type at least 2 characters of a username"
                      : "No matching usernames found"
                    : "Only harassment, scam, fake profile, spam, inappropriate content or other allow tagging"
                }
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.75,
                  color: "rgba(26, 26, 26, 0.6)",
                }}
              >
                Tagging helps our moderators find the exact profile you are
                reporting. Categories like payment or technical issues remain
                general.
              </Typography>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setCreateDialogOpen(false)}
            disabled={submitting}
            sx={{ color: "#666" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateReport}
            variant="contained"
            disabled={submitting}
            sx={{
              bgcolor: "#D4AF37",
              "&:hover": { bgcolor: "#B8941F" },
            }}
          >
            {submitting ? <CircularProgress size={20} /> : "Submit Report"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid rgba(212, 175, 55, 0.3)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: { xs: "1.125rem", sm: "1.25rem" },
            py: { xs: 2, sm: 2.5 },
            px: { xs: 2.5, sm: 3 },
          }}
        >
          <Report sx={{ fontSize: { xs: 24, sm: 28 } }} />
          Report Details
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            px: { xs: 2.5, sm: 3 },
            "& .MuiTypography-root": {
              fontSize: {
                xs: "0.65rem",
                sm: "0.75rem",
                md: "0.85rem",
                lg: "0.9rem",
              },
            },
            "& .MuiChip-root": {
              fontSize: {
                xs: "0.6rem",
                sm: "0.7rem",
                md: "0.8rem",
                lg: "0.85rem",
              },
            },
            "& .MuiButtonBase-root": {
              fontSize: {
                xs: "0.65rem",
                sm: "0.75rem",
                md: "0.85rem",
                lg: "0.9rem",
              },
            },
          }}
        >
          {selectedReport && (
            <Stack spacing={3}>
              {/* Subject Section */}
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.1) 100%)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  boxShadow: "0 2px 8px rgba(212, 175, 55, 0.1)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(26, 26, 26, 0.6)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontSize: "0.75rem",
                    mb: 1,
                  }}
                >
                  Subject
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "#1a1a1a",
                    fontSize: { xs: "1rem", sm: "1.125rem" },
                    lineHeight: 1.4,
                  }}
                >
                  {selectedReport.subject}
                </Typography>
              </Card>

              {/* Status and Category Section */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                }}
              >
                <Card
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.1) 100%)",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: "0.75rem",
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedReport.status)}
                    label={getStatusLabel(selectedReport.status)}
                    color={getStatusColor(selectedReport.status)}
                    size="medium"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      py: 2.5,
                      "& .MuiChip-icon": {
                        fontSize: "1.25rem",
                      },
                    }}
                  />
                </Card>

                <Card
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.1) 100%)",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: "0.75rem",
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    Category
                  </Typography>
                  <Chip
                    icon={<CategoryIcon />}
                    label={getCategoryLabel(selectedReport.category)}
                    size="medium"
                    sx={{
                      bgcolor: "rgba(212, 175, 55, 0.15)",
                      color: "#D4AF37",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      py: 2.5,
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                      "& .MuiChip-icon": {
                        color: "#D4AF37",
                        fontSize: "1.25rem",
                      },
                    }}
                  />
                </Card>
              </Box>

              {selectedReport.reportedUser && (
                <Card
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.1) 100%)",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                  }}
                >
                  <Avatar
                    src={buildImageUrl(selectedReport.reportedUser.photo)}
                    alt={
                      selectedReport.reportedUser?.username ||
                      selectedReport.reportedUser?.name ||
                      "Tagged user"
                    }
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: "rgba(212, 175, 55, 0.2)",
                    }}
                  >
                    {getDisplayInitial(selectedReport.reportedUser, {
                      fallback: "T",
                    })}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.6)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontSize: "0.75rem",
                        mb: 0.5,
                        display: "block",
                      }}
                    >
                      Tagged Profile
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: "#1a1a1a" }}
                    >
                      {selectedReport.reportedUser?.username ||
                        selectedReport.reportedUser?.name ||
                        "Profile"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(26, 26, 26, 0.7)" }}
                    >
                      {[
                        selectedReport.reportedUser.category,
                        selectedReport.reportedUser.county,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </Typography>
                  </Box>
                </Card>
              )}

              {/* Description Section */}
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.1) 100%)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  boxShadow: "0 2px 8px rgba(212, 175, 55, 0.1)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(26, 26, 26, 0.6)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontSize: "0.75rem",
                    mb: 1.5,
                    display: "block",
                  }}
                >
                  Description
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#1a1a1a",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    fontSize: { xs: "0.9375rem", sm: "1rem" },
                  }}
                >
                  {selectedReport.description}
                </Typography>
              </Card>

              {/* Admin Response Section */}
              {selectedReport.admin_notes && (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)",
                    border: "1px solid rgba(33, 150, 243, 0.3)",
                    "& .MuiAlert-icon": {
                      color: "#2196F3",
                    },
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      color: "#1a1a1a",
                      fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                    }}
                  >
                    Admin Response:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#1a1a1a",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedReport.admin_notes}
                  </Typography>
                </Alert>
              )}

              {/* Date Information */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  background: "rgba(212, 175, 55, 0.05)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                }}
              >
                <Stack spacing={1}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.6)",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                      }}
                    >
                      Submitted:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#1a1a1a",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                      }}
                    >
                      {formatDate(selectedReport.createdAt)}
                    </Typography>
                  </Box>
                  {selectedReport.resolution_date && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(26, 26, 26, 0.6)",
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                        }}
                      >
                        Resolved:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#1a1a1a",
                          fontWeight: 500,
                          fontSize: "0.875rem",
                        }}
                      >
                        {formatDate(selectedReport.resolution_date)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: { xs: 2, sm: 2.5 },
            px: { xs: 2.5, sm: 3 },
            borderTop: "1px solid rgba(212, 175, 55, 0.2)",
            backgroundColor: "rgba(212, 175, 55, 0.05)",
          }}
        >
          <Button
            onClick={() => setViewDialogOpen(false)}
            variant="contained"
            fullWidth
            sx={{
              bgcolor: "#D4AF37",
              color: "#fff",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "8px",
              py: 1.25,
              fontSize: { xs: "0.9375rem", sm: "1rem" },
              "&:hover": {
                bgcolor: "#B8941F",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
