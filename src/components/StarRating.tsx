export function StarRating({
  value,
  count,
  size = "sm",
}: {
  value: number | null;
  count?: number;
  size?: "sm" | "md";
}) {
  if (value == null || value <= 0) {
    return <span className="text-sm text-slate-500">No ratings yet</span>;
  }

  const rounded = Math.round(value * 2) / 2;
  const textClass = size === "md" ? "text-base" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-2 ${textClass} text-slate-800`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span className="tracking-tight text-amber-500" aria-hidden="true">
        {"★★★★★".split("").map((star, index) => (
          <span key={star + index} className={index + 1 <= Math.round(rounded) ? "text-amber-500" : "text-slate-300"}>
            ★
          </span>
        ))}
      </span>
      <span>
        {value.toFixed(1)}
        {typeof count === "number" ? ` (${count})` : ""}
      </span>
    </span>
  );
}
