import { rules } from "./rules";

export function scorePlayer(stats: any) {
  if (!stats) return 0;

  return (
    (stats.pass_yd ?? 0) * rules.passYards +
    (stats.rush_yd ?? 0) * rules.rushYards +
    (stats.rec_yd ?? 0) * rules.recYards +
    (stats.rec ?? 0) * rules.reception +
    (stats.pass_td ?? 0) * rules.passTD +
    (stats.rush_td ?? 0) * rules.rushTD +
    (stats.rec_td ?? 0) * rules.recTD +
    (stats.int ?? 0) * rules.interception
  );
}