import {
  GeneBounds,
  GeneDetails,
  GenomeSearchResult,
} from "@/lib/api/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ExternalLink } from "lucide-react";

const GeneInfo = ({
  gene,
  geneDetail,
  geneBound,
}: {
  gene: GenomeSearchResult;
  geneDetail: GeneDetails | null;
  geneBound: GeneBounds | null;
}) => {
  return (
    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-sm font-normal text-[#707b7c]/70">
          Gene Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex">
              <span className="w-28 text-xs min-28 text-[#707b7c]/70">
                Symbol:
              </span>
              <span className="text-xs font-medium">{gene.symbol}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-xs min-28 text-[#707b7c]/70">
                Name:
              </span>
              <span className="text-xs font-medium">{gene.name}</span>
            </div>
            {gene.description && gene.description !== gene.name && (
              <div className="flex">
                <span className="w-28 text-xs min-28 text-[#707b7c]/70">
                  Description:
                </span>
                <span className="text-xs font-medium">{gene.description}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-28 text-xs min-28 text-[#707b7c]/70">
                Chromosome:
              </span>
              <span className="text-xs font-medium">{gene.chrom}</span>
            </div>
            {geneBound && (
              <div className="flex">
                <span className="w-28 text-xs min-28 text-[#707b7c]/70">
                  Position:
                </span>
                <span className="text-xs font-medium">
                  {Math.min(geneBound.min, geneBound.max).toLocaleString()} - {" "} 
                  {Math.max(geneBound.min, geneBound.max).toLocaleString()} (
                  {Math.abs(geneBound.max - geneBound.min + 1).toLocaleString()} bp)
                  {geneDetail?.genomicinfo?.[0]?.strand === "-" &&
                    " (reverse strand)"}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {gene.gene_id && (
              <div className="flex">
                <span className="w-28 text-xs min-28 text-[#707b7c]/70">
                  Gene ID:
                </span>
                <span className="text-xs">
                  <a
                    href={`https://ncbi.nlm.nih.gov/gene/${gene.gene_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline items-center flex"
                  >
                    {gene.gene_id}
                    <ExternalLink className="ml-1 inline-block h-3 w-3" />
                  </a>
                </span>
              </div>
            )}
            {geneDetail?.organism && (
              <div className="flex">
                <span className="w-28 text-xs text-[#707b7c]/70">
                  Organism:
                </span>
                <span className="text-xs">
                  {geneDetail.organism.scientificname}{" "}
                  {geneDetail.organism.commonname &&
                    ` (${geneDetail.organism.commonname})`}
                </span>
              </div>
            )}
            {geneDetail?.summary && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-medium text-[#707b7c]/70">
                  Summary:
                </h3>
                <p className="text-xs leading-relaxed text-[#707b7c]/80">
                  {geneDetail.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneInfo;
