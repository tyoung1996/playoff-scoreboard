import React, { useState, useEffect, useCallback } from 'react';

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

// Scoring rules from PDF
const rules = {
  // Offense
  passYards: 1 / 20,        // 1 pt per 20 yards passing
  rushYards: 1 / 10,        // 1 pt per 10 yards rushing
  recYards: 1 / 10,         // 1 pt per 10 yards receiving
  reception: 1,             // 1 pt per reception
  passTD: 6,                // 6 pts for TD pass
  rushTD: 6,                // 6 pts for rushing TD
  recTD: 6,                 // 6 pts for receiving TD
  twoPointConversion: 2,    // 2 pts for 2pt conversion
  // NO penalty for offensive turnovers
  
  // Kicker
  extraPoint: 1,            // 1 pt per XP
  fieldGoal: 3,             // 3 pts per FG
  fg50Plus: 5,              // 5 pts for 50+ yd FG (not bonus, full value)
  
  // Defense/ST
  sack: 2,                  // 2 pts per sack
  defenseINT: 2,            // 2 pts per INT recovery
  fumbleRecovery: 2,        // 2 pts per fumble recovery
  blockedKick: 1,           // 1 pt per blocked kick
  safety: 2,                // 2 pts per safety
  defenseTD: 6,             // 6 pts per defensive TD
  shutout: 10,              // 10 pts for shutout
};

// Team picks
const picks = [
  {
    user: "Tyler Young",
    players: [
      { name: "Trevor Lawrence", position: "QB", team: "JAX" },
      { name: "Zach Charbonnet", position: "RB", team: "SEA" },
      { name: "Bhayshul Tuten", position: "RB", team: "JAX" },
      { name: "Jaxon Smith-Njigba", position: "WR", team: "SEA" },
      { name: "Brian Thomas", position: "WR", team: "JAX" },
      { name: "Parker Washington", position: "WR", team: "JAX" },
      { name: "Brenton Strange", position: "TE", team: "JAX" },
      { name: "Jason Myers", position: "K", team: "SEA" },
      { name: "Seahawks", position: "DEF", team: "SEA" },
    ]
  },
  {
    user: "Emilie",
    players: [
      { name: "Drake Maye", position: "QB", team: "NE" },
      { name: "Kenneth Walker", position: "RB", team: "SEA" },
      { name: "Rhamondre Stevenson", position: "RB", team: "NE" },
      { name: "Rashid Shaheed", position: "WR", team: "SEA" },
      { name: "Cooper Kupp", position: "WR", team: "SEA" },
      { name: "DeMario Douglas", position: "WR", team: "NE" },
      { name: "AJ Barner", position: "TE", team: "SEA" },
      { name: "Andy Borregales", position: "K", team: "NE" },
      { name: "Seahawks", position: "DEF", team: "SEA" },
    ]
  }
];

// 2025-26 NFL Playoff date ranges
const playoffDateRanges = [
  { name: "Wild Card", dates: "20260111-20260114" },
  { name: "Divisional", dates: "20260117-20260120" },
  { name: "Conference Championships", dates: "20260125-20260127" },
  { name: "Super Bowl LX", dates: "20260208-20260210" },
];

// Normalize name for matching
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if two names match (handles partial matches)
function namesMatch(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;
  // Handle "Kenneth Walker III" vs "Kenneth Walker"
  if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
  // Handle first/last only
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  if (parts1.length >= 2 && parts2.length >= 2) {
    if (parts1[0] === parts2[0] && parts1[1] === parts2[1]) return true;
  }
  return false;
}

// Calculate player score with optional breakdown logging
function calculatePlayerScore(stats, playerName = '', shouldLog = false) {
  if (!stats) return 0;
  
  let score = 0;
  
  // Passing - 1 pt per 20 yards (floor)
  score += Math.floor((stats.passYards || 0) / 20);
  score += (stats.passTD || 0) * 6;
  
  // Rushing - 1 pt per 10 yards (floor)
  score += Math.floor((stats.rushYards || 0) / 10);
  score += (stats.rushTD || 0) * 6;
  
  // Receiving - 1 pt per 10 yards (floor), 1 pt per reception
  score += Math.floor((stats.recYards || 0) / 10);
  score += (stats.receptions || 0) * 1;
  score += (stats.recTD || 0) * 6;
  
  // Kicker
  score += (stats.extraPoints || 0) * 1;
  // Regular FGs get 3 pts, 50+ get 5 pts
  const regularFGs = Math.max(0, (stats.fieldGoals || 0) - (stats.fg50Plus || 0));
  score += regularFGs * 3;
  score += (stats.fg50Plus || 0) * 5;
  
  // Defense
  score += (stats.sacks || 0) * 2;
  score += (stats.defINT || 0) * 2;
  score += (stats.fumbleRec || 0) * 2;
  score += (stats.blockedKicks || 0) * 1;
  score += (stats.safeties || 0) * 2;
  score += (stats.defTD || 0) * 6;
  if (stats.shutout) score += 10;
  
  return score;
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    maxWidth: '100%',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
    color: 'white',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
    margin: 0,
  },
  maxWidth: {
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    padding: '0',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  card: {
    background: 'rgba(51, 65, 85, 0.5)',
    borderRadius: '12px',
    border: '1px solid #475569',
    marginBottom: '16px',
    overflow: 'hidden',
    width: '100%',
  },
  cardHeader: {
    padding: '20px',
    borderBottom: '1px solid #475569',
    fontWeight: 'bold',
    fontSize: '20px',
  },
  teamRow: {
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  teamRowHover: {
    background: 'rgba(71, 85, 105, 0.5)',
  },
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  rank: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '22px',
  },
  rank1: { background: '#eab308', color: '#713f12' },
  rank2: { background: '#94a3b8', color: '#1e293b' },
  score: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#4ade80',
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    margin: '6px 0',
    borderRadius: '8px',
    background: 'rgba(71, 85, 105, 0.5)',
  },
  playerRowNoData: {
    opacity: 0.5,
    background: 'rgba(30, 41, 59, 0.5)',
  },
  positionBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    marginRight: '12px',
  },
  posColors: {
    QB: { background: '#fee2e2', color: '#991b1b' },
    RB: { background: '#dbeafe', color: '#1e40af' },
    WR: { background: '#dcfce7', color: '#166534' },
    TE: { background: '#f3e8ff', color: '#7c3aed' },
    K: { background: '#fef9c3', color: '#854d0e' },
    DEF: { background: '#e5e7eb', color: '#374151' },
  },
  statsText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginRight: '16px',
  },
  playerScore: {
    fontWeight: 'bold',
    minWidth: '50px',
    textAlign: 'right',
  },
  button: {
    padding: '8px 16px',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  buttonDisabled: {
    background: '#475569',
    cursor: 'not-allowed',
  },
  logs: {
    maxHeight: '200px',
    overflow: 'auto',
    fontSize: '11px',
    color: '#64748b',
    fontFamily: 'monospace',
    padding: '8px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    marginTop: '8px',
  },
  error: {
    color: '#f87171',
    fontSize: '14px',
    marginTop: '8px',
  },
};

export default function LivePlayoffLeaderboard() {
  const [playerStats, setPlayerStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const addLog = (message, data = null) => {
    const logMsg = data ? `${message}: ${JSON.stringify(data)}` : message;
    setLogs(prev => [...prev.slice(-100), `${new Date().toLocaleTimeString()}: ${logMsg}`]);
    console.log(message, data || '');
  };

  const fetchPlayoffStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const allPlayerStats = {};
    const defenseStats = {};
    const processedGames = new Set(); // Track games we've already processed

    // Get all picked player names for logging
    const pickedNames = picks.flatMap(p => p.players.map(pl => pl.name.toLowerCase()));

    try {
      addLog("Starting ESPN data fetch...");

      for (const round of playoffDateRanges) {
        try {
          addLog(`Fetching ${round.name}: ${round.dates}`);
          
          const scoreboardRes = await fetch(`${ESPN_BASE}/scoreboard?dates=${round.dates}`);
          if (!scoreboardRes.ok) {
            addLog(`Scoreboard fetch failed: ${scoreboardRes.status}`);
            continue;
          }
          const scoreboard = await scoreboardRes.json();
          
          const events = (scoreboard.events || []).filter(e => e?.season?.type === 3);
          addLog(`Found ${events.length} postseason games`);

          for (const event of events) {
            const eventId = event.id?.toString();
            if (!eventId) continue;
            
            // Skip if we already processed this game
            if (processedGames.has(eventId)) {
              addLog(`SKIPPING duplicate game: ${eventId}`);
              continue;
            }
            processedGames.add(eventId);

            const gameName = event.name || event.shortName || eventId;
            addLog(`Processing game: ${gameName} (ID: ${eventId})`);

            try {
              const summaryRes = await fetch(`${ESPN_BASE}/summary?event=${eventId}`);
              if (!summaryRes.ok) continue;
              const summary = await summaryRes.json();

              // === SCORING PLAYS (DEF / ST TDs like kickoff & punt returns) ===
              const scoringPlays = summary?.scoringPlays || [];
              const competition = summary?.header?.competitions?.[0];
              const competitors = competition?.competitors || [];

              scoringPlays.forEach(play => {
                const playText = (play?.type?.text || play?.text || '').toLowerCase();
                const scoringTeamId = play?.team?.id;
                if (!scoringTeamId || competitors.length !== 2) return;

                const home = competitors.find(c => c.homeAway === 'home');
                const away = competitors.find(c => c.homeAway === 'away');

                if (!home || !away) return;

                let defTeamAbbr: string | null = null;

                // Defensive / Special Teams TD detection
                const isReturnTD =
                  playText.includes('kickoff return touchdown') ||
                  playText.includes('punt return touchdown') ||
                  playText.includes('interception return touchdown') ||
                  playText.includes('fumble return touchdown');

                if (!isReturnTD) return;

                if (home.team.id === scoringTeamId) {
                  defTeamAbbr = home.team.abbreviation?.toLowerCase();
                } else if (away.team.id === scoringTeamId) {
                  defTeamAbbr = away.team.abbreviation?.toLowerCase();
                }

                if (!defTeamAbbr) return;

                if (!defenseStats[defTeamAbbr]) {
                  defenseStats[defTeamAbbr] = {
                    sacks: 0,
                    defINT: 0,
                    fumbleRec: 0,
                    defTD: 0,
                    blockedKicks: 0,
                    safeties: 0,
                    pointsAllowed: 0,
                    gamesPlayed: 0,
                    processedStats: new Set(),
                  };
                }

                const key = `${defTeamAbbr}-${eventId}-return-td`;
                if (!defenseStats[defTeamAbbr].processedStats.has(key)) {
                  defenseStats[defTeamAbbr].processedStats.add(key);
                  defenseStats[defTeamAbbr].defTD += 1;
                  addLog(`[DEF TD] ${defTeamAbbr.toUpperCase()} return TD`);
                }
              });

              // ESPN has boxscore.players (array of team player groups)
              const boxscorePlayers = summary?.boxscore?.players || [];
              
              for (const teamGroup of boxscorePlayers) {
                const teamAbbr = teamGroup.team?.abbreviation || '';
                const teamName = teamGroup.team?.displayName || '';
                
                // Initialize defense stats
                const defKey = teamAbbr.toLowerCase();
                if (defKey && !defenseStats[defKey]) {
                  defenseStats[defKey] = {
                    sacks: 0, defINT: 0, fumbleRec: 0, defTD: 0,
                    blockedKicks: 0, safeties: 0,
                    pointsAllowed: 0, gamesPlayed: 0,
                    processedStats: new Set()// Track which games we've added PA for
                  };
                }

                // teamGroup.statistics contains stat categories
                const statCategories = teamGroup.statistics || [];
                
                // Log all categories for debugging
                const catNames = statCategories.map(c => c.name || c.type).join(', ');
                if (teamAbbr === 'SEA' || teamAbbr === 'NE') {
                  console.log(`[CATEGORIES] ${teamAbbr}:`, catNames);
                }
                
                for (const category of statCategories) {
                  const catName = category.name || category.type || '';
                  const labels = category.labels || [];
                  const athletes = category.athletes || [];

                  for (const athleteData of athletes) {
                    const athlete = athleteData.athlete || {};
                    const displayName = athlete.displayName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim();
                    const statValues = athleteData.stats || [];
                    
                    if (!displayName) continue;

                    // Build stat object from labels/values
                    const rawStats = {};
                    labels.forEach((label, idx) => {
                      rawStats[label] = statValues[idx];
                    });

                    // Initialize player stats
                    const nameKey = normalizeName(displayName);
                    if (!allPlayerStats[nameKey]) {
                      allPlayerStats[nameKey] = {
                        displayName,
                        team: teamAbbr,
                        passYards: 0, passTD: 0, interceptions: 0,
                        rushYards: 0, rushTD: 0,
                        recYards: 0, receptions: 0, recTD: 0,
                        fumbles: 0,
                        extraPoints: 0, fieldGoals: 0, fg50Plus: 0,
                        gamesPlayed: 0,
                        gameIds: [],
                        processedGames: new Set()// Track game+category to prevent duplicates
                      };
                    }

                    const ps = allPlayerStats[nameKey];
                    
                   
                    
                    // Track game IDs for game count
                    if (!ps.processedGames.has(eventId)) {
                      ps.processedGames.add(eventId);
                      ps.gameIds.push(eventId);
                      ps.gamesPlayed++;
                    }

                    // Parse stats based on category
                    if (catName === 'passing') {
                      const yds = parseFloat(rawStats['YDS']) || 0;
                      const td = parseFloat(rawStats['TD']) || 0;
                      if (teamAbbr === 'NE') console.log(`[NE PASSING] ${displayName} game ${eventId}: +${yds} yds, +${td} TD`);
                      ps.passYards += yds;
                      ps.passTD += td;
                      ps.interceptions += parseFloat(rawStats['INT']) || 0;
                    }
                    else if (catName === 'rushing') {
                      const yds = parseFloat(rawStats['YDS']) || 0;
                      const td = parseFloat(rawStats['TD']) || 0;
                      if (teamAbbr === 'NE') console.log(`[NE RUSHING] ${displayName} game ${eventId}: +${yds} yds, +${td} TD`);
                      if (teamAbbr === 'SEA') console.log(`[SEA RUSHING] ${displayName} game ${eventId}: +${yds} yds, +${td} TD`);
                      ps.rushYards += yds;
                      ps.rushTD += td;
                      ps.fumbles += parseFloat(rawStats['FUM']) || 0;
                    }
                    else if (catName === 'receiving') {
                      const rec = parseFloat(rawStats['REC']) || 0;
                      const yds = parseFloat(rawStats['YDS']) || 0;
                      const td = parseFloat(rawStats['TD']) || 0;
                      if (teamAbbr === 'NE') console.log(`[NE RECEIVING] ${displayName} game ${eventId}: +${rec} rec, +${yds} yds, +${td} TD`);
                      if (teamAbbr === 'SEA') console.log(`[SEA RECEIVING] ${displayName} game ${eventId}: +${rec} rec, +${yds} yds, +${td} TD`);
                      ps.recYards += yds;
                      ps.receptions += rec;
                      ps.recTD += td;
                    }
                    else if (catName === 'kicking') {
                      // FG format: "2/3" or just a number
                      const fgVal = rawStats['FG'];
                      let fgMade = 0;
                      if (typeof fgVal === 'string' && fgVal.includes('/')) {
                        fgMade = parseInt(fgVal.split('/')[0]) || 0;
                      } else {
                        fgMade = parseFloat(fgVal) || 0;
                      }
                      ps.fieldGoals += fgMade;
                      
                      // XP format similar
                      const xpVal = rawStats['XP'];
                      let xpMade = 0;
                      if (typeof xpVal === 'string' && xpVal.includes('/')) {
                        xpMade = parseInt(xpVal.split('/')[0]) || 0;
                      } else {
                        xpMade = parseFloat(xpVal) || 0;
                      }
                      ps.extraPoints += xpMade;
                      
                      if (teamAbbr === 'NE') console.log(`[NE KICKING] ${displayName} game ${eventId}: +${fgMade} FG, +${xpMade} XP`);
                      
                      // Long FG (support alternate ESPN label 'LNG')
                      const longFG =
                        parseFloat(rawStats['LONG']) ||
                        parseFloat(rawStats['LNG']) ||
                        0;
                      if (longFG >= 50 && fgMade > 0) {
                        ps.fg50Plus += 1;
                      }
                    }
                    else if (catName === 'defensive') {
                      // Log all defensive stat labels to see what ESPN provides
                      if (teamAbbr === 'SEA') console.log(`[SEA DEF STATS] ${displayName}:`, labels, rawStats);
                      
                      // Track per-player per-game defensive stats to prevent double-counting
                      const defStatKey = `${defKey}-${eventId}-${displayName}-defensive`;
                      if (defKey && !defenseStats[defKey].processedStats.has(defStatKey)) {
                        defenseStats[defKey].processedStats.add(defStatKey);
                        defenseStats[defKey].sacks += parseFloat(rawStats['SACKS']) || parseFloat(rawStats['SK']) || 0;
                        defenseStats[defKey].fumbleRec += parseFloat(rawStats['FR']) || parseFloat(rawStats['FF']) || 0;
                        defenseStats[defKey].defTD += parseFloat(rawStats['TD']) || 0;
                      }
                    }
                    else if (catName === 'interceptions') {
                      // This category should have actual INT stats
                      const defStatKey = `${defKey}-${eventId}-${displayName}-interceptions`;
                      if (defKey && !defenseStats[defKey].processedStats.has(defStatKey)) {
                        defenseStats[defKey].processedStats.add(defStatKey);
                        const intCount = parseFloat(rawStats['INT']) || 1; // If in this category, at least 1 INT
                        defenseStats[defKey].defINT += intCount;
                        console.log(`[DEF INT] ${teamAbbr} ${displayName}: +${intCount} INT`);
                      }
                    }
                    else if (catName === 'fumbles') {
                      // Track fumble recoveries
                      const defStatKey = `${defKey}-${eventId}-${displayName}-fumbles`;
                      if (defKey && !defenseStats[defKey].processedStats.has(defStatKey)) {
                        defenseStats[defKey].processedStats.add(defStatKey);
                        const frCount = parseFloat(rawStats['REC']) || parseFloat(rawStats['FR']) || 0;
                        if (frCount > 0) {
                          defenseStats[defKey].fumbleRec += frCount;
                          console.log(`[DEF FR] ${teamAbbr} ${displayName}: +${frCount} FR`);
                        }
                      }
                    }
                  }
                }

                // Get points allowed for defense from the competition score
                if (defKey) {
                  // Prevent double-counting PA
                  if (!defenseStats[defKey].processedStats.has(eventId)) {
                    const competition = event?.competitions?.[0];
                    const opponent = (competition?.competitors || []).find(
                      c => c.team?.abbreviation?.toLowerCase() !== defKey
                    );
                    if (opponent?.score) {
                      defenseStats[defKey].pointsAllowed += parseInt(opponent.score) || 0;
                      defenseStats[defKey].gamesPlayed += 1;
                      defenseStats[defKey].processedStats.add(eventId);
                    }
                  }
                }
              }
            } catch (gameErr) {
              addLog(`Error fetching game ${eventId}: ${gameErr.message}`);
            }
          }
        } catch (roundErr) {
          addLog(`Error in ${round.name}: ${roundErr.message}`);
        }
      }
      
      addLog(`Processed ${processedGames.size} unique games: ${Array.from(processedGames).join(', ')}`);
      addLog(`Defense stats collected:`, JSON.stringify(defenseStats));

      // Add defense stats with team name variations
      const teamNameMap = {
        'sea': ['seahawks', 'seattle seahawks'],
        'buf': ['bills', 'buffalo bills'],
        'kc': ['chiefs', 'kansas city chiefs'],
        'lar': ['rams', 'los angeles rams', 'la rams'],
        'phi': ['eagles', 'philadelphia eagles'],
        'det': ['lions', 'detroit lions'],
        'gb': ['packers', 'green bay packers'],
        'sf': ['49ers', 'san francisco 49ers', 'niners'],
        'den': ['broncos', 'denver broncos'],
        'hou': ['texans', 'houston texans'],
        'pit': ['steelers', 'pittsburgh steelers'],
        'ne': ['patriots', 'new england patriots'],
        'chi': ['bears', 'chicago bears'],
        'jax': ['jaguars', 'jacksonville jaguars'],
        'lac': ['chargers', 'los angeles chargers', 'la chargers'],
      };

      Object.entries(defenseStats).forEach(([abbr, stats]) => {
        const names = teamNameMap[abbr] || [abbr];
        names.forEach(name => {
          allPlayerStats[normalizeName(name)] = {
            ...stats,
            displayName: names[0].charAt(0).toUpperCase() + names[0].slice(1),
            isDefense: true,
            shutout: stats.pointsAllowed === 0 && stats.gamesPlayed > 0,
          };
        });
      });

      addLog(`Total players loaded: ${Object.keys(allPlayerStats).length}`);
      
      // Log which picked players were found
      pickedNames.forEach(pn => {
        const found = Object.keys(allPlayerStats).find(k => namesMatch(k, pn));
        addLog(`Pick "${pn}": ${found ? 'FOUND as ' + found : 'NOT FOUND'}`);
      });

      setPlayerStats(allPlayerStats);
      setLastUpdate(new Date());

    } catch (err) {
      setError(err.message);
      addLog(`Fatal error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayoffStats();
    
    const interval = setInterval(fetchPlayoffStats, 60000);
    return () => clearInterval(interval);
  }, [fetchPlayoffStats]);

  // Find stats for a player
  const findPlayerStats = (playerName) => {
    const normalized = normalizeName(playerName);
    // Direct match
    if (playerStats[normalized]) return playerStats[normalized];
    // Fuzzy match
    const key = Object.keys(playerStats).find(k => namesMatch(k, playerName));
    return key ? playerStats[key] : null;
  };

  // Calculate leaderboard
  const leaderboard = picks.map(team => {
    let totalScore = 0;
    const playerScores = team.players.map(player => {
      const stats = findPlayerStats(player.name);
      const score = calculatePlayerScore(stats, player.name, false);
      totalScore += score;
      return { ...player, stats, score, found: !!stats };
    });
    return { ...team, playerScores, totalScore };
  }).sort((a, b) => b.totalScore - a.totalScore);

  // Clean summary log for copy/paste
  useEffect(() => {
    if (Object.keys(playerStats).length === 0) return;
    
    let output = '\n=== SCORE SUMMARY ===\n';
    picks.forEach(team => {
      let teamTotal = 0;
      output += `\n${team.user}:\n`;
      team.players.forEach(p => {
        const stats = findPlayerStats(p.name) || {};
        const score = calculatePlayerScore(stats, p.name, false);
        teamTotal += score;
        const games = stats.gamesPlayed || 0;
        let details = '';
        if (p.position === 'QB') details = `[${games}g] passYds:${stats.passYards||0} passTD:${stats.passTD||0}`;
        else if (p.position === 'RB') details = `[${games}g] rushYds:${stats.rushYards||0} rushTD:${stats.rushTD||0} rec:${stats.receptions||0} recYds:${stats.recYards||0}`;
        else if (p.position === 'WR' || p.position === 'TE') details = `[${games}g] rec:${stats.receptions||0} recYds:${stats.recYards||0} recTD:${stats.recTD||0}`;
        else if (p.position === 'K') details = `[${games}g] FG:${stats.fieldGoals||0} XP:${stats.extraPoints||0} FG50:${stats.fg50Plus||0}`;
        else if (p.position === 'DEF') details = `[${games}g] sacks:${stats.sacks||0} INT:${stats.defINT||0} FR:${stats.fumbleRec||0} defTD:${stats.defTD||0} PA:${stats.pointsAllowed||0}`;
        output += `  ${p.name}: ${score} | ${details}\n`;
      });
      output += `  TOTAL: ${teamTotal}\n`;
    });
    output += '\n=== END ===';
    console.log(output);
  }, [playerStats]);

  const formatStat = (val) => val === undefined || val === null ? '-' : 
    (Number.isInteger(val) ? val : val.toFixed(1));

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🏈 2025-26 Playoff Fantasy Football</h1>
          <p style={styles.subtitle}>
            {loading ? '🔄 Loading live data from ESPN...' : 
              `Last updated: ${lastUpdate?.toLocaleTimeString() || 'Never'}`}
          </p>
          {error && <p style={styles.error}>Error: {error}</p>}
        </div>

        {/* Refresh Button */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <button
            onClick={fetchPlayoffStats}
            disabled={loading}
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Stats'}
          </button>
        </div>

        {/* Leaderboard */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>🏆 Leaderboard</div>
          {leaderboard.map((team, index) => (
            <div
              key={team.user}
              style={{
                ...styles.teamRow,
                ...(selectedUser === team.user ? styles.teamRowHover : {}),
              }}
              onClick={() => setSelectedUser(selectedUser === team.user ? null : team.user)}
            >
              <div style={styles.flexBetween}>
                <div style={styles.flexCenter}>
                  <div style={{
                    ...styles.rank,
                    ...(index === 0 ? styles.rank1 : index === 1 ? styles.rank2 : { background: '#92400e', color: '#fef3c7' })
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '18px' }}>{team.user}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                      {team.playerScores.filter(p => p.found).length}/{team.playerScores.length} players found
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.score}>{team.totalScore}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>points</div>
                </div>
              </div>

              {/* Player breakdown */}
              {selectedUser === team.user && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #475569' }}>
                  {team.playerScores.map(player => (
                    <div
                      key={player.name}
                      style={{
                        ...styles.playerRow,
                        ...(player.found ? {} : styles.playerRowNoData),
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          ...styles.positionBadge,
                          ...(styles.posColors[player.position] || styles.posColors.DEF)
                        }}>
                          {player.position}
                        </span>
                        <span style={{ fontWeight: '500' }}>{player.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                          {player.team}
                        </span>
                        {!player.found && (
                          <span style={{ fontSize: '11px', color: '#fb923c', marginLeft: '8px' }}>
                            NO DATA
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {player.stats && player.position === 'QB' && (
                          <span style={styles.statsText}>
                            {formatStat(player.stats.passYards)} yds ({Math.floor((player.stats.passYards || 0) / 20)}), {formatStat(player.stats.passTD)} TD ({(player.stats.passTD || 0) * 6})
                          </span>
                        )}
                        {player.stats && player.position === 'RB' && (
                          <span style={styles.statsText}>
                            {formatStat(player.stats.rushYards)} rush ({Math.floor((player.stats.rushYards || 0) / 10)}), {formatStat(player.stats.rushTD)} TD ({(player.stats.rushTD || 0) * 6}), {formatStat(player.stats.receptions)} rec, {formatStat(player.stats.recYards)} recYds ({Math.floor((player.stats.recYards || 0) / 10)})
                          </span>
                        )}
                        {player.stats && (player.position === 'WR' || player.position === 'TE') && (
                          <span style={styles.statsText}>
                            {formatStat(player.stats.receptions)} rec, {formatStat(player.stats.recYards)} yds ({Math.floor((player.stats.recYards || 0) / 10)}), {formatStat(player.stats.recTD)} TD ({(player.stats.recTD || 0) * 6})
                          </span>
                        )}
                        {player.stats && player.position === 'K' && (
                          <span style={styles.statsText}>
                            {formatStat(player.stats.fieldGoals)} FG, {formatStat(player.stats.extraPoints)} XP, {formatStat(player.stats.fg50Plus)} 50+
                          </span>
                        )}
                        {player.stats && player.position === 'DEF' && (
                          <span style={styles.statsText}>
                            {formatStat(player.stats.sacks)} sack, {formatStat(player.stats.defINT)} INT, {formatStat(player.stats.fumbleRec)} FR, PA:{formatStat(player.stats.pointsAllowed)}
                          </span>
                        )}
                        <span style={{
                          ...styles.playerScore,
                          color: player.score > 0 ? '#4ade80' : '#64748b'
                        }}>
                          {player.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Debug Logs */}
        <div style={styles.card}>
          <div 
            style={{ ...styles.cardHeader, cursor: 'pointer', fontSize: '14px' }}
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? '▼' : '▶'} Debug Logs ({logs.length} entries)
          </div>
          {showLogs && (
            <div style={styles.logs}>
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}
        </div>

        {/* Scoring Rules */}
        <div style={{ ...styles.card, padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px' }}>
            SCORING RULES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', fontSize: '13px' }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#fff' }}>Players Receive</div>
              <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                6 pts - TD (Pass/Rush/Rec)<br/>
                1 pt / 20 yds Passing<br/>
                1 pt / 10 yds Rush/Rec<br/>
                1 pt - Reception<br/>
                2 pts - 2pt Conversion
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#fff' }}>Kicking</div>
              <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                1 pt - Extra Point<br/>
                3 pts - Field Goal<br/>
                5 pts - 50+ yd FG
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#fff' }}>Defense/ST</div>
              <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                2 pts - Sack<br/>
                2 pts - INT/Fumble Rec<br/>
                1 pt - Blocked Kick<br/>
                2 pts - Safety<br/>
                6 pts - TD<br/>
                10 pts - Shutout
              </div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '16px' }}>
          Click a team to see player breakdown • Auto-refreshes every 60s
        </p>
      </div>
    </div>
  );
}