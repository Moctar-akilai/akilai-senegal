"use client";

export function ModaleAVenir({
  ouvert,
  titre,
  description,
  onFermer,
}: {
  ouvert: boolean;
  titre: string;
  description: string;
  onFermer: () => void;
}) {
  if (!ouvert) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onFermer}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-semibold text-neutral-900">{titre}</h3>
        <p className="mb-6 text-sm text-neutral-600">{description}</p>
        <button
          type="button"
          onClick={onFermer}
          className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
