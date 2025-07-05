"use client";

import { ClinicalVariant, GenomeSearchResult } from "@/lib/api/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { getClassificationClasses } from "@/lib/utils";
import { analyzeVariant as analyzeVariantAPI } from "@/lib/api/genome-api";

const KnownVariants = ({
  refreshVariants,
  showComparison,
  updateClinicalVariant,
  clinicalVariants,
  isLoading = true,
  error,
  genomeId,
  gene,
}: {
  refreshVariants: () => void;
  showComparison: (variant: ClinicalVariant) => void;
  updateClinicalVariant: (id: string, newVariant: ClinicalVariant) => void;
  clinicalVariants: ClinicalVariant[];
  isLoading: boolean;
  error: string | null;
  genomeId: string;
  gene: GenomeSearchResult;
}) => {
  const analyzeVariant = async (variant: ClinicalVariant) => {
    let variantDetails = null;
    const position = variant.location
      ? parseInt(variant.location.replaceAll(",", ""))
      : null;

    const refAltMatch = variant.title.match(/(\w)>(\w)/);

    if (refAltMatch && refAltMatch.length === 3) {
      variantDetails = {
        position,
        reference: refAltMatch[1],
        alternative: refAltMatch[2],
      };
    }
    if (
      !variantDetails ||
      !variantDetails.position ||
      !variantDetails.reference ||
      !variantDetails.alternative
    ) {
      return;
    }
    updateClinicalVariant(variant.clinvar_id, {
      ...variant,
      isAnalyzing: true,
    });

    try {
      const data = await analyzeVariantAPI({
        position: variantDetails.position,
        alternative: variantDetails.alternative,
        reference: variantDetails.reference,
        genomeId,
        chromosome: gene.chrom,
      });

      const updatedVariant = {
        ...variant,
        evo2Result: data,
        isAnalyzing: false,
      };
      updateClinicalVariant(variant.clinvar_id, updatedVariant);
      showComparison(updatedVariant);
    } catch (error) {
      updateClinicalVariant(variant.clinvar_id, {
        ...variant,
        isAnalyzing: false,
        evo2Error: error instanceof Error ? error.message : "Failed Analysis",
      });
    }
  };
  return (
    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
        <CardTitle className="text-sm font-normal text-[#707b7c]/70">
          Known Variants in ClinVar
        </CardTitle>
        <Button
          variant={"ghost"}
          size="sm"
          className="h-7 cursor-pointer text-[#707b7c] hover:bg-[#3b3b3b]/70"
          onClick={refreshVariants}
          disabled={isLoading}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-400"></div>
          </div>
        ) : (
          <>
            {clinicalVariants.length > 0 ? (
              <div className="h-96 max-h-96 overflow-y-scroll rounded-md border border-[#3c4f3d]/5">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-[#707b7c]/70 hover:bg-[#707b7c]/30">
                      <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                        Variant
                      </TableHead>
                      <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                        Type
                      </TableHead>
                      <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                        Clinical Significance
                      </TableHead>
                      <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinicalVariants.map((variant) => (
                      <TableRow
                        key={variant.clinvar_id}
                        className="border-b border-[#3c4f3d]/5"
                      >
                        <TableCell className="py-2">
                          <div className="text-xs font-medium text-[#3c4f3d]">
                            {variant.title}
                          </div>
                          <div className="text-xs text-[#3c4f3d]/70 mt-1 flex gap-1 items-center">
                            <p>Location: {variant.location}</p>
                            <Button
                              variant={"link"}
                              size="sm"
                              className="h-6 px-0 cursor-pointer text-xs text-[#ec7063] hover:[#ec7063]/80"
                              onClick={() =>
                                window.open(
                                  `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_id}`,
                                  "_blank"
                                )
                              }
                            >
                              View in ClinVar
                              <ExternalLink className="ml-1 inline-block h-2 w-2" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-[#3c4f3d]">
                          {variant.variation_type}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-[#3c4f3d]">
                          <div
                            className={`w-fit rounded-md px-2 py-2 text-center font-normal ${getClassificationClasses(
                              variant.classification
                            )}`}
                          >
                            {variant.classification || "Unknown"}
                          </div>
                          {variant.evo2Result && (
                            <div className="mt-2">
                              <div
                                className={`w-fit flex items-center gap-1 rounded-md px-2 py-1 text-center ${getClassificationClasses(
                                  variant.evo2Result.prediction
                                )}`}
                              >
                                <Shield className="h-3 w-3" />
                                <span>
                                  Evo2: {variant.evo2Result.prediction}
                                </span>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          <div className="flex flex-col items-end gap-1">
                            {variant.variation_type
                              .toLowerCase()
                              .includes("single nucleotide") ? (
                              !variant.evo2Result ? (
                                <Button
                                  variant={"outline"}
                                  size={"sm"}
                                  className="h-7 cursor-pointer border-[#3c4f3d]/20 bg-[#707b7c]/10 hover:bg-[#707b7c]/30 text-xs text-[#3c4f3d] px-3"
                                  disabled={variant.isAnalyzing}
                                  onClick={() => analyzeVariant(variant)}
                                >
                                  {variant.isAnalyzing ? (
                                    <>
                                      <div className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#3c4f3c]/30 border-t-[#3c4f3d]" />
                                      <span>Analyzing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="mr-2 inline-block h-3 w-3" />
                                      <span>Analyze with Evo2</span>
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant={"outline"}
                                  size="sm"
                                  className="h-7 cursor-pointer border-green-200 bg-green-50 text-xs px-3 hover:bg-green-100 text-green-700"
                                  onClick={() => showComparison(variant)}
                                >
                                  <BarChart2 className="mr-2 inline-block h-3 w-3" />
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
              <div className="flex h-48 flex-col items-center justify-center text-center text-gray-400">
                <Search className="mb-4 h-10 w-10 text-gray-300" />
                <p className="text-sm leading-relaxed">
                  No ClinVar variants found for this gene.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default KnownVariants;
