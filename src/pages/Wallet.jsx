import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Badge,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  AccountBalanceWallet,
  Add,
  CheckCircle,
  Cancel,
  TrendingUp,
  Payment,
  AccountCircle,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  TOKENS_PER_KSH,
  convertTokensToKsh,
  describeExchangeRate,
} from "../utils/pricing";

const QUICK_TOKEN_PACKS = [100, 250, 500, 1000];
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

const formatKsh = (kshValue) =>
  `KES ${Number(kshValue).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Wallet({ user, setUser }) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(user?.token_balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [customAmountError, setCustomAmountError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const quickBuyOptions = QUICK_TOKEN_PACKS.map((tokens) => ({
    tokens,
    label: `${tokens.toLocaleString()} Tokens`,
    price: formatKsh(convertTokensToKsh(tokens)),
  }));
  const parsedCustomAmount = Number(customAmount);
  const formattedCustomValue =
    customAmount &&
    Number.isFinite(parsedCustomAmount) &&
    parsedCustomAmount > 0
      ? formatKsh(convertTokensToKsh(parsedCustomAmount))
      : null;

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [balanceRes, transactionsRes] = await Promise.all([
        fetch("/api/tokens/balance", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/tokens/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const balanceData = await balanceRes.json();
      const transactionsData = await transactionsRes.json();

      if (balanceData.success) {
        setBalance(balanceData.data.balance);
        const updatedUser = {
          ...user,
          token_balance: balanceData.data.balance,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (setUser) setUser(updatedUser);
      }

      if (transactionsData.success) {
        setTransactions(transactionsData.data || []);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tokensRequested) => {
    if (purchasing) return;

    const currentUser =
      user || JSON.parse(localStorage.getItem("user") || "{}");
    if (!currentUser?.email) {
      Swal.fire({
        icon: "error",
        title: "Missing Email",
        text: "We could not determine your account email. Please re-login and try again.",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    setPurchasing(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: currentUser.email,
          amount: tokensRequested,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      const {
        reference,
        bypassed,
        credited_tokens,
        balance: updatedBalance,
        paystack_amount,
        currency,
      } = data;
      const effectiveTokens = credited_tokens || tokensRequested;
      const effectiveKsh = convertTokensToKsh(effectiveTokens);

      if (bypassed) {
        const parsedBalance =
          updatedBalance !== undefined ? Number(updatedBalance) : NaN;
        const balanceToApply = Number.isFinite(parsedBalance)
          ? parsedBalance
          : Number.isFinite(Number(balance))
          ? Number(balance)
          : null;
        if (balanceToApply !== null) {
          setBalance(balanceToApply);
          const updatedUserData = {
            ...(currentUser || {}),
            token_balance: balanceToApply,
          };
          localStorage.setItem("user", JSON.stringify(updatedUserData));
          if (setUser) setUser(updatedUserData);
        }

        await fetchWallet();
        setPurchasing(false);
        Swal.fire({
          icon: "success",
          title: "Tokens Added",
          html: `
            <p><strong>${effectiveTokens.toLocaleString()} tokens</strong> added to your wallet.</p>
            <p style="font-size: 0.9em; color: #666; margin-top: 8px;">Equivalent to ${formatKsh(effectiveKsh)}</p>
            <p style="font-size: 0.85em; color: #888; margin-top: 6px;">Reference: <code>${reference}</code></p>
          `,
          confirmButtonColor: "#D4AF37",
        });
        return;
      }

      if (!PAYSTACK_PUBLIC_KEY) {
        throw new Error("Paystack public key not configured");
      }

      if (!window.PaystackPop) {
        throw new Error("Paystack inline SDK not loaded");
      }

      const paystackAmountNumberRaw = Number(paystack_amount);
      const fallbackPaystackAmount = Math.round(
        convertTokensToKsh(effectiveTokens) * 100
      );
      const paystackAmountNumber =
        Number.isFinite(paystackAmountNumberRaw) &&
        paystackAmountNumberRaw > 0
          ? paystackAmountNumberRaw
          : fallbackPaystackAmount;

      if (
        !Number.isFinite(paystackAmountNumberRaw) ||
        paystackAmountNumberRaw <= 0
      ) {
        console.warn("Paystack amount missing; using fallback value", {
          paystack_amount: paystack_amount ?? null,
          fallbackPaystackAmount,
          tokens: effectiveTokens,
        });
      }

      if (!Number.isFinite(paystackAmountNumber) || paystackAmountNumber <= 0) {
        throw new Error("Invalid Paystack amount received from server");
      }

      const metadata = {
        tokens: effectiveTokens,
      };
      const userIdentifier =
        currentUser?.public_id ||
        currentUser?.id ||
        currentUser?.user_id ||
        currentUser?.uuid;
      if (userIdentifier) {
        metadata.userId = userIdentifier;
      }

      let paymentCompleted = false;

      const handlePaystackVerification = async (paystackResponse) => {
        try {
          Swal.fire({
            icon: "info",
            title: "Verifying Payment...",
            text: "Please wait while we confirm your payment.",
            allowOutsideClick: false,
            showConfirmButton: false,
          });
          Swal.showLoading();

          const authToken = localStorage.getItem("token");
          const verifyResponse = await fetch(
            `/api/paystack/verify?reference=${paystackResponse.reference}`,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
          const verifyData = await verifyResponse.json();
          Swal.close();

          if (!verifyResponse.ok || !verifyData.success) {
            throw new Error(
              verifyData.message ||
                "Paystack reported that the payment was not completed."
            );
          }

          paymentCompleted = true;
          await fetchWallet();
          Swal.fire({
            icon: "success",
            title: "Payment Successful",
            html: `
              <p><strong>${effectiveTokens.toLocaleString()} tokens</strong> added to your wallet.</p>
              <p style="font-size: 0.9em; color: #666; margin-top: 8px;">Equivalent to ${formatKsh(effectiveKsh)}</p>
              <p style="font-size: 0.85em; color: #888; margin-top: 6px;">Reference: <code>${paystackResponse.reference}</code></p>
            `,
            timer: 2600,
            showConfirmButton: false,
            confirmButtonColor: "#D4AF37",
          });
        } catch (verifyError) {
          console.error("verifyPayment error:", verifyError);
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Verification Failed",
            text:
              verifyError.message ||
              "Something went wrong. Please contact support.",
            confirmButtonColor: "#D4AF37",
          });
        } finally {
          setPurchasing(false);
        }
      };

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: paystackAmountNumber,
        currency: currency || "KES",
        ref: reference,
        metadata,
        onClose: () => {
          if (!paymentCompleted) {
            setPurchasing(false);
            Swal.fire({
              icon: "info",
              title: "Payment Cancelled",
              text: "You can restart the payment whenever you’re ready.",
              confirmButtonColor: "#D4AF37",
            });
          }
        },
        callback: function (paystackResponse) {
          handlePaystackVerification(paystackResponse);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Purchase error:", error);
      setPurchasing(false);
      Swal.fire({
        icon: "error",
        title: "Purchase Failed",
        text:
          error.message ||
          "Failed to start Paystack payment. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  const handleCustomPurchase = async () => {
    if (purchasing) return;

    const parsedAmount = Number(customAmount);

    if (!customAmount || Number.isNaN(parsedAmount)) {
      setCustomAmountError("Enter how many tokens you want to buy.");
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setCustomAmountError("Use a positive whole number of tokens.");
      return;
    }

    setCustomAmountError("");

    try {
      await handlePurchase(parsedAmount);
      setCustomAmount("");
    } catch (error) {
      console.error("Custom purchase error:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRowClick = async (transactionId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tokens/transactions/${transactionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSelectedTransaction(data.data);
        setDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load transaction details",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: { xs: 1, sm: 2 },
            mb: { xs: 0.5, sm: 1 },
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
                  fontWeight: 700,
                  fontSize: { xs: "1.25rem", sm: "1.75rem", md: "2.125rem" },
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  wordBreak: "break-word",
                  lineHeight: 1.2,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                Token Wallet
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
                        backgroundColor: "rgba(212, 175, 55, 0.12)",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        "&:hover": {
                          backgroundColor: "rgba(212, 175, 55, 0.22)",
                        },
                        flexShrink: 0,
                        width: { xs: "36px", sm: "40px" },
                        height: { xs: "36px", sm: "40px" },
                        p: { xs: 0.75, sm: 1 },
                      }}
                    >
                      <AccountCircle
                        sx={{
                          color: "#D4AF37",
                          fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        }}
                      />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(26, 26, 26, 0.7)",
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                wordBreak: "break-word",
                lineHeight: 1.4,
              }}
            >
              Manage your tokens and view transaction history
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Test Mode Alert */}
      <Alert
        severity="info"
        icon={<Payment />}
        sx={{
          mb: { xs: 1.5, sm: 2, md: 3 },
          borderRadius: "12px",
          bgcolor: "rgba(212, 175, 55, 0.07)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          "& .MuiAlert-icon": {
            color: "#D4AF37",
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            fontSize: { xs: "0.75rem", sm: "0.9rem" },
          }}
        >
          🔒 Secure Paystack Checkout
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontSize: { xs: "0.7rem", sm: "0.9rem" } }}
        >
          Your purchase is completed through Paystack. Approve the charge in the
          Paystack window and we’ll update your wallet instantly once the
          payment is confirmed.
        </Typography>
      </Alert>

      {/* Balance Card */}
      <Card
        sx={{
          p: { xs: 1, sm: 2, md: 3 },
          mb: { xs: 1.5, sm: 2, md: 3 },
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
          border: "2px solid rgba(212, 175, 55, 0.3)",
          boxShadow: "0 8px 32px rgba(212, 175, 55, 0.15)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          // Fixed height to prevent layout shift during loading
          minHeight: { xs: "140px", sm: "160px", md: "180px" },
          height: { xs: "140px", sm: "160px", md: "180px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 2, md: 3 }}
          alignItems="center"
        >
          <Box
            sx={{
              width: { xs: 50, sm: 60, md: 80 },
              height: { xs: 50, sm: 60, md: 80 },
              borderRadius: "50%",
              background: "linear-gradient(135deg, #D4AF37, #B8941F)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(212, 175, 55, 0.3)",
              flexShrink: 0,
            }}
          >
            <AccountBalanceWallet
              sx={{ fontSize: { xs: 24, sm: 30, md: 40 }, color: "#1a1a1a" }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(26, 26, 26, 0.7)",
                mb: 1,
                fontSize: { xs: "0.65rem", sm: "0.875rem" },
              }}
            >
              Current Balance
            </Typography>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                }}
              >
                <CircularProgress size={24} sx={{ color: "#D4AF37" }} />
              </Box>
            ) : (
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.2rem", sm: "2rem", md: "3rem" },
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  wordBreak: "break-word",
                  minHeight: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {Number(balance || 0).toFixed(2)} Tokens
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                color: "rgba(26, 26, 26, 0.6)",
                mt: 0.5,
                fontSize: { xs: "0.65rem", sm: "0.875rem" },
              }}
            >
              Exchange rate: {describeExchangeRate()} (≈ KES
              {convertTokensToKsh(1).toFixed(2)} per token)
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* Quick Buy Section */}
      <Card
        sx={{
          p: { xs: 1, sm: 2, md: 3 },
          mb: { xs: 1.5, sm: 2, md: 3 },
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 3,
            color: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: { xs: "0.85rem", sm: "1.125rem", md: "1.25rem" },
          }}
        >
          <Add
            sx={{ fontSize: { xs: "1rem", md: "1.5rem" }, color: "#D4AF37" }}
          />
          Quick Buy Tokens
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(26, 26, 26, 0.6)",
            mb: { xs: 1, sm: 1.5 },
            fontSize: { xs: "0.7rem", sm: "0.85rem" },
          }}
        >
          Each KES adds {TOKENS_PER_KSH.toLocaleString()} tokens ({describeExchangeRate()})
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 1.5 }}
          sx={{ mb: { xs: 1.5, sm: 2 } }}
        >
          <TextField
            label="Custom tokens"
            type="number"
            value={customAmount}
            onChange={(event) => {
              setCustomAmount(event.target.value);
              if (customAmountError) {
                setCustomAmountError("");
              }
            }}
            fullWidth
            inputProps={{ min: 1, step: 1 }}
            disabled={purchasing}
            error={Boolean(customAmountError)}
            helperText={
              customAmountError ||
              `1 purchase: ${describeExchangeRate()} (enter tokens)${
                formattedCustomValue ? ` • Worth ${formattedCustomValue}` : ""
              }`
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleCustomPurchase}
            disabled={purchasing}
            sx={{
              minWidth: { xs: "100%", sm: 180 },
              borderRadius: "12px",
              bgcolor: "#D4AF37",
              color: "#1a1a1a",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#B8941F",
                transform: "translateY(-2px)",
              },
              "&:disabled": {
                opacity: 0.6,
              },
            }}
          >
            Buy Tokens
          </Button>
        </Stack>
        {formattedCustomValue && (
          <Box
            sx={{
              display: "flex",
              justifyContent: { xs: "flex-start", sm: "flex-start" },
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            <Chip
              icon={<Payment />}
              label={`Worth ${formattedCustomValue}`}
              sx={{
                borderRadius: "999px",
                fontWeight: 600,
                px: 2,
                py: 0.5,
                bgcolor: "rgba(212, 175, 55, 0.15)",
                color: "#B8941F",
                "& .MuiChip-icon": {
                  color: "#D4AF37",
                },
              }}
            />
          </Box>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: { xs: 1, sm: 1.5, md: 2 },
          }}
        >
          {quickBuyOptions.map((option) => (
            <Button
              key={option.tokens}
              variant="outlined"
              onClick={() => handlePurchase(option.tokens)}
              disabled={purchasing}
              sx={{
                p: { xs: 1, sm: 1.5, md: 2 },
                borderRadius: "12px",
                borderColor: "rgba(212, 175, 55, 0.5)",
                color: "#1a1a1a",
                fontWeight: 600,
                textTransform: "none",
                "&:hover": {
                  borderColor: "#D4AF37",
                  bgcolor: "rgba(212, 175, 55, 0.1)",
                  transform: "translateY(-2px)",
                },
                "&:disabled": {
                  opacity: 0.6,
                },
              }}
            >
              <Box sx={{ textAlign: "center", width: "100%" }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    fontSize: { xs: "0.75rem", sm: "1rem", md: "1.25rem" },
                  }}
                >
                  {option.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(26, 26, 26, 0.7)",
                    fontSize: { xs: "0.65rem", sm: "0.875rem" },
                  }}
                >
                  {option.price}
                </Typography>
              </Box>
            </Button>
          ))}
        </Box>
        {purchasing && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <CircularProgress size={24} sx={{ color: "#D4AF37" }} />
            <Typography
              variant="body2"
              sx={{ mt: 1, color: "rgba(26, 26, 26, 0.7)" }}
            >
              Processing purchase...
            </Typography>
          </Box>
        )}
      </Card>

      {/* Transaction History */}
      <Card
        sx={{
          p: { xs: 1, sm: 2, md: 3 },
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 3,
            color: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" },
          }}
        >
          <TrendingUp
            sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, color: "#D4AF37" }}
          />
          Transaction History
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#D4AF37" }} />
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" sx={{ color: "rgba(26, 26, 26, 0.6)" }}>
              No transactions yet
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(26, 26, 26, 0.5)", mt: 1 }}
            >
              Purchase tokens to see your transaction history here
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              boxShadow: "none",
              bgcolor: "transparent",
              overflowX: "auto",
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: { xs: 280, sm: 400 },
                width: "100%",
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: { xs: "0.65rem", sm: "0.875rem" },
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: { xs: "0.65rem", sm: "0.875rem" },
                    }}
                  >
                    Amount
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Method
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    hover
                    onClick={() => handleRowClick(transaction.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell
                      sx={{
                        color: "rgba(26, 26, 26, 0.7)",
                        fontSize: { xs: "0.65rem", sm: "0.875rem" },
                      }}
                    >
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color:
                            Number(transaction.amount) > 0
                              ? "#4caf50"
                              : "#f44336",
                          fontSize: { xs: "0.65rem", sm: "0.875rem" },
                        }}
                      >
                        {Number(transaction.amount) > 0 ? "+" : ""}
                        {Number(transaction.amount).toFixed(2)} Tokens
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      <Chip
                        label={transaction.payment_method || "system"}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(212, 175, 55, 0.3)",
                          color: "rgba(26, 26, 26, 0.7)",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                          height: { xs: 24, sm: 28 },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedTransaction(null);
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
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #D4AF37, #B8941F)",
            color: "#1a1a1a",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pb: 2,
          }}
        >
          <AccountBalanceWallet sx={{ color: "#1a1a1a" }} />
          Transaction Details
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedTransaction && (
            <Box>
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                    }}
                  >
                    Type
                  </Typography>
                  <Chip
                    label={
                      selectedTransaction.transaction_type === "purchase"
                        ? "Purchase"
                        : selectedTransaction.transaction_type === "deduction"
                          ? "Deduction"
                          : "Bonus"
                    }
                    size="small"
                    sx={{
                      mt: 0.5,
                      bgcolor:
                        selectedTransaction.transaction_type === "purchase"
                          ? "rgba(76, 175, 80, 0.15)"
                          : selectedTransaction.transaction_type === "deduction"
                            ? "rgba(244, 67, 54, 0.15)"
                            : "rgba(212, 175, 55, 0.15)",
                      color:
                        selectedTransaction.transaction_type === "purchase"
                          ? "#4caf50"
                          : selectedTransaction.transaction_type === "deduction"
                            ? "#f44336"
                            : "#D4AF37",
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Divider />

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                    }}
                  >
                    Amount
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color:
                        Number(selectedTransaction.amount) > 0
                          ? "#4caf50"
                          : "#f44336",
                      mt: 0.5,
                    }}
                  >
                    {Number(selectedTransaction.amount) > 0 ? "+" : ""}
                    {Number(selectedTransaction.amount).toFixed(2)} Tokens
                  </Typography>
                </Box>

                <Divider />

                {selectedTransaction.description && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.6)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                      }}
                    >
                      Description
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#1a1a1a",
                        mt: 0.5,
                      }}
                    >
                      {selectedTransaction.description}
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                    }}
                  >
                    Payment Method
                  </Typography>
                  <Chip
                    label={selectedTransaction.payment_method || "system"}
                    variant="outlined"
                    sx={{
                      mt: 0.5,
                      borderColor: "rgba(212, 175, 55, 0.3)",
                      color: "rgba(26, 26, 26, 0.7)",
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {selectedTransaction.reference && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(26, 26, 26, 0.6)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          fontSize: "0.7rem",
                        }}
                      >
                        Reference
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(26, 26, 26, 0.7)",
                          mt: 0.5,
                          fontFamily: "monospace",
                        }}
                      >
                        {selectedTransaction.reference}
                      </Typography>
                    </Box>
                  </>
                )}

                <Divider />

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                    }}
                  >
                    Date
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#1a1a1a",
                      mt: 0.5,
                    }}
                  >
                    {formatDate(selectedTransaction.createdAt)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
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
              setSelectedTransaction(null);
            }}
            sx={{
              color: "#1a1a1a",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(212, 175, 55, 0.1)",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
