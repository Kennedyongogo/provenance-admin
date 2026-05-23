export const getDisplayName = (
  user,
  { fallback = "User", currentUserId } = {}
) => {
  if (!user) {
    return fallback;
  }

  const trimmedName = user?.name?.trim();
  const trimmedUsername = user?.username?.trim();
  const isSelf =
    currentUserId &&
    (user?.id === currentUserId ||
      (Array.isArray(currentUserId)
        ? currentUserId.includes(user?.id)
        : false));

  if (isSelf) {
    return trimmedName || trimmedUsername || fallback;
  }

  return trimmedUsername || trimmedName || fallback;
};

export const getDisplayInitial = (
  user,
  { fallback = "U", currentUserId } = {}
) => {
  const name = getDisplayName(user, { fallback, currentUserId });
  return name.charAt(0).toUpperCase();
};
