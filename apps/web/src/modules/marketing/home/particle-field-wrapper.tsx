"use client";

import dynamic from "next/dynamic";

const ParticleField = dynamic(
  () =>
    import("~/modules/marketing/home/particle-field").then(
      (mod) => mod.ParticleField,
    ),
  { ssr: false },
);

export function ParticleFieldWrapper() {
  return <ParticleField />;
}
