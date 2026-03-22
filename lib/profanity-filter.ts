import { RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers } from 'obscenity'

// Initialize the profanity matcher with English dataset
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

// Initialize the censor for replacing profane words
const censor = new TextCensor()

// Collapses letter-spacing bypass attempts like "f u c k" → "fuck"
// Requires 3+ consecutive single letters separated by spaces to avoid false positives
function normalizeSpacedLetters(text: string): string {
  return text.replace(/\b([a-zA-Z])([ \t]+[a-zA-Z]){2,}\b/g, (m) => m.replace(/[ \t]+/g, ''))
}

/**
 * Check if text contains profanity
 * @param text - Text to check
 * @returns true if profanity is found, false otherwise
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false
  const matches = matcher.getAllMatches(normalizeSpacedLetters(text))
  return matches.length > 0
}

/**
 * Censor profanity in text
 * @param text - Text to censor
 * @returns Censored text with profane words replaced with asterisks
 */
export function censorProfanity(text: string): string {
  if (!text) return text
  const normalized = normalizeSpacedLetters(text)
  const matches = matcher.getAllMatches(normalized)
  return censor.applyTo(normalized, matches)
}

/**
 * Get detailed information about profanity matches
 * @param text - Text to analyze
 * @returns Array of match information
 */
export function getProfanityMatches(text: string) {
  if (!text) return []
  return matcher.getAllMatches(text).map(match => ({
    startIndex: match.startIndex,
    endIndex: match.endIndex,
    matchedWord: text.substring(match.startIndex, match.endIndex),
  }))
}

/**
 * Validate content before posting (combines profanity check with other validations)
 * @param content - Content to validate
 * @returns Validation result with error message if invalid
 */
export function validateContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' }
  }

  if (containsProfanity(content)) {
    return { 
      valid: false, 
      error: 'Your content contains inappropriate language. Please revise and try again.' 
    }
  }

  return { valid: true }
}

/**
 * Validate post title and content
 * @param title - Post title
 * @param content - Post content
 * @returns Validation result
 */
export function validatePost(title: string, content: string): { valid: boolean; error?: string } {
  // Check title
  if (!title || title.trim().length < 5) {
    return { valid: false, error: 'Title must be at least 5 characters long' }
  }

  if (title.length > 200) {
    return { valid: false, error: 'Title must be less than 200 characters' }
  }

  if (containsProfanity(title)) {
    return { 
      valid: false, 
      error: 'Post title contains inappropriate language. Please revise and try again.' 
    }
  }

  // Check content
  if (!content || content.trim().length < 10) {
    return { valid: false, error: 'Content must be at least 10 characters long' }
  }

  if (content.length > 5000) {
    return { valid: false, error: 'Content must be less than 5000 characters' }
  }

  if (containsProfanity(content)) {
    return { 
      valid: false, 
      error: 'Post content contains inappropriate language. Please revise and try again.' 
    }
  }

  return { valid: true }
}
