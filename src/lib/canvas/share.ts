/* ============================================
   AGIRAILS Canvas - Share URL Utilities
   ============================================

   URL-safe state encoding/decoding for sharing canvas configurations.
   Uses browser-native btoa/atob for base64 encoding.
   No external dependencies.
   ============================================ */

import { ShareableState } from './types';

// btoa/atob only work reliably with Latin1. Our payload includes emoji/icons and
// arbitrary Unicode (agent names, service descriptions), so we must encode UTF-8.
function base64EncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const CHUNK_SIZE = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

function base64DecodeUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encode shareable state to URL-safe string
 * Uses base64 encoding (browser-native btoa)
 *
 * @param state - ShareableState to encode
 * @returns Base64-encoded string
 */
export function encodeShareState(state: ShareableState): string {
  try {
    const json = JSON.stringify(state);
    return base64EncodeUtf8(json);
  } catch (error) {
    console.error('Failed to encode share state:', error);
    throw new Error('Failed to encode share state');
  }
}

/**
 * Decode share string back to ShareableState
 * Uses base64 decoding (browser-native atob)
 *
 * @param encoded - Base64-encoded string
 * @returns Decoded ShareableState or null if invalid
 */
export function decodeShareState(encoded: string): ShareableState | null {
  try {
    const decodedParam = (() => {
      // Support both raw and URL-encoded inputs
      try {
        return decodeURIComponent(encoded);
      } catch {
        return encoded;
      }
    })();

    const json = base64DecodeUtf8(decodedParam);
    const state = JSON.parse(json);

    // Validate structure
    if (!state || typeof state !== 'object') {
      return null;
    }

    if (!Array.isArray(state.agents) || !Array.isArray(state.connections)) {
      return null;
    }

    return state as ShareableState;
  } catch (error) {
    console.error('Failed to decode share state:', error);
    return null;
  }
}

/**
 * Generate full share URL for current canvas state
 *
 * @param state - ShareableState to encode in URL
 * @returns Full URL with encoded state in query param
 */
export function generateShareUrl(state: ShareableState): string {
  const encoded = encodeShareState(state);
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';

  return `${baseUrl}?s=${encodeURIComponent(encoded)}`;
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

/**
 * Copy arbitrary text to clipboard, with timeout + legacy fallback.
 * Important: some environments expose `navigator.clipboard` but the promise can hang
 * (permissions, automation, browser quirks). We guard with a short timeout.
 */
export async function copyTextToClipboard(
  text: string,
  opts?: { timeoutMs?: number }
): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 500;

  // Modern async clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await Promise.race([navigator.clipboard.writeText(text), timeoutAfter(timeoutMs)]);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API copy failed:', error);
  }

  // Legacy fallback (execCommand)
  try {
    if (typeof document === 'undefined') return false;

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (error) {
    console.warn('execCommand copy failed:', error);
    return false;
  }
}

/**
 * Parse share URL and extract state
 *
 * @param url - Full URL or just query string
 * @returns Decoded ShareableState or null if not present/invalid
 */
export function parseShareUrl(url?: string): ShareableState | null {
  try {
    // If no URL provided, use window.location
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    // Extract query params
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const urlObj = new URL(targetUrl, baseOrigin);
    const shareParam = urlObj.searchParams.get('s');

    if (!shareParam) {
      return null;
    }

    // Decode the state
    return decodeShareState(shareParam);
  } catch (error) {
    console.error('Failed to parse share URL:', error);
    return null;
  }
}

/**
 * Copy share URL to clipboard
 *
 * @param state - ShareableState to encode
 * @returns Promise that resolves to true if successful
 */
export async function copyShareUrlToClipboard(state: ShareableState): Promise<boolean> {
  try {
    const url = generateShareUrl(state);
    return await copyTextToClipboard(url);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Get share URL size in bytes
 * Useful for validating URL isn't too long (browsers have ~2KB limit for query params)
 *
 * @param state - ShareableState to check
 * @returns Size in bytes
 */
export function getShareUrlSize(state: ShareableState): number {
  const url = generateShareUrl(state);
  return new Blob([url]).size;
}

/**
 * Check if share URL is within safe size limits
 * Most browsers support ~2KB for query params, we use 1.5KB as safe limit
 *
 * @param state - ShareableState to check
 * @returns True if within safe limits
 */
export function isShareUrlSafe(state: ShareableState): boolean {
  const size = getShareUrlSize(state);
  const SAFE_LIMIT = 1536; // 1.5KB in bytes
  return size <= SAFE_LIMIT;
}
