const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

// Fetch NFL scoreboard for a specific date range
export async function fetchScoreboardByDates(dates: string) {
  const res = await fetch(
    `${ESPN_BASE}/scoreboard?dates=${dates}`
  );
  if (!res.ok) throw new Error("Failed to fetch ESPN scoreboard");
  return res.json();
}

// Fetch detailed summary (boxscore + stats) for one game
export async function fetchSummary(eventId: string) {
  const res = await fetch(`${ESPN_BASE}/summary?event=${eventId}`);
  if (!res.ok) throw new Error("Failed to fetch ESPN game summary");
  return res.json();
}