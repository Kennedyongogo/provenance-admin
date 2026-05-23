const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const evaluatePhoneInput = (input) => {
  if (input === undefined || input === null || input === "") {
    return {
      normalized: "",
      error: "Phone number is required.",
    };
  }

  const trimmed = String(input).trim();
  const stripped = trimmed.replace(/[\s-]+/g, "");

  if (!stripped.startsWith("+")) {
    return {
      normalized: stripped,
      error: "Include the country code, e.g., +254798123456.",
    };
  }

  if (!/^\+[0-9]+$/.test(stripped)) {
    return {
      normalized: stripped,
      error: "Use digits only after '+', e.g., +254798123456.",
    };
  }

  if (!PHONE_REGEX.test(stripped)) {
    return {
      normalized: stripped,
      error: "Enter a valid international number, e.g., +254798123456.",
    };
  }

  return {
    normalized: stripped,
    error: "",
  };
};

export { evaluatePhoneInput, PHONE_REGEX };
