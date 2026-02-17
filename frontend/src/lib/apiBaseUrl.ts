export function getApiBaseUrl(): string {
  // Public env var so it can be used from client components.
  // Default is local dev to keep onboarding friction low.
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
}
