import { ReferenceLine } from "recharts";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import { ChartTooltip } from "@/components/evilcharts/ui/recharts-tooltip";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { data, pct } from "@/data";
import { Legend, Plate, Swatch } from "./Plate";
import { useTr } from "@/i18n";

const W = data.meta.window;
const rows = data.lifetimes.map((e) => ({ unit: `#${e.unit}`, healthy: e.life - W, warning: W, life: e.life }));
const lives = data.lifetimes.map((e) => e.life);
const sorted = [...lives].sort((a, b) => a - b);
const median = Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);

const makeConfig = (tr: <T,>(en: T, fr: T) => T) =>
  ({
    healthy: { label: tr("Healthy (y = 0)", "Sain (y = 0)"), colors: { light: ["#d4d4d4"] } },
    warning: { label: tr(`Last ${W} cycles (y = 1)`, `${W} derniers cycles (y = 1)`), colors: { light: ["#e5484d"] } },
  }) satisfies ChartConfig;

type Row = (typeof rows)[number];

function LifeTip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const tr = useTr();
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-tile border border-hair bg-white px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-ink">{tr("Engine", "Moteur")} {row.unit}</div>
      <div className="num text-dim">{row.life} {tr("flights until it broke", "vols avant la panne")}</div>
    </div>
  );
}

export function Lives() {
  const tr = useTr();
  return (
    <Plate
      id="label"
      n="02"
      kicker={tr("Label", "Étiquette")}
      title={
        <>
          {tr(<>What the model <em className="serif">has to predict</em>.</>, <>Ce que le modèle <em className="serif">doit prédire</em>.</>)}
        </>
      }
      caption={tr(`Each bar is one engine, from its first flight until it broke. Its last ${W} flights are labelled “about to fail” (red), all the others “healthy”.`, `Chaque barre est un moteur, de son premier vol à sa panne. Ses ${W} derniers vols sont étiquetés « sur le point de lâcher » (rouge), tous les autres « sain ».`)}
    >
      <div className="h-[260px] w-full sm:h-[300px]">
        <EvilBarChart
          data={rows}
          config={makeConfig(tr)}
          stackType="stacked"
          barRadius={1}
          barCategoryGap={1}
          animationType="left-to-right"
          className="aspect-auto h-full w-full"
          chartProps={{ margin: { top: 16, right: 4, bottom: 0, left: 4 } }}
        >
          <EvilBarChart.XAxis dataKey="unit" hide />
          <EvilBarChart.YAxis
            ticks={[0, 100, 200, 300]}
            domain={[0, 370]}
            width={36}
            tickFormatter={(v: number) => String(v)}
          />
          <EvilBarChart.Grid vertical={false} horizontal strokeDasharray="2 4" stroke="var(--hair)" />
          <ChartTooltip cursor={false} content={<LifeTip />} />
          <ReferenceLine
            y={median}
            stroke="var(--ink-2)"
            strokeDasharray="3 3"
            strokeWidth={0.8}
            label={{ value: tr(`median ${median}`, `médiane ${median}`), position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }}
          />
          <EvilBarChart.Bar dataKey="healthy" />
          <EvilBarChart.Bar dataKey="warning" />
        </EvilBarChart>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <Legend
          items={[
            { swatch: <Swatch color="#d4d4d4" />, label: tr("healthy", "sain") },
            { swatch: <Swatch color="var(--red)" />, label: tr(`last ${W} flights: about to fail`, `${W} derniers vols : sur le point de lâcher`) },
          ]}
        />
        <div className="num flex gap-6 text-[12px] text-dim">
          <span>
            <span className="text-ink">{Math.min(...lives)}</span> {tr("to", "à")} <span className="text-ink">{Math.max(...lives)}</span> {tr("flights per engine", "vols par moteur")}
          </span>
          <span>
            {tr("only", "seulement")} <span className="text-red">{pct(data.meta.positiveShare)}</span> {tr("of flights are red", "des vols sont rouges")}
          </span>
        </div>
      </div>
    </Plate>
  );
}
