export interface GenomeAssembly {
  id: string;
  name: string;
  sourceName: string;
  active: boolean;
}

export interface GenomeChromosome {
  name: string;
  size: number;
}

export interface GenomeSearchResult {
  symbol: string;
  name: string;
  chrom: string;
  description: string;
  gene_id?: string;
}

export interface GeneDetails {
  genomicinfo?: {
    chrstart: number;
    chrstop: number;
    strand?: string;
  }[];
  summary?: string;
  organism?: {
    scientificname: string;
    commonname: string;
  };
}

export interface GeneBounds {
  min: number;
  max: number;
}

export interface ClinicalVariant {
  clinvar_id: string;
  title: string;
  variation_type: string;
  classification: string;
  gene_sort: string;
  chromosome: string;
  location: string;
  evo2Result?: {
    // only for evo2 model classification
    prediction: string;
    delta_score: number;
    classification_conf: number;
  };
  isAnalyzing?: boolean;
  evo2Error?: string;
}

export interface AnalysisResult {
  position: number;
  reference: string;
  alternative: string;
  delta_score: number;
  prediction: string;
  classification_conf: number;
}

import { config } from "dotenv";

config({
  path: ".env",
});

export async function getAvailableGenomes() {
  const url = "https://api.genome.ucsc.edu/list/ucscGenomes";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch genomes from UCSC");
  }
  const data = await response.json();
  if (!data.ucscGenomes) {
    throw new Error("API Error: Failed to fetch genomes from UCSC");
  }

  const genomes = data.ucscGenomes;
  const genomesList: Record<string, GenomeAssembly[]> = {};

  for (const genome in genomes) {
    const assembly = genomes[genome];
    const organism = assembly.organism || "Other";
    if (!genomesList[organism]) {
      genomesList[organism] = [];
    }
    genomesList[organism].push({
      id: genome,
      name: assembly.description || genome,
      sourceName: assembly.sourceName || genome,
      active: !!assembly.active,
    });
  }
  return { genomes: genomesList };
}

export async function getGenomeChromosomes(genome: string) {
  const url = `https://api.genome.ucsc.edu/list/chromosomes?genome=${genome}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch chromosomes from UCSC");
  }
  const data = await response.json();
  if (!data.chromosomes) {
    throw new Error(
      "API Error: Failed to fetch chromosomes from UCSC for genome " + genome
    );
  }
  const chromosomes: GenomeChromosome[] = [];
  for (const chromosome in data.chromosomes) {
    // exclude chromosomes with '_' or 'Un' or 'random'
    if (
      chromosome.includes("_") ||
      chromosome.includes("Un") ||
      chromosome.includes("random")
    )
      continue;
    chromosomes.push({
      name: chromosome,
      size: data.chromosomes[chromosome],
    });
  }

  // sort by number, then by name
  chromosomes.sort((a, b) => {
    const anum = a.name.replace("chr", "");
    const bnum = b.name.replace("chr", "");

    const isAnu = anum.match(/^\d+$/);
    const isBnu = bnum.match(/^\d+$/);

    if (isAnu && isBnu) {
      return Number(anum) - Number(bnum);
    }
    if (isAnu) return -1;
    if (isBnu) return 1;
    return anum.localeCompare(bnum);
  });
  return { chromosomes };
}

export async function searchVariants(query: string, genome: string) {
  const url = `https://clinicaltables.nlm.nih.gov/api/ncbi_genes/v3/search?`;
  const params = new URLSearchParams({
    terms: query,
    df: "chromosome,Symbol,description,map_location,type_of_gene", // reprsents the fields to return
    ef: "chromosome,Symbol,description,map_location,type_of_gene,GenomicInfo,GeneID", // extra fields to return
  });
  const response = await fetch(`${url}${params}`);
  if (!response.ok) {
    throw new Error(
      "Failed to fetch search results (NCBI) for " +
        query +
        " and genome " +
        genome
    );
  }
  const data = await response.json();
  const results: GenomeSearchResult[] = [];

  // In the API,
  // data[0] = total number of results
  // data[1] = geneId (which won't be there because of 'cf' param)
  // data[2] = extra fields (using 'ef' param, contains 'GeneID')
  // data[3] = results (contains the search results in order of Symbol, description, map_location, type_of_gene)
  if (data[0] > 0) {
    const fieldMap = data[2];
    const geneIds = fieldMap["GeneID"] || [];
    // consider only first 10 search results
    for (let i = 0; i < Math.min(10, data[0]); i++) {
      if (i < data[3].length) {
        try {
          const searchResult = data[3][i];
          let chrom = searchResult[0];
          if (chrom && !chrom.startsWith("chr")) {
            // add 'chr' to chromosomes that don't have it
            chrom = "chr" + chrom;
          }
          results.push({
            symbol: searchResult[1],
            description: searchResult[2],
            chrom: chrom,
            gene_id: geneIds[i],
            name: searchResult[3],
          });
        } catch {
          continue;
        }
      }
    }
  }
  return { query, genome, results };
}

export async function getGeneDetails(geneId: string): Promise<{
  geneDetails: GeneDetails | null;
  geneBound: GeneBounds | null;
  initialRange: { start: number; end: number } | null;
}> {
  try {
    const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${geneId}&retmode=json`;
    const response = await fetch(detailsUrl);
    if (!response.ok) {
      console.log("Failed to fetch gene details for " + geneId);
      console.error(`Error: ${response.statusText}`);
      return { geneDetails: null, geneBound: null, initialRange: null };
    }
    const data = await response.json();

    if (data.result && data.result[geneId]) {
      const geneDetail = data.result[geneId];
      if (geneDetail.genomicinfo && geneDetail.genomicinfo.length > 0) {
        const genomicInfo = geneDetail.genomicinfo[0];
        const minPos = Math.min(genomicInfo.chrstart, genomicInfo.chrstop);
        const maxPos = Math.max(genomicInfo.chrstart, genomicInfo.chrstop);

        const bounds = { min: minPos, max: maxPos };

        // get the initial range
        const geneSize = maxPos - minPos;
        const seqStart = minPos;
        const seqEnd = (geneSize > 10000 ? minPos + 10000 : maxPos) - 1;
        console.log(maxPos, minPos, geneSize, seqStart, seqEnd);
        const initialRange = { start: seqStart, end: seqEnd };

        return {
          geneDetails: geneDetail,
          geneBound: bounds,
          initialRange: initialRange,
        };
      }
    }
    return { geneDetails: null, geneBound: null, initialRange: null };
  } catch (error) {
    return { geneDetails: null, geneBound: null, initialRange: null };
  }
}

export async function getGeneSequence(
  chrom: string,
  start: number,
  end: number,
  genomeId: string
): Promise<{
  sequence: string;
  range: { start: number; end: number };
  error?: string;
}> {
  const chromosome = chrom.startsWith("chr") ? chrom : "chr" + chrom;

  const apiStart = start - 1;
  const apiEnd = end;
  const url = `https://api.genome.ucsc.edu/getData/sequence?genome=${genomeId};chrom=${chromosome};start=${apiStart};end=${apiEnd}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error("Failed to fetch gene sequence");
    console.error(`Error: ${response.statusText}`);
    return { sequence: "", range: { start, end }, error: "Failed to fetch" };
  }
  const data = await response.json();
  const actualRange = { start, end };

  if (data.error || !data.dna) {
    return { sequence: "", range: actualRange, error: data.error };
  }

  const seq = data.dna.toUpperCase();
  return { sequence: seq, range: actualRange };
}

export async function fetchClinicalVariants(
  chrom: string,
  geneBounds: GeneBounds,
  genomeId: string
): Promise<ClinicalVariant[]> {
  const chromosomeFormatted = chrom.replace(/^chr/i, "");
  const minBound = Math.min(geneBounds.max, geneBounds.min);
  const maxBound = Math.max(geneBounds.max, geneBounds.min);

  const pos = genomeId === "hg19" ? "chrpos37" : "chrpos38";
  const searchTerm = `${chromosomeFormatted}[chromosome] AND ${minBound}:${maxBound}[${pos}]`;

  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`;
  const searchParams = new URLSearchParams({
    db: "clinvar",
    term: searchTerm,
    retmode: "json",
    retmax: "20",
  });
  const searchResponse = await fetch(`${url}?${searchParams.toString()}`);
  if (!searchResponse.ok) {
    throw new Error(
      "Failed to fetch clinical variants" + searchResponse.statusText
    );
  }
  const searchData = await searchResponse.json();
  if (
    !searchData.esearchresult ||
    !searchData.esearchresult.idlist ||
    searchData.esearchresult.idlist.length === 0
  ) {
    console.log("No clinical variants found for " + searchTerm);
    return [];
  }
  const variantIds = searchData.esearchresult.idlist;
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi`;
  const summaryParams = new URLSearchParams({
    db: "clinvar",
    id: variantIds.join(","),
    retmode: "json",
  });
  const summaryResponse = await fetch(
    `${summaryUrl}?${summaryParams.toString()}`
  );
  if (!summaryResponse.ok) {
    throw new Error(
      "Failed to fetch clinical variants summary" + summaryResponse.statusText
    );
  }
  const summaryData = await summaryResponse.json();
  const clinicalVariants: ClinicalVariant[] = [];

  if (summaryData.result && summaryData.result.uids) {
    for (const uid of summaryData.result.uids) {
      const variant = summaryData.result[uid];
      // console.log(variant);
      clinicalVariants.push({
        clinvar_id: uid,
        title: variant.title,
        variation_type: (variant.obj_type || "Unknown")
          .split(" ")
          .map(
            (word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        classification:
          variant.germline_classification.description || "Unknown",
        gene_sort: variant.gene_sort || "",
        chromosome: chromosomeFormatted,
        location: variant.location_sort
          ? parseInt(variant.location_sort).toLocaleString()
          : "Unknown",
      });
    }
  }
  return clinicalVariants;
}

export async function analyzeVariant({
  position,
  alternative,
  genomeId,
  chromosome,
}: {
  position: number;
  alternative: string;
  reference?: string;
  genomeId: string;
  chromosome: string;
}): Promise<AnalysisResult> {
  const queryParams = new URLSearchParams({
    variant_pos: position.toString(),
    alt: alternative,
    genome: genomeId,
    chromosome: chromosome,
  });

  const baseUrl = process.env.NEXT_PUBLIC_ANALYSE_SINGLE_VARIANT_BASEURL!;
  const url = `${baseUrl}?${queryParams.toString()}`;

  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to analyze variant: ${error}`);
  }

  const data = await response.json();
  return data;
}
