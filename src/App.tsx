/**
 * src/App.tsx
 *
 * Renders your playoff leaderboard using ESPN’s API
 * and scoring rules from scorePlayer.
 */

import { useEffect, useState } from "react";
import { fetchScoreboardByDates, fetchSummary } from "./api";

// Scoring engine (your existing logic)
function scorePlayer(stats: any) {
  if (!stats) return 0;

  return (
    (stats.passYards ?? 0) * (1 / 20) +
    (stats.rushYards ?? 0) * (1 / 10) +
    (stats.recYards ?? 0) * (1 / 10) +
    (stats.receptions ?? 0) * 1 +
    (stats.passTD ?? 0) * 6 +
    (stats.rushTD ?? 0) * 6 +
    (stats.recTD ?? 0) * 6 +
    (stats.interceptions ?? 0) * -2 +
    (stats.fumbles ?? 0) * -2
  );
}

// Helper to merge stats from multiple games
function mergeStats(a: any, b: any) {
  const out: any = { ...a };
  Object.keys(b || {}).forEach((key) => {
    if (typeof b[key] === "number") {
      out[key] = (out[key] || 0) + b[key];
    }
  });
  return out;
}

function App() {
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      // 1) Load picks.json
      const picks = await fetch(
        `${import.meta.env.BASE_URL}picks.json`
      ).then((r) => r.json());

      // 2) Date ranges covering playoff games (adjust if needed)
      const playoffDateRanges = [
        "20250113-20250114", // Wild Card
        "20250118-20250118", // Divisional round
        "20250125-20250125", // Conference championships
        "20250202-20250202", // Super Bowl
      ];

      // Collect stats aggregated by player name
      const statsByName: Record<string, any> = {};

      for (const dates of playoffDateRanges) {
        try {
          // Fetch scoreboard for this range
          const scoreboard = await fetchScoreboardByDates(dates);
          const events = scoreboard.events || [];

          // For each game, fetch summary (boxscore + players)
          for (const event of events) {
            const eventId = event.id?.toString();
            if (!eventId) continue;

            const summary = await fetchSummary(eventId);

            // ESPN summary → boxscore → teams → players → statistics → athletes
            const teams = summary?.boxscore?.teams || [];

            for (const team of teams) {
              const playerGroups = team.players || [];

              for (const group of playerGroups) {
                const statGroups = group.statistics || [];

                for (const statGroup of statGroups) {
                  const labels: string[] = statGroup.labels || [];
                  const athletes = statGroup.athletes || [];

                  for (const a of athletes) {
                    const person = a.athlete;
                    if (!person) continue;

                    const name =
                      `${person.firstName} ${person.lastName}`.toLowerCase();

                    const values = a.stats || [];
                    const rawStats: Record<string, number> = {};

                    labels.forEach((label, idx) => {
                      rawStats[label] = Number(values[idx]) || 0;
                    });

                    // Map ESPN labels → scoring fields
                    const statsMapped = {
                      passYards: rawStats["passingYards"],
                      rushYards: rawStats["rushingYards"],
                      recYards: rawStats["receivingYards"],
                      receptions: rawStats["receptions"],
                      passTD: rawStats["passingTouchdowns"],
                      rushTD: rawStats["rushingTouchdowns"],
                      recTD: rawStats["receivingTouchdowns"],
                      interceptions: rawStats["interceptions"],
                      fumbles: rawStats["fumblesLost"],
                    };

                    statsByName[name] = statsByName[name]
                      ? mergeStats(statsByName[name], statsMapped)
                      : statsMapped;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("ESPN data not available for dates:", dates, e);
        }
      }

      // 3) Compute leaderboard scores
      const results = picks.map((p: any) => {
        let total = 0;
        p.players.forEach((name: string) => {
          const stats = statsByName[name.toLowerCase()];
          total += scorePlayer(stats);
        });
        return { user: p.user, total };
      });

      // Sort descending
      setScores(results.sort((a, b) => b.total - a.total));
    }

    // Kick off load
    load();
    // Optional auto-refresh
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Render
  return (
    <div style={{ padding: 20 }}>
      <h1>🏈 Playoff Leaderboard</h1>
      {scores.map((s, i) => (
        <div key={s.user}>
          {i + 1}. {s.user} — {s.total.toFixed(2)}
        </div>
      ))}
    </div>
  );
}

export default App;