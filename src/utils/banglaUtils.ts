/**
 * Utility functions for Bengali numbering and localization
 */

export function toBanglaNumber(num: number): string {
  if (isNaN(num) || num < 0) return '০';
  const banglaDigits: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };

  const formatted = num.toLocaleString('en-US');
  return formatted
    .split('')
    .map((char) => banglaDigits[char] || char)
    .join('');
}
