import { useEffect, useState } from "react";

export function useElementById(id: string) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById(id));
  }, [id]);
  return el;
}
