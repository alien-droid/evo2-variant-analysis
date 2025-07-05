"use client";
import {
  ClinicalVariant,
  GeneBounds,
  GeneDetails,
  GenomeSearchResult,
  getGeneDetails,
  getGeneSequence,
  fetchClinicalVariants,
} from "@/lib/api/genome-api";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import GeneInfo from "./geneInfo";
import GeneSequence from "./geneSequence";
import KnownVariants from "./knownVariants";
import VariantComparison from "./variantComparison";
import VariantAnalysis, { VariantAnalysisHandle } from "./variantAnalysis";

const GeneViewer = ({
  gene,
  genomeId,
  onClose,
}: {
  gene: GenomeSearchResult;
  genomeId: string;
  onClose: () => void;
}) => {
  const [geneDetail, setGeneDetail] = useState<GeneDetails | null>(null);
  const [geneBound, setGeneBound] = useState<GeneBounds | null>(null);
  const [sequence, setSequence] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startPos, setStartPos] = useState<string>("");
  const [endPos, setEndPos] = useState<string>("");
  const [isLoadingSeq, setIsLoadingSeq] = useState(false);

  const [actualRange, setActualRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const [comparisonVariant, setComparisonVariant] =
    useState<ClinicalVariant | null>(null);

  // activeSeqPosition and activeSeqNucleotide are used to store the position and nucleotide clicked in the gene sequence
  // these are used to fill the "position" and "reference sequence" in the VariantAnalysis component
  const [activeSeqPosition, setActiveSeqPosition] = useState<number | null>(
    null
  );
  const [activeSeqNucleotide, setActiveSeqNucleotide] = useState<string | null>(
    null
  );

  const [clinicalVariants, setClinicalVariants] = useState<ClinicalVariant[]>(
    []
  );

  const [isLoadingClinical, setIsLoadingClinical] = useState(false);
  const [errorClinical, setErrorClinical] = useState<string | null>(null);

  const variantAnalysisRef = useRef<VariantAnalysisHandle>(null);

  const updateClinicalVariant = (id: string, newVariant: ClinicalVariant) => {
    setClinicalVariants((currentVariants) =>
      currentVariants.map((v) => (v.clinvar_id === id ? newVariant : v))
    );
  };

  const fetchGeneSequence = useCallback(
    async (start: number, end: number) => {
      try {
        setIsLoadingSeq(true);
        setError(null);

        const result = await getGeneSequence(gene.chrom, start, end, genomeId);
        setSequence(result.sequence);
        setActualRange(result.range);

        if (result.error) {
          setError(result.error);
        }
        //console.log(result.sequence);
      } catch (error) {
        setError("Failed to fetch gene sequence. Please Try Again");
        console.error("Error fetching gene sequence:", error);
      } finally {
        setIsLoadingSeq(false);
      }
    },
    [gene.chrom, genomeId]
  );

  useEffect(() => {
    const initialGeneDetail = async () => {
      setIsLoading(true);
      setError(null);
      setGeneDetail(null);
      setStartPos("");
      setEndPos("");

      if (!gene.gene_id) {
        setError("Gene ID not found. Cannot fetch gene details");
        setIsLoading(false);
        return;
      }

      try {
        const result = await getGeneDetails(gene.gene_id);
        setGeneDetail(result.geneDetails);
        setGeneBound(result.geneBound);
        if (result.initialRange) {
          setStartPos(result.initialRange.start.toString());
          setEndPos(result.initialRange.end.toString());
          console.log(result.initialRange);
          // fetch gene sequence
          await fetchGeneSequence(
            result.initialRange.start,
            result.initialRange.end
          );
          // console.log(result.geneDetails);
        }
      } catch (error) {
        setError("Failed to fetch gene details. Please Try Again");
        console.error("Error fetching gene details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initialGeneDetail();
  }, [gene, genomeId, fetchGeneSequence]);

  // allows a sequence posiition and nucleotide to be clicked from the gene sequence
  // that automatically focuses the "alternative" input field in the variant analysis component and fills the "position" and "reference sequence" in VariantAnalysis

  const handleSequenceClick = useCallback(
    (position: number, nucleotide: string) => {
      setActiveSeqPosition(position);
      setActiveSeqNucleotide(nucleotide);
      // console.log(`Clicked position: ${position}, nucleotide: ${nucleotide}`);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      }); // Scroll to top when clicking on sequence
      if (variantAnalysisRef.current) {
        variantAnalysisRef.current.focusAlternativeInput();
      }
    },
    []
  );
  const handleLoadSequence = useCallback(() => {
    const start = parseInt(startPos);
    const end = parseInt(endPos);
    let seqerror: string | null = null;
    //console.log(start, end);
    if (isNaN(start) || isNaN(end)) {
      seqerror = "Please enter a Invalid start or end position";
    } else if (start > end) {
      seqerror = "Start position cannot be greater than end position";
    } else if (geneBound) {
      const minBound = Math.min(geneBound.max, geneBound.min);
      const maxBound = Math.max(geneBound.max, geneBound.min);
      if (start < minBound) {
        seqerror = `Start position ${start.toLocaleString()} cannot be less than min value: ${minBound.toLocaleString()}`;
      } else if (end > maxBound) {
        seqerror = `End position ${end.toLocaleString()} cannot be greater than max value: ${maxBound.toLocaleString()}`;
      } else if (end - start - 1 >= 10000) {
        seqerror = `Range ${(
          end - start
        ).toLocaleString()} bp is greater than max range ${10000} bp`;
      }
    }

    if (seqerror) {
      console.log(seqerror);

      setError(seqerror);
      return;
    }
    setError(null);
    fetchGeneSequence(start, end);
  }, [startPos, endPos, geneBound, fetchGeneSequence]);

  const fetchClinicalVariantsForGene = useCallback(async () => {
    if (!gene.chrom || !geneBound) return;
    setIsLoadingClinical(true);
    setErrorClinical(null);

    try {
      const variants = await fetchClinicalVariants(
        gene.chrom,
        geneBound,
        genomeId
      );
      console.log(variants);
      setClinicalVariants(variants);
      // console.log(variants);
    } catch (error) {
      setClinicalVariants([]);
      console.error("Error fetching clinical variants:", error);
      setErrorClinical("Failed to fetch clinical variants. Please Try Again");
    } finally {
      setIsLoadingClinical(false);
    }
  }, [gene.chrom, geneBound, genomeId]);

  useEffect(() => {
    if (geneBound) fetchClinicalVariantsForGene();
  }, [fetchClinicalVariantsForGene, geneBound]);

  const showComparison = (variant: ClinicalVariant) => {
    if (variant.evo2Result) {
      setComparisonVariant(variant);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant={"ghost"}
        size="sm"
        className="cursor-pointer text-[#707b7c] hover:bg-[#3b3b3b]/10"
        onClick={onClose}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Results
      </Button>

      <VariantAnalysis
        ref={variantAnalysisRef}
        gene={gene}
        genomeId={genomeId}
        chromosome={gene.chrom}
        clincalVariants={clinicalVariants}
        referenceSequence={activeSeqNucleotide}
        seqPosition={activeSeqPosition}
        geneBounds={geneBound}
      />

      <KnownVariants
        refreshVariants={fetchClinicalVariantsForGene}
        showComparison={showComparison}
        updateClinicalVariant={updateClinicalVariant}
        clinicalVariants={clinicalVariants}
        isLoading={isLoadingClinical}
        error={errorClinical}
        genomeId={genomeId}
        gene={gene}
      />

      <GeneSequence
        geneBounds={geneBound}
        geneDetails={geneDetail}
        startPos={startPos}
        endPos={endPos}
        onStartPosChange={setStartPos}
        onEndPosChange={setEndPos}
        sequence={sequence}
        range={actualRange}
        maxRange={10000}
        isLoading={isLoadingSeq}
        error={error}
        onSequenceLoad={handleLoadSequence}
        onSequenceClick={handleSequenceClick}
      />
      <GeneInfo gene={gene} geneDetail={geneDetail} geneBound={geneBound} />
      <VariantComparison
        comparisonVariant={comparisonVariant}
        onClose={() => setComparisonVariant(null)}
      />
    </div>
  );
};

export default GeneViewer;
