export const getRatingPromptStatus = async (token) => {
  if (!token) {
    throw new Error("Missing auth token");
  }

  const response = await fetch("/api/ratings/check-prompt", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to check rating prompt");
  }

  return payload.data;
};

export const submitRatingTestimonial = async ({
  token,
  rating,
  testimonial,
}) => {
  if (!token) {
    throw new Error("Missing auth token");
  }
  const response = await fetch("/api/ratings/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating,
      testimonial: testimonial?.trim() || null,
    }),
  });

  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to submit rating");
  }

  return payload.data;
};

export const dismissRatingPrompt = async (token) => {
  if (!token) {
    throw new Error("Missing auth token");
  }
  const response = await fetch("/api/ratings/dismiss", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to dismiss prompt");
  }

  return payload.data;
};
