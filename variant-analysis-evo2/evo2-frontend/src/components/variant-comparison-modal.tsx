import type { ClinvarVariant } from "~/utils/genome-api";
import { Button } from "./ui/button";
import { Check, ExternalLink, Shield, X, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import {
  getClassificationColorClasses,
  getNucleotideColorClass,
  getRiskLevel,
  getScoreInterpretation,
} from "~/utils/coloring-utils";

export function VariantComparisonModal({
  comparisonVariant,
  onClose,
}: {
  comparisonVariant: ClinvarVariant | null;
  onClose: () => void;
}) {
  if (!comparisonVariant || !comparisonVariant.evo2Result) return null;

  const result = comparisonVariant.evo2Result;
  const risk = getRiskLevel(result.delta_score);
  const agrees = comparisonVariant.classification.toLowerCase() === result.prediction.toLowerCase();
  const confidencePct = Math.round(result.classification_confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card-elevated max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl animate-fade-in-up">
        {/* Header */}
        <div className="border-b border-slate-700/30 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20">
                <Shield className="h-4 w-4 text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">
                Variant Analysis Comparison
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 cursor-pointer p-0 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Variant Info */}
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/20 p-4">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Variant Information</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-28 text-xs text-slate-500">Position:</span>
                  <span className="text-xs text-slate-200 font-medium">{comparisonVariant.location}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-xs text-slate-500">Type:</span>
                  <span className="text-xs text-slate-300">{comparisonVariant.variation_type}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-28 text-xs text-slate-500">Variant:</span>
                  <span className="font-mono text-xs">
                    {(() => {
                      const match = comparisonVariant.title.match(/(\w)>(\w)/);
                      if (match && match.length === 3) {
                        const [_, ref, alt] = match;
                        return (
                          <>
                            <span className={getNucleotideColorClass(ref!)}>{ref}</span>
                            <span className="text-slate-600">{">"}</span>
                            <span className={getNucleotideColorClass(alt!)}>{alt}</span>
                          </>
                        );
                      }
                      return comparisonVariant.title;
                    })()}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-xs text-slate-500">ClinVar ID:</span>
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${comparisonVariant.clinvar_id}`}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                    target="_blank"
                  >
                    {comparisonVariant.clinvar_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Analysis Comparison</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {/* ClinVar */}
              <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">ClinVar Assessment</h5>
                </div>
                <div className={`inline-block rounded-lg px-3 py-1.5 text-sm font-semibold ${getClassificationColorClasses(comparisonVariant.classification)}`}>
                  {comparisonVariant.classification || "Unknown significance"}
                </div>
                <div className="mt-4 text-[10px] text-slate-500">
                  Based on submitted clinical reports and expert panel reviews.
                </div>
              </div>

              {/* EVO2 */}
              <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">EVO2 Prediction</h5>
                </div>
                <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${getClassificationColorClasses(result.prediction)}`}>
                  <Shield className="h-3.5 w-3.5" />
                  {result.prediction}
                </div>

                {/* Delta Score */}
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">Delta Likelihood Score</span>
                      <div className="flex items-center gap-1">
                        {result.delta_score < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        )}
                        <span className={`text-sm font-bold ${result.delta_score < 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {result.delta_score.toFixed(6)}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {result.delta_score < 0 ? "Negative score indicates loss of function" : "Positive score indicates gain/neutral function"}
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${risk.class}`}>
                      {risk.label}
                    </span>
                  </div>

                  {/* Confidence Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">Confidence</span>
                      <span className="text-xs font-medium text-slate-300">{confidencePct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full animate-score-fill ${result.prediction.toLowerCase().includes("lof") || result.prediction.toLowerCase().includes("pathogenic") ? "bg-gradient-to-r from-red-600 to-red-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"}`}
                        style={{ width: `${confidencePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score Interpretation */}
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-4">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Score Interpretation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getScoreInterpretation(result.delta_score, result.prediction)}
            </p>
          </div>

          {/* Agreement Indicator */}
          <div className={`rounded-xl p-4 flex items-center gap-3 ${
            agrees
              ? "bg-emerald-500/8 border border-emerald-500/15"
              : "bg-amber-500/8 border border-amber-500/15"
          }`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              agrees ? "bg-emerald-500/15" : "bg-amber-500/15"
            }`}>
              {agrees ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div>
              <span className={`text-sm font-medium ${agrees ? "text-emerald-300" : "text-amber-300"}`}>
                {agrees
                  ? "EVO2 prediction agrees with ClinVar classification"
                  : "EVO2 prediction differs from ClinVar classification"}
              </span>
              {!agrees && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  This discrepancy may indicate a variant of uncertain significance that warrants further investigation.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-700/30 bg-slate-900/30 p-4 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer border-slate-700/40 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
