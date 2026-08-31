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
        className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-semibold text-encre">{titre}</h3>
        <p className="mb-6 text-sm text-texte-secondaire">{description}</p>
        <button
          type="button"
          onClick={onFermer}
          className="w-full rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
