/**
 * Get the base API URL for backend proxy endpoints
 * - Development: Empty string (uses Vite proxy to localhost:3001)
 * - Production: VITE_API_URL environment variable (Railway backend)
 */
export const getApiBaseUrl = () => {
  // In development, use Vite proxy (empty string means /api goes to localhost:3001)
  // In production, use the Railway backend URL from environment variable
  return import.meta.env.VITE_API_URL || '';
};
