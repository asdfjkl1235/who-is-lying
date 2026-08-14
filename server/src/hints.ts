// Server-side hint validation. This is the only validation that matters --
// any frontend checks are just UX sugar and must never be trusted.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export interface HintValidationResult {
  valid: boolean;
  reason?: string;
  cleanedText?: string;
}

export function validateHint(rawText: string, secretWord: string): HintValidationResult {
  const text = rawText.trim();

  if (!text) {
    return { valid: false, reason: "Hint cannot be empty." };
  }

  if (text.length > 60) {
    return { valid: false, reason: "Hint is too long (max 60 characters)." };
  }

  const normalizedHint = normalize(text);
  const normalizedWord = normalize(secretWord);

  if (!normalizedHint) {
    return { valid: false, reason: "Hint cannot be empty." };
  }

  // Reject the exact secret word (e.g. "Salman Khan" -> "Salman Khan").
  if (normalizedHint === normalizedWord) {
    return { valid: false, reason: "You can't just say the secret word." };
  }

  // Reject a hint that fully contains the secret word as a phrase
  // (e.g. hint "It's Salman Khan obviously" should also be rejected),
  // but allow partial/thematic overlaps like "Bhaijaan" or "Tiger".
  if (normalizedWord.length > 2 && normalizedHint.includes(normalizedWord)) {
    return { valid: false, reason: "Your hint gives away the secret word directly." };
  }

  // Also reject the reverse for single-token words, e.g. word "Pizza" and
  // hint "Pizza" already caught above; this guards multi-word words where
  // someone submits just one distinguishing token that is itself the whole
  // word once normalized (rare edge case, cheap to check).
  const wordTokens = normalizedWord.split(" ").filter((t) => t.length > 3);
  const hintTokenSet = new Set(normalizedHint.split(" "));
  const allWordTokensPresent =
    wordTokens.length > 1 && wordTokens.every((t) => hintTokenSet.has(t));
  if (allWordTokensPresent) {
    return { valid: false, reason: "Your hint gives away the secret word directly." };
  }

  return { valid: true, cleanedText: text };
}
