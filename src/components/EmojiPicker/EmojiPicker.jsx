import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Tabs,
  Tab,
  ClickAwayListener,
  Button,
  Portal,
} from "@mui/material";
import { EmojiEmotions } from "@mui/icons-material";

// Popular emoji categories
const EMOJI_CATEGORIES = {
  recent: {
    name: "Recent",
    emojis: [], // Will be populated from localStorage
  },
  smileys: {
    name: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🤧",
      "🥵",
      "🥶",
      "😵",
      "🤯",
      "🤠",
      "🥳",
      "😎",
      "🤓",
      "🧐",
    ],
  },
  hearts: {
    name: "Hearts",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "☮️",
      "✝️",
      "☪️",
      "🕉️",
      "☸️",
      "✡️",
      "🔯",
      "🕎",
      "☯️",
      "☦️",
      "🛐",
    ],
  },
  gestures: {
    name: "Gestures",
    emojis: [
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💪",
      "🦾",
      "🦿",
      "🦵",
      "🦶",
      "👂",
      "🦻",
      "👃",
      "🧠",
    ],
  },
  objects: {
    name: "Objects",
    emojis: [
      "🔥",
      "💯",
      "⭐",
      "🌟",
      "✨",
      "💫",
      "💥",
      "💢",
      "💨",
      "💦",
      "🎉",
      "🎊",
      "🎈",
      "🎁",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "🏅",
      "🎖️",
      "🎗️",
      "🎫",
      "🎟️",
      "🎪",
      "🤹",
      "🎭",
      "🩰",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎹",
      "🥁",
      "🎷",
      "🎺",
      "🎸",
      "🪕",
      "🎻",
      "🎲",
    ],
  },
  symbols: {
    name: "Symbols",
    emojis: [
      "✅",
      "❌",
      "❓",
      "❔",
      "❕",
      "❗",
      "➕",
      "➖",
      "➗",
      "✖️",
      "💱",
      "💲",
      "⚕️",
      "♻️",
      "🔱",
      "📛",
      "🔰",
      "⭕",
      "✅",
      "☑️",
      "✔️",
      "❌",
      "❎",
      "➰",
      "➿",
      "〽️",
      "✳️",
      "✴️",
      "❇️",
      "©️",
      "®️",
      "™️",
      "#️⃣",
      "*️⃣",
      "0️⃣",
      "1️⃣",
      "2️⃣",
      "3️⃣",
      "4️⃣",
      "5️⃣",
    ],
  },
};

const EmojiPicker = ({
  onEmojiSelect,
  anchorEl,
  open,
  onClose,
  position = "bottom",
  keepOpenOnSelect = false,
  container = null,
}) => {
  const [activeTab, setActiveTab] = useState("smileys");
  const [recentEmojis, setRecentEmojis] = useState([]);
  const pickerRef = useRef(null);

  useEffect(() => {
    // Load recent emojis from localStorage
    const saved = localStorage.getItem("recentEmojis");
    if (saved) {
      try {
        setRecentEmojis(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent emojis:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Update recent category with loaded emojis
    if (recentEmojis.length > 0) {
      EMOJI_CATEGORIES.recent.emojis = recentEmojis.slice(0, 30);
    }
  }, [recentEmojis]);

  const handleEmojiClick = (emoji, event) => {
    // Save to recent emojis
    const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(
      0,
      30
    );
    setRecentEmojis(updated);
    localStorage.setItem("recentEmojis", JSON.stringify(updated));

    // Get click position for animation
    const clickPosition = event ? { x: event.clientX, y: event.clientY } : null;

    // Call callback with emoji and click position
    if (onEmojiSelect) {
      onEmojiSelect(emoji, clickPosition);
    }

    // Close picker unless keepOpenOnSelect is true
    if (!keepOpenOnSelect && onClose) {
      onClose();
    }
  };

  const getPosition = () => {
    if (!anchorEl) return { position: "fixed" };
    const rect = anchorEl.getBoundingClientRect();
    // Fixed dimensions to avoid horizontal scroll
    const pickerHeight = 400;
    const pickerWidth = 350;
    const padding = 16;

    // If container is provided, center the picker on the container
    if (container) {
      const containerRect = container.getBoundingClientRect();
      
      // Ensure picker width doesn't exceed container width (with padding)
      const maxPickerWidth = Math.min(pickerWidth, containerRect.width - padding * 2);
      
      // Center horizontally and vertically on the container
      const left = (containerRect.width - maxPickerWidth) / 2;
      const top = (containerRect.height - pickerHeight) / 2;
      
      return { top, left, position: "absolute", maxWidth: maxPickerWidth };
    }

    // Default: fixed positioning relative to viewport
    let top, left;
    switch (position) {
      case "top":
        top = rect.top - pickerHeight - padding;
        left = rect.left + rect.width / 2 - pickerWidth / 2;
        // Ensure it doesn't go off the left edge
        if (left < padding) left = padding;
        // Ensure it doesn't go off the right edge
        if (left + pickerWidth > window.innerWidth - padding) {
          left = window.innerWidth - pickerWidth - padding;
        }
        // If not enough space above, try to show above anyway but adjust position
        // Only fall back to below if absolutely necessary (less than 50px from top)
        if (top < 50) {
          // Try to show above the dialog by positioning relative to dialog center
          const dialogCenter = window.innerHeight / 2;
          const dialogTop = dialogCenter - 200; // Approximate dialog top
          if (dialogTop > pickerHeight + padding) {
            top = dialogTop - pickerHeight - padding;
          } else {
            // Last resort: show below
            top = rect.bottom + padding;
          }
        }
        return { top, left, position: "fixed" };
      case "left":
        left = rect.left - pickerWidth - padding;
        top = rect.top;
        // If not enough space on left, show on right instead
        if (left < padding) {
          left = rect.right + padding;
        }
        // Ensure it doesn't go off the bottom
        if (top + pickerHeight > window.innerHeight - padding) {
          top = window.innerHeight - pickerHeight - padding;
        }
        // Ensure it doesn't go off the top
        if (top < padding) top = padding;
        return { top, left, position: "fixed" };
      case "right":
        left = rect.right + padding;
        top = rect.top;
        // If not enough space on right, show on left instead
        if (left + pickerWidth > window.innerWidth - padding) {
          left = rect.left - pickerWidth - padding;
        }
        // Ensure it doesn't go off the right edge
        if (left + pickerWidth > window.innerWidth - padding) {
          left = window.innerWidth - pickerWidth - padding;
        }
        // Ensure it doesn't go off the left edge
        if (left < padding) left = padding;
        // Ensure it doesn't go off the bottom
        if (top + pickerHeight > window.innerHeight - padding) {
          top = window.innerHeight - pickerHeight - padding;
        }
        // Ensure it doesn't go off the top
        if (top < padding) top = padding;
        return { top, left, position: "fixed" };
      default: // bottom
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - pickerWidth / 2;
        // Ensure it doesn't go off the left edge
        if (left < padding) left = padding;
        // Ensure it doesn't go off the right edge
        if (left + pickerWidth > window.innerWidth - padding) {
          left = window.innerWidth - pickerWidth - padding;
        }
        // If not enough space below, show above instead
        if (top + pickerHeight > window.innerHeight - padding) {
          top = rect.top - pickerHeight - padding;
        }
        // If still not enough space, align to bottom of screen
        if (top < padding) {
          top = window.innerHeight - pickerHeight - padding;
        }
        return { top, left, position: "fixed" };
    }
  };

  if (!open) return null;
  
  const positionStyles = getPosition();

  const categories = Object.keys(EMOJI_CATEGORIES).filter(
    (key) => key !== "recent" || recentEmojis.length > 0
  );

  const pickerContent = (
    <ClickAwayListener onClickAway={onClose}>
      <Paper
        ref={pickerRef}
        elevation={8}
        sx={{
          position: positionStyles.position || "fixed",
          width: positionStyles.maxWidth ? positionStyles.maxWidth : 350,
          maxWidth: positionStyles.maxWidth || 350,
          height: 400,
          display: "flex",
          flexDirection: "column",
          zIndex: 1400,
          borderRadius: 2,
          overflow: "hidden",
          ...positionStyles,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
            minHeight: 48,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
              minHeight: 48,
              maxWidth: "100%",
              overflowX: "auto",
              "& .MuiTabs-scrollButtons": {
                width: 24,
              },
              "& .MuiTab-root": {
                minHeight: 48,
                fontSize: "0.75rem",
                px: 1,
                minWidth: "auto",
                textTransform: "none",
              },
              "&::-webkit-scrollbar": {
                height: "4px",
              },
              "&::-webkit-scrollbar-track": {
                background: "rgba(0,0,0,0.05)",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(0,0,0,0.2)",
                borderRadius: "2px",
              },
            }}
          >
            {categories.map((key) => (
              <Tab
                key={key}
                label={EMOJI_CATEGORIES[key].name}
                value={key}
              />
            ))}
          </Tabs>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            p: 1.5,
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: 0.75,
            width: "100%",
            boxSizing: "border-box",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(0,0,0,0.05)",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(0,0,0,0.2)",
              borderRadius: "3px",
            },
          }}
        >
          {EMOJI_CATEGORIES[activeTab]?.emojis.map((emoji, index) => (
            <IconButton
              key={`${activeTab}-${index}`}
              onClick={(e) => handleEmojiClick(emoji, e)}
              sx={{
                fontSize: "1.5rem",
                width: 36,
                height: 36,
                minWidth: 36,
                maxWidth: 36,
                padding: 0,
                "&:hover": {
                  bgcolor: "rgba(212, 175, 55, 0.1)",
                  transform: "scale(1.2)",
                },
                transition: "all 0.2s ease",
              }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>

        {/* Close Button at Bottom */}
        <Box
          sx={{
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            p: 1,
            display: "flex",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Button
            onClick={onClose}
            size="small"
            sx={{
              minWidth: "auto",
              px: 2,
              py: 0.75,
              color: "text.secondary",
              textTransform: "none",
              fontSize: "0.875rem",
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.05)",
                color: "text.primary",
              },
              transition: "all 0.2s ease",
            }}
          >
            Close
          </Button>
        </Box>
      </Paper>
    </ClickAwayListener>
  );

  // If container is provided, render inside container using Portal
  if (container) {
    return <Portal container={container}>{pickerContent}</Portal>;
  }

  // Otherwise, render normally (fixed positioning)
  return pickerContent;
};

export default EmojiPicker;
