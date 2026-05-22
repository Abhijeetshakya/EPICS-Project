"use client";

import {
  analyzeVariantWithAPI,
  type ClinvarVariant,
  type GeneFromSearch,
} from "~/utils/genome-api";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  BarChart2,
  ExternalLink,
  RefreshCw,
  Dna,
  Shield,
  Zap,
} from "lucide-react";
import { getClassificationColorClasses, getRiskLevel } from "~/utils/coloring-utils";

export default function KnownVariants({
  refreshVariants,
  showComparison,
  updateClinvarVariant,
  clinvarVariants,
  isLoadingClinvar,
  clinvarError,
  genomeId,
  gene,
}: {
  refreshVariants: () => void;
  showComparison: (variant: ClinvarVariant) => void;
  updateClinvarVariant: (id: string, newVariant: ClinvarVariant) => void;
  clinvarVariants: ClinvarVariant[];
  isLoadingClinvar: boolean;
  clinvarError: string | null;
  genomeId: string;
  gene: GeneFromSearch;
}) {
  const analyzeVariant = async (variant: ClinvarVariant) => {
    let variantDetails = null;
    const position = variant.location ? parseInt(variant.location.replaceAll(",", "")) : null;
    const refAltMatch = variant.title.match(/(\w)>(\w)/);
    if (refAltMatch && refAltMatch.length === 3) {
      variantDetails = { position, reference: refAltMatch[1], alternative: refAltMatch[2] };
    }
    if (!variantDetails || !variantDetails.position || !variantDetails.reference || !variantDetails.alternative) return;

    updateClinvarVariant(variant.clinvar_id, { ...variant, isAnalyzing: true });

    try {
      const data = await analyzeVariantWithAPI({
        position: variantDetails.position,
        alternative: variantDetails.alternative,
        genomeId: genomeId,
        chromosome: gene.chrom,
      });
      const updatedVariant: ClinvarVariant = { ...variant, isAnalyzing: false, evo2Result: data };
      updateClinvarVariant(variant.clinvar_id, updatedVariant);
      showComparison(updatedVariant);
    } catch (error) {
      updateClinvarVariant(variant.clinvar_id, {
        ...variant,
        isAnalyzing: false,
        evo2Error: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  };

  return (
    <div className="glass-card rounded-2xl">
      <div className="flex items-center justify-between p-6 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal-400" />
          <h3 className="text-sm font-medium text-slate-300">
            Known Variants from ClinVar
          </h3>
          {clinvarVariants.length > 0 && (
            <span className="ml-2 rounded-full bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-700/30">
              {clinvarVariants.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshVariants}
          disabled={isLoadingClinvar}
          className="h-7 cursor-pointer text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${isLoadingClinvar ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="px-6 pb-6">
        {clinvarError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {clinvarError}
          </div>
        )}

        {isLoadingClinvar ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
            <span className="text-xs text-slate-500">Loading ClinVar data...</span>
          </div>
        ) : clinvarVariants.length > 0 ? (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-700/20">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="border-slate-700/20 bg-slate-800/70 hover:bg-slate-800/80">
                  <TableHead className="py-2.5 text-xs font-medium text-slate-400">Variant</TableHead>
                  <TableHead className="py-2.5 text-xs font-medium text-slate-400">Type</TableHead>
                  <TableHead className="py-2.5 text-xs font-medium text-slate-400">Clinical Significance</TableHead>
                  <TableHead className="py-2.5 text-xs font-medium text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinvarVariants.map((variant) => (
                  <TableRow
                    key={variant.clinvar_id}
                    className="border-b border-slate-700/15 hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="text-xs font-medium text-slate-200">{variant.title}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>Position: {variant.location}</span>
                        <button
                          className="flex items-center gap-0.5 text-amber-400 hover:text-amber-300 transition-colors"
                          onClick={() => window.open(`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_id}`, "_blank")}
                        >
                          ClinVar <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-slate-400">{variant.variation_type}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs ${getClassificationColorClasses(variant.classification)}`}>
                        {variant.classification || "Unknown"}
                      </span>
                      {variant.evo2Result && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${getClassificationColorClasses(variant.evo2Result.prediction)}`}>
                            <Shield className="h-3 w-3" />
                            EVO2: {variant.evo2Result.prediction}
                          </span>
                          {/* Inline confidence bar */}
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-16 rounded-full bg-slate-700/50 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${variant.evo2Result.delta_score < 0 ? "bg-red-400" : "bg-emerald-400"}`}
                                style={{ width: `${Math.min(100, variant.evo2Result.classification_confidence * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {Math.round(variant.evo2Result.classification_confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {variant.evo2Error && (
                        <div className="mt-1 text-[10px] text-red-400">{variant.evo2Error}</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {variant.variation_type.toLowerCase().includes("single nucleotide") ? (
                          !variant.evo2Result ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 cursor-pointer border-slate-700/40 bg-slate-800/50 px-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                              disabled={variant.isAnalyzing}
                              onClick={() => analyzeVariant(variant)}
                            >
                              {variant.isAnalyzing ? (
                                <>
                                  <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-300" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-1 h-3 w-3 text-amber-400" />
                                  Analyze with EVO2
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 cursor-pointer border-teal-500/30 bg-teal-500/10 px-3 text-xs text-teal-300 hover:bg-teal-500/20"
                              onClick={() => showComparison(variant)}
                            >
                              <BarChart2 className="mr-1 h-3 w-3" />
                              Compare Results
                            </Button>
                          )
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 border border-slate-700/30">
              <Dna className="h-6 w-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">No ClinVar variants found for this gene.</p>
          </div>
        )}
      </div>
    </div>
  );
}
