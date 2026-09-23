/**
 * Utility functions for Verifi
 */

/**
 * Conditionally join class names together into a single string.
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ").trim();
}
