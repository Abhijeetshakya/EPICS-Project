"use client";

import { Search, Activity, Cpu, Dna, Server } from "lucide-react";
import { useEffect, useState } from "react";
import GeneViewer from "~/components/gene-viewer";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  type ChromosomeFromSeach,
  type GeneFromSearch,
  type GenomeAssemblyFromSearch,
  getAvailableGenomes,
  getGenomeChromosomes,
  searchGenes,
} from "~/utils/genome-api";

type Mode = "browse" | "search";

export default function HomePage() {
  const [genomes, setGenomes] = useState<GenomeAssemblyFromSearch[]>([]);
  const [selectedGenome, setSelectedGenome] = useState<string>("hg38");
  const [chromosomes, setChromosomes] = useState<ChromosomeFromSeach[]>([]);
  const [selectedChromosome, setSelectedChromosome] = useState<string>("chr1");
  const [selectedGene, setSelectedGene] = useState<GeneFromSearch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeneFromSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("search");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(5000) });
        if (res.ok) setBackendStatus("online");
        else setBackendStatus("offline");
      } catch {
        setBackendStatus("offline");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchGenomes = async () => {
      try {
        setIsLoading(true);
        const data = await getAvailableGenomes();
        if (data.genomes && data.genomes["Human"]) {
          setGenomes(data.genomes["Human"]);
        }
      } catch (err) {
        setError("Failed to load genome data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGenomes();
  }, []);

  useEffect(() => {
    const fetchChromosomes = async () => {
      try {
        setIsLoading(true);
        const data = await getGenomeChromosomes(selectedGenome);
        setChromosomes(data.chromosomes);
        if (data.chromosomes.length > 0) {
          setSelectedChromosome(data.chromosomes[0]!.name);
        }
      } catch (err) {
        setError("Failed to load chromosome data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchChromosomes();
  }, [selectedGenome]);

  const performGeneSearch = async (
    query: string,
    genome: string,
    filterFn?: (gene: GeneFromSearch) => boolean,
  ) => {
    try {
      setIsLoading(true);
      const data = await searchGenes(query, genome);
      const results = filterFn ? data.results.filter(filterFn) : data.results;
      setSearchResults(results);
    } catch (err) {
      setError("Failed to search genes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChromosome || mode !== "browse") return;
    performGeneSearch(
      selectedChromosome,
      selectedGenome,
      (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
    );
  }, [selectedChromosome, selectedGenome, mode]);

  const handleGenomeChange = (value: string) => {
    setSelectedGenome(value);
    setSearchResults([]);
    setSelectedGene(null);
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setSearchResults([]);
    setSelectedGene(null);
    setError(null);
    if (newMode === "browse" && selectedChromosome) {
      performGeneSearch(
        selectedChromosome,
        selectedGenome,
        (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
      );
    }
    setMode(newMode);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    performGeneSearch(searchQuery, selectedGenome);
  };

  const loadBRCA1Example = () => {
    setMode("search");
    setSearchQuery("BRCA1");
    performGeneSearch("BRCA1", selectedGenome);
  };

  return (
    <div className="min-h-screen">
      {/* ─── Professional Header ────────────────────────────────────────── */}
      <header className="glass-card sticky top-0 z-50 border-b border-slate-700/30">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <Dna className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-100">
                    EVO<span className="text-amber-400">2</span>
                  </h1>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    Variant Analysis
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden h-8 w-px bg-slate-700/50 sm:block" />

              {/* Model Badge */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-800/60 px-3 py-1 border border-slate-700/40">
                  <Cpu className="h-3 w-3 text-amber-400" />
                  <span className="text-[11px] font-medium text-slate-400">
                    EVO2-40B
                  </span>
                  <span className="text-[10px] text-slate-600">•</span>
                  <span className="text-[11px] text-slate-500">NVIDIA API</span>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1.5 border border-slate-700/40">
                <Server className="h-3 w-3 text-slate-400" />
                <span className="text-[11px] text-slate-400">Backend</span>
                <div className={`h-2 w-2 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-400 animate-pulse-glow"
                    : backendStatus === "offline"
                    ? "bg-red-400"
                    : "bg-yellow-400 animate-pulse"
                }`} />
                <span className={`text-[11px] font-medium ${
                  backendStatus === "online" ? "text-emerald-400" :
                  backendStatus === "offline" ? "text-red-400" : "text-yellow-400"
                }`}>
                  {backendStatus === "online" ? "Online" :
                   backendStatus === "offline" ? "Offline" : "Checking"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <main className="container mx-auto px-6 py-8">
        {selectedGene ? (
          <GeneViewer
            gene={selectedGene}
            genomeId={selectedGenome}
            onClose={() => setSelectedGene(null)}
          />
        ) : (
          <div className="animate-fade-in-up space-y-6">
            {/* ─── Genome Assembly Card ──────────────────────────────── */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <h2 className="text-sm font-medium text-slate-300">
                    Genome Assembly
                  </h2>
                </div>
                <div className="text-xs text-slate-500">
                  Organism: <span className="text-slate-400 font-medium">Human</span>
                </div>
              </div>
              <Select
                value={selectedGenome}
                onValueChange={handleGenomeChange}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10 w-full border-slate-700/50 bg-slate-800/50 text-slate-200 focus:border-teal-500/50 focus:ring-teal-500/20">
                  <SelectValue placeholder="Select genome assembly" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {genomes.map((genome) => (
                    <SelectItem key={genome.id} value={genome.id} className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">
                      {genome.id} - {genome.name}
                      {genome.active ? " (active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGenome && (
                <p className="mt-2 text-xs text-slate-500">
                  {genomes.find((g) => g.id === selectedGenome)?.sourceName}
                </p>
              )}
            </div>

            {/* ─── Browse / Search Card ──────────────────────────────── */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-teal-400" />
                <h2 className="text-sm font-medium text-slate-300">
                  Browse Genome
                </h2>
              </div>

              <Tabs
                value={mode}
                onValueChange={(value) => switchMode(value as Mode)}
              >
                <TabsList className="mb-5 bg-slate-800/60 border border-slate-700/40">
                  <TabsTrigger
                    className="data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-300 data-[state=active]:border-teal-500/30 text-slate-400"
                    value="search"
                  >
                    Search Genes
                  </TabsTrigger>
                  <TabsTrigger
                    className="data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-300 data-[state=active]:border-teal-500/30 text-slate-400"
                    value="browse"
                  >
                    Browse Chromosomes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="mt-0">
                  <div className="space-y-3">
                    <form
                      onSubmit={handleSearch}
                      className="flex flex-col gap-3 sm:flex-row"
                    >
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="Enter gene symbol or name (e.g. BRCA1, TP53)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-10 border-slate-700/50 bg-slate-800/50 pr-10 text-slate-200 placeholder:text-slate-500 focus:border-teal-500/50 focus:ring-teal-500/20"
                        />
                        <Button
                          type="submit"
                          className="absolute top-0 right-0 h-full cursor-pointer rounded-l-none bg-teal-600 text-white hover:bg-teal-500"
                          size="icon"
                          disabled={isLoading || !searchQuery.trim()}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                    <Button
                      variant="link"
                      className="h-auto cursor-pointer p-0 text-amber-400 hover:text-amber-300"
                      onClick={loadBRCA1Example}
                    >
                      ⚡ Try BRCA1 example
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="browse" className="mt-0">
                  <div className="max-h-[150px] overflow-y-auto pr-1">
                    <div className="flex flex-wrap gap-2">
                      {chromosomes.map((chrom) => (
                        <Button
                          key={chrom.name}
                          variant="outline"
                          size="sm"
                          className={`h-8 cursor-pointer border-slate-700/40 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 ${
                            selectedChromosome === chrom.name
                              ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                              : ""
                          }`}
                          onClick={() => setSelectedChromosome(chrom.name)}
                        >
                          {chrom.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Loading */}
              {isLoading && (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Results */}
              {searchResults.length > 0 && !isLoading && (
                <div className="mt-6 animate-fade-in-up">
                  <div className="mb-3">
                    <h4 className="text-xs text-slate-500">
                      {mode === "search" ? (
                        <>
                          Search Results:{" "}
                          <span className="text-teal-400 font-medium">
                            {searchResults.length} genes
                          </span>
                        </>
                      ) : (
                        <>
                          Genes on {selectedChromosome}:{" "}
                          <span className="text-teal-400 font-medium">
                            {searchResults.length} found
                          </span>
                        </>
                      )}
                    </h4>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-700/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700/30 bg-slate-800/50 hover:bg-slate-800/60">
                          <TableHead className="text-xs font-medium text-slate-400">
                            Symbol
                          </TableHead>
                          <TableHead className="text-xs font-medium text-slate-400">
                            Name
                          </TableHead>
                          <TableHead className="text-xs font-medium text-slate-400">
                            Location
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((gene, index) => (
                          <TableRow
                            key={`${gene.symbol}-${index}`}
                            className="cursor-pointer border-b border-slate-700/20 hover:bg-slate-800/40 transition-colors"
                            onClick={() => setSelectedGene(gene)}
                          >
                            <TableCell className="py-3">
                              <span className="font-semibold text-teal-300">
                                {gene.symbol}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 text-sm text-slate-300">
                              {gene.name}
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-xs text-slate-400 border border-slate-700/30">
                                {gene.chrom}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !error && searchResults.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50 border border-slate-700/30">
                    <Dna className="h-8 w-8 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">
                    {mode === "search"
                      ? "Search for a gene to begin variant analysis"
                      : selectedChromosome
                        ? "No genes found on this chromosome"
                        : "Select a chromosome to view genes"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
