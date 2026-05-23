import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  CircularProgress,
  Typography,
  Container,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import PostCard from "../components/Posts/PostCard";
import Swal from "sweetalert2";

const PostDetail = ({ user: userProp }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(userProp || null);

  // Get user from localStorage if not provided as prop
  useEffect(() => {
    if (!user) {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/posts/${postId}`, {
          method: "GET",
          headers,
        });

        const data = await response.json();
        if (data.success && data.data.post) {
          setPost(data.data.post);
        } else {
          setError(data.message || "Post not found");
          Swal.fire({
            icon: "error",
            title: "Post Not Found",
            text: data.message || "The post you're looking for doesn't exist",
            confirmButtonColor: "#D4AF37",
          }).then(() => {
            navigate("/home");
          });
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        setError("Failed to load post");
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to load post. Please try again.",
          confirmButtonColor: "#D4AF37",
        }).then(() => {
          navigate("/home");
        });
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId, navigate]);

  const getMediaUrl = () => {
    if (!post?.media_url) return null;
    if (post.media_url.startsWith("http")) return post.media_url;
    return `${window.location.origin}/uploads/${post.media_url}`;
  };

  const getPostUrl = () => {
    return `${window.location.origin}/post/${postId}`;
  };

  const getPostTitle = () => {
    if (!post) return "Post on Tuvibe";
    const authorName = post.user?.name || "Someone";
    return `${authorName}'s post on Tuvibe`;
  };

  const getPostDescription = () => {
    if (!post) return "Check out this post on Tuvibe";
    return post.caption || "Check out this post on Tuvibe";
  };

  const getPostImage = () => {
    if (post?.media_type === "photo" && getMediaUrl()) {
      return getMediaUrl();
    }
    // Fallback to user photo or default
    if (post?.user?.photo) {
      return `${window.location.origin}/uploads/${post.user.photo}`;
    }
    return `${window.location.origin}/favicon.ico`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6" color="error">
          {error || "Post not found"}
        </Typography>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{getPostTitle()}</title>
        <meta name="title" content={getPostTitle()} />
        <meta name="description" content={getPostDescription()} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getPostUrl()} />
        <meta property="og:title" content={getPostTitle()} />
        <meta property="og:description" content={getPostDescription()} />
        <meta property="og:image" content={getPostImage()} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Tuvibe" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={getPostUrl()} />
        <meta name="twitter:title" content={getPostTitle()} />
        <meta name="twitter:description" content={getPostDescription()} />
        <meta name="twitter:image" content={getPostImage()} />

        {/* Additional Meta Tags */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={getPostUrl()} />
      </Helmet>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6">Post</Typography>
        </Box>

        {post && (
          <PostCard
            post={post}
            currentUser={user}
            onReaction={() => {}}
            onRemoveReaction={() => {}}
            onComment={() => {}}
            onDelete={() => {}}
          />
        )}
      </Container>
    </>
  );
};

export default PostDetail;

