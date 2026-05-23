import React, { useState, useEffect, useCallback } from "react";
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
  Button,
  Chip,
} from "@mui/material";
import { AttachMoney, CheckCircle, Verified } from "@mui/icons-material";
import Swal from "sweetalert2";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

const categories = [
  "Regular",
  "Sugar Mummy",
  "Sponsor",
  "Ben 10",
  "Urban Chics",
];

export default function Pricing() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userCategory, setUserCategory] = useState(null); // Track user's category
  const [subscribing, setSubscribing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [pendingDowngrade, setPendingDowngrade] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Get effective category index: use user's category if logged in, otherwise use selectedTab
  const getEffectiveCategoryIndex = () => {
    if (isLoggedIn && userCategory) {
      const categoryIndex = categories.findIndex((cat) => cat === userCategory);
      return categoryIndex !== -1 ? categoryIndex : 0;
    }
    return selectedTab;
  };

  const effectiveCategoryIndex = getEffectiveCategoryIndex();

  // Calculate prorated amount for upgrade
  const calculateProratedAmount = (currentPlan, newPlan) => {
    if (!currentSubscription) return null;

    // Get plan prices based on user category
    const amounts = {
      Silver: effectiveCategoryIndex === 0 ? 149 : 199,
      Gold: effectiveCategoryIndex === 0 ? 249 : 349,
    };
    
    // Use stored amount if available, otherwise fallback to expected price for current plan
    const currentPlanPrice = currentSubscription.amount && currentSubscription.amount > 0
      ? currentSubscription.amount
      : amounts[currentPlan] || 0;
    
    const newPlanPrice = amounts[newPlan];

    // Validate prices
    if (!currentPlanPrice || !newPlanPrice || currentPlanPrice <= 0 || newPlanPrice <= 0) {
      console.warn("Invalid plan prices for prorated calculation:", { currentPlanPrice, newPlanPrice });
      return null;
    }

    // Calculate remaining days
    const now = new Date();
    const expiresAt = new Date(currentSubscription.expires_at);
    const timeDiff = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) return 0;

    // Calculate daily rates
    const daysInMonth = 30;
    const currentDailyRate = currentPlanPrice / daysInMonth;
    const newDailyRate = newPlanPrice / daysInMonth;

    // Calculate prorated difference
    const dailyDifference = newDailyRate - currentDailyRate;
    const proratedAmount = dailyDifference * remainingDays;

    return Math.max(0, Math.round(proratedAmount * 100) / 100);
  };

  const handleUpgrade = async (plan) => {
    if (subscribing) return;

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to upgrade your subscription",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    const proratedAmount = calculateProratedAmount(
      currentSubscription.plan,
      plan
    );

    if (proratedAmount === null || proratedAmount <= 0) {
      Swal.fire({
        icon: "error",
        title: "Cannot Upgrade",
        text: "Your subscription has expired or is about to expire. Please renew instead.",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    // Get plan prices for calculation display
    const amounts = {
      Silver: effectiveCategoryIndex === 0 ? 149 : 199,
      Gold: effectiveCategoryIndex === 0 ? 249 : 349,
    };
    const currentPlanPrice = amounts[currentSubscription.plan];
    const newPlanPrice = amounts[plan];

    // Calculate remaining days
    const now = new Date();
    const expiresAt = new Date(currentSubscription.expires_at);
    const timeDiff = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Calculate daily rates
    const daysInMonth = 30;
    const currentDailyRate = currentPlanPrice / daysInMonth;
    const newDailyRate = newPlanPrice / daysInMonth;
    const dailyDifference = newDailyRate - currentDailyRate;

    // Show confirmation with detailed calculation
    const result = await Swal.fire({
      icon: false,
      title: "Upgrade Subscription",
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 16px;">
            Upgrade from <strong>${currentSubscription.plan}</strong> to <strong>${plan}</strong>?
          </p>
          
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #333;">Calculation:</p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              Daily rate difference: (KES ${newPlanPrice} - KES ${currentPlanPrice}) ÷ 30 days = <strong>KES ${dailyDifference.toFixed(2)}/day</strong>
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              Amount for remaining ${remainingDays} days: KES ${dailyDifference.toFixed(2)} × ${remainingDays} = <strong style="color: #D4AF37;">KES ${proratedAmount.toFixed(2)}</strong> (prorated charge)
            </p>
          </div>
          
          <p style="margin: 0; font-size: 0.9em; color: #333;">
            You pay <strong style="color: #D4AF37;">KES ${proratedAmount.toFixed(2)}</strong> now, and your next full bill will be <strong>KES ${newPlanPrice}</strong>.
          </p>
          <p style="margin-top: 8px; font-size: 0.85em; color: #888;">
            Your new plan will activate immediately after payment.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Upgrade Now",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#D4AF37",
    });

    if (!result.isConfirmed) return;

    setSubscribing(true);

    try {
      const response = await fetch("/api/subscriptions/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize upgrade");
      }

      const {
        bypassed,
        authorization_url,
        proratedAmount: responseAmount,
        reference,
      } = data;

      if (!bypassed && !reference) {
        throw new Error("Payment reference not received from server");
      }

      if (bypassed) {
        setSubscribing(false);
        Swal.fire({
          icon: "success",
          title: "Upgrade Successful!",
          html: `
            <p>Your subscription has been upgraded to <strong>${plan}</strong>!</p>
            <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
              All ${plan} features are now active.
            </p>
          `,
          confirmButtonColor: "#D4AF37",
        }).then(() => {
          // Refresh subscription status
          fetchSubscriptionStatus();
        });
        return;
      }

      if (!PAYSTACK_PUBLIC_KEY) {
        throw new Error("Paystack public key not configured");
      }

      if (!window.PaystackPop) {
        throw new Error("Paystack inline SDK not loaded");
      }

      let paymentCompleted = false;

      // Paystack requires a regular function, not an async arrow function
      const handlePaystackVerification = function (paystackResponse) {
        // Immediately invoke async function inside regular function
        (async () => {
          if (paymentCompleted) return;

          try {
            const verifyResponse = await fetch(
              `/api/subscriptions/upgrade/verify?reference=${paystackResponse.reference}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              paymentCompleted = true;
              setSubscribing(false);
              Swal.fire({
                icon: "success",
                title: "Upgrade Successful!",
                html: `
                  <p>Your subscription has been upgraded to <strong>${plan}</strong>!</p>
                  <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
                    All ${plan} features are now active.
                  </p>
                `,
                confirmButtonColor: "#D4AF37",
              }).then(() => {
                window.location.reload();
              });
            } else {
              throw new Error(
                verifyData.message || "Payment verification failed"
              );
            }
          } catch (error) {
            console.error("Upgrade verification error:", error);
            setSubscribing(false);
            Swal.fire({
              icon: "error",
              title: "Verification Failed",
              text: error.message || "Failed to verify upgrade payment",
              confirmButtonColor: "#D4AF37",
            });
          }
        })();
      };

      // Get user email safely
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData?.email) {
        throw new Error("User email not found. Please re-login and try again.");
      }

      // Validate and convert amount to Paystack format (kobo)
      const upgradeAmount = Math.round(responseAmount * 100);
      if (!Number.isFinite(upgradeAmount) || upgradeAmount <= 0) {
        throw new Error("Invalid upgrade amount calculated");
      }

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: userData.email,
        amount: upgradeAmount,
        currency: "KES",
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Upgrade Type",
              variable_name: "upgrade_type",
              value: `${currentSubscription.plan} to ${plan}`,
            },
          ],
        },
        callback: handlePaystackVerification,
        onClose: () => {
          if (!paymentCompleted) {
            setSubscribing(false);
            Swal.fire({
              icon: "info",
              title: "Payment Cancelled",
              text: "You can upgrade your subscription whenever you're ready.",
              confirmButtonColor: "#D4AF37",
            });
          }
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Upgrade error:", error);
      setSubscribing(false);
      Swal.fire({
        icon: "error",
        title: "Upgrade Failed",
        text: error.message || "Failed to process upgrade. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  const handleDowngrade = async (plan) => {
    if (subscribing) return;

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to downgrade your subscription",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    // Show confirmation
    const expiresAt = new Date(currentSubscription.expires_at);
    const remainingDays = Math.ceil(
      (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get plan prices for display
    const amounts = {
      Silver: selectedTab === 0 ? 149 : 199,
      Gold: selectedTab === 0 ? 249 : 349,
    };
    const newPlanPrice = amounts[plan];

    const result = await Swal.fire({
      icon: false,
      title: "Downgrade Subscription",
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 16px;">
            Downgrade from <strong>${currentSubscription.plan}</strong> to <strong>${plan}</strong>?
          </p>
          
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #333;">What will happen:</p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • Your current <strong>${currentSubscription.plan}</strong> plan will remain active for <strong>${remainingDays} more days</strong> (until ${expiresAt.toLocaleDateString()})
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • You will continue to enjoy all <strong>${currentSubscription.plan}</strong> benefits until then
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • The downgrade will take effect automatically when your current subscription expires
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • Your next billing cycle will be <strong>KES ${newPlanPrice}/month</strong> for the <strong>${plan}</strong> plan
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #d32f2f; font-weight: 500;">
              ⚠️ No refund will be issued for the remaining days on your current plan
            </p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Schedule Downgrade",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#D4AF37",
    });

    if (!result.isConfirmed) return;

    setSubscribing(true);

    try {
      const response = await fetch("/api/subscriptions/downgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to schedule downgrade");
      }

      setSubscribing(false);
      Swal.fire({
        icon: "success",
        title: "Downgrade Scheduled",
        html: `
          <p>Your downgrade to <strong>${plan}</strong> has been scheduled.</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
            Your current plan remains active until ${expiresAt.toLocaleDateString()}.
          </p>
          <p style="font-size: 0.85em; color: #888; margin-top: 6px;">
            The downgrade will take effect automatically at that time.
          </p>
        `,
        confirmButtonColor: "#D4AF37",
      }).then(() => {
        // Refresh subscription status
        window.location.reload();
      });
    } catch (error) {
      console.error("Downgrade error:", error);
      setSubscribing(false);
      Swal.fire({
        icon: "error",
        title: "Downgrade Failed",
        text:
          error.message || "Failed to schedule downgrade. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (subscribing) return;

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to cancel your subscription",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    // Show confirmation
    const expiresAt = new Date(currentSubscription.expires_at);
    const remainingDays = Math.ceil(
      (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const result = await Swal.fire({
      icon: false,
      title: "Cancel Subscription",
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 16px;">
            Are you sure you want to cancel your <strong>${currentSubscription.plan}</strong> subscription?
          </p>
          
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #333;">What will happen:</p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • Your subscription will remain active until ${expiresAt.toLocaleDateString()} (${remainingDays} days)
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • You will continue to enjoy all <strong>${currentSubscription.plan}</strong> benefits until then
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • Your subscription will not renew automatically
            </p>
            <p style="margin: 4px 0; font-size: 0.9em; color: #666;">
              • You will not be charged again
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #d32f2f; font-weight: 500;">
              ⚠️ You can resubscribe anytime before or after expiration
            </p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Cancel Subscription",
      cancelButtonText: "Keep Subscription",
      confirmButtonColor: "#d32f2f",
      cancelButtonColor: "#D4AF37",
    });

    if (!result.isConfirmed) return;

    setSubscribing(true);

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to cancel subscription");
      }

      setSubscribing(false);
      Swal.fire({
        icon: "success",
        title: "Subscription Cancelled",
        html: `
          <p>Your <strong>${currentSubscription.plan}</strong> subscription has been cancelled.</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
            Your subscription remains active until ${expiresAt.toLocaleDateString()}.
          </p>
          <p style="font-size: 0.85em; color: #888; margin-top: 6px;">
            You will not be charged again. You can resubscribe anytime.
          </p>
        `,
        confirmButtonColor: "#D4AF37",
      }).then(() => {
        // Refresh subscription status
        window.location.reload();
      });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      setSubscribing(false);
      Swal.fire({
        icon: "error",
        title: "Cancellation Failed",
        text:
          error.message || "Failed to cancel subscription. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  const handleSubscribe = async (plan) => {
    if (subscribing) return;

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to subscribe to a plan",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (!currentUser?.email) {
      Swal.fire({
        icon: "error",
        title: "Missing Email",
        text: "We could not determine your account email. Please re-login and try again.",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    // Determine amount based on plan and category
    const amounts = {
      Silver: effectiveCategoryIndex === 0 ? 149 : 199,
      Gold: effectiveCategoryIndex === 0 ? 249 : 349,
    };
    const amount = amounts[plan];

    setSubscribing(true);

    try {
      const response = await fetch("/api/subscriptions/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: currentUser.email,
          amount,
          plan,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize subscription");
      }

      const { reference, bypassed, subscription, authorization_url } = data;

      if (!bypassed && !reference) {
        throw new Error("Payment reference not received from server");
      }

      if (bypassed) {
        setSubscribing(false);
        Swal.fire({
          icon: "success",
          title: "Subscription Activated",
          html: `
            <p><strong>${plan} Plan</strong> has been activated!</p>
            <p style="font-size: 0.9em; color: #666; margin-top: 8px;">Your subscription is now active.</p>
            <p style="font-size: 0.85em; color: #888; margin-top: 6px;">Reference: <code>${reference}</code></p>
          `,
          confirmButtonColor: "#D4AF37",
        }).then(() => {
          // Refresh user data to reflect subscription
          window.location.reload();
        });
        return;
      }

      if (!PAYSTACK_PUBLIC_KEY) {
        throw new Error("Paystack public key not configured");
      }

      if (!window.PaystackPop) {
        throw new Error("Paystack inline SDK not loaded");
      }

      let paymentCompleted = false;

      const handlePaystackVerification = async (paystackResponse) => {
        if (paymentCompleted) return;

        try {
          const verifyResponse = await fetch(
            `/api/subscriptions/paystack/verify?reference=${paystackResponse.reference}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok || !verifyData.success) {
            throw new Error(
              verifyData.message || "Payment verification failed"
            );
          }

          paymentCompleted = true;
          setSubscribing(false);

          Swal.fire({
            icon: "success",
            title: "Subscription Successful",
            html: `
              <p><strong>${plan} Plan</strong> subscription activated!</p>
              <p style="font-size: 0.9em; color: #666; margin-top: 8px;">Your subscription is now active.</p>
            `,
            confirmButtonColor: "#D4AF37",
          }).then(() => {
            // Refresh user data to reflect subscription
            window.location.reload();
          });
        } catch (error) {
          console.error("Verification error:", error);
          paymentCompleted = true;
          setSubscribing(false);
          Swal.fire({
            icon: "error",
            title: "Verification Failed",
            text:
              error.message ||
              "Failed to verify payment. Please contact support.",
            confirmButtonColor: "#D4AF37",
          });
        }
      };

      // Validate and convert amount to Paystack format (kobo)
      const paystackAmountRaw = data.paystack_amount;
      const fallbackAmount = Math.round(amount * 100);
      const paystackAmountNumber =
        Number.isFinite(Number(paystackAmountRaw)) &&
        Number(paystackAmountRaw) > 0
          ? Number(paystackAmountRaw)
          : fallbackAmount;

      if (!Number.isFinite(paystackAmountNumber) || paystackAmountNumber <= 0) {
        throw new Error("Invalid payment amount received from server");
      }

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: paystackAmountNumber,
        currency: data.currency || "KES",
        ref: reference,
        metadata: {
          userId: currentUser.id,
          type: "subscription",
          plan,
        },
        onClose: () => {
          if (!paymentCompleted) {
            setSubscribing(false);
            Swal.fire({
              icon: "info",
              title: "Payment Cancelled",
              text: "You can restart the subscription whenever you're ready.",
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
      console.error("Subscription error:", error);
      setSubscribing(false);
      Swal.fire({
        icon: "error",
        title: "Subscription Failed",
        text:
          error.message ||
          "Failed to start subscription payment. Please try again.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  useEffect(() => {
    // Only set isLoggedIn if BOTH token and user exist in localStorage
    // This prevents auto-login with stale tokens
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    // Only consider user logged in if both token and user data exist
    // This prevents issues with stale tokens from previous sessions
    const hasValidAuth = Boolean(token && savedUser);
    setIsLoggedIn(hasValidAuth);

    // Auto-select tab and set user category based on user's category for better UX
    if (hasValidAuth) {
      try {
        const user = JSON.parse(savedUser);
        if (user && user.category) {
          // Store user's category
          setUserCategory(user.category);

          // Find the index of the user's category in the categories array
          const categoryIndex = categories.findIndex(
            (cat) => cat === user.category
          );
          // If category found, set the tab to that index
          if (categoryIndex !== -1) {
            setSelectedTab(categoryIndex);
          }
        }
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        // If parsing fails, clear invalid auth state
        setIsLoggedIn(false);
        setUserCategory(null);
      }
    } else {
      setUserCategory(null);
    }
  }, []);

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCurrentSubscription(null);
      return;
    }

    try {
      setLoadingSubscription(true);
      const response = await fetch("/api/subscriptions/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (
        data.success &&
        data.data?.hasSubscription &&
        data.data.subscription
      ) {
        const subscriptionData = {
          plan: data.data.subscription.plan,
          amount: data.data.subscription.amount || 0,
          status: data.data.subscription.status,
          expires_at: data.data.subscription.expires_at,
          remainingDays: data.data.subscription.remainingDays || 0,
          isCancelled: data.data.subscription.isCancelled || false,
          auto_renew_enabled:
            data.data.subscription.auto_renew_enabled || false,
        };
        setCurrentSubscription(subscriptionData);
        setPendingDowngrade(data.data.pendingDowngrade || null);
      } else {
        setCurrentSubscription(null);
        setPendingDowngrade(null);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      setCurrentSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [isLoggedIn, fetchSubscriptionStatus]);

  // Poll for subscription status updates (replaces SSE for better performance)
  useEffect(() => {
    if (!isLoggedIn) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let pollInterval = null;

    // Poll every 45 seconds - checks subscription status without blocking initial load
    const startPolling = () => {
      if (pollInterval) return; // Already polling

      pollInterval = setInterval(() => {
        // Only poll if page is visible (don't waste resources on hidden tabs)
        if (document.hidden) {
          return;
        }

        // Non-blocking fetch - doesn't delay component loading
        fetchSubscriptionStatus().catch((err) => {
          console.error("[Pricing] Polling error:", err);
        });
      }, 45000); // Check every 45 seconds
    };

    // Start polling after initial load (delayed to avoid blocking)
    const timeoutId = setTimeout(() => {
      startPolling();
    }, 2000); // Wait 2 seconds after mount before starting to poll

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoggedIn, fetchSubscriptionStatus]);

  // Helper function to get button text and action for a plan
  const getPlanButtonInfo = (plan) => {
    if (!isLoggedIn || !currentSubscription) {
      return {
        text: "Subscribe",
        action: () => handleSubscribe(plan),
        variant: "contained",
        disabled: subscribing,
      };
    }

    const currentPlan = currentSubscription.plan;

    // If already on this plan
    if (currentPlan === plan) {
      return {
        text: "Current Plan",
        action: null,
        variant: "outlined",
        disabled: true,
      };
    }

    // If on Silver and clicking Gold - show Upgrade
    if (currentPlan === "Silver" && plan === "Gold") {
      const proratedAmount = calculateProratedAmount(currentPlan, plan);
      return {
        text: proratedAmount
          ? `Upgrade (KES ${proratedAmount.toFixed(2)})`
          : "Upgrade",
        action: () => handleUpgrade(plan),
        variant: "contained",
        disabled: subscribing || !proratedAmount || proratedAmount <= 0,
        isUpgrade: true,
        proratedAmount,
      };
    }

    // If on Gold and clicking Silver - show Downgrade
    if (currentPlan === "Gold" && plan === "Silver") {
      // Check if there's already a pending downgrade
      if (pendingDowngrade && pendingDowngrade.plan === "Silver") {
        return {
          text: "Downgrade Scheduled",
          action: null,
          variant: "outlined",
          disabled: true,
          isDowngrade: true,
          isScheduled: true,
        };
      }
      return {
        text: "Downgrade",
        action: () => handleDowngrade(plan),
        variant: "outlined",
        disabled: subscribing,
        isDowngrade: true,
      };
    }

    // Fallback
    return {
      text: "Subscribe",
      action: () => handleSubscribe(plan),
      variant: "contained",
      disabled: subscribing,
    };
  };

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
          {isLoggedIn && currentSubscription && currentSubscription.plan && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
                flexWrap: "wrap",
                pl: { xs: 0, sm: 0 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "16px",
                  backgroundColor:
                    currentSubscription.plan === "Gold"
                      ? "rgba(212, 175, 55, 0.15)"
                      : "rgba(169, 169, 169, 0.15)",
                  border: `1px solid ${
                    currentSubscription.plan === "Gold"
                      ? "rgba(212, 175, 55, 0.3)"
                      : "rgba(169, 169, 169, 0.3)"
                  }`,
                }}
              >
                <Verified
                  sx={{
                    color:
                      currentSubscription.plan === "Gold"
                        ? "#B8941F"
                        : "#5a5a5a",
                    fontSize: "1.1rem",
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color:
                      currentSubscription.plan === "Gold"
                        ? "#B8941F"
                        : "#5a5a5a",
                  }}
                >
                  Current: {currentSubscription.plan} Plan (
                  {currentSubscription.remainingDays || 0} days left)
                  {currentSubscription.isCancelled && " - Cancelled"}
                </Typography>
              </Box>
              {!currentSubscription.isCancelled && (
                <Box
                  component="span"
                  onClick={handleCancelSubscription}
                  sx={{
                    cursor: subscribing ? "not-allowed" : "pointer",
                    opacity: subscribing ? 0.6 : 1,
                    display: "inline-block",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      color: "#000000",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      textDecoration: "underline",
                      textDecorationColor: "#000000",
                      "&:hover": {
                        color: "#000000",
                        textDecorationColor: "#000000",
                      },
                    }}
                  >
                    Cancel
                  </Typography>
                </Box>
              )}
            </Box>
          )}
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
          {/* Show user's category badge when logged in */}
          {isLoggedIn && userCategory && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <Chip
                label={`${userCategory} Category Pricing`}
                sx={{
                  bgcolor: "rgba(212, 175, 55, 0.15)",
                  color: "#B8941F",
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                  px: 2,
                  py: 1,
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                }}
              />
            </Box>
          )}

          {/* Mobile: Dropdown Select - Only show when NOT logged in */}
          {!isLoggedIn && (
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
          )}

          {/* Desktop: Tabs - Only show when NOT logged in */}
          {!isLoggedIn && (
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
          )}

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
                      label={
                        currentSubscription?.plan === "Silver"
                          ? "Silver Package (Current)"
                          : "Silver Package"
                      }
                      sx={{
                        bgcolor:
                          currentSubscription?.plan === "Silver"
                            ? "rgba(25, 118, 210, 0.15)"
                            : "rgba(169, 169, 169, 0.25)",
                        color:
                          currentSubscription?.plan === "Silver"
                            ? "#1976d2"
                            : "#5a5a5a",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        mb: 2,
                        px: 2,
                        py: 0.5,
                        border:
                          currentSubscription?.plan === "Silver"
                            ? "1px solid rgba(25, 118, 210, 0.5)"
                            : "1px solid rgba(169, 169, 169, 0.4)",
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
                      {effectiveCategoryIndex === 0 ? "KES 149" : "KES 199"}
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
                      {effectiveCategoryIndex === 0 ? (
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
                    {isLoggedIn &&
                      (() => {
                        const buttonInfo = getPlanButtonInfo("Silver");
                        const isCurrentPlan =
                          currentSubscription?.plan === "Silver";

                        // If it's the current plan, only show the chip, no button
                        if (isCurrentPlan) {
                          return (
                            <Box sx={{ mt: "auto" }}>
                              <Chip
                                label="Current Plan"
                                color="primary"
                                sx={{
                                  width: "100%",
                                  fontWeight: 600,
                                  py: 2,
                                  fontSize: "0.9375rem",
                                }}
                              />
                            </Box>
                          );
                        }

                        // Otherwise show the action button
                        return (
                          <Box sx={{ mt: "auto" }}>
                            {currentSubscription?.plan === "Gold" &&
                              pendingDowngrade &&
                              pendingDowngrade.plan === "Silver" && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    mb: 1.5,
                                    color: "#d32f2f",
                                    fontSize: "0.75rem",
                                    textAlign: "center",
                                    fontWeight: 600,
                                  }}
                                >
                                  ⚠️ Downgrade to Silver already scheduled
                                </Typography>
                              )}
                            {currentSubscription?.plan === "Gold" &&
                              !pendingDowngrade && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    mb: 1.5,
                                    color: "text.secondary",
                                    fontSize: "0.75rem",
                                    textAlign: "center",
                                  }}
                                >
                                  Downgrade takes effect when your Gold plan
                                  expires
                                </Typography>
                              )}
                            <Button
                              variant={buttonInfo.variant}
                              fullWidth
                              onClick={buttonInfo.action || undefined}
                              disabled={buttonInfo.disabled}
                              sx={{
                                borderRadius: "999px",
                                textTransform: "none",
                                fontWeight: 700,
                                py: 1.25,
                                ...(buttonInfo.variant === "contained"
                                  ? {
                                      background:
                                        "linear-gradient(90deg, #808080 0%, #A9A9A9 100%)",
                                      boxShadow:
                                        "0 4px 10px rgba(169, 169, 169, 0.4)",
                                      "&:hover": {
                                        background:
                                          "linear-gradient(90deg, #A9A9A9 0%, #808080 100%)",
                                        boxShadow:
                                          "0 6px 16px rgba(169, 169, 169, 0.5)",
                                      },
                                    }
                                  : {
                                      borderColor: "#808080",
                                      color: "#808080",
                                      "&:hover": {
                                        borderColor: "#A9A9A9",
                                        backgroundColor:
                                          "rgba(128, 128, 128, 0.05)",
                                      },
                                    }),
                                "&:disabled": {
                                  opacity: 0.6,
                                },
                              }}
                            >
                              {subscribing ? "Processing..." : buttonInfo.text}
                            </Button>
                          </Box>
                        );
                      })()}
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
                      label={
                        currentSubscription?.plan === "Gold"
                          ? "Gold Package (Current)"
                          : "Gold Package"
                      }
                      sx={{
                        bgcolor:
                          currentSubscription?.plan === "Gold"
                            ? "rgba(212, 175, 55, 0.4)"
                            : "rgba(212, 175, 55, 0.3)",
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
                      {effectiveCategoryIndex === 0 ? "KES 249" : "KES 349"}
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
                      {effectiveCategoryIndex === 0 ? (
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
                    {isLoggedIn &&
                      (() => {
                        const buttonInfo = getPlanButtonInfo("Gold");
                        const isCurrentPlan =
                          currentSubscription?.plan === "Gold";
                        const isUpgrade = buttonInfo.isUpgrade;

                        // If it's the current plan, only show the chip, no button
                        if (isCurrentPlan) {
                          return (
                            <Box sx={{ mt: "auto" }}>
                              <Chip
                                label="Current Plan"
                                color="warning"
                                sx={{
                                  width: "100%",
                                  fontWeight: 600,
                                  py: 2,
                                  fontSize: "0.9375rem",
                                }}
                              />
                            </Box>
                          );
                        }

                        // Otherwise show the action button
                        return (
                          <Box sx={{ mt: "auto" }}>
                            {isUpgrade && buttonInfo.proratedAmount && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mb: 1.5,
                                  color: "text.secondary",
                                  fontSize: "0.75rem",
                                  textAlign: "center",
                                }}
                              >
                                Pay prorated amount for remaining days
                              </Typography>
                            )}
                            <Button
                              variant={buttonInfo.variant}
                              fullWidth
                              onClick={buttonInfo.action || undefined}
                              disabled={buttonInfo.disabled}
                              sx={{
                                borderRadius: "999px",
                                textTransform: "none",
                                fontWeight: 700,
                                py: 1.25,
                                ...(buttonInfo.variant === "contained"
                                  ? {
                                      background:
                                        "linear-gradient(90deg, #D4AF37 0%, #B8941F 100%)",
                                      boxShadow:
                                        "0 4px 10px rgba(212, 175, 55, 0.4)",
                                      "&:hover": {
                                        background:
                                          "linear-gradient(90deg, #B8941F 0%, #D4AF37 100%)",
                                        boxShadow:
                                          "0 6px 16px rgba(212, 175, 55, 0.5)",
                                      },
                                    }
                                  : {
                                      borderColor: "#D4AF37",
                                      color: "#D4AF37",
                                      "&:hover": {
                                        borderColor: "#B8941F",
                                        backgroundColor:
                                          "rgba(212, 175, 55, 0.05)",
                                      },
                                    }),
                                "&:disabled": {
                                  opacity: 0.6,
                                },
                              }}
                            >
                              {subscribing ? "Processing..." : buttonInfo.text}
                            </Button>
                          </Box>
                        );
                      })()}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
