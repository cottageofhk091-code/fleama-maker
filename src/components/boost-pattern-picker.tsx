"use client";

import { RECOMMENDED_BADGE } from "@/lib/boost-patterns";
import type { BoostPattern, BoostPatternId } from "@/lib/types";

type Props = {
  patterns: BoostPattern[];
  selectedId: BoostPatternId;
  onSelect: (id: BoostPatternId) => void;
};

export function BoostPatternPicker({
  patterns,
  selectedId,
  onSelect,
}: Props) {
  if (patterns.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          販促ブースト文（3パターン）
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          切り口の違う3案から、ワンタップで説明文に採用する1つを選べます
        </p>
      </div>
      <ul className="space-y-2.5">
        {patterns.map((p) => {
          const active = selectedId === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition ${
                  active
                    ? "border-teal-600 bg-teal-50 ring-2 ring-teal-500/25 dark:border-teal-500 dark:bg-teal-950/40"
                    : "border-slate-200 bg-white hover:border-teal-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-700"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {p.label}
                  </span>
                  <span className="text-[10px] text-slate-500">{p.angle}</span>
                  {p.recommended && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {RECOMMENDED_BADGE}
                    </span>
                  )}
                  {active && (
                    <span className="ml-auto text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                      選択中
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {p.comment}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
