const MIN_PUBLIC_USER_AGE = 18;
const MIN_BIRTH_YEAR = 1900;
const MAX_AGE = 120;

const getCurrentYear = () => new Date().getFullYear();

const evaluateBirthYearInput = (input) => {
  if (input === undefined || input === null || input === "") {
    return {
      normalized: null,
      error: "Year of birth is required.",
    };
  }

  const numeric = parseInt(input, 10);

  if (Number.isNaN(numeric)) {
    return {
      normalized: null,
      error: "Enter a valid four-digit year.",
    };
  }

  const currentYear = getCurrentYear();

  if (numeric < MIN_BIRTH_YEAR || numeric > currentYear) {
    return {
      normalized: null,
      error: "Please enter a valid year of birth.",
    };
  }

  const age = currentYear - numeric;

  if (age < MIN_PUBLIC_USER_AGE) {
    return {
      normalized: null,
      error: `You must be at least ${MIN_PUBLIC_USER_AGE} years old to continue.`,
    };
  }

  if (age > MAX_AGE) {
    return {
      normalized: null,
      error: "Please enter a valid year of birth.",
    };
  }

  return {
    normalized: numeric,
    error: "",
  };
};

export { evaluateBirthYearInput, MIN_PUBLIC_USER_AGE };
