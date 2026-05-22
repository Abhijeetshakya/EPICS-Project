export function getNucleotideColorClass(nucleotide: string): string {
  switch (nucleotide.toUpperCase()) {
    case "A":
      return "text-red-400";
    case "T":
      return "text-sky-400";
    case "G":
      return "text-emerald-400";
    case "C":
      return "text-amber-400";
    default:
      return "text-slate-500";
  }
}

export function getClassificationColorClasses(classification: string): string {
  if (!classification) return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20";
  const lowercaseClass = classification.toLowerCase();

  if (lowercaseClass.includes("pathogenic") || lowercaseClass === "lof") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  } else if (lowercaseClass.includes("benign") || lowercaseClass === "func" || lowercaseClass === "func/int") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  } else {
    return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20";
  }
}

export function getRiskLevel(deltaScore: number): { label: string; class: string; color: string } {
  const absScore = Math.abs(deltaScore);
  if (absScore > 1.5) {
    return { label: "High Risk", class: "risk-badge-high", color: "#ef4444" };
  } else if (absScore > 0.5) {
    return { label: "Moderate Risk", class: "risk-badge-moderate", color: "#f59e0b" };
  } else {
    return { label: "Low Risk", class: "risk-badge-low", color: "#22c55e" };
  }
}

export function getScoreInterpretation(deltaScore: number, prediction: string): string {
  const absScore = Math.abs(deltaScore);
  if (prediction.toLowerCase().includes("lof") || prediction.toLowerCase().includes("pathogenic")) {
    if (absScore > 2) return "Strong evidence of loss-of-function. The model is highly confident this variant disrupts normal protein function.";
    if (absScore > 1) return "Moderate evidence of pathogenicity. The variant likely affects protein function based on evolutionary conservation.";
    return "Weak signal for pathogenicity. Additional functional studies may be needed for confirmation.";
  } else {
    if (absScore < 0.1) return "Very likely benign. The variant has minimal impact on the evolutionary fitness of the sequence.";
    if (absScore < 0.5) return "Likely benign with low functional impact. The variant falls within the normal range of variation.";
    return "Borderline classification. Further clinical evidence is recommended.";
  }
}
