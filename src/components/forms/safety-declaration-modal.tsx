"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/services/api-client";

type DeclarationCategory = { key: string; label: string };
type DeclarationContent = { version: string; categories: DeclarationCategory[]; liabilityText: string };

// Fallback used only if the live /v1/legal/parcel-declaration fetch fails —
// the backend re-validates declarationVersion and every category regardless,
// so this never bypasses server-side enforcement.
const FALLBACK_CONTENT: DeclarationContent = {
  version: "v1",
  categories: [
    { key: "noNarcotics", label: "Narcotics or other controlled substances" },
    { key: "noWeapons", label: "Weapons, ammunition, or explosives" },
    { key: "noCashInstruments", label: "Cash or bearer financial instruments above the platform limit" },
    { key: "noLiveAnimals", label: "Live animals" },
    { key: "noHazmat", label: "Hazardous, flammable, or toxic materials" },
    { key: "noCounterfeitGoods", label: "Counterfeit goods" },
    { key: "noOtherProhibited", label: "Anything else prohibited by law" },
  ],
  liabilityText:
    "By submitting this declaration you confirm, item by item, that this shipment does not contain any of the categories above. Shipping a prohibited or illegal item through Trickle can carry criminal and civil liability under applicable law, in addition to any platform consequences. Trickle will provide available records — including this declaration — to law enforcement upon lawful request.",
};

export type SafetyDeclaration = Record<string, boolean | string>;

export function SafetyDeclarationModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (declaration: SafetyDeclaration) => void;
}) {
  const [content, setContent] = useState<DeclarationContent>(FALLBACK_CONTENT);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setChecked({});
      setLoading(true);
    });
    apiRequest<{ data?: DeclarationContent } | DeclarationContent>("/v1/legal/parcel-declaration")
      .then((response) => {
        const data: DeclarationContent | undefined = "data" in response ? response.data : (response as DeclarationContent);
        if (data?.categories?.length) setContent(data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const allChecked = content.categories.every((category) => checked[category.key]);
  const confirm = () => {
    if (!allChecked) return;
    const declaration: SafetyDeclaration = { declarationVersion: content.version };
    content.categories.forEach((category) => {
      declaration[category.key] = true;
    });
    onConfirm(declaration);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1d1c]/50 p-4" onClick={onCancel}>
      <div className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl border-t-4 border-[#e85b43] bg-white p-6" onClick={(event) => event.stopPropagation()}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Required before you send</p>
        <h2 className="mt-2 text-xl font-semibold text-[#183b3a]">Confirm what&apos;s in this parcel</h2>
        <p className="mt-2 text-sm leading-6 text-[#62645f]">
          Check each item to confirm your parcel does not contain it. Every box is a specific declaration about this shipment, recorded with your request.
        </p>
        {loading ? (
          <p className="mt-6 text-sm text-[#62645f]">Loading declaration...</p>
        ) : (
          <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
            {content.categories.map((category) => (
              <label key={category.key} className="flex cursor-pointer items-start gap-3 py-2 text-sm text-[#183b3a]">
                <input
                  type="checkbox"
                  checked={Boolean(checked[category.key])}
                  onChange={() => setChecked((current) => ({ ...current, [category.key]: !current[category.key] }))}
                  className="mt-0.5"
                />
                <span>This parcel does not contain: {category.label}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-4 border-t border-[#eee9e1] pt-3 text-xs leading-5 text-[#62645f]">{content.liabilityText}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-[#d7d2c9] py-3 text-sm font-semibold text-[#183b3a]">
            Cancel
          </button>
          <button
            type="button"
            disabled={!allChecked}
            onClick={confirm}
            className="flex-[1.4] rounded-xl bg-[#0f6e56] py-3 text-sm font-semibold text-white disabled:bg-[#d8deea] disabled:text-[#8991a3]"
          >
            I confirm — send request
          </button>
        </div>
      </div>
    </div>
  );
}
