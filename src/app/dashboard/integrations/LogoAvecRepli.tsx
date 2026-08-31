"use client";

import { useState } from "react";

// Affiche le logo à l'emplacement `src` (public/logos/...) et retombe sur
// un badge à initiales si le fichier n'existe pas encore (onError) — un
// <img> avec un gestionnaire d'événement doit être un composant client,
// donc partagé ici plutôt que dupliqué dans chaque carte.
export function LogoAvecRepli({
  src,
  initiales,
  repliClassName = "bg-bordure text-texte-secondaire",
}: {
  src: string;
  initiales: string;
  repliClassName?: string;
}) {
  const [enErreur, setEnErreur] = useState(false);

  if (enErreur) {
    return (
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${repliClassName}`}
      >
        {initiales}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos externes optionnels, pas encore tous présents dans public/logos.
    <img
      src={src}
      alt=""
      className="h-9 w-9 shrink-0 rounded-full border border-bordure object-contain"
      onError={() => setEnErreur(true)}
    />
  );
}
