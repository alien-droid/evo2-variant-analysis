import { ClinicalVariant } from "@/lib/api/genome-api";
import React from "react";
import { Button } from "./ui/button";
import { Check, ExternalLink, Shield, X } from "lucide-react";
import { getClassificationClasses, getNucleotideColorClass } from "@/lib/utils";

const VariantComparison = ({
  comparisonVariant,
  onClose,
}: {
  comparisonVariant: ClinicalVariant | null;
  onClose: () => void;
}) => {
  if (!comparisonVariant || comparisonVariant.evo2Result === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
        <div className="border-b border-[#3c4f3c]/10 p-5 ">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[#3c4f3d]">
              Variant Analysis Comparison
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-7 h-7 cursor-pointer p-0 text-[#3c4f3d]/70 hover:bg-[#707b7c]/70 hover:text-[#3c4f3d]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Modal Content */}
        <div className="p-5">
          {comparisonVariant && comparisonVariant.evo2Result && (
            <div className="space-y-6">
              <div className="rounded-md border border-[#3c4f3d]/10 bg-white p-4">
                <h4 className="text-sm mb-3 font-medium text-[#3c4f3d]">
                  Variant Information
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-28 text-xs  text-[#3c4f3d]/70">
                          Position:
                        </span>
                        <span className="text-xs font-medium">
                          {comparisonVariant.location}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-xs  text-[#3c4f3d]/70">
                          Type:
                        </span>
                        <span className="text-xs font-medium">
                          {comparisonVariant.variation_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-28 text-xs  text-[#3c4f3d]/70">
                          Variant:
                        </span>
                        <span className="text-xs font-mono">
                          {(() => {
                            const match =
                              comparisonVariant.title.match(/(\w)>(\w)/);
                            if (match && match.length === 3) {
                              const [, ref, alt] = match;
                              return (
                                <>
                                  <span
                                    className={getNucleotideColorClass(ref!)}
                                  >
                                    {ref}
                                  </span>
                                  <span>{">"}</span>
                                  <span
                                    className={getNucleotideColorClass(alt!)}
                                  >
                                    {alt}
                                  </span>
                                </>
                              );
                            }
                            return comparisonVariant.title;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-28 text-xs  text-[#3c4f3d]/70">
                          ClinVar ID:
                        </span>
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${comparisonVariant.clinvar_id}`}
                          target="_blank"
                          className="text-xs text-[#ec7063] hover:underline"
                        >
                          {comparisonVariant.clinvar_id}
                        </a>
                        <ExternalLink className="ml-1 inline-block h-3 w-3 text-[#ec7063]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="">
                <h4 className="text-sm mb-3 font-medium text-[#3c4f3d]">
                  Analysis Comparison
                </h4>
                <div className="rounded-md border border-[#3c4f3d]/10 bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md bg-[#e9eeea]/90 p-4">
                      <h5 className="mb-2 flex items-center font-medium text-xs text-[#3c4f3d] gap-2">
                        <div className="flex items-center justify-center rounded-full h-5 w-5 bg-[#3c4f3d]/10">
                          <span className="rounded-full w-3 h-3 bg-[#3c4f3d]"></span>
                        </div>
                        ClinVar Assessment
                      </h5>
                      <div className="mt-2">
                        <div
                          className={`w-fit rounded-md px-2 py-1 text-xs font-normal ${getClassificationClasses(
                            comparisonVariant.classification
                          )}`}
                        >
                          {comparisonVariant.classification ||
                            "Unknown Significance"}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md bg-[#e9eeea]/50 p-4">
                      <h5 className="mb-2 flex items-center font-medium text-xs text-[#3c4f3d] gap-2">
                        <div className="flex items-center justify-center rounded-full h-5 w-5 bg-[#3c4f3d]/10">
                          <span className="rounded-full w-3 h-3 bg-[#de8246]"></span>
                        </div>
                        Evo2 Prediction
                      </h5>
                      <div className="mt-2">
                        <div
                          className={`w-fit flex items-center gap-1 rounded-md px-2 py-1 text-xs font-normal ${getClassificationClasses(
                            comparisonVariant.evo2Result.prediction
                          )}`}
                        >
                          <Shield
                            className={`inline-block h-3 w-3 mr-1 ${getClassificationClasses(
                              comparisonVariant.evo2Result.prediction
                            )}`}
                          />
                          {comparisonVariant.evo2Result.prediction}
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-[#3c4f3d]/70">
                          Delta Likelihood Score:
                        </div>
                        <div className="text-sm font-medium">
                          {comparisonVariant.evo2Result.delta_score.toFixed(6)}
                        </div>
                        <div className="text-xs text-[#3c4f3d]/60">
                          {comparisonVariant.evo2Result.delta_score < 0
                            ? "Negative score indicates loss of function"
                            : "Positive score indicates gain/neutral of function"}
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-[#3c4f3d]/70">
                          Confidence
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-[#e9eeea]/80">
                          <div
                            className={`h-2 rounded-full ${
                              comparisonVariant.evo2Result.prediction.includes(
                                "pathogenic"
                              )
                                ? "bg-red-600"
                                : "bg-green-600"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                comparisonVariant.evo2Result
                                  .classification_conf * 100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="mt-1 text-right text-xs text-[#3c4f3d]/60">
                          {Math.round(
                            comparisonVariant.evo2Result.classification_conf *
                              100
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-md p-3 text-xs leading-relaxed bg-[#e9eeea]/20">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          comparisonVariant.classification.toLowerCase() ===
                          comparisonVariant.evo2Result.prediction.toLowerCase()
                            ? "bg-green-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        {comparisonVariant.classification.toLowerCase() ===
                        comparisonVariant.evo2Result.prediction.toLowerCase() ? (
                          <Check className="w-3 h-3 text-green-600 " />
                        ) : (
                          <span className="flex h-3 w-3 items-center justify-center text-yellow-600">
                            <p>!</p>
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-[#3c4f3d]/70">
                        {comparisonVariant.classification.toLowerCase() ===
                        comparisonVariant.evo2Result.prediction.toLowerCase() ? (
                          <span>
                            Evo2 Prediction{" "}
                            <span className="underline text-green-500">
                              matches
                            </span>{" "}
                            with ClinVar Assessment
                          </span>
                        ) : (
                          <span>
                            Evo2 Prediction{" "}
                            <span className="underline text-red-500">
                              does not match
                            </span>{" "}
                            with ClinVar Assessment
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Modal Footer */}
        <div className="flex justify-end border-t border-[#3c4f3d]/10 p-4 bg-[#e9eeea]/30">
          <Button
            variant={"outline"}
            onClick={onClose}
            className="cursor-pointer bg-white border-[#3c4f3d]/10 text-[#3c4f3d] hover:bg-[#e9eeea]/70"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VariantComparison;
