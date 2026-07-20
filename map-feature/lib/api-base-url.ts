const API_BASE_URL_ENV = "CIVIC_SIGNAL_API_BASE_URL";

export function getApiBaseUrl(): string {
  const configuredApiBase = process.env[API_BASE_URL_ENV]?.trim() ?? "";
  return configuredApiBase.replace(/\/$/, "");
}

export function missingApiBaseUrlMessage(): string {
  return `Live API base URL is not configured. Set ${API_BASE_URL_ENV}.`;
}
