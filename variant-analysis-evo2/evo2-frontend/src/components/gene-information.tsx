import type {
  GeneBounds,
  GeneDetailsFromSearch,
  GeneFromSearch,
} from "~/utils/genome-api";
import { ExternalLink, Info } from "lucide-react";

export function GeneInformation({
  gene,
  geneDetail,
  geneBounds,
}: {
  gene: GeneFromSearch;
  geneDetail: GeneDetailsFromSearch | null;
  geneBounds: GeneBounds | null;
}) {
  return (
    <div className="glass-card rounded-2xl">
      <div className="p-6 pb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-teal-400" />
          <h3 className="text-sm font-medium text-slate-300">Gene Information</h3>
        </div>
      </div>
      <div className="px-6 pb-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2.5">
            <div className="flex">
              <span className="w-28 text-xs text-slate-500">Symbol:</span>
              <span className="text-xs font-semibold text-teal-300">{gene.symbol}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-xs text-slate-500">Name:</span>
              <span className="text-xs text-slate-300">{gene.name}</span>
            </div>
            {gene.description && gene.description !== gene.name && (
              <div className="flex">
                <span className="w-28 text-xs text-slate-500">Description:</span>
                <span className="text-xs text-slate-400">{gene.description}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-28 text-xs text-slate-500">Chromosome:</span>
              <span className="text-xs text-slate-300">{gene.chrom}</span>
            </div>
            {geneBounds && (
              <div className="flex">
                <span className="w-28 text-xs text-slate-500">Position:</span>
                <span className="text-xs text-slate-300">
                  {Math.min(geneBounds.min, geneBounds.max).toLocaleString()} –{" "}
                  {Math.max(geneBounds.min, geneBounds.max).toLocaleString()} (
                  {Math.abs(geneBounds.max - geneBounds.min + 1).toLocaleString()} bp)
                  {geneDetail?.genomicinfo?.[0]?.strand === "-" && " (reverse strand)"}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2.5">
            {gene.gene_id && (
              <div className="flex">
                <span className="w-28 text-xs text-slate-500">Gene ID:</span>
                <a
                  href={`https://www.ncbi.nlm.nih.gov/gene/${gene.gene_id}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {gene.gene_id}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {geneDetail?.organism && (
              <div className="flex">
                <span className="w-28 text-xs text-slate-500">Organism:</span>
                <span className="text-xs text-slate-300">
                  <em>{geneDetail.organism.scientificname}</em>
                  {geneDetail.organism.commonname && ` (${geneDetail.organism.commonname})`}
                </span>
              </div>
            )}

            {geneDetail?.summary && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-medium text-slate-400">Summary</h4>
                <p className="text-xs leading-relaxed text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/20">
                  {geneDetail.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
