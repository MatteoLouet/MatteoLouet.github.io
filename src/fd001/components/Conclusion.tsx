import { confusion, data, verdictOf } from "@/data";
import { Plate } from "./Plate";
import { useTr } from "@/i18n";

const at = confusion(data.threshold.chosen);
const near = Math.max(
  ...data.test.filter((e) => ["missed", "false alarm"].includes(verdictOf(e, data.threshold.chosen))).map((e) => Math.abs(e.rul - data.meta.window)),
);

export function Conclusion() {
  const tr = useTr();
  return (
    <Plate
      id="conclusion"
      n="12"
      kicker={tr("Conclusion", "Conclusion")}
      title={
        <>
          {tr(<>Yes: the sensors of one flight are <em className="serif">enough to warn</em>.</>, <>Oui : les capteurs d’un seul vol <em className="serif">suffisent à prévenir</em>.</>)}
        </>
      }
      caption={tr("A simple, readable model catches most failures before they happen, with few false alarms, and its few mistakes are near misses.", "Un modèle simple et lisible détecte la plupart des pannes avant qu’elles n’arrivent, avec peu de fausses alarmes, et ses rares erreurs sont à un cheveu.")}
    >
      <div className="grid gap-px overflow-hidden rounded-card border border-hair bg-hair sm:grid-cols-3">
        <Big value={tr(`${at.counts.detected} of 25`, `${at.counts.detected} sur 25`)} label={tr("engines about to fail were caught", "moteurs en fin de vie ont été détectés")} tone="text-red" />
        <Big value={tr(`${at.counts["false alarm"]} of 75`, `${at.counts["false alarm"]} sur 75`)} label={tr("healthy engines raised a false alarm", "moteurs sains ont déclenché une fausse alarme")} />
        <Big value={`≤ ${near}`} label={tr("flights from the 30-flight line: the size of every mistake", "vols de la ligne des 30 vols : l’ampleur de chaque erreur")} />
      </div>

    </Plate>
  );
}

function Big({ value, label, tone = "text-ink" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="bg-white p-5">
      <div className={`mono text-[30px] leading-none ${tone}`}>{value}</div>
      <div className="mt-2 text-[12px] leading-snug text-dim">{label}</div>
    </div>
  );
}
