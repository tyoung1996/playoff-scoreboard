import { useEffect, useState } from "react";
import { fetchStats } from "./api";
import { scorePlayer } from "./scorer";

function App() {
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const picks = await fetch("/picks.json").then(r => r.json());
      const stats = await fetchStats();

      const results = picks.map((p: any) => {
        let total = 0;
        p.players.forEach((name: string) => {
          const playerStats = stats[name];
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