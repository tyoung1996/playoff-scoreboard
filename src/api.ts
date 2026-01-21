export async function fetchStats(week: number) {
  const res = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/2025/${week}`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Sleeper stats");
  }
  return res.json();
}