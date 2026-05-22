"use client";

import {
  type AnalysisResult,
  analyzeVariantWithAPI,
  type ClinvarVariant,
  type GeneBounds,
  type GeneFromSearch,
  fetchClinicalContext,
  type ClinicalContextResult,
} from "~/utils/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  getClassificationColorClasses,
  getNucleotideColorClass,
  getRiskLevel,
  getScoreInterpretation,
} from "~/utils/coloring-utils";
import { Button } from "./ui/button";
import { Zap, BookOpen, Stethoscope, TrendingDown, TrendingUp, AlertTriangle, Gauge, BarChart3 } from "lucide-react";

export interface VariantAnalysisHandle {
  focusAlternativeInput: () => void;
}

interface VariantAnalysisProps {
  gene: GeneFromSearch;
  genomeId: string;
  chromosome: string;
  clinvarVariants: Array<ClinvarVariant>;
  referenceSequence: string | null;
  sequencePosition: number | null;
  geneBounds: GeneBounds | null;
}

// Score Gauge Component
function ScoreGauge({ score, maxScore = 5 }: { score: number; maxScore?: number }) {
  const absScore = Math.abs(score);
  const percentage = Math.min(100, (absScore / maxScore) * 100);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (percentage / 100) * circumference;
  const isNegative = score < 0;

  return (
    <div className="score-gauge flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={isNegative ? "#ef4444" : "#22c55e"}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="score-gauge-circle"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${isNegative ? "text-red-400" : "text-emerald-400"}`}>
          {score.toFixed(2)}
        </span>
        <span className="text-[9px] text-slate-500">Δ Score</span>
      </div>
    </div>
  );
}

const VariantAnalysis = forwardRef<VariantAnalysisHandle, VariantAnalysisProps>(
  (
    {
      gene,
      genomeId,
      chromosome,
      clinvarVariants = [],
      referenceSequence,
      sequencePosition,
      geneBounds,
    }: VariantAnalysisProps,
    ref,
  ) => {
    const [variantPosition, setVariantPosition] = useState<string>(
      geneBounds?.min?.toString() || "",
    );
    const [variantReference, setVariantReference] = useState("");
    const [variantAlternative, setVariantAlternative] = useState("");
    const [variantResult, setVariantResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [variantError, setVariantError] = useState<string | null>(null);
    const [clinicalContext, setClinicalContext] = useState<ClinicalContextResult | null>(null);
    const [isContextLoading, setIsContextLoading] = useState(false);

    const alternativeInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusAlternativeInput: () => {
        if (alternativeInputRef.current) alternativeInputRef.current.focus();
      },
    }));

    useEffect(() => {
      if (sequencePosition && referenceSequence) {
        setVariantPosition(String(sequencePosition));
        setVariantReference(referenceSequence);
      }
    }, [sequencePosition, referenceSequence]);

    const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setVariantPosition(e.target.value);
      setVariantReference("");
    };

    const handleVariantSubmit = async (pos: string, alt: string) => {
      const position = parseInt(pos);
      if (isNaN(position)) { setVariantError("Please enter a valid position number"); return; }
      const validNucleotides = /^[ATGC]$/;
      if (!validNucleotides.test(alt)) { setVariantError("Nucleotides must be A, C, G or T"); return; }

      setIsAnalyzing(true);
      setVariantError(null);

      try {
        const data = await analyzeVariantWithAPI({ position, alternative: alt, genomeId, chromosome });
        setVariantResult(data);

        // Fetch clinical context
        setIsContextLoading(true);
        setClinicalContext(null);
        const matchedClinvar = clinvarVariants.find(
          (v) => parseInt(v.location?.replaceAll(",", "") || "0") === position
        );
        let variantIdArg = matchedClinvar?.clinvar_id;

        fetchClinicalContext({
          gene: gene.symbol,
          variantId: variantIdArg || (matchedClinvar ? matchedClinvar.clinvar_id : undefined),
          prediction: data.prediction
        }).then(context => {
          setClinicalContext(context);
          setIsContextLoading(false);
        }).catch(() => setIsContextLoading(false));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setVariantError(`Failed to analyze variant: ${errorMsg}`);
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <div className="glass-card rounded-2xl">
        <div className="p-6 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="h-4 w-4 text-teal-400" />
            <h3 className="text-sm font-medium text-slate-300">Variant Analysis</h3>
          </div>
          <p className="text-xs text-slate-500">
            Predict the impact of genetic variants using the EVO2 deep learning model.
          </p>
        </div>

        <div className="px-6 pb-6">
          {/* Input Controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">Position</label>
              <Input
                value={variantPosition}
                onChange={handlePositionChange}
                className="h-9 w-36 border-slate-700/50 bg-slate-800/50 text-sm text-slate-200 focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">Alternative (variant)</label>
              <Input
                ref={alternativeInputRef}
                value={variantAlternative}
                onChange={(e) => setVariantAlternative(e.target.value.toUpperCase())}
                className="h-9 w-36 border-slate-700/50 bg-slate-800/50 text-sm text-slate-200 focus:border-teal-500/50"
                placeholder="e.g., T"
                maxLength={1}
              />
            </div>
            {variantReference && (
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                <span>Substitution</span>
                <span className={`font-medium ${getNucleotideColorClass(variantReference)}`}>{variantReference}</span>
                <span className="text-slate-600">→</span>
                <span className={`font-medium ${getNucleotideColorClass(variantAlternative)}`}>
                  {variantAlternative ? variantAlternative : "?"}
                </span>
              </div>
            )}
            <Button
              disabled={isAnalyzing || !variantPosition || !variantAlternative}
              className="h-9 cursor-pointer bg-teal-600 text-xs text-white hover:bg-teal-500 disabled:opacity-40"
              onClick={() => handleVariantSubmit(variantPosition.replaceAll(",", ""), variantAlternative)}
            >
              {isAnalyzing ? (
                <>
                  <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing... (may take 30s)
                </>
              ) : (
                <>
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Analyze variant
                </>
              )}
            </Button>
          </div>

          {/* Known Variant Match */}
          {variantPosition &&
            clinvarVariants
              .filter(
                (variant) =>
                  variant?.variation_type?.toLowerCase().includes("single nucleotide") &&
                  parseInt(variant?.location?.replaceAll(",", "")) === parseInt(variantPosition.replaceAll(",", "")),
              )
              .map((matchedVariant) => {
                const refAltMatch = matchedVariant.title.match(/(\w)>(\w)/);
                let ref = null, alt = null;
                if (refAltMatch && refAltMatch.length === 3) { ref = refAltMatch[1]; alt = refAltMatch[2]; }
                if (!ref || !alt) return null;

                return (
                  <div key={matchedVariant.clinvar_id} className="mt-4 rounded-xl border border-teal-500/15 bg-teal-500/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-teal-300">Known Variant Detected</h4>
                      <span className="text-xs text-slate-500">Position: {matchedVariant.location}</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-slate-400">{matchedVariant.title}</div>
                        <div className="mt-2 text-sm text-slate-300">
                          {gene?.symbol} {variantPosition}{" "}
                          <span className="font-mono">
                            <span className={getNucleotideColorClass(ref)}>{ref}</span>
                            <span className="text-slate-600">{">"}</span>
                            <span className={getNucleotideColorClass(alt)}>{alt}</span>
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs ${getClassificationColorClasses(matchedVariant.classification)}`}>
                            {matchedVariant.classification || "Unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button
                          disabled={isAnalyzing}
                          variant="outline"
                          size="sm"
                          className="h-8 cursor-pointer border-teal-500/30 bg-teal-500/10 text-xs text-teal-300 hover:bg-teal-500/20"
                          onClick={() => { setVariantAlternative(alt); handleVariantSubmit(variantPosition.replaceAll(",", ""), alt); }}
                        >
                          {isAnalyzing ? (
                            <><span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-teal-300/30 border-t-teal-300" />Analyzing...</>
                          ) : (
                            <><Zap className="mr-1 h-3 w-3" />Analyze this Variant</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })[0]}

          {/* Error */}
          {variantError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              {variantError}
            </div>
          )}

          {/* ─── Enhanced Results Panel ───────────────────────────────── */}
          {variantResult && (
            <div className="mt-6 animate-fade-in-up rounded-xl border border-slate-700/30 bg-slate-800/30 p-5">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                <BarChart3 className="h-4 w-4 text-teal-400" />
                Analysis Result
              </h4>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Score Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <ScoreGauge score={variantResult.delta_score} />
                  <div className="mt-2">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getRiskLevel(variantResult.delta_score).class}`}>
                      {getRiskLevel(variantResult.delta_score).label}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Variant</div>
                    <div className="text-sm text-slate-200">
                      {gene?.symbol} {variantResult.position.toLocaleString()}{" "}
                      <span className="font-mono">
                        <span className={getNucleotideColorClass(variantResult.reference)}>{variantResult.reference}</span>
                        <span className="text-slate-600">{">"}</span>
                        <span className={getNucleotideColorClass(variantResult.alternative)}>{variantResult.alternative}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Delta Likelihood Score</div>
                    <div className="flex items-center gap-2">
                      {variantResult.delta_score < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      )}
                      <span className={`text-lg font-bold ${variantResult.delta_score < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {variantResult.delta_score.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">EVO2 Score (Log-prob)</div>
                    <div className="text-sm font-mono text-slate-300">
                      {(variantResult as any).evo2_score?.toFixed(6) ?? "N/A"}
                    </div>
                  </div>
                </div>

                {/* Prediction + Confidence */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Prediction</div>
                    <span className={`inline-block rounded-lg px-3 py-1.5 text-xs font-semibold ${getClassificationColorClasses(variantResult.prediction)}`}>
                      {variantResult.prediction}
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Confidence</div>
                    <div className="mt-1.5 h-2.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full animate-score-fill ${variantResult.prediction.toLowerCase().includes("lof") || variantResult.prediction.toLowerCase().includes("pathogenic") ? "bg-gradient-to-r from-red-600 to-red-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"}`}
                        style={{ width: `${Math.min(100, variantResult.classification_confidence * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-xs font-medium text-slate-400">
                      {Math.round(variantResult.classification_confidence * 100)}%
                    </div>
                  </div>

                  {/* Score Interpretation */}
                  <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Interpretation</div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {getScoreInterpretation(variantResult.delta_score, variantResult.prediction)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Context Section (RAG) */}
          {(isContextLoading || clinicalContext) && (
            <div className="mt-5 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-sky-400" />
                <h4 className="text-sm font-medium text-sky-300">Clinical Insights (AI Generated)</h4>
              </div>

              {isContextLoading ? (
                <div className="flex items-center gap-2 text-xs text-sky-400/70">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
                  Loading clinical context...
                </div>
              ) : (
                clinicalContext && clinicalContext.found && (
                  <div className="animate-fade-in-up">
                    <div className="prose prose-sm max-w-none text-xs text-sky-200/70">
                      <div dangerouslySetInnerHTML={{ __html: clinicalContext.summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-300">$1</strong>').replace(/\n/g, '<br/>') }} />
                    </div>
                    {clinicalContext.sources.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 border-t border-sky-500/10 pt-2">
                        <BookOpen className="h-3 w-3 text-sky-500" />
                        <span className="text-[10px] text-sky-500">
                          Sources: {clinicalContext.sources.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )
              )}

              {clinicalContext && !clinicalContext.found && !isContextLoading && (
                <div className="text-xs text-sky-400/50">
                  No specific clinical context found for this variant.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default VariantAnalysis;
