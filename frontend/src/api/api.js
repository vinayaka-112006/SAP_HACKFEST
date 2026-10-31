export { createApiClient, ApiError } from "./client.js";
const env = import.meta.env || {};
export const apiConfig = {
  baseUrl: env.VITE_API_BASE_URL || "/api",
  demoMode: env.DEV === true && env.VITE_DEMO_AUTH !== "false",
  aiEnabled: env.VITE_AI_ENABLED === "true",
};
