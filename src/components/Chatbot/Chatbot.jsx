import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Fade,
  Slide,
  Chip,
  CircularProgress,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  Send,
  Close,
  Chat as ChatIcon,
  SmartToy,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
// Using fetch with proxy like other components

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Initial greeting message
  const initialMessage = {
    text: "Hello! I'm your TuVibe AI assistant. I can help you with marketplace items, posts, user information, pricing, and platform features. How can I assist you today?",
    isBot: true,
    timestamp: null,
    intent: "greeting",
  };

  const [messages, setMessages] = useState([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Reset messages when chat is opened
  const handleOpenChat = () => {
    setIsOpen(true);
    setMessages([initialMessage]);
    setError(null);
    setSuggestions([]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      text: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);
    setError(null);

    // Build conversation history BEFORE adding the new message
    // Include the new user message in the history calculation
    const updatedMessages = [...messages, userMessage];
    const conversationHistory = updatedMessages
      .filter((msg) => msg.timestamp) // Only include messages with timestamps
      .slice(-6) // Last 6 messages (including the new user message)
      .map((msg) => ({
        text: msg.text,
        isBot: msg.isBot,
      }));

    // Add user message to state immediately
    setMessages(updatedMessages);

    // Now send the API request with proper conversation history
    try {
      // Use ML service endpoint with data service integration
      const response = await fetch("/api/ml/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentInput,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data;

      const botMessage = {
        text: data.answer || data.reply || "I'm here to help!",
        isBot: true,
        timestamp: new Date(),
        intent: data.intent,
        confidence: data.confidence,
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, botMessage]);

      // Update suggestions if available
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setError(
        "Sorry, I'm having trouble connecting right now. Please try again later."
      );

      const errorMessage = {
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or refresh the page.",
        isBot: true,
        timestamp: new Date(),
        intent: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // Handle sending suggestion questions directly
  const handleSuggestionSend = async (questionText) => {
    if (isLoading) return;

    const userMessage = {
      text: questionText,
      isBot: false,
      timestamp: new Date(),
    };

    setInputValue("");
    setIsLoading(true);
    setError(null);
    setSuggestions([]); // Clear suggestions when sending

    // Build conversation history including the new user message
    const updatedMessages = [...messages, userMessage];
    const conversationHistory = updatedMessages
      .filter((msg) => msg.timestamp)
      .slice(-6) // Last 6 messages (including the new user message)
      .map((msg) => ({
        text: msg.text,
        isBot: msg.isBot,
      }));

    // Add user message to state
    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/ml/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: questionText,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data;

      const botMessage = {
        text: data.answer || data.reply || "I'm here to help!",
        isBot: true,
        timestamp: new Date(),
        intent: data.intent,
        confidence: data.confidence,
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, botMessage]);

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setError(
        "Sorry, I'm having trouble connecting right now. Please try again later."
      );

      const errorMessage = {
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or refresh the page.",
        isBot: true,
        timestamp: new Date(),
        intent: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "What's for sale?",
    "Show me hot deals",
    "What are people looking for?",
    "How much does chat cost?",
    "Tell me about the platform",
    "How do I unlock chats?",
  ];

  const getIntentColor = (intent) => {
    const colors = {
      market_info: "#D4AF37",
      posts_info: "#2196f3",
      user_info: "#ff9800",
      platform_info: "#9c27b0",
      pricing_info: "#B8941F",
      general_help: "#607d8b",
      general: "#607d8b",
      error: "#f44336",
      greeting: "#D4AF37",
    };
    return colors[intent] || "#D4AF37";
  };

  const formatTime = (date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Chat Button */}
      <Fade in={!isOpen}>
        <Box
          sx={{
            position: "fixed",
            bottom: { xs: 100, sm: 24 }, // Position above card on mobile
            right: 24,
            zIndex: 1000,
          }}
        >
          <Tooltip title="Chat with TuVibe AI Assistant" arrow>
            <IconButton
              onClick={handleOpenChat}
              sx={{
                background: "linear-gradient(135deg, #8B6914, #654321)",
                color: "#D4AF37",
                width: 64,
                height: 64,
                border: "3px solid #D4AF37",
                boxShadow:
                  "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(212, 175, 55, 0.6)",
                "&:hover": {
                  background: "linear-gradient(135deg, #654321, #8B6914)",
                  borderColor: "#F4D03F",
                  boxShadow:
                    "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.8)",
                  transform: "scale(1.1)",
                },
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <ChatIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Fade>

      {/* Chat Window */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: { xs: "calc(100vw - 48px)", sm: 420 },
            height: isMinimized ? 60 : 450,
            maxHeight: "calc(100vh - 120px)", // Ensure it doesn't exceed viewport minus header and margins
            zIndex: 1001,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            borderRadius: 3,
            overflow: "hidden",
            transition: "height 0.3s ease",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
              color: "#1a1a1a",
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: isMinimized ? "pointer" : "default",
            }}
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
                // Reset messages when expanding from minimized state
                setMessages([initialMessage]);
                setError(null);
                setSuggestions([]);
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                sx={{
                  background: "rgba(26, 26, 26, 0.2)",
                  width: 32,
                  height: 32,
                }}
              >
                <SmartToy sx={{ fontSize: 20, color: "#1a1a1a" }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, fontSize: "1rem", color: "#1a1a1a" }}
                >
                  TuVibe AI Assistant
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.8, fontSize: "0.7rem", color: "#1a1a1a" }}
                >
                  {isMinimized ? "Click to expand" : "How can I help you?"}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                sx={{ color: "#1a1a1a", p: 0.5 }}
              >
                {isMinimized ? <ExpandMore /> : <ExpandLess />}
              </IconButton>
              <IconButton
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                  // Reset messages when fully closed
                  setMessages([initialMessage]);
                  setError(null);
                  setSuggestions([]);
                }}
                sx={{ color: "#1a1a1a", p: 0.5 }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {!isMinimized && (
            <>
              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflow: "auto",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  background:
                    "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)",
                }}
              >
                {messages.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: message.isBot ? "flex-start" : "flex-end",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    {message.isBot && (
                      <Avatar
                        sx={{
                          background: getIntentColor(message.intent),
                          width: 28,
                          height: 28,
                          mt: 0.5,
                        }}
                      >
                        <SmartToy sx={{ fontSize: 16 }} />
                      </Avatar>
                    )}

                    <Box
                      sx={{
                        maxWidth: "80%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: message.isBot ? "flex-start" : "flex-end",
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          background: message.isBot
                            ? "white"
                            : "linear-gradient(135deg, #D4AF37, #B8941F)",
                          color: message.isBot ? "text.primary" : "#1a1a1a",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          border: message.isBot ? "1px solid #e0e0e0" : "none",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            lineHeight: 1.5,
                            whiteSpace: "pre-line",
                            fontSize: "0.875rem",
                          }}
                        >
                          {message.text}
                        </Typography>

                        {message.intent && message.intent !== "greeting" && (
                          <Box
                            sx={{
                              mt: 1,
                              display: "flex",
                              gap: 0.5,
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              label={message.intent}
                              size="small"
                              sx={{
                                fontSize: "0.65rem",
                                height: 20,
                                background: getIntentColor(message.intent),
                                color: "white",
                                fontWeight: 500,
                              }}
                            />
                            {message.confidence && (
                              <Typography
                                variant="caption"
                                sx={{ opacity: 0.7, fontSize: "0.65rem" }}
                              >
                                {(message.confidence * 100).toFixed(0)}%
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {message.timestamp && (
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 0.5,
                            opacity: 0.6,
                            fontSize: "0.7rem",
                            alignSelf: message.isBot
                              ? "flex-start"
                              : "flex-end",
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </Typography>
                      )}
                    </Box>

                    {!message.isBot && (
                      <Avatar
                        sx={{
                          background:
                            "linear-gradient(135deg, #D4AF37, #B8941F)",
                          width: 28,
                          height: 28,
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#1a1a1a",
                          }}
                        >
                          U
                        </Typography>
                      </Avatar>
                    )}
                  </Box>
                ))}

                {isLoading && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <Avatar
                      sx={{
                        background: "#D4AF37",
                        width: 28,
                        height: 28,
                        mt: 0.5,
                      }}
                    >
                      <SmartToy sx={{ fontSize: 16, color: "#1a1a1a" }} />
                    </Avatar>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: "white",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        border: "1px solid #e0e0e0",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={16} />
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        Thinking...
                      </Typography>
                    </Box>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Box>

              {/* Quick Questions / Suggestions */}
              {(messages.length === 1 || suggestions.length > 0) && (
                <Box sx={{ p: 2, pt: 0 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: "block", fontWeight: 500 }}
                  >
                    {suggestions.length > 0
                      ? "Suggested questions:"
                      : "Quick questions:"}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(suggestions.length > 0
                      ? suggestions
                      : quickQuestions
                    ).map((question, index) => (
                      <Chip
                        key={index}
                        label={question}
                        size="small"
                        onClick={() => {
                          setInputValue(question);
                          // Auto-send the suggestion question
                          setTimeout(() => {
                            const userMessage = {
                              text: question,
                              isBot: false,
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, userMessage]);
                            handleSuggestionSend(question);
                          }, 100);
                        }}
                        sx={{
                          fontSize: "0.7rem",
                          cursor: "pointer",
                          background: "rgba(212, 175, 55, 0.1)",
                          color: "#B8941F",
                          border: "1px solid rgba(212, 175, 55, 0.3)",
                          "&:hover": {
                            background:
                              "linear-gradient(135deg, #D4AF37, #B8941F)",
                            color: "#1a1a1a",
                            transform: "scale(1.05)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Input */}
              <Box
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: "divider",
                  background: "white",
                }}
              >
                {error && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{
                      display: "block",
                      mb: 1,
                      textAlign: "center",
                      fontSize: "0.75rem",
                    }}
                  >
                    {error}
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                  <TextField
                    fullWidth
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    size="small"
                    multiline
                    maxRows={3}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                  <IconButton
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    sx={{
                      background:
                        inputValue.trim() && !isLoading
                          ? "linear-gradient(135deg, #D4AF37, #B8941F)"
                          : "grey.300",
                      color: "#1a1a1a",
                      p: 1,
                      "&:hover": {
                        background:
                          inputValue.trim() && !isLoading
                            ? "linear-gradient(135deg, #B8941F, #D4AF37)"
                            : "grey.400",
                      },
                      "&:disabled": {
                        background: "grey.300",
                        color: "grey.500",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Send sx={{ fontSize: 20 }} />
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Slide>
    </>
  );
};

export default Chatbot;
