// Tournament core logic: seed data, standings calculation, bracket sync
import { v4 as uuidv4 } from 'uuid';

export const GROUPS = {
  A: ['Gangtok FC', 'Dhondupling Legen', 'USA'],
  B: ['Phuntsokling Orissa', 'Norbulingka Nepal', 'TDL PANO'],
  C: ['Rawangla', 'Dickyling SC', 'Delhi'],
  D: ['Happy FC', 'Baluwala', 'Hunsur'],
  E: ['Maio', 'Drabche Shelong', 'DYSA Mundgod'],
  F: ['Darjeeling', 'Donta Chelsum', 'EU United'],
  G: ['Dhaola', 'Phurithang FC', 'Kollegal United'],
  H: ['TDL', 'Canada Sangey', 'Dhondenling SC'],
};

// Knockout pairings: group winners meet in QF
export const QF_PAIRINGS = [
  { slot: 'QF1', groupA: 'A', groupB: 'H' },
  { slot: 'QF2', groupA: 'B', groupB: 'G' },
  { slot: 'QF3', groupA: 'C', groupB: 'F' },
  { slot: 'QF4', groupA: 'D', groupB: 'E' },
];

export const SF_PAIRINGS = [
  { slot: 'SF1', from: ['QF1', 'QF2'] },
  { slot: 'SF2', from: ['QF3', 'QF4'] },
];

export const FINAL_PAIRING = { slot: 'FINAL', from: ['SF1', 'SF2'] };

function makeMatch({ teamA, teamB, type, group = null, slot = null, dayOffset = 0, hour = 9 }) {
  const start = new Date('2026-01-15T00:00:00Z');
  start.setUTCDate(start.getUTCDate() + dayOffset);
  start.setUTCHours(hour, 0, 0, 0);
  return {
    id: uuidv4(),
    teamA,
    teamB,
    scoreA: null,
    scoreB: null,
    status: 'scheduled',
    type,
    group,
    slot,
    date: start.toISOString(),
  };
}

export function buildSeedData() {
  const teams = [];
  const matches = [];
  let dayOffset = 0;
  let hour = 9;

  // Build teams
  for (const [g, names] of Object.entries(GROUPS)) {
    for (const n of names) teams.push({ id: uuidv4(), name: n, group: g });
  }

  // Group stage round-robin (3 teams = 3 matches per group)
  for (const [g, names] of Object.entries(GROUPS)) {
    const pairs = [
      [names[0], names[1]],
      [names[1], names[2]],
      [names[0], names[2]],
    ];
    for (const [a, b] of pairs) {
      matches.push(makeMatch({ teamA: a, teamB: b, type: 'group', group: g, dayOffset, hour }));
      hour += 2;
      if (hour >= 17) { hour = 9; dayOffset += 1; }
    }
  }

  // Knockout placeholders
  let koDay = dayOffset + 1;
  for (const p of QF_PAIRINGS) {
    matches.push(makeMatch({ teamA: `Winner ${p.groupA}`, teamB: `Winner ${p.groupB}`, type: 'QF', slot: p.slot, dayOffset: koDay, hour: 9 + matches.filter(m => m.type === 'QF').length * 2 }));
  }
  for (const p of SF_PAIRINGS) {
    matches.push(makeMatch({ teamA: `Winner ${p.from[0]}`, teamB: `Winner ${p.from[1]}`, type: 'SF', slot: p.slot, dayOffset: koDay + 1, hour: 11 + matches.filter(m => m.type === 'SF').length * 4 }));
  }
  matches.push(makeMatch({ teamA: `Winner ${FINAL_PAIRING.from[0]}`, teamB: `Winner ${FINAL_PAIRING.from[1]}`, type: 'FINAL', slot: 'FINAL', dayOffset: koDay + 2, hour: 15 }));

  return { teams, matches };
}

// Compute standings for a group based on completed matches
// teamsByGroup: optional map { groupLetter: [teamName, ...] } - if not provided uses GROUPS constant
export function computeGroupStandings(groupLetter, matches, teamsByGroup = null) {
  const teams = (teamsByGroup && teamsByGroup[groupLetter]) || GROUPS[groupLetter] || [];
  const stats = {};
  for (const t of teams) {
    stats[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  }
  for (const m of matches) {
    if (m.type !== 'group' || m.group !== groupLetter || m.status !== 'completed') continue;
    if (!stats[m.teamA] || !stats[m.teamB]) continue;
    const a = stats[m.teamA];
    const b = stats[m.teamB];
    a.played += 1; b.played += 1;
    a.gf += m.scoreA; a.ga += m.scoreB;
    b.gf += m.scoreB; b.ga += m.scoreA;
    if (m.scoreA > m.scoreB) { a.won += 1; b.lost += 1; a.points += 3; }
    else if (m.scoreA < m.scoreB) { b.won += 1; a.lost += 1; b.points += 3; }
    else { a.drawn += 1; b.drawn += 1; a.points += 1; b.points += 1; }
  }
  for (const t of Object.values(stats)) t.gd = t.gf - t.ga;
  return Object.values(stats).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });
}

export function computeAllStandings(matches, teamsByGroup = null) {
  const out = {};
  for (const g of Object.keys(GROUPS)) out[g] = computeGroupStandings(g, matches, teamsByGroup);
  return out;
}

// Get group winner (only if all 3 matches completed)
export function getGroupWinner(groupLetter, matches, teamsByGroup = null) {
  const groupMatches = matches.filter(m => m.type === 'group' && m.group === groupLetter);
  const completed = groupMatches.filter(m => m.status === 'completed');
  if (completed.length < 3) return null;
  const standings = computeGroupStandings(groupLetter, matches, teamsByGroup);
  return standings[0]?.team || null;
}

// Get winner of a knockout match by slot. Handles penalty shootouts on draws.
export function getSlotWinner(slot, matches) {
  const m = matches.find(x => x.slot === slot);
  if (!m || m.status !== 'completed') return null;
  if (m.scoreA > m.scoreB) return m.teamA;
  if (m.scoreB > m.scoreA) return m.teamB;
  // Tied after regulation/extra time - check penalty shootout
  if (m.penaltyScoreA != null && m.penaltyScoreB != null) {
    if (m.penaltyScoreA > m.penaltyScoreB) return m.teamA;
    if (m.penaltyScoreB > m.penaltyScoreA) return m.teamB;
  }
  return null;
}

// Recompute knockout bracket teams based on completed group/QF/SF matches
export function syncBracket(matches, teamsByGroup = null) {
  // Returns updated matches array
  const updated = matches.map(m => ({ ...m }));

  // QF: fill from group winners
  for (const p of QF_PAIRINGS) {
    const qf = updated.find(m => m.slot === p.slot);
    if (!qf) continue;
    const winA = getGroupWinner(p.groupA, updated, teamsByGroup);
    const winB = getGroupWinner(p.groupB, updated, teamsByGroup);
    const newA = winA || `Winner ${p.groupA}`;
    const newB = winB || `Winner ${p.groupB}`;
    if (qf.status !== 'completed') {
      qf.teamA = newA;
      qf.teamB = newB;
    }
  }

  // SF: fill from QF winners
  for (const p of SF_PAIRINGS) {
    const sf = updated.find(m => m.slot === p.slot);
    if (!sf) continue;
    const w0 = getSlotWinner(p.from[0], updated);
    const w1 = getSlotWinner(p.from[1], updated);
    const newA = w0 || `Winner ${p.from[0]}`;
    const newB = w1 || `Winner ${p.from[1]}`;
    if (sf.status !== 'completed') {
      sf.teamA = newA;
      sf.teamB = newB;
    }
  }

  // FINAL
  const fin = updated.find(m => m.slot === 'FINAL');
  if (fin) {
    const w0 = getSlotWinner(FINAL_PAIRING.from[0], updated);
    const w1 = getSlotWinner(FINAL_PAIRING.from[1], updated);
    if (fin.status !== 'completed') {
      fin.teamA = w0 || `Winner ${FINAL_PAIRING.from[0]}`;
      fin.teamB = w1 || `Winner ${FINAL_PAIRING.from[1]}`;
    }
  }

  return updated;
}
