/**
 * Point d'entrée du site C-MAPSS embarqué dans l'étude de cas.
 * Code d'origine : dossier website/ du dépôt du projet (Daniil Hirchyts & Mattéo Louet).
 * Les éléments fixes (navigation latérale, dock) ne s'affichent que lorsque le site est à l'écran.
 */
import "@fontsource-variable/host-grotesk";
import "@fontsource-variable/martian-mono/standard.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "./fd001.css";

import { useEffect, useRef, useState } from "react";
import App from "./App";
import { LangProvider, type Lang } from "./i18n";

export default function Fd001({ lang = "en" }: { lang?: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // visible si le site occupe le milieu de l'écran (calcul au scroll, robuste partout)
    const update = () => {
      const r = el.getBoundingClientRect();
      const mid = window.innerHeight / 2;
      setLive(r.top < mid && r.bottom > mid);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div ref={ref} className={"fd001" + (live ? " is-live" : "")}>
      <LangProvider lang={lang}>
        <App />
      </LangProvider>
    </div>
  );
}
