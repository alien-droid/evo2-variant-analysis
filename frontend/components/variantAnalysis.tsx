"use client";
import {
  ClinicalVariant,
  GenomeSearchResult,
  GeneBounds,
  AnalysisResult,
  analyzeVariant,
} from "@/lib/api/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import React, { forwardRef, useEffect, useImperativeHandle } from "react";
import { Input } from "./ui/input";
import { getClassificationClasses, getNucleotideColorClass } from "@/lib/utils";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";

export interface VariantAnalysisHandle {
  focusAlternativeInput: () => void;
}

export interface VariantAnalysisProps {
  gene: GenomeSearchResult;
  genomeId: string;
  chromosome: string;
  clincalVariants: Array<ClinicalVariant>;
  referenceSequence: string | null;
  seqPosition: number | null;
  geneBounds: GeneBounds | null;
}
// forwardRef is used to allow parent components to access ref components
// this allows the parent component (GeneViewer) to focus on the "alternative" input field when needed

// referenceSequence and seqPosition are used to fill the "position" and "reference sequence"
// in the component coming from the gene sequence clicked in the "GeneSequence" component

const VariantAnalysis = forwardRef<VariantAnalysisHandle, VariantAnalysisProps>(
  (
    {
      gene,
      genomeId,
      chromosome,
      clincalVariants,
      referenceSequence,
      seqPosition,
      geneBounds,
    }: VariantAnalysisProps,
    ref
  ) => {
    const [varPosition, setVarPosition] = React.useState<string>(
      geneBounds?.min.toString() || ""
    );

    const [varReference, setVarReference] = React.useState<string>("");
    const [varAlternative, setVarAlternative] = React.useState<string>("");
    const [varResult, setVarResult] = React.useState<AnalysisResult | null>(
      null
    );

    const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const alternativeInputRef = React.useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusAlternativeInput: () => {
        alternativeInputRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (seqPosition && referenceSequence) {
        setVarPosition(seqPosition.toString());
        setVarReference(referenceSequence);
      }
    }, [seqPosition, referenceSequence]);

    const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setVarPosition(e.target.value);
      setVarAlternative("");
    };

    const handleVarSubmit = async (pos: string, alt: string) => {
      const vPos = parseInt(pos);
      if (isNaN(vPos)) {
        setError("Invalid position. Please enter a valid number.");
        return;
      }
      const validNucleotides = /^[ACGT]$/;
      if (!validNucleotides.test(alt)) {
        setError("Invalid nucleotide. Please enter A, T, C, or G.");
        return;
      }
      setIsAnalyzing(true);
      setError(null);

      try {
        const data = await analyzeVariant({
          position: vPos,
          alternative: alt,
          genomeId,
          chromosome,
        });

        setVarResult(data);
      } catch (error) {
        console.error("Error analyzing variant:", error);
        setError("Failed to analyze variant. Please try again.");
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <Card className="border-none bg-white py-0 shadow-sm gap-0">
        <CardHeader className="pt-4 pb-2">
          <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
            Variant Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="mb-4 text-xs text-[#3c4f3d]/70">
            Predict the impact of genetic variants on the gene function and
            potential disease associations using Evo2 Model.
          </p>
          <div className="items-end gap-4 flex flex-wrap">
            <div>
              <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                Position
              </label>
              <Input
                value={varPosition}
                onChange={handlePositionChange}
                className="h-8 w-32 border-[#3c4f3d]/10 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                Alternative (variant)
              </label>
              <Input
                value={varAlternative}
                onChange={(e) =>
                  setVarAlternative(e.target.value.toUpperCase())
                }
                placeholder="e.g. A, T, C, G"
                maxLength={1}
                className="h-8 w-32 border-[#3c4f3d]/10 text-xs"
                ref={alternativeInputRef}
              />
            </div>
            {varReference && (
              <div className="mb-2 flex items-center gap-2 text-xs text-[#3c4f3d]/70">
                <span>Substitution:</span>
                <span
                  className={`font-medium ${getNucleotideColorClass(
                    varReference
                  )}`}
                >
                  {varReference}
                </span>
                <span>→</span>
                <span
                  className={`font-medium ${getNucleotideColorClass(
                    varAlternative
                  )}`}
                >
                  {varAlternative || "?"}
                </span>
              </div>
            )}
            <Button
              disabled={isAnalyzing || !varPosition || !varAlternative}
              variant={"outline"}
              size="sm"
              onClick={() =>
                handleVarSubmit(varPosition.replaceAll(",", ""), varAlternative)
              }
              className="cursor-pointer h-8 bg-[#3c4f3d] text-xs text-white px-3 hover:bg-[#3c4f3d]/90"
            >
              {isAnalyzing ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin border-2 border-white border-t-transparent align-middle rounded-full"></span>
                  Analyzing...
                </>
              ) : (
                "Analyze Variant"
              )}
            </Button>
          </div>
          {varPosition &&
            clincalVariants.length > 0 &&
            clincalVariants
              .filter(
                (v) =>
                  v.variation_type
                    .toLowerCase()
                    .includes("single nucleotide") &&
                  parseInt(v.location.replaceAll(",", "")) ===
                    parseInt(varPosition.replaceAll(",", ""))
              )
              .map((mV) => {
                const refAltMatch = mV.title.match(/(\w)>(\w)/);
                let ref = null,
                  alt = null;
                if (refAltMatch && refAltMatch.length === 3) {
                  ref = refAltMatch[1];
                  alt = refAltMatch[2];
                }
                if (!ref || !alt) {
                  return null; // Skip if no valid reference or alternative
                }
                return (
                  <div
                    key={mV.clinvar_id}
                    className="mt-4 rounded-md border border-[#3c4f3d] bg-[#e9eeea]/30 p-4"
                  >
                    <div className="mt-3 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#3c4f3d]">
                        Known Variant Detected
                      </h4>
                      <span className="text-xs font-medium text-[#3c4f3d]/70">
                        Position: {mV.location}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="mb-1 text-xs font-medium text-[#3c4f3d]/70">
                          Variant Details
                        </div>
                        <div className="text-sm">{mV.title}</div>
                        <div className="mt-2 text-sm">
                          {gene?.symbol} {varPosition}{" "}
                          <span className="font-mono">
                            <span className={getNucleotideColorClass(ref)}>
                              {ref}
                            </span>
                            {">"}
                            <span className={getNucleotideColorClass(alt)}>
                              {alt}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-[#3c4f3d]/70">
                          ClinVar classification
                          <span
                            className={`ml-1 rounded-sm px-1 py-0.5 ${getClassificationClasses(
                              mV.classification
                            )}`}
                          >
                            {mV.classification || "Unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end ">
                        <Button
                          disabled={isAnalyzing}
                          variant={"outline"}
                          size="sm"
                          onClick={() => {
                            setVarAlternative(alt);
                            handleVarSubmit(
                              varPosition.replaceAll(",", ""),
                              alt
                            );
                          }}
                          className="cursor-pointer h-7 bg-[#e9eeea] text-xs text-[#3c4f3d] border-[#3c4f3d]/20 px-3 hover:bg-[#3c4f3d]/10"
                        >
                          {isAnalyzing ? (
                            <>
                              <span className="mr-1 inline-block h-3 w-3 animate-spin border-2 border-white border-t-transparent align-middle rounded-full"></span>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Zap className="mr-1 inline-block h-3 w-3" />{" "}
                              Analyze This Variant
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })[0]}
          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}
          {varResult && (
            <div className="mt-6 rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/30 p-4">
              <h4 className="mb-3 text-sm font-medium text-[#3c4f3d]">
                Analysis Result
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2">
                    <div className="text-xs font-medium text-[#3c4f3d]/70">
                      Variant
                    </div>
                    <div className="text-sm">
                      {gene?.symbol} {varResult.position}{" "}
                      <span className="font-mono">{varResult.reference}</span>
                      {">"}
                      <span>{varResult.alternative}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#3c4f3d]/70">
                      Delta Likelihood Score
                    </div>
                    <div className="text-sm">
                      {varResult.delta_score.toFixed(6)}
                    </div>
                    <div className="text-xs text-[#3c4f3d]/60">
                      Negative score indicates loss of function
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#3c4f3d]/70">
                    Prediction
                  </div>
                  <div
                    className={`inline-block rounded-lg px-3 py-1 text-xs ${getNucleotideColorClass(
                      varResult.prediction
                    )}`}
                  >
                    {varResult.prediction}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-medium text-[#3c4f3d]/70">
                      Confidence
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-[#e9eeea]">
                      <div
                        className={`h-2 rounded-full ${
                          varResult.prediction.includes("pathogenic")
                            ? "bg-red-600"
                            : "bg-green-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            varResult.classification_conf * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="mt-1 text-right text-xs text-[#3c4f3d]/60">
                      {Math.round(varResult.classification_conf * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

VariantAnalysis.displayName = "VariantAnalysis";

export default VariantAnalysis;
