import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildSeedData, computeAllStandings, syncBracket, GROUPS } from '@/lib/tournament';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'goldcup2026';
const ADMIN_TOKEN = `apfa-${process.env.JWT_SECRET || 'secret'}-token`;

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function isAdmin(req) {
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${ADMIN_TOKEN}`;
}

async function ensureSeeded(db) {
  const teamCount = await db.collection('teams').countDocuments();
  const matchCount = await db.collection('matches').countDocuments();
  if (teamCount === 0 || matchCount === 0) {
    const { teams, matches } = buildSeedData();
    if (teamCount === 0 && teams.length) await db.collection('teams').insertMany(teams);
    if (matchCount === 0 && matches.length) await db.collection('matches').insertMany(matches);
  }
}

async function handle(req, { params }) {
  const segments = params?.path || [];
  const path = '/' + segments.join('/');
  const method = req.method;

  try {
    const db = await getDb();
    await ensureSeeded(db);

    // ROOT
    if (path === '/' || path === '') {
      return json({ name: 'APFA INT Gold Cup 2026 API', status: 'ok' });
    }

    // AUTH
    if (path === '/auth/login' && method === 'POST') {
      const body = await req.json();
      if (body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD) {
        return json({ token: ADMIN_TOKEN, user: { username: ADMIN_USERNAME, role: 'admin' } });
      }
      return json({ error: 'Invalid credentials' }, 401);
    }

    if (path === '/auth/me' && method === 'GET') {
      if (!isAdmin(req)) return json({ error: 'Unauthorized' }, 401);
      return json({ user: { username: ADMIN_USERNAME, role: 'admin' } });
    }

    // TEAMS
    if (path === '/teams' && method === 'GET') {
      const teams = await db.collection('teams').find({}, { projection: { _id: 0 } }).toArray();
      return json({ teams });
    }

    // MATCHES
    if (path === '/matches' && method === 'GET') {
      const url = new URL(req.url);
      const type = url.searchParams.get('type');
      const group = url.searchParams.get('group');
      const filter = {};
      if (type) filter.type = type;
      if (group) filter.group = group;
      let matches = await db.collection('matches').find(filter, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
      return json({ matches });
    }

    // STANDINGS
    if (path === '/standings' && method === 'GET') {
      const matches = await db.collection('matches').find({}, { projection: { _id: 0 } }).toArray();
      const standings = computeAllStandings(matches);
      return json({ standings, groups: GROUPS });
    }

    // BRACKET
    if (path === '/bracket' && method === 'GET') {
      const allMatches = await db.collection('matches').find({}, { projection: { _id: 0 } }).toArray();
      // Live-compute synced bracket WITHOUT writing (in case admin hasn't triggered yet)
      const synced = syncBracket(allMatches);
      const qf = synced.filter(m => m.type === 'QF').sort((a,b) => a.slot.localeCompare(b.slot));
      const sf = synced.filter(m => m.type === 'SF').sort((a,b) => a.slot.localeCompare(b.slot));
      const final = synced.find(m => m.type === 'FINAL');
      return json({ qf, sf, final });
    }

    // UPDATE MATCH (admin)
    const matchUpdateMatch = path.match(/^\/matches\/([^/]+)$/);
    if (matchUpdateMatch && method === 'PUT') {
      if (!isAdmin(req)) return json({ error: 'Unauthorized' }, 401);
      const id = matchUpdateMatch[1];
      const body = await req.json();
      const update = {};
      if (body.scoreA !== undefined) update.scoreA = parseInt(body.scoreA);
      if (body.scoreB !== undefined) update.scoreB = parseInt(body.scoreB);
      if (body.status) update.status = body.status;
      if (body.date) update.date = body.date;
      const result = await db.collection('matches').findOneAndUpdate(
        { id },
        { $set: update },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      // After updating, resync bracket if completed
      if (update.status === 'completed') {
        const allMatches = await db.collection('matches').find({}, { projection: { _id: 0 } }).toArray();
        const synced = syncBracket(allMatches);
        // Persist team-name changes for not-yet-completed knockout matches
        const ops = [];
        for (const m of synced) {
          const orig = allMatches.find(x => x.id === m.id);
          if (!orig) continue;
          if (orig.status !== 'completed' && (orig.teamA !== m.teamA || orig.teamB !== m.teamB)) {
            ops.push({ updateOne: { filter: { id: m.id }, update: { $set: { teamA: m.teamA, teamB: m.teamB } } } });
          }
        }
        if (ops.length) await db.collection('matches').bulkWrite(ops);
      }
      return json({ match: result });
    }

    // RESET (admin) - wipes scores back to scheduled (handy for demos)
    if (path === '/admin/reset' && method === 'POST') {
      if (!isAdmin(req)) return json({ error: 'Unauthorized' }, 401);
      await db.collection('matches').deleteMany({});
      await db.collection('teams').deleteMany({});
      await ensureSeeded(db);
      return json({ ok: true });
    }

    return json({ error: 'Not found', path }, 404);
  } catch (e) {
    console.error('API error', e);
    return json({ error: e.message || 'Server error' }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
