"use client";
import GeneViewer from "@/components/geneViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GenomeAssembly,
  GenomeChromosome,
  GenomeSearchResult,
  getAvailableGenomes,
  getGenomeChromosomes,
  searchVariants,
} from "@/lib/api/genome-api";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "search" | "browse";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [genomes, setGenomes] = useState<GenomeAssembly[]>([]);
  const [chromosomes, setChromosomes] = useState<GenomeChromosome[]>([]);
  const [selectChromosome, setSelectChromosome] = useState<string>("chr1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGene, setSelectedGene] = useState<GenomeSearchResult | null>(
    null
  );
  const [searchResults, setSearchResults] = useState<GenomeSearchResult[]>([]);
  const [selectedGenome, setSelectedGenome] = useState<string>("hg38");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("search");

  // Fetch genomes from UCSC
  useEffect(() => {
    const fetchGenomes = async () => {
      try {
        setIsLoading(true);
        const data = await getAvailableGenomes();
        if (data.genomes || data.genomes["Human"]) {
          setGenomes(data.genomes["Human"]);
        }
      } catch (error) {
        setError("Failed to fetch genomes from UCSC" + error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGenomes();
  }, []);

  useEffect(() => {
    const fetchGenomeChromosomes = async () => {
      if (!selectedGenome) return;
      try {
        setIsLoading(true);
        const data = await getGenomeChromosomes(selectedGenome);
        setChromosomes(data.chromosomes);
        
        if (data.chromosomes.length > 0) {
          setSelectChromosome(data.chromosomes[0].name);
        }
      } catch (error) {
        setError("Failed to fetch chromosomes from UCSC" + error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGenomeChromosomes();
  }, [selectedGenome]);

  const handleGenomeChange = (genome: string) => {
    setSelectedGenome(genome);
    setSearchResults([]);
    setError(null);
  };

  const loadBRCA1 = () => {
    setMode("search");
    setSearchQuery("BRCA1");
    handleGeneSearch("BRCA1", selectedGenome);
  };

  const handleSearchSumbit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    handleGeneSearch(searchQuery, selectedGenome);
  };

  const handleGeneSearch = async (
    query: string,
    genome: string,
    filterFn?: (result: GenomeSearchResult) => boolean
  ) => {
    try {
      setIsLoading(true);
      const data = await searchVariants(query, genome);
      const results = filterFn ? data.results.filter(filterFn) : data.results;
      console.log(results);
      setSearchResults(results);
    } catch (error) {
      setError("Failed to search for genes" + error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectChromosome || mode !== "browse") return;
    handleGeneSearch(selectChromosome, selectedGenome, (result) => {
      return result.chrom === selectChromosome;
    });
  }, [selectChromosome, selectedGenome, mode]);

  return (
    <div className="min-h-screen bg-[#fdf2e9]">
      <header className="border-b bg-white border-[#28b463]/10">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h1 className="text-xl font-light tracking-wide text-[#28b463]">
                <span className="font-normal">EVO</span>
                <span className="text-[#ec7063] px-0.5">2</span>
              </h1>
              <div className="absolute -bottom-1 left-0 w-12 h-[2px] bg-[#ec7063]"></div>
            </div>
            <span className="font-light text-[#28b463]/70">
              Genetic LLM (Variant Analysis)
            </span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-6">
        {selectedGene ? (
          <GeneViewer gene={selectedGene} genomeId={selectedGenome} onClose={() => setSelectedGene(null)} />
        ) : (
          <>
            <Card className="mb-6 gap-0 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#707b7c]/70">
                    Genome Assembly
                  </CardTitle>
                  <div className="text-sm">
                    Organism : <span className="font-bold">Human</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <Select
                  value={selectedGenome}
                  onValueChange={handleGenomeChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9 w-full border-[#707b7c]/10">
                    <SelectValue placeholder="Select Genome Assembly" />
                  </SelectTrigger>
                  <SelectContent>
                    {genomes.map((genome) => (
                      <SelectItem key={genome.id} value={genome.id}>
                        {genome.id} - {genome.name}
                        {genome.active && (
                          <span className="text-sm">(Active)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGenome && (
                  <p className="mt-2 text-[#707b7c]/60">
                    {genomes.find((g) => g.id === selectedGenome)?.sourceName}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="mt-6 gap-0 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-sm font-normal text-[#707b7c]/70">
                  Browse
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <Tabs
                  value={mode}
                  onValueChange={(value) => {
                    if (value === mode) return;
                    setSearchResults([]);
                    setError(null);
                    setSelectedGene(null);

                    if (value === "browse" && selectChromosome) {
                      handleGeneSearch(
                        selectChromosome,
                        selectedGenome,
                        (result) => {
                          return result.chrom === selectChromosome;
                        }
                      );
                    }
                    setMode(value as Mode);
                  }}
                >
                  <TabsList className="mb-4 bg-[#707b7c]/10">
                    <TabsTrigger
                      className="data-[state=active]:bg-white data-[state=active]:text-[#707b7c]"
                      value="search"
                    >
                      Search Genes
                    </TabsTrigger>
                    <TabsTrigger
                      className="data-[state=active]:bg-white data-[state=active]:text-[#707b7c]"
                      value="browse"
                    >
                      Browse Chromosomes
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="search" className="mt-0">
                    <div className="space-y-4">
                      <form
                        onSubmit={handleSearchSumbit}
                        className="flex flex-col gap-3 sm:flex-row"
                      >
                        <div className="flex-1 relative">
                          <Input
                            type="text"
                            placeholder="Enter gene symbol/name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 border-[#707b7c]/10 pr-10"
                          />
                          <Button
                            type="submit"
                            className="absolute top-0 right-0 cursor-pointer rounded-l-none bg-[#707b7c] text-white hover:bg-[#707b7c]/80"
                            disabled={isLoading || !searchQuery.trim()}
                            size={"icon"}
                          >
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Search</span>
                          </Button>
                        </div>
                      </form>
                      <Button
                        variant={"link"}
                        className="text-[#ec7063] hover:text-[#ec7063]/80 cursor-pointer h-0 p-0"
                        disabled={isLoading}
                        onClick={loadBRCA1}
                      >
                        Try BRCA1 Example
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="browse" className="mt-0">
                    <div className="max-h-[150px] overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-1">
                        {chromosomes.map((chromosome) => (
                          <Button
                            key={chromosome.name}
                            variant={"outline"}
                            size="sm"
                            className={`h-8 cursor-pointer border-[#707b7c]/10 hover:bg-[#fef5e7] hover:text-[#707b7c] ${
                              selectChromosome === chromosome.name
                                ? "bg-[#fef5e7] text-[#707b7c]"
                                : ""
                            }`}
                            onClick={() => setSelectChromosome(chromosome.name)}
                          >
                            {chromosome.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#707b7c] border-t-[#ec7063]"></div>
                  </div>
                )}
                {error && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {searchResults.length > 0 && !isLoading && (
                  <div className="mt-6">
                    <div className="mb-2">
                      <h4 className="text-sm font-normal text-[#28b463]/70">
                        {mode === "search" ? (
                          <>
                            Search Results:{" "}
                            <span className="font-medium text-[#28b463]">
                              {searchResults.length} genes
                            </span>
                          </>
                        ) : (
                          <>
                            Genes on {selectChromosome}:{" "}
                            <span className="font-medium text-[#28b463]">
                              {searchResults.length} found
                            </span>
                          </>
                        )}
                      </h4>
                    </div>
                    <div className="overflow-hidden rounded-md border border-[#707b7c]/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#707b7c]/10 hover:bg-[#707b7c]/20">
                            <TableHead className="text-xs font-normal text-[#707b7c]/70">
                              Symbol
                            </TableHead>
                            <TableHead className="text-xs font-normal text-[#707b7c]/70">
                              Name
                            </TableHead>
                            <TableHead className="text-xs font-normal text-[#707b7c]/70">
                              Location
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((gene, index) => (
                            <TableRow
                              key={`${gene.symbol}-${index}`}
                              className="cursor-pointer border-b border-[#707b7c]/10 hover:hover:bg-[#707b7c]/20"
                              onClick={() => setSelectedGene(gene)}
                            >
                              <TableCell className="py-2 font-medium text-[#707b7c]">
                                {gene.symbol}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-[#707b7c]">
                                {gene.name}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-[#707b7c]">
                                {gene.chrom}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {!isLoading && !error && searchResults.length === 0 && (
                  <div className="flex h-48 flex-col items-center justify-center text-gray-400 text-center">
                    <Search className="mb-4 h-10 w-10 text-gray-400" />
                    {mode === "search" ? (
                      <span className="text-sm leading-relaxed">
                        Enter a gene symbol or name to search
                      </span>
                    ) : (
                      <span className="text-sm leading-relaxed">
                        {selectChromosome
                          ? `No genes found on ${selectChromosome}`
                          : "Choose a chromosome to browse"}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
