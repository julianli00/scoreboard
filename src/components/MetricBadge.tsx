import { Info } from "lucide-react";

type MetricBadgeProps = {
  label: string;
  tone?: "metric" | "unit" | "scorer" | "model" | "source" | "warning";
  title?: string;
};

export function MetricBadge({ label, tone = "metric", title }: MetricBadgeProps) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <span
      className={`badge badge-${tone} badge-${normalized}`}
      title={title ?? label}
      aria-label={title ?? label}
    >
      {title ? <Info size={12} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
