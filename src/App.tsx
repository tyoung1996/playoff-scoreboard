import { useEffect, useState } from "react";
import { fetchStats, fetchPlayers } from "./api";

function App() {
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const picks = await fetch(
        `${import.meta.env.BASE_URL}picks.json`
      ).then(r => r.json());

      const players = await fetchPlayers();

      const nameToId: Record<string, string> = {};
      Object.entries(players).forEach(([id, p]: any) => {
        if (p?.full_name) {
          nameToId[p.full_name.toLowerCase()] = id;
        }
      });

      // NFL playoff weeks on Sleeper are typically weeks 19–22
      const playoffWeeks = [19, 20, 21, 22];

      const statsById: Record<string, any> = {};

      for (const week of playoffWeeks) {
        try {
          const weekStats = await fetchStats(week);
          Object.entries(weekStats).forEach(([playerId, stat]) => {
            const safeStat = stat as Record<string, number>;
            statsById[playerId] = statsById[playerId]
              ? { ...statsById[playerId], ...safeStat }
              : safeStat;
          });
        } catch (e) {
          console.warn(`Stats not available for week ${week}`);
        }
      }

      const results = picks.map((p: any) => {
        let total = 0;
        p.players.forEach((name: string) => {
          const playerId = nameToId[name.toLowerCase()];
          if (!playerId) return;
          const playerStats = statsById[playerId];
          total += scorePlayer(playerStats);
        });

        return { user: p.user, total };
      });

      setScores(results.sort((a, b) => b.total - a.total));
    }

    load();
    const interval = setInterval(load, 60000); // auto-refresh
    return () => clearInterval(interval);
  }, []);

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