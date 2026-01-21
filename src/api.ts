export async function fetchStats() {
    const res = await fetch(
      "https://api.sleeper.app/v1/stats/nfl/2025"
    );
    return res.json();
  }