// Severity buckets for the redesigned map — level order, labels, and legend colors.

export type SeverityBucket = "high" | "medium" | "low" | "info";

export const SEVERITY_ORDER: SeverityBucket[] = ["high", "medium", "low", "info"];

export const SEVERITY_LABELS: Record<SeverityBucket, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info"
};

// Legend/marker colors: distinct per level so severity is instantly readable at
// a glance (red = high, amber = medium, green = low, blue = info).
export const SEVERITY_COLORS: Record<SeverityBucket, string> = {
  high: "#e5484d",
  medium: "#f5a623",
  low: "#3aa655",
  info: "#3b82f6"
};
