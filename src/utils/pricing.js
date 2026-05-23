export const TOKENS_PER_KSH = Number(
  import.meta.env.VITE_TOKENS_PER_KSH || "10"
);

if (!Number.isFinite(TOKENS_PER_KSH) || TOKENS_PER_KSH <= 0) {
  throw new Error("TOKENS_PER_KSH must be a positive number");
}

export const BOOST_PRICE_KSH = Number(
  import.meta.env.VITE_BOOST_PRICE_KSH || "10"
);
export const PREMIUM_UPGRADE_PRICE_KSH = Number(
  import.meta.env.VITE_PREMIUM_UPGRADE_PRICE_KSH || "100"
);

export const convertKshToTokens = (ksh) => {
  const amount = Number(ksh);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  return Math.round(amount * TOKENS_PER_KSH);
};

export const convertTokensToKsh = (tokens) => {
  const amount = Number(tokens);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  return amount / TOKENS_PER_KSH;
};

export const BOOST_PRICE_TOKENS = convertKshToTokens(BOOST_PRICE_KSH);
export const PREMIUM_UPGRADE_PRICE_TOKENS = convertKshToTokens(
  PREMIUM_UPGRADE_PRICE_KSH
);

export const formatKshFromTokens = (tokens) =>
  `KES ${convertTokensToKsh(tokens).toFixed(2)}`;

export const formatKshValue = (ksh) =>
  `KES ${Number(ksh || 0).toFixed(2)}`;

export const describeExchangeRate = () =>
  `KES 1 = ${TOKENS_PER_KSH} tokens`;
