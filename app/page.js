'use client';

import { useEffect, useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trophy, Shield, LogIn, LogOut, ChevronRight, Pencil, Calendar, MapPin, Crown, Star } from 'lucide-react';

const TROPHY_GOLD = '#d4af37';

const fetcher = async (url, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('apfa_token') : null;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

function StatusBadge({ status }) {
  const map = {
    scheduled: { label: 'Scheduled', cls: 'bg-slate-700/60 text-slate-200 border-slate-600' },
    'in-progress': { label: 'LIVE', cls: 'bg-red-600/90 text-white border-red-500 animate-pulse' },
    completed: { label: 'Final', cls: 'bg-emerald-700/70 text-emerald-100 border-emerald-600' },
  };
  const m = map[status] || map.scheduled;
  return <Badge variant="outline" className={`${m.cls} text-[10px] tracking-wider uppercase`}>{m.label}</Badge>;
}

function MatchCard({ match, onEdit, isAdmin }) {
  const isComplete = match.status === 'completed';
  const winnerA = isComplete && match.scoreA > match.scoreB;
  const winnerB = isComplete && match.scoreB > match.scoreA;
  return (
    <div className="rounded-xl border border-amber-500/15 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4 hover:border-amber-500/40 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {match.type === 'group' ? (
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">Group {match.group}</Badge>
          ) : (
            <Badge variant="outline" className="border-red-500/40 text-red-200 bg-red-950/40 text-[10px]">{match.slot}</Badge>
          )}
          <Calendar className="h-3 w-3" />
          <span>{new Date(match.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className={`text-right font-semibold truncate ${winnerA ? 'text-amber-300' : 'text-slate-100'}`}>
          {winnerA && <Crown className="h-3.5 w-3.5 inline mr-1 text-amber-400" />}
          {match.teamA}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-black/40 border border-amber-500/20 min-w-[80px] justify-center">
          <span className={`text-2xl font-bold tabular-nums ${winnerA ? 'text-amber-300' : 'text-slate-100'}`}>{match.scoreA ?? '-'}</span>
          <span className="text-slate-500 text-sm">:</span>
          <span className={`text-2xl font-bold tabular-nums ${winnerB ? 'text-amber-300' : 'text-slate-100'}`}>{match.scoreB ?? '-'}</span>
        </div>
        <div className={`font-semibold truncate ${winnerB ? 'text-amber-300' : 'text-slate-100'}`}>
          {match.teamB}
          {winnerB && <Crown className="h-3.5 w-3.5 inline ml-1 text-amber-400" />}
        </div>
      </div>
      {isAdmin && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onEdit(match)} className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
            <Pencil className="h-3 w-3 mr-1" /> Update Score
          </Button>
        </div>
      )}
    </div>
  );
}

function GroupTable({ group, rows }) {
  return (
    <Card className="bg-slate-900/60 border-amber-500/20 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-red-950/60 via-slate-900/40 to-amber-950/30 border-b border-amber-500/20">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-bold">{group}</span>
            <span className="text-amber-100">Group {group}</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Top 1 Advances</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-2 py-2">Team</th>
                <th className="px-1.5 py-2">P</th>
                <th className="px-1.5 py-2">W</th>
                <th className="px-1.5 py-2">D</th>
                <th className="px-1.5 py-2">L</th>
                <th className="px-1.5 py-2">GF</th>
                <th className="px-1.5 py-2">GA</th>
                <th className="px-1.5 py-2">GD</th>
                <th className="px-2 py-2 text-amber-300">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.team} className={`border-t border-slate-800 ${idx === 0 ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{idx + 1}</span>
                  </td>
                  <td className="px-2 py-2.5 font-medium text-slate-100 whitespace-nowrap">
                    {idx === 0 && <Star className="h-3 w-3 inline mr-1 text-amber-400 fill-amber-400" />}
                    {r.team}
                  </td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.played}</td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.won}</td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.drawn}</td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.lost}</td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.gf}</td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.ga}</td>
                  <td className="text-center px-1.5 py-2.5 text-slate-300">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="text-center px-2 py-2.5 font-bold text-amber-300">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function BracketMatch({ match, onEdit, isAdmin, highlight }) {
  const isComplete = match?.status === 'completed';
  const winnerA = isComplete && match.scoreA > match.scoreB;
  const winnerB = isComplete && match.scoreB > match.scoreA;
  return (
    <div className={`rounded-lg border ${highlight ? 'border-amber-400/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-amber-500/20'} bg-gradient-to-br from-slate-900 to-slate-950 p-2.5 w-full`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-amber-300/90">{match?.slot}</span>
        {match && <StatusBadge status={match.status} />}
      </div>
      <div className={`flex items-center justify-between py-1 px-2 rounded ${winnerA ? 'bg-amber-500/10' : ''}`}>
        <span className={`text-xs sm:text-sm font-medium truncate ${winnerA ? 'text-amber-300' : 'text-slate-200'}`}>{match?.teamA || 'TBD'}</span>
        <span className={`tabular-nums text-sm font-bold ml-2 ${winnerA ? 'text-amber-300' : 'text-slate-300'}`}>{match?.scoreA ?? '-'}</span>
      </div>
      <div className={`flex items-center justify-between py-1 px-2 rounded mt-0.5 ${winnerB ? 'bg-amber-500/10' : ''}`}>
        <span className={`text-xs sm:text-sm font-medium truncate ${winnerB ? 'text-amber-300' : 'text-slate-200'}`}>{match?.teamB || 'TBD'}</span>
        <span className={`tabular-nums text-sm font-bold ml-2 ${winnerB ? 'text-amber-300' : 'text-slate-300'}`}>{match?.scoreB ?? '-'}</span>
      </div>
      {isAdmin && match && (
        <Button size="sm" variant="ghost" onClick={() => onEdit(match)} className="mt-1.5 h-6 text-[10px] w-full text-amber-300 hover:bg-amber-500/10">
          <Pencil className="h-2.5 w-2.5 mr-1" /> Edit
        </Button>
      )}
    </div>
  );
}

function ScoreDialog({ match, open, onOpenChange, onSave }) {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [status, setStatus] = useState('scheduled');

  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA ?? '');
      setScoreB(match.scoreB ?? '');
      setStatus(match.status || 'scheduled');
    }
  }, [match]);

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-amber-500/30 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-amber-300">Update Match Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            {match.type === 'group' ? `Group ${match.group}` : match.slot} · {new Date(match.date).toLocaleString()}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-400">{match.teamA}</Label>
              <Input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)} className="bg-slate-900 border-slate-700 text-2xl text-center font-bold mt-1 h-14" />
            </div>
            <span className="text-2xl font-bold text-slate-500 pb-3">:</span>
            <div>
              <Label className="text-xs text-slate-400">{match.teamB}</Label>
              <Input type="number" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)} className="bg-slate-900 border-slate-700 text-2xl text-center font-bold mt-1 h-14" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-slate-900 border-slate-700 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress (LIVE)</SelectItem>
                <SelectItem value="completed">Completed (Final)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSave({ scoreA: scoreA === '' ? 0 : parseInt(scoreA), scoreB: scoreB === '' ? 0 : parseInt(scoreB), status })}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function App() {
  const [tab, setTab] = useState('home');
  const [standings, setStandings] = useState({});
  const [matches, setMatches] = useState([]);
  const [bracket, setBracket] = useState({ qf: [], sf: [], final: null });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [editing, setEditing] = useState(null);
  const [matchFilter, setMatchFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const refreshAll = async () => {
    try {
      const [s, m, b] = await Promise.all([
        fetcher('/api/standings'),
        fetcher('/api/matches'),
        fetcher('/api/bracket'),
      ]);
      setStandings(s.standings || {});
      setMatches(m.matches || []);
      setBracket(b);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('apfa_token');
      if (t) setIsAdmin(true);
    }
    refreshAll();
    const interval = setInterval(refreshAll, 15000); // auto-refresh for live feel
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    try {
      const res = await fetcher('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: loginUser, password: loginPass }) });
      localStorage.setItem('apfa_token', res.token);
      setIsAdmin(true);
      toast.success('Welcome, Admin!');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('apfa_token');
    setIsAdmin(false);
    toast.info('Logged out');
  };

  const handleSaveScore = async ({ scoreA, scoreB, status }) => {
    try {
      await fetcher(`/api/matches/${editing.id}`, { method: 'PUT', body: JSON.stringify({ scoreA, scoreB, status }) });
      toast.success('Match updated!');
      setEditing(null);
      await refreshAll();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset ALL scores and reseed teams? This cannot be undone.')) return;
    try {
      await fetcher('/api/admin/reset', { method: 'POST' });
      toast.success('Tournament reset.');
      refreshAll();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (matchFilter !== 'all' && m.type !== matchFilter) return false;
      if (groupFilter !== 'all' && m.group !== groupFilter) return false;
      return true;
    });
  }, [matches, matchFilter, groupFilter]);

  const liveMatches = matches.filter(m => m.status === 'in-progress');
  const recentResults = matches.filter(m => m.status === 'completed').slice(-3).reverse();
  const upcoming = matches.filter(m => m.status === 'scheduled').slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="border-b border-amber-500/20 bg-gradient-to-r from-red-950/80 via-slate-950 to-red-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="h-5 w-5 text-red-950" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold gold-text leading-tight">3rd APFA INT GOLD CUP</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">2026 · TDL Bylakuppe</p>
            </div>
          </div>
          {isAdmin ? (
            <Button size="sm" variant="outline" onClick={handleLogout} className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
              <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setTab('admin')} className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
              <Shield className="h-3.5 w-3.5 mr-1" /> Admin
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 sm:grid-cols-5 w-full bg-slate-900/60 border border-amber-500/20">
            <TabsTrigger value="home" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs sm:text-sm">Home</TabsTrigger>
            <TabsTrigger value="standings" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs sm:text-sm">Groups</TabsTrigger>
            <TabsTrigger value="bracket" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs sm:text-sm">Bracket</TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs sm:text-sm">Matches</TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs sm:text-sm hidden sm:inline-flex">Admin</TabsTrigger>
          </TabsList>

          {/* HOME */}
          <TabsContent value="home" className="mt-6 space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-red-950 via-slate-900 to-amber-950/40 p-6 sm:p-10">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-red-600/10 blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-amber-500 text-slate-950 hover:bg-amber-400">3rd Edition</Badge>
                  <Badge variant="outline" className="border-red-500/50 text-red-200">Veterans 40+</Badge>
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold gold-text leading-tight">APFA INT Gold Cup 2026</h2>
                <p className="text-slate-300 mt-2 text-sm sm:text-base">A football tournament celebrating Tibetan fathers above 40. 24 teams · 8 groups · 1 cup.</p>
                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-amber-400" /> TDL Bylakuppe</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-amber-400" /> 2026</span>
                  <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-400" /> 24 Teams</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                  <Button onClick={() => setTab('standings')} className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold">View Standings <ChevronRight className="h-4 w-4 ml-1" /></Button>
                  <Button onClick={() => setTab('bracket')} variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">Knockout Bracket</Button>
                </div>
              </div>
            </div>

            {liveMatches.length > 0 && (
              <section>
                <h3 className="text-sm uppercase tracking-widest text-red-300 mb-3 flex items-center gap-2">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                  Live Now
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {liveMatches.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} />)}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm uppercase tracking-widest text-amber-300 mb-3">Recent Results</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentResults.length === 0 && <div className="text-slate-500 text-sm col-span-3">No matches completed yet.</div>}
                {recentResults.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} />)}
              </div>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-widest text-amber-300 mb-3">Upcoming Matches</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} />)}
              </div>
            </section>
          </TabsContent>

          {/* STANDINGS */}
          <TabsContent value="standings" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-4">
              {Object.keys(standings).sort().map(g => (
                <GroupTable key={g} group={g} rows={standings[g] || []} />
              ))}
            </div>
          </TabsContent>

          {/* BRACKET */}
          <TabsContent value="bracket" className="mt-6">
            <Card className="bg-slate-900/40 border-amber-500/20">
              <CardHeader>
                <CardTitle className="gold-text">Knockout Bracket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[700px] grid grid-cols-4 gap-4 sm:gap-6">
                    {/* QF */}
                    <div className="space-y-3 sm:space-y-6 flex flex-col justify-around">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Quarter Finals</div>
                      {bracket.qf.map(m => (
                        <BracketMatch key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} />
                      ))}
                    </div>
                    {/* SF */}
                    <div className="space-y-3 flex flex-col justify-around">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Semi Finals</div>
                      {bracket.sf.map(m => (
                        <div key={m.id} className="my-auto">
                          <BracketMatch match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} />
                        </div>
                      ))}
                    </div>
                    {/* FINAL */}
                    <div className="flex flex-col justify-center">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Final</div>
                      {bracket.final && <BracketMatch match={bracket.final} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} highlight />}
                    </div>
                    {/* CHAMPION */}
                    <div className="flex flex-col justify-center items-center">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Champion</div>
                      <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/20 to-red-900/20 p-4 w-full text-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                        <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                        <div className="font-bold gold-text text-lg">
                          {bracket.final?.status === 'completed'
                            ? (bracket.final.scoreA > bracket.final.scoreB ? bracket.final.teamA : bracket.final.teamB)
                            : 'TBD'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Gold Cup 2026</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MATCHES */}
          <TabsContent value="matches" className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={matchFilter} onValueChange={setMatchFilter}>
                <SelectTrigger className="w-[160px] bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="group">Group Stage</SelectItem>
                  <SelectItem value="QF">Quarter Finals</SelectItem>
                  <SelectItem value="SF">Semi Finals</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                </SelectContent>
              </Select>
              {matchFilter === 'group' && (
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectItem value="all">All Groups</SelectItem>
                    {['A','B','C','D','E','F','G','H'].map(g => <SelectItem key={g} value={g}>Group {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredMatches.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} />)}
            </div>
          </TabsContent>

          {/* ADMIN */}
          <TabsContent value="admin" className="mt-6">
            {!isAdmin ? (
              <Card className="bg-slate-900/60 border-amber-500/20 max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 gold-text"><Shield className="h-5 w-5" /> Admin Login</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="text-xs text-slate-400">Username</Label>
                      <Input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="admin" className="bg-slate-900 border-slate-700 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Password</Label>
                      <Input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" className="bg-slate-900 border-slate-700 mt-1" />
                    </div>
                    <Button type="submit" className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold">
                      <LogIn className="h-4 w-4 mr-2" /> Sign In
                    </Button>
                    <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-800">
                      Default credentials: <span className="text-amber-300">admin / goldcup2026</span>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="bg-slate-900/60 border-amber-500/20">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="gold-text">Admin Panel</CardTitle>
                    <Button onClick={handleReset} variant="outline" size="sm" className="border-red-500/50 text-red-300 hover:bg-red-500/10">Reset Tournament</Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm mb-4">Tap any match to update its score. The standings table & knockout bracket auto-refresh.</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {matches.map(m => <MatchCard key={m.id} match={m} isAdmin onEdit={(mm) => setEditing(mm)} />)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <ScoreDialog match={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} onSave={handleSaveScore} />

      <footer className="border-t border-amber-500/20 mt-8 py-6 text-center text-xs text-slate-500">
        <p>3rd APFA INT Gold Cup 2026 · TDL Bylakuppe</p>
        <p className="mt-1">A celebration of Tibetan football heritage</p>
      </footer>
    </div>
  );
}

export default App;
