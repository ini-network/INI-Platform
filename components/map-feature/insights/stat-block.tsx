export function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="cs-stat">
      <span className="cs-stat-value">{value}</span>
      <span className="cs-stat-label">{label}</span>
    </div>
  );
}
