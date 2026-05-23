import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Fade,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Avatar,
} from "@mui/material";
import {
  Login,
  PersonAdd,
  Menu as MenuIcon,
  Close,
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  ArrowForward,
  AutoAwesome,
  PhotoCamera,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  evaluateBirthYearInput,
  MIN_PUBLIC_USER_AGE,
} from "../../utils/ageValidation";
import { evaluatePhoneInput } from "../../utils/phoneValidation";

export default function PublicHeader() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [registerStep, setRegisterStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    gender: "",
    birthYear: "",
    bio: "",
  });
  const [loginFormData, setLoginFormData] = useState({
    email: "",
    password: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [birthYearError, setBirthYearError] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleOpenLogin = () => {
      setLoginDialogOpen(true);
    };
    const handleOpenRegister = () => {
      setRegisterDialogOpen(true);
    };

    window.addEventListener("openLoginDialog", handleOpenLogin);
    window.addEventListener("openRegisterDialog", handleOpenRegister);
    return () => {
      window.removeEventListener("openLoginDialog", handleOpenLogin);
      window.removeEventListener("openRegisterDialog", handleOpenRegister);
    };
  }, []);

  const handleLogin = () => {
    setLoginDialogOpen(true);
  };

  const handleLoginClose = () => {
    setLoginDialogOpen(false);
    setLoginFormData({
      email: "",
      password: "",
    });
  };

  const handleRegister = () => {
    setRegisterDialogOpen(true);
  };

  const handleRegisterClose = () => {
    setRegisterDialogOpen(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      password: "",
      gender: "",
      birthYear: "",
      bio: "",
    });
    setPhoneError("");
    setBirthYearError("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setRegisterStep(1);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        Swal.fire({
          icon: "error",
          title: "Invalid File",
          text: "Please select an image file.",
          confirmButtonColor: "#D4AF37",
        });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: "Please select an image smaller than 10MB.",
          confirmButtonColor: "#D4AF37",
        });
        return;
      }
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field) => (e) => {
    const value = e.target.value;
    if (field === "birthYear") {
      const { error } = evaluateBirthYearInput(value);
      setBirthYearError(error);
    }
    if (field === "phone") {
      const { error } = evaluatePhoneInput(value);
      setPhoneError(error);
    }
    setFormData({ ...formData, [field]: value });
  };

  const handleLoginInputChange = (field) => (e) => {
    setLoginFormData({ ...loginFormData, [field]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    // Close the login dialog first so SweetAlert appears on top
    handleLoginClose();

    // Small delay to ensure dialog is closed before showing SweetAlert
    setTimeout(async () => {
      // Show loading alert first (like LoginPage.jsx)
      Swal.fire({
        title: "Signing in...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
          // Apply gold styling
          const swal = document.querySelector(".swal2-popup");
          if (swal) {
            swal.style.borderRadius = "20px";
            swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
            swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
            swal.style.background =
              "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
            swal.style.backdropFilter = "blur(20px)";
          }
          const title = document.querySelector(".swal2-title");
          if (title) {
            title.style.color = "#1a1a1a";
            title.style.fontWeight = "700";
            title.style.fontSize = "1.5rem";
            title.style.background = "linear-gradient(45deg, #D4AF37, #B8941F)";
            title.style.webkitBackgroundClip = "text";
            title.style.webkitTextFillColor = "transparent";
            title.style.backgroundClip = "text";
          }
        },
      });

      try {
        const response = await fetch("/api/public/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(loginFormData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage =
            data.message ||
            (response.status === 403
              ? "We could not confirm your age. Please contact support to update your profile."
              : "Invalid email or password. Please try again.");
          Swal.fire({
            icon: "error",
            title: "Login Failed",
            text: errorMessage,
            confirmButtonColor: "#D4AF37",
            didOpen: () => {
              const swal = document.querySelector(".swal2-popup");
              if (swal) {
                swal.style.borderRadius = "20px";
                swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
                swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
                swal.style.background =
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
                swal.style.backdropFilter = "blur(20px)";
              }
              const title = document.querySelector(".swal2-title");
              if (title) {
                title.style.color = "#1a1a1a";
                title.style.fontWeight = "700";
                title.style.fontSize = "1.5rem";
                title.style.background =
                  "linear-gradient(45deg, #D4AF37, #B8941F)";
                title.style.webkitBackgroundClip = "text";
                title.style.webkitTextFillColor = "transparent";
                title.style.backgroundClip = "text";
              }
            },
          });
        } else {
          // Check if login was successful
          if (data.success) {
            // Store token and user data
            localStorage.setItem("token", data.data.token);
            localStorage.setItem("user", JSON.stringify(data.data.user));

            Swal.fire({
              icon: "success",
              title: "Success!",
              text: data.message || "Login successful!",
              timer: 1500,
              showConfirmButton: false,
              confirmButtonColor: "#D4AF37",
              didOpen: () => {
                const swal = document.querySelector(".swal2-popup");
                if (swal) {
                  swal.style.borderRadius = "20px";
                  swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
                  swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
                  swal.style.background =
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
                  swal.style.backdropFilter = "blur(20px)";
                }
                const title = document.querySelector(".swal2-title");
                if (title) {
                  title.style.color = "#1a1a1a";
                  title.style.fontWeight = "700";
                  title.style.fontSize = "1.5rem";
                  title.style.background =
                    "linear-gradient(45deg, #D4AF37, #B8941F)";
                  title.style.webkitBackgroundClip = "text";
                  title.style.webkitTextFillColor = "transparent";
                  title.style.backgroundClip = "text";
                }
                const icon = document.querySelector(".swal2-success");
                if (icon) {
                  icon.style.color = "#D4AF37";
                  const circles = icon.querySelectorAll("circle");
                  circles.forEach((circle) => {
                    circle.style.stroke = "#D4AF37";
                  });
                  const paths = icon.querySelectorAll("path");
                  paths.forEach((path) => {
                    path.style.stroke = "#D4AF37";
                    path.style.fill = "#D4AF37";
                  });
                }
                const timerBar = document.querySelector(
                  ".swal2-timer-progress-bar"
                );
                if (timerBar) {
                  timerBar.style.background =
                    "linear-gradient(45deg, #D4AF37, #B8941F)";
                }
              },
              willClose: () => {
                // Navigate immediately when SweetAlert closes
                navigate("/home");
              },
            });
          } else {
            const errorMessage =
              data.message || "Invalid email or password. Please try again.";
            Swal.fire({
              icon: "error",
              title: "Login Failed",
              text: errorMessage,
              confirmButtonColor: "#D4AF37",
              didOpen: () => {
                const swal = document.querySelector(".swal2-popup");
                if (swal) {
                  swal.style.borderRadius = "20px";
                  swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
                  swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
                  swal.style.background =
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
                  swal.style.backdropFilter = "blur(20px)";
                }
                const title = document.querySelector(".swal2-title");
                if (title) {
                  title.style.color = "#1a1a1a";
                  title.style.fontWeight = "700";
                  title.style.fontSize = "1.5rem";
                  title.style.background =
                    "linear-gradient(45deg, #D4AF37, #B8941F)";
                  title.style.webkitBackgroundClip = "text";
                  title.style.webkitTextFillColor = "transparent";
                  title.style.backgroundClip = "text";
                }
              },
            });
          }
        }
      } catch (error) {
        console.error("Login error:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Login failed. Please try again.",
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
              swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
              swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
              swal.style.background =
                "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
              swal.style.backdropFilter = "blur(20px)";
            }
            const title = document.querySelector(".swal2-title");
            if (title) {
              title.style.color = "#1a1a1a";
              title.style.fontWeight = "700";
              title.style.fontSize = "1.5rem";
              title.style.background =
                "linear-gradient(45deg, #D4AF37, #B8941F)";
              title.style.webkitBackgroundClip = "text";
              title.style.webkitTextFillColor = "transparent";
              title.style.backgroundClip = "text";
            }
          },
        });
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Only submit if we're on step 2
    if (registerStep !== 2) {
      return;
    }
    const { normalized: normalizedPhone, error: phoneValidationError } =
      evaluatePhoneInput(formData.phone);

    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      Swal.fire({
        icon: "error",
        title: "Invalid Phone Number",
        text: phoneValidationError,
        confirmButtonColor: "#D4AF37",
      });
      return;
    }
    const { normalized: normalizedBirthYear, error: birthYearValidationError } =
      evaluateBirthYearInput(formData.birthYear);

    if (birthYearValidationError) {
      setBirthYearError(birthYearValidationError);
      handleRegisterClose();
      setTimeout(() => {
        Swal.fire({
          icon: "error",
          title: "Age Verification Required",
          text: birthYearValidationError,
          confirmButtonColor: "#D4AF37",
        });
      }, 0);
      return;
    }
    // Prepare data - only include non-empty optional fields
    const submitData = {
      name: formData.name,
      phone: normalizedPhone,
      email: formData.email,
      password: formData.password,
    };
    if (formData.gender) submitData.gender = formData.gender;
    if (normalizedBirthYear !== null) {
      submitData.birth_year = normalizedBirthYear;
    }

    // Close the registration dialog first so SweetAlert appears on top
    handleRegisterClose();

    // Small delay to ensure dialog is closed before showing SweetAlert
    setTimeout(async () => {
      // Show loading alert first
      Swal.fire({
        title: "Registering...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
          // Apply gold styling
          const swal = document.querySelector(".swal2-popup");
          if (swal) {
            swal.style.borderRadius = "20px";
            swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
            swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
            swal.style.background =
              "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
            swal.style.backdropFilter = "blur(20px)";
          }
          const title = document.querySelector(".swal2-title");
          if (title) {
            title.style.color = "#1a1a1a";
            title.style.fontWeight = "700";
            title.style.fontSize = "1.5rem";
            title.style.background = "linear-gradient(45deg, #D4AF37, #B8941F)";
            title.style.webkitBackgroundClip = "text";
            title.style.webkitTextFillColor = "transparent";
            title.style.backgroundClip = "text";
          }
        },
      });

      try {
        let response;
        // If photo file is selected, use FormData for multipart upload
        if (photoFile) {
          const formDataToSend = new FormData();
          // Add all form fields
          formDataToSend.append("name", formData.name);
          formDataToSend.append("phone", normalizedPhone);
          formDataToSend.append("email", formData.email);
          formDataToSend.append("password", formData.password);
          if (formData.gender) formDataToSend.append("gender", formData.gender);
          if (normalizedBirthYear !== null)
            formDataToSend.append("birth_year", normalizedBirthYear);
          if (formData.bio) formDataToSend.append("bio", formData.bio);
          // Add photo file
          formDataToSend.append("profile_image", photoFile);

          response = await fetch("/api/public/register", {
            method: "POST",
            headers: {
              Accept: "application/json",
              // Don't set Content-Type - browser will set it with boundary
            },
            body: formDataToSend,
          });
        } else {
          // No photo, use JSON
          if (formData.bio) submitData.bio = formData.bio;
          response = await fetch("/api/public/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(submitData),
          });
        }

        const data = await response.json();

        if (!response.ok) {
          Swal.fire({
            icon: "error",
            title: "Registration Failed",
            text: data.message || "Something went wrong. Please try again.",
            confirmButtonColor: "#D4AF37",
            didOpen: () => {
              const swal = document.querySelector(".swal2-popup");
              if (swal) {
                swal.style.borderRadius = "20px";
                swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
                swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
                swal.style.background =
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
                swal.style.backdropFilter = "blur(20px)";
              }
              const title = document.querySelector(".swal2-title");
              if (title) {
                title.style.color = "#1a1a1a";
                title.style.fontWeight = "700";
                title.style.fontSize = "1.5rem";
                title.style.background =
                  "linear-gradient(45deg, #D4AF37, #B8941F)";
                title.style.webkitBackgroundClip = "text";
                title.style.webkitTextFillColor = "transparent";
                title.style.backgroundClip = "text";
              }
            },
          });
        } else {
          // Check if registration was successful
          if (data.success) {
            Swal.fire({
              icon: "success",
              title: "Registration Successful!",
              text:
                data.message || "Your account has been created successfully.",
              timer: 5000,
              timerProgressBar: true,
              showConfirmButton: false,
              confirmButtonColor: "#D4AF37",
              didOpen: () => {
                const swal = document.querySelector(".swal2-popup");
                if (swal) {
                  swal.style.borderRadius = "20px";
                  swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
                  swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
                  swal.style.background =
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
                  swal.style.backdropFilter = "blur(20px)";
                }
                const title = document.querySelector(".swal2-title");
                if (title) {
                  title.style.color = "#1a1a1a";
                  title.style.fontWeight = "700";
                  title.style.fontSize = "1.75rem";
                  title.style.background =
                    "linear-gradient(45deg, #D4AF37, #B8941F)";
                  title.style.webkitBackgroundClip = "text";
                  title.style.webkitTextFillColor = "transparent";
                  title.style.backgroundClip = "text";
                }
                const icon = document.querySelector(".swal2-success");
                if (icon) {
                  icon.style.color = "#D4AF37";
                  const circles = icon.querySelectorAll("circle");
                  circles.forEach((circle) => {
                    circle.style.stroke = "#D4AF37";
                  });
                  const paths = icon.querySelectorAll("path");
                  paths.forEach((path) => {
                    path.style.stroke = "#D4AF37";
                    path.style.fill = "#D4AF37";
                  });
                }
                const timerBar = document.querySelector(
                  ".swal2-timer-progress-bar"
                );
                if (timerBar) {
                  timerBar.style.background =
                    "linear-gradient(45deg, #D4AF37, #B8941F)";
                }
              },
            });

            setTimeout(() => {
              // Open login dialog
              handleLogin();
            }, 5000);
          } else {
            Swal.fire({
              icon: "error",
              title: "Registration Failed",
              text: data.message || "Something went wrong. Please try again.",
              confirmButtonColor: "#D4AF37",
              didOpen: () => {
                const swal = document.querySelector(".swal2-popup");
                if (swal) {
                  swal.style.borderRadius = "20px";
                  swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
                  swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
                  swal.style.background =
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
                  swal.style.backdropFilter = "blur(20px)";
                }
                const title = document.querySelector(".swal2-title");
                if (title) {
                  title.style.color = "#1a1a1a";
                  title.style.fontWeight = "700";
                  title.style.fontSize = "1.5rem";
                  title.style.background =
                    "linear-gradient(45deg, #D4AF37, #B8941F)";
                  title.style.webkitBackgroundClip = "text";
                  title.style.webkitTextFillColor = "transparent";
                  title.style.backgroundClip = "text";
                }
              },
            });
          }
        }
      } catch (error) {
        console.error("Registration error:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Registration failed. Please try again.",
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
              swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
              swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
              swal.style.background =
                "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)";
              swal.style.backdropFilter = "blur(20px)";
            }
            const title = document.querySelector(".swal2-title");
            if (title) {
              title.style.color = "#1a1a1a";
              title.style.fontWeight = "700";
              title.style.fontSize = "1.5rem";
              title.style.background =
                "linear-gradient(45deg, #D4AF37, #B8941F)";
              title.style.webkitBackgroundClip = "text";
              title.style.webkitTextFillColor = "transparent";
              title.style.backgroundClip = "text";
            }
          },
        });
      }
    }, 100);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: scrolled
            ? "rgba(255, 248, 220, 0.98)"
            : "rgba(255, 236, 179, 0.5)",
          backdropFilter: scrolled ? "blur(20px)" : "blur(10px)",
          boxShadow: scrolled
            ? "0 8px 32px rgba(212, 175, 55, 0.25)"
            : "0 4px 20px rgba(212, 175, 55, 0.2)",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          borderBottom: scrolled
            ? "2px solid rgba(212, 175, 55, 0.4)"
            : "2px solid rgba(212, 175, 55, 0.3)",
          backgroundImage: scrolled
            ? "linear-gradient(135deg, rgba(255, 248, 220, 0.98) 0%, rgba(255, 236, 179, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(255, 236, 179, 0.5) 0%, rgba(245, 230, 211, 0.6) 100%)",
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* Enhanced Logo Section */}
            <Fade in={true} timeout={1000}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "scale(1.05) translateY(-2px)",
                  },
                }}
                onClick={() => navigate("/")}
              >
                <img
                  src="/tuvibe.png"
                  alt="Tuvibe Logo"
                  style={{
                    height: scrolled ? "56px" : "64px",
                    width: "auto",
                    transition: "height 0.4s ease",
                    filter: scrolled
                      ? "none"
                      : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                  }}
                />
                <Box sx={{ ml: 2, display: { xs: "none", sm: "block" } }}>
                  <Typography
                    sx={{
                      fontWeight: "700",
                      fontSize: { sm: "1.1rem", md: "1.25rem" },
                      color: scrolled ? "primary.main" : "#2C2C2C",
                      lineHeight: 1.2,
                      transition: "all 0.3s ease",
                      textShadow: scrolled
                        ? "none"
                        : "2px 2px 4px rgba(255,255,255,0.5)",
                      background: scrolled
                        ? "linear-gradient(45deg, #D4AF37, #B8941F)"
                        : "linear-gradient(45deg, #D4AF37, #E8D5A3)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Tuvibe
                  </Typography>
                </Box>
              </Box>
            </Fade>

            {/* Register and Login Buttons - Desktop Only */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                gap: 2,
                alignItems: "center",
              }}
            >
              <Fade in={true} timeout={1000}>
                <Button
                  onClick={handleRegister}
                  startIcon={<PersonAdd sx={{ color: "#D4AF37" }} />}
                  variant="outlined"
                  sx={{
                    color: "#D4AF37",
                    borderColor: "#D4AF37",
                    borderWidth: "2px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    borderRadius: "25px",
                    textTransform: "none",
                    outline: "none",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      backgroundColor: "rgba(212, 175, 55, 0.15)",
                      borderColor: "#B8941F",
                      borderWidth: "2px",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(212, 175, 55, 0.4)",
                      "& .MuiSvgIcon-root": {
                        color: "#B8941F",
                      },
                    },
                    "&:focus": {
                      outline: "none",
                      boxShadow: "none",
                    },
                    "&:focus-visible": {
                      outline: "none",
                      boxShadow: "none",
                    },
                    "&.Mui-focusVisible": {
                      outline: "none",
                      boxShadow: "none",
                    },
                  }}
                >
                  Register
                </Button>
              </Fade>
              <Fade in={true} timeout={1200}>
                <Button
                  onClick={handleLogin}
                  startIcon={<Login sx={{ color: "white" }} />}
                  variant="contained"
                  sx={{
                    backgroundColor: "#D4AF37",
                    color: "white",
                    fontSize: "1rem",
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    borderRadius: "25px",
                    textTransform: "none",
                    outline: "none",
                    background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      background: "linear-gradient(45deg, #B8941F, #D4AF37)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(212, 175, 55, 0.5)",
                    },
                    "&:focus": {
                      outline: "none",
                      boxShadow: "none",
                    },
                    "&:focus-visible": {
                      outline: "none",
                      boxShadow: "none",
                    },
                    "&.Mui-focusVisible": {
                      outline: "none",
                      boxShadow: "none",
                    },
                  }}
                >
                  Login
                </Button>
              </Fade>
            </Box>

            {/* Hamburger Menu - Mobile Only */}
            <Fade in={true} timeout={1200}>
              <IconButton
                sx={{
                  display: { xs: "flex", md: "none" },
                  color: "#D4AF37",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  borderRadius: "12px",
                  outline: "none",
                  border: "2px solid rgba(212, 175, 55, 0.3)",
                  "&:hover": {
                    backgroundColor: "rgba(212, 175, 55, 0.15)",
                    borderColor: "#D4AF37",
                    transform: "rotate(90deg) scale(1.1)",
                    boxShadow: "0 8px 25px rgba(212, 175, 55, 0.4)",
                    color: "#B8941F",
                  },
                  "&:focus": {
                    outline: "none",
                    boxShadow: "none",
                  },
                  "&:focus-visible": {
                    outline: "none",
                    boxShadow: "none",
                  },
                  "&.Mui-focusVisible": {
                    outline: "none",
                    boxShadow: "none",
                  },
                }}
                onClick={() => setMobileMenuOpen(true)}
              >
                <MenuIcon sx={{ fontSize: "1.8rem" }} />
              </IconButton>
            </Fade>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "280px", sm: "320px" },
            backgroundColor: "rgba(255, 248, 220, 0.98)",
            backgroundImage:
              "linear-gradient(135deg, rgba(255, 248, 220, 0.98) 0%, rgba(255, 236, 179, 0.95) 100%)",
            backdropFilter: "blur(20px)",
            borderLeft: "3px solid rgba(212, 175, 55, 0.5)",
            boxShadow: "0 8px 32px rgba(212, 175, 55, 0.25)",
            height: "auto",
            top: "80px",
            bottom: "auto",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              Menu
            </Typography>
            <IconButton
              onClick={() => setMobileMenuOpen(false)}
              size="small"
              sx={{
                transition: "all 0.3s ease",
                borderRadius: "8px",
                "&:hover": {
                  transform: "rotate(90deg)",
                  backgroundColor: "rgba(212, 175, 55, 0.1)",
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2, borderColor: "rgba(212, 175, 55, 0.2)" }} />
          <List sx={{ py: 0 }}>
            <ListItemButton
              onClick={() => {
                handleRegister();
                setMobileMenuOpen(false);
              }}
              sx={{
                borderRadius: "12px",
                mb: 1,
                py: 1.5,
                px: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.15)",
                  transform: "translateX(8px)",
                  boxShadow: "0 4px 12px rgba(212, 175, 55, 0.2)",
                  "& .icon": {
                    color: "#D4AF37",
                    transform: "rotate(180deg)",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: "#D4AF37",
                  minWidth: 36,
                  "& .icon": {
                    transition: "all 0.3s ease",
                  },
                }}
              >
                <PersonAdd className="icon" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Register"
                primaryTypographyProps={{
                  fontSize: { xs: "0.95rem", sm: "1.1rem" },
                  fontWeight: 600,
                  color: "text.primary",
                }}
              />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                handleLogin();
                setMobileMenuOpen(false);
              }}
              sx={{
                borderRadius: "12px",
                mb: 1,
                py: 1.5,
                px: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.15)",
                  transform: "translateX(8px)",
                  boxShadow: "0 4px 12px rgba(212, 175, 55, 0.2)",
                  "& .icon": {
                    color: "#D4AF37",
                    transform: "rotate(180deg)",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: "#D4AF37",
                  minWidth: 36,
                  "& .icon": {
                    transition: "all 0.3s ease",
                  },
                }}
              >
                <Login className="icon" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Login"
                primaryTypographyProps={{
                  fontSize: { xs: "0.95rem", sm: "1.1rem" },
                  fontWeight: 600,
                  color: "text.primary",
                }}
              />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Registration Dialog */}
      <Dialog
        open={registerDialogOpen}
        onClose={handleRegisterClose}
        PaperProps={{
          sx: {
            borderRadius: "20px",
            backgroundColor: "rgba(255, 248, 220, 0.98)",
            backgroundImage:
              "linear-gradient(135deg, rgba(255, 248, 220, 0.98) 0%, rgba(255, 236, 179, 0.95) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(212, 175, 55, 0.3)",
            border: "2px solid rgba(212, 175, 55, 0.3)",
            maxHeight: "95vh",
            width: { xs: "90%", sm: "85%", md: "75%" },
            maxWidth: "700px",
            margin: "auto",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(45deg, #D4AF37, #B8941F)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            textAlign: "center",
            pb: 1,
            pt: { xs: 2, sm: 2.5 },
          }}
        >
          Create Account{" "}
          {registerStep === 1 ? "(Step 1 of 2)" : "(Step 2 of 2)"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent
            sx={{
              px: { xs: 3, sm: 4 },
              py: { xs: 2, sm: 2.5 },
              overflow: "auto",
              minHeight: "400px",
            }}
          >
            {registerStep === 1 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Required Fields */}
                <TextField
                  required
                  label="Name"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.5,
                      lineHeight: 1.5,
                    },
                    "& .MuiInputLabel-root": {
                      transform: "translate(14px, 18px) scale(1)",
                      "&.MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                      },
                      "&.Mui-focused": {
                        color: "#D4AF37",
                      },
                    },
                  }}
                />
                <TextField
                  required
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange("phone")}
                  fullWidth
                  variant="outlined"
                  placeholder="+254798123456"
                  error={Boolean(phoneError)}
                  helperText={
                    phoneError ||
                    "Use the full country code, e.g., +254798123456."
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.5,
                      lineHeight: 1.5,
                    },
                    "& .MuiInputLabel-root": {
                      transform: "translate(14px, 18px) scale(1)",
                      "&.MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                      },
                      "&.Mui-focused": {
                        color: "#D4AF37",
                      },
                    },
                  }}
                />
                <TextField
                  required
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  fullWidth
                  variant="outlined"
                  placeholder="john@example.com"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.5,
                      lineHeight: 1.5,
                    },
                    "& .MuiInputLabel-root": {
                      transform: "translate(14px, 18px) scale(1)",
                      "&.MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                      },
                      "&.Mui-focused": {
                        color: "#D4AF37",
                      },
                    },
                  }}
                />
                <TextField
                  required
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.5,
                      lineHeight: 1.5,
                    },
                    "& .MuiInputLabel-root": {
                      transform: "translate(14px, 18px) scale(1)",
                      "&.MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                      },
                      "&.Mui-focused": {
                        color: "#D4AF37",
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "#D4AF37" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Optional Fields */}
                <FormControl fullWidth>
                  <InputLabel sx={{ "&.Mui-focused": { color: "#D4AF37" } }}>
                    Gender
                  </InputLabel>
                  <Select
                    value={formData.gender}
                    onChange={handleInputChange("gender")}
                    label="Gender"
                    sx={{
                      borderRadius: "12px",
                      "& .MuiSelect-select": {
                        py: 1.5,
                        lineHeight: 1.5,
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    }}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Year of Birth"
                  type="number"
                  value={formData.birthYear}
                  onChange={handleInputChange("birthYear")}
                  required
                  error={Boolean(birthYearError)}
                  helperText={birthYearError || " "}
                  fullWidth
                  variant="outlined"
                  inputProps={{
                    min: 1900,
                    max: new Date().getFullYear(),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.5,
                      lineHeight: 1.5,
                    },
                    "& .MuiInputLabel-root": {
                      transform: "translate(14px, 18px) scale(1)",
                      "&.MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                      },
                      "&.Mui-focused": {
                        color: "#D4AF37",
                      },
                    },
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  py: 2,
                }}
              >
                <TextField
                  label="Bio"
                  name="bio"
                  multiline
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange("bio")}
                  fullWidth
                  placeholder="Tell us about yourself..."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(212, 175, 55, 0.6)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#D4AF37",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.5,
                      lineHeight: 1.5,
                    },
                    "& .MuiInputLabel-root": {
                      transform: "translate(14px, 18px) scale(1)",
                      "&.MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                      },
                      "&.Mui-focused": {
                        color: "#D4AF37",
                      },
                    },
                  }}
                />
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="register-photo-upload-header"
                  type="file"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="register-photo-upload-header">
                  <IconButton
                    color="primary"
                    component="span"
                    sx={{
                      width: 150,
                      height: 150,
                      border: "2px dashed rgba(212, 175, 55, 0.5)",
                      borderRadius: "12px",
                      "&:hover": {
                        borderColor: "#D4AF37",
                        backgroundColor: "rgba(212, 175, 55, 0.1)",
                      },
                    }}
                  >
                    {photoPreview ? (
                      <Avatar
                        src={photoPreview}
                        sx={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "12px",
                        }}
                      />
                    ) : (
                      <PhotoCamera sx={{ fontSize: 60, color: "#D4AF37" }} />
                    )}
                  </IconButton>
                </label>
                <Typography
                  variant="body1"
                  sx={{
                    color: "rgba(26, 26, 26, 0.7)",
                    textAlign: "center",
                    fontWeight: 500,
                  }}
                >
                  {photoPreview
                    ? "Click to change photo"
                    : "Upload Profile Photo (Optional)"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(26, 26, 26, 0.5)",
                    textAlign: "center",
                  }}
                >
                  You can skip photo and bio and add them later
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              px: { xs: 3, sm: 4 },
              pb: { xs: 2, sm: 2.5 },
              pt: { xs: 1, sm: 1.5 },
              gap: { xs: 1.5, sm: 2 },
              justifyContent: "center",
            }}
          >
            {registerStep === 1 ? (
              <>
                <Button
                  onClick={handleRegisterClose}
                  variant="outlined"
                  sx={{
                    borderRadius: "25px",
                    px: { xs: 3, sm: 4 },
                    py: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    borderColor: "primary.main",
                    color: "primary.main",
                    "&:hover": {
                      borderColor: "primary.dark",
                      backgroundColor: "rgba(212, 175, 55, 0.1)",
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Validate required fields
                    if (
                      !formData.name ||
                      !formData.phone ||
                      !formData.email ||
                      !formData.password
                    ) {
                      Swal.fire({
                        icon: "error",
                        title: "Missing Fields",
                        text: "Please fill in all required fields.",
                        confirmButtonColor: "#D4AF37",
                        zIndex: 2000,
                        didOpen: () => {
                          const swalContainer =
                            document.querySelector(".swal2-container");
                          const swalPopup =
                            document.querySelector(".swal2-popup");
                          if (swalContainer) {
                            swalContainer.style.zIndex = "2000";
                          }
                          if (swalPopup) {
                            swalPopup.style.zIndex = "2001";
                          }
                        },
                      });
                      return;
                    }
                    const { error: stepPhoneError } = evaluatePhoneInput(
                      formData.phone
                    );
                    if (stepPhoneError) {
                      setPhoneError(stepPhoneError);
                      Swal.fire({
                        icon: "error",
                        title: "Invalid Phone Number",
                        text: stepPhoneError,
                        confirmButtonColor: "#D4AF37",
                        zIndex: 2000,
                        didOpen: () => {
                          const swalContainer =
                            document.querySelector(".swal2-container");
                          const swalPopup =
                            document.querySelector(".swal2-popup");
                          if (swalContainer) {
                            swalContainer.style.zIndex = "2000";
                          }
                          if (swalPopup) {
                            swalPopup.style.zIndex = "2001";
                          }
                        },
                      });
                      return;
                    }
                    setRegisterStep(2);
                  }}
                  variant="contained"
                  sx={{
                    borderRadius: "25px",
                    px: { xs: 3, sm: 4 },
                    py: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                    "&:hover": {
                      background: "linear-gradient(45deg, #B8941F, #D4AF37)",
                      boxShadow: "0 8px 25px rgba(212, 175, 55, 0.4)",
                    },
                  }}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setRegisterStep(1)}
                  variant="outlined"
                  sx={{
                    borderRadius: "25px",
                    px: { xs: 3, sm: 4 },
                    py: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    borderColor: "primary.main",
                    color: "primary.main",
                    "&:hover": {
                      borderColor: "primary.dark",
                      backgroundColor: "rgba(212, 175, 55, 0.1)",
                    },
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    borderRadius: "25px",
                    px: { xs: 3, sm: 4 },
                    py: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                    "&:hover": {
                      background: "linear-gradient(45deg, #B8941F, #D4AF37)",
                      boxShadow: "0 8px 25px rgba(212, 175, 55, 0.4)",
                    },
                  }}
                >
                  Register
                </Button>
              </>
            )}
          </DialogActions>
        </form>
      </Dialog>

      {/* Enhanced Login Dialog */}
      <Dialog
        open={loginDialogOpen}
        onClose={handleLoginClose}
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 220, 0.95) 100%)",
            backdropFilter: "blur(30px)",
            boxShadow:
              "0 25px 80px rgba(212, 175, 55, 0.25), 0 0 0 1px rgba(212, 175, 55, 0.1)",
            maxHeight: "95vh",
            width: { xs: "90%", sm: "500px" },
            margin: "auto",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "linear-gradient(90deg, #D4AF37, #B8941F, #D4AF37)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s ease-in-out infinite",
            },
          },
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(184, 148, 31, 0.05))",
            filter: "blur(40px)",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(245, 230, 211, 0.3), rgba(212, 175, 55, 0.1))",
            filter: "blur(30px)",
            zIndex: 0,
          }}
        />

        {/* Header Section */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <DialogTitle
            sx={{
              pt: { xs: 4, sm: 5 },
              pb: 1,
              px: { xs: 3, sm: 4 },
              textAlign: "center",
              position: "relative",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1.5,
              }}
            >
              <AutoAwesome
                sx={{
                  fontSize: { xs: 28, sm: 32 },
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                  fontSize: { xs: "1.75rem", sm: "2rem" },
                  letterSpacing: "0.5px",
                }}
              >
                Welcome Back
              </Typography>
              <AutoAwesome
                sx={{
                  fontSize: { xs: 28, sm: 32 },
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "pulse 2s ease-in-out infinite",
                  animationDelay: "1s",
                }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                fontWeight: 400,
                mt: 0.5,
              }}
            >
              Sign in to continue your TuVibe journey
            </Typography>
          </DialogTitle>

          <form onSubmit={handleLoginSubmit}>
            <DialogContent
              sx={{
                px: { xs: 3, sm: 4 },
                py: { xs: 2.5, sm: 3 },
                position: "relative",
                zIndex: 1,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Email Field */}
                <Box>
                  <TextField
                    required
                    label="Email Address"
                    type="email"
                    value={loginFormData.email}
                    onChange={handleLoginInputChange("email")}
                    fullWidth
                    variant="outlined"
                    placeholder="Enter your email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email
                            sx={{
                              color: "#D4AF37",
                              fontSize: { xs: 20, sm: 22 },
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "16px",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        transition: "all 0.3s ease",
                        "& fieldset": {
                          borderColor: "rgba(212, 175, 55, 0.25)",
                          borderWidth: "1.5px",
                        },
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          "& fieldset": {
                            borderColor: "rgba(212, 175, 55, 0.5)",
                          },
                        },
                        "&.Mui-focused": {
                          backgroundColor: "rgba(255, 255, 255, 1)",
                          "& fieldset": {
                            borderColor: "#D4AF37",
                            borderWidth: "2px",
                          },
                        },
                      },
                      "& .MuiInputBase-input": {
                        py: { xs: 1.75, sm: 2 },
                        fontSize: { xs: "0.9375rem", sm: "1rem" },
                      },
                      "& .MuiInputLabel-root": {
                        fontSize: { xs: "0.9375rem", sm: "1rem" },
                        "&.Mui-focused": {
                          color: "#D4AF37",
                          fontWeight: 500,
                        },
                      },
                    }}
                  />
                </Box>

                {/* Password Field */}
                <Box>
                  <TextField
                    required
                    label="Password"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginFormData.password}
                    onChange={handleLoginInputChange("password")}
                    fullWidth
                    variant="outlined"
                    placeholder="Enter your password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock
                            sx={{
                              color: "#D4AF37",
                              fontSize: { xs: 20, sm: 22 },
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() =>
                              setShowLoginPassword(!showLoginPassword)
                            }
                            edge="end"
                            sx={{
                              color: "#D4AF37",
                              "&:hover": {
                                backgroundColor: "rgba(212, 175, 55, 0.1)",
                              },
                            }}
                          >
                            {showLoginPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "16px",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        transition: "all 0.3s ease",
                        "& fieldset": {
                          borderColor: "rgba(212, 175, 55, 0.25)",
                          borderWidth: "1.5px",
                        },
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          "& fieldset": {
                            borderColor: "rgba(212, 175, 55, 0.5)",
                          },
                        },
                        "&.Mui-focused": {
                          backgroundColor: "rgba(255, 255, 255, 1)",
                          "& fieldset": {
                            borderColor: "#D4AF37",
                            borderWidth: "2px",
                          },
                        },
                      },
                      "& .MuiInputBase-input": {
                        py: { xs: 1.75, sm: 2 },
                        fontSize: { xs: "0.9375rem", sm: "1rem" },
                      },
                      "& .MuiInputLabel-root": {
                        fontSize: { xs: "0.9375rem", sm: "1rem" },
                        "&.Mui-focused": {
                          color: "#D4AF37",
                          fontWeight: 500,
                        },
                      },
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      mt: 1,
                    }}
                  >
                    <Typography
                      component="button"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Implement forgot password
                        Swal.fire({
                          icon: "info",
                          title: "Forgot Password",
                          text: "Password reset feature coming soon!",
                          confirmButtonColor: "#D4AF37",
                        });
                      }}
                      sx={{
                        fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                        color: "#D4AF37",
                        fontWeight: 500,
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        textDecoration: "none",
                        "&:hover": {
                          color: "#B8941F",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      Forgot Password?
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </DialogContent>

            {/* Footer Actions */}
            <DialogActions
              sx={{
                px: { xs: 3, sm: 4 },
                pb: { xs: 3, sm: 4 },
                pt: 1,
                flexDirection: "column",
                gap: 2,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Button
                type="submit"
                variant="contained"
                fullWidth
                endIcon={<ArrowForward />}
                sx={{
                  borderRadius: "16px",
                  py: { xs: 1.5, sm: 1.75 },
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { xs: "1rem", sm: "1.0625rem" },
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: "linear-gradient(45deg, #B8941F, #D4AF37)",
                    boxShadow: "0 8px 25px rgba(212, 175, 55, 0.4)",
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                }}
              >
                Sign In
              </Button>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  width: "100%",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                    color: "text.secondary",
                  }}
                >
                  Don't have an account?
                </Typography>
                <Typography
                  component="button"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLoginClose();
                    setTimeout(() => {
                      handleRegister();
                    }, 300);
                  }}
                  sx={{
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                    color: "#D4AF37",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    "&:hover": {
                      color: "#B8941F",
                      textDecoration: "underline",
                    },
                  }}
                >
                  Register Now
                  <PersonAdd sx={{ fontSize: 18 }} />
                </Typography>
              </Box>

              <Button
                onClick={handleLoginClose}
                variant="text"
                sx={{
                  textTransform: "none",
                  color: "text.secondary",
                  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  "&:hover": {
                    backgroundColor: "rgba(212, 175, 55, 0.05)",
                  },
                }}
              >
                Cancel
              </Button>
            </DialogActions>
          </form>

          {/* Animations */}
          <style>
            {`
              @keyframes shimmer {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              
              @keyframes pulse {
                0%, 100% { 
                  opacity: 1;
                  transform: scale(1);
                }
                50% { 
                  opacity: 0.7;
                  transform: scale(1.1);
                }
              }
            `}
          </style>
        </Box>
      </Dialog>

      <Toolbar
        sx={{
          height: scrolled ? "72px" : "80px",
          transition: "height 0.4s ease",
        }}
      />
    </>
  );
}
