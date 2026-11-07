import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { data } from "@/data";
import { cn } from "@/lib/utils";
import { useLang, useTr } from "@/i18n";

const Turbofan = lazy(() => import("anatomy-figures/turbofan"));

const TOKENS = {
  "--anatomy-card": "#fafafa",
  "--anatomy-paper": "#fafafa",
  "--anatomy-lit": "#e5484d",
} as const;

const SHADOW_CSS = `
.iso-plate{padding:0!important;box-shadow:none!important;border:none!important;background:transparent!important;margin:0!important;width:100%!important}
.iso-plate-corners{display:none!important}
.iso-stage{cursor:ew-resize}
`;

const DETENTS = [
  { at: 1, label: "Take-off", fr: "Décollage" },
  { at: 0.8, label: "Climb", fr: "Montée" },
  { at: 0.6, label: "Cruise", fr: "Croisière" },
  { at: 0.3, label: "Approach", fr: "Approche" },
  { at: 0, label: "Idle", fr: "Ralenti" },
];

type Readout = { status: string; n1: number; thrust: number; tgt: number };

const PARSE = /^(.+?) · N1 ([\d.]+)% · (\d+) kN · TGT (-?\d+)°C/;

function useTurbofan() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement | null>(null);
  const [lever, setLeverState] = useState(0);
  const [readout, setReadout] = useState<Readout>({ status: "idle", n1: 21, thrust: 14, tgt: 367 });

  useEffect(() => {
    let stop = () => {};
    const timer = window.setInterval(() => {
      const root = host.current?.querySelector<HTMLElement>("[data-anatomy-figure]")?.shadowRoot;
      const st = root?.querySelector<HTMLElement>(".iso-stage");
      const out = root?.querySelector<HTMLElement>("[data-readout]");
      if (!root || !st || !out) return;
      window.clearInterval(timer);
      stage.current = st;

      if (!root.querySelector("style[data-site]")) {
        const style = document.createElement("style");
        style.dataset.site = "";
        style.textContent = SHADOW_CSS;
        root.append(style);
      }

      let frame = 0;
      const read = () => {
        frame = 0;
        const m = PARSE.exec(out.textContent ?? "");
        if (m) setReadout({ status: m[1], n1: Number(m[2]), thrust: Number(m[3]), tgt: Number(m[4]) });
        setLeverState(Number(st.getAttribute("aria-valuenow") ?? 0) / 100);
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(read);
      };
      const mo = new MutationObserver(schedule);
      mo.observe(out, { childList: true, characterData: true, subtree: true });
      mo.observe(st, { attributes: true, attributeFilter: ["aria-valuenow"] });
      read();
      stop = () => {
        mo.disconnect();
        cancelAnimationFrame(frame);
      };
    }, 120);
    return () => {
      window.clearInterval(timer);
      stop();
    };
  }, []);

  const setLever = useCallback((target: number) => {
    const st = stage.current;
    if (!st) return;
    const steps = Math.round(Math.min(1, Math.max(0, target)) * 10);
    const press = (key: string) => st.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    if (steps === 10) press("End");
    else {
      press("Home");
      for (let i = 0; i < steps; i++) press("ArrowRight");
    }
  }, []);

  return { host, lever, readout, setLever };
}

function Lever({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const tr = useTr();

  const fromPointer = (e: ReactPointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    const v = 1 - (e.clientY - r.top - 12) / (r.height - 24);
    onChange(Math.round(Math.min(1, Math.max(0, v)) * 10) / 10);
  };

  const top = (v: number) => `calc(12px + ${(1 - v) * 100}% - ${(1 - v) * 24}px)`;

  return (
    <div className="flex gap-4">
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={tr("Thrust lever", "Levier de poussée")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-orientation="vertical"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          const map: Record<string, number> = { ArrowUp: value + 0.1, ArrowRight: value + 0.1, ArrowDown: value - 0.1, ArrowLeft: value - 0.1, Home: 0, End: 1 };
          if (e.key in map) {
            e.preventDefault();
            onChange(Math.round(Math.min(1, Math.max(0, map[e.key])) * 10) / 10);
          }
        }}
        className="relative h-[232px] w-[46px] shrink-0 cursor-ns-resize touch-none rounded-[13px] border border-hair bg-white outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
      >
        <span className="absolute inset-y-[12px] left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-track" />
        <span
          className="absolute bottom-[12px] left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-t from-ink-2 to-red transition-[height] duration-200"
          style={{ height: `calc(${value * 100}% - ${value * 24}px)` }}
        />
        {DETENTS.map((d) => (
          <span key={d.at} className="absolute left-[7px] h-px w-[6px] bg-faint" style={{ top: top(d.at) }} />
        ))}
        <span
          className="absolute left-1/2 grid h-[18px] w-[38px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-ink bg-white shadow-[0_2px_6px_-1px_rgba(0,0,0,0.18)] transition-[top] duration-200 ease-out"
          style={{ top: top(value) }}
        >
          <span className="grid gap-[2px]">
            <span className="block h-px w-4 bg-faint" />
            <span className="block h-px w-4 bg-faint" />
          </span>
        </span>
      </div>
      <div className="relative h-[232px] flex-1">
        {DETENTS.map((d) => {
          const on = Math.abs(value - d.at) < 0.05;
          return (
            <button
              key={d.at}
              onClick={() => onChange(d.at)}
              className={cn(
                "absolute left-0 -translate-y-1/2 text-left text-[12px] whitespace-nowrap transition-colors",
                on ? "font-[550] text-ink" : "text-dim hover:text-ink",
              )}
              style={{ top: top(d.at) }}
            >
              {tr(d.label, d.fr)}
              <span className="num ml-1.5 text-[11px] text-faint">{Math.round(d.at * 100)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Meter({ label, value, unit, max, hot }: { label: string; value: number; unit: string; max: number; hot?: boolean }) {
  const lang = useLang();
  const share = Math.min(1, Math.max(0, value / max));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-dim">{label}</span>
        <span className="num text-[13px] text-ink">
          {value.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: unit === "%" ? 1 : 0 })}
          <span className="ml-0.5 text-[11px] text-faint">{unit}</span>
        </span>
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-track">
        <div
          className={cn("h-full rounded-full transition-[width] duration-150", hot ? "bg-red" : "bg-ink-2")}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  );
}

const FACTS = [
  { value: data.meta.engines, label: "engines flown until they broke", fr: "moteurs utilisés jusqu’à la panne" },
  { value: data.meta.trainRows, label: "flights recorded (1 cycle = 1 flight)", fr: "vols enregistrés (1 cycle = 1 vol)" },
  { value: 21, label: "sensors per flight", fr: "capteurs par vol" },
  { value: 1, label: "type of wear: compressor (HPC)", fr: "type d’usure : compresseur (HPC)" },
];

// États renvoyés par la figure du turboréacteur (en anglais) → français
const STATUS_FR: Record<string, string> = { idle: "ralenti", "spooling up": "montée en régime", "spooling down": "baisse de régime", running: "en marche", stable: "stable" };

export function Hero() {
  const { host, lever, readout, setLever } = useTurbofan();
  const moving = readout.status.startsWith("spooling");
  const lang = useLang();
  const tr = useTr();

  return (
    <section id="top" className="pt-16 sm:pt-24">
      <p className="text-[12px] text-dim">{tr("NASA C-MAPSS · subset FD001 · predictive maintenance", "NASA C-MAPSS · sous-ensemble FD001 · maintenance prédictive")}</p>
      <h1 className="mt-4 max-w-[640px] text-[32px] leading-[1.08] font-[520] tracking-[-0.035em] text-ink sm:text-[46px]">
        {tr(
          <>Will this engine fail <em className="serif">in the next 30&nbsp;flights</em>?</>,
          <>Ce moteur va-t-il lâcher <em className="serif">dans les 30&nbsp;prochains vols</em>&nbsp;?</>,
        )}
      </h1>
      <p className="mt-4 max-w-[520px] text-dim">
        {tr(
          <>We read the 21 sensors of a single flight and answer: <span className="text-ink">healthy</span>, or{" "}<span className="text-red">about to fail</span>. Try the engine first.</>,
          <>Nous lisons les 21 capteurs d’un seul vol et répondons : <span className="text-ink">sain</span>, ou{" "}<span className="text-red">sur le point de lâcher</span>. Essayez d’abord le moteur.</>,
        )}
      </p>

      <div className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_196px] md:gap-10">
        <div ref={host} className="mx-auto w-full max-w-[540px]">
          <Suspense fallback={<div className="aspect-[600/560] w-full" />}>
            <Turbofan theme="light" tokens={TOKENS} className="w-full" />
          </Suspense>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-6 md:grid-cols-1 md:gap-7">
          <div>
            <div className="mb-4 flex items-center justify-between text-[11px]">
              <span className="text-dim">{tr("Thrust lever", "Levier de poussée")}</span>
              <span className={cn("flex items-center gap-1.5", moving ? "text-red" : "text-faint")}>
                <span className={cn("size-1.5 rounded-full", moving ? "animate-pulse bg-red" : "bg-faint")} />
                {lang === "fr" ? (STATUS_FR[readout.status] ?? readout.status) : readout.status}
              </span>
            </div>
            <Lever value={lever} onChange={setLever} />
          </div>
          <div className="grid content-start gap-4">
            <Meter label={tr("Fan speed N1", "Régime soufflante N1")} value={readout.n1} unit="%" max={100} />
            <Meter label={tr("Thrust", "Poussée")} value={readout.thrust} unit="kN" max={334} />
            <Meter label={tr("Turbine gas temp.", "Temp. gaz turbine")} value={readout.tgt} unit="°C" max={1000} hot={readout.tgt > 800} />
          </div>
        </div>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-y-6 border-t border-hair pt-6 sm:grid-cols-4">
        {FACTS.map((fact) => (
          <div key={fact.label}>
            <dt className="mono text-[22px] text-ink">{fact.value.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}</dt>
            <dd className="text-[12px] text-dim">{tr(fact.label, fact.fr)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
