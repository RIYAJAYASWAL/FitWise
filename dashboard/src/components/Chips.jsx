import React from "react";

export function StatusChip({ status }) {
  const norm = String(status || "").toLowerCase();

  let className = "chip chip-pending";
  let label = "Pending";

  if (norm === "kept") {
    className = "chip chip-kept";
    label = "Kept";
  } else if (norm === "returned") {
    className = "chip chip-returned";
    label = "Returned";
  } else {
    className = "chip chip-pending";
    label = "Pending";
  }

  return <span className={className}>{label}</span>;
}

export function ImpactChip({ impact }) {
  const norm = String(impact || "").toLowerCase();

  let className = "chip chip-medium";
  let label = "Medium";

  if (norm === "high") {
    className = "chip chip-high";
    label = "High";
  } else if (norm === "medium") {
    className = "chip chip-medium";
    label = "Medium";
  } else if (norm === "low") {
    className = "chip";
    label = "Low";
  }

  return <span className={className}>{label}</span>;
}

export default { StatusChip, ImpactChip };
