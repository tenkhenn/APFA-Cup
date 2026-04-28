'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trophy, Shield, LogIn, LogOut, ChevronRight, Pencil, Calendar, MapPin, Crown, Star, Upload, X, ImageIcon } from 'lucide-react';

const fetcher = async (url, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('apfa_token') : null;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

// Resize an image file client-side to keep base64 small
function fileToCompressedDataUrl(file, maxDim = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TeamLogo({ name, logos, size = 'sm' }) {
  const sizes = {
    xs: 'h-4 w-4 text-[8px]',
    sm: 'h-6 w-6 text-[9px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-12 w-12 text-sm',
  };
  const cls = sizes[size] || sizes.sm;
  const initials = (name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logos && logos[name]) {
    return <img src={logos[name]} alt={name} className={`${cls} rounded-full object-cover bg-slate-800 border border-amber-500/30 flex-shrink-0`} />;
  }
  return <span className={`${cls} rounded-full bg-slate-700/80 text-slate-300 inline-flex items-center justify-center font-semibold flex-shrink-0 border border-slate-600`}>{initials}</span>;
}

function StatusBadge({ status }) {
  const map = {
    scheduled: { label: 'Scheduled', cls: 'bg-slate-700/60 text-slate-200 border-slate-600' },
    'in-progress': { label: 'LIVE', cls: 'bg-red-600/90 text-white border-red-500 animate-pulse' },
    completed: { label: 'Final', cls: 'bg-emerald-700/70 text-emerald-100 border-emerald-600' },
  };
  const m = map[status] || map.scheduled;
  return <Badge variant="outline" className={`${m.cls} text-[10px] tracking-wider uppercase`}>{m.label}</Badge>;
}

function MatchResultMeta({ match }) {
  // Show "After Extra Time", "Pens 4-3", etc.
  if (match.status !== 'completed') return null;
  const isDraw = match.scoreA === match.scoreB;
  const hasPens = match.penaltyScoreA != null && match.penaltyScoreB != null;
  if (!match.extraTime && !hasPens) return null;
  return (
    <div className="text-[10px] text-amber-300/80 mt-1 text-center uppercase tracking-wider">
      {hasPens && isDraw && (
        <span>Penalties: {match.penaltyScoreA} - {match.penaltyScoreB}</span>
      )}
      {match.extraTime && !hasPens && <span>After Extra Time</span>}
      {match.extraTime && hasPens && <span> · After Extra Time</span>}
    </div>
  );
}

function MatchCard({ match, onEdit, isAdmin, logos }) {
  const isComplete = match.status === 'completed';
  let winnerA = isComplete && match.scoreA > match.scoreB;
  let winnerB = isComplete && match.scoreB > match.scoreA;
  if (isComplete && match.scoreA === match.scoreB && match.penaltyScoreA != null && match.penaltyScoreB != null) {
    winnerA = match.penaltyScoreA > match.penaltyScoreB;
    winnerB = match.penaltyScoreB > match.penaltyScoreA;
  }
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
        <div className={`flex items-center justify-end gap-2 font-semibold truncate ${winnerA ? 'text-amber-300' : 'text-slate-100'}`}>
          {winnerA && <Crown className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />}
          <span className="truncate">{match.teamA}</span>
          <TeamLogo name={match.teamA} logos={logos} size="sm" />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-black/40 border border-amber-500/20 min-w-[80px] justify-center">
          <span className={`text-2xl font-bold tabular-nums ${winnerA ? 'text-amber-300' : 'text-slate-100'}`}>{match.scoreA ?? '-'}</span>
          <span className="text-slate-500 text-sm">:</span>
          <span className={`text-2xl font-bold tabular-nums ${winnerB ? 'text-amber-300' : 'text-slate-100'}`}>{match.scoreB ?? '-'}</span>
        </div>
        <div className={`flex items-center gap-2 font-semibold truncate ${winnerB ? 'text-amber-300' : 'text-slate-100'}`}>
          <TeamLogo name={match.teamB} logos={logos} size="sm" />
          <span className="truncate">{match.teamB}</span>
          {winnerB && <Crown className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />}
        </div>
      </div>
      <MatchResultMeta match={match} />
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

function GroupTable({ group, rows, logos }) {
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
                    <span className="inline-flex items-center gap-2">
                      <TeamLogo name={r.team} logos={logos} size="sm" />
                      <span>{r.team}</span>
                      {idx === 0 && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                    </span>
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

function BracketMatch({ match, onEdit, isAdmin, highlight, logos }) {
  const isComplete = match?.status === 'completed';
  let winnerA = isComplete && match.scoreA > match.scoreB;
  let winnerB = isComplete && match.scoreB > match.scoreA;
  if (isComplete && match.scoreA === match.scoreB && match.penaltyScoreA != null && match.penaltyScoreB != null) {
    winnerA = match.penaltyScoreA > match.penaltyScoreB;
    winnerB = match.penaltyScoreB > match.penaltyScoreA;
  }
  return (
    <div className={`rounded-lg border ${highlight ? 'border-amber-400/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-amber-500/20'} bg-gradient-to-br from-slate-900 to-slate-950 p-2.5 w-full`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-amber-300/90">{match?.slot}</span>
        {match && <StatusBadge status={match.status} />}
      </div>
      <div className={`flex items-center justify-between py-1 px-2 rounded ${winnerA ? 'bg-amber-500/10' : ''}`}>
        <span className="flex items-center gap-2 min-w-0">
          <TeamLogo name={match?.teamA} logos={logos} size="xs" />
          <span className={`text-xs sm:text-sm font-medium truncate ${winnerA ? 'text-amber-300' : 'text-slate-200'}`}>{match?.teamA || 'TBD'}</span>
        </span>
        <span className={`tabular-nums text-sm font-bold ml-2 ${winnerA ? 'text-amber-300' : 'text-slate-300'}`}>
          {match?.scoreA ?? '-'}
          {match?.penaltyScoreA != null && <sup className="text-[9px] text-amber-400 ml-0.5">({match.penaltyScoreA})</sup>}
        </span>
      </div>
      <div className={`flex items-center justify-between py-1 px-2 rounded mt-0.5 ${winnerB ? 'bg-amber-500/10' : ''}`}>
        <span className="flex items-center gap-2 min-w-0">
          <TeamLogo name={match?.teamB} logos={logos} size="xs" />
          <span className={`text-xs sm:text-sm font-medium truncate ${winnerB ? 'text-amber-300' : 'text-slate-200'}`}>{match?.teamB || 'TBD'}</span>
        </span>
        <span className={`tabular-nums text-sm font-bold ml-2 ${winnerB ? 'text-amber-300' : 'text-slate-300'}`}>
          {match?.scoreB ?? '-'}
          {match?.penaltyScoreB != null && <sup className="text-[9px] text-amber-400 ml-0.5">({match.penaltyScoreB})</sup>}
        </span>
      </div>
      {match?.extraTime && (
        <div className="text-[9px] text-amber-300/70 text-center mt-1 uppercase tracking-wider">
          {match.penaltyScoreA != null ? 'AET · Pens' : 'After Extra Time'}
        </div>
      )}
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
  const [extraTime, setExtraTime] = useState(false);
  const [penA, setPenA] = useState('');
  const [penB, setPenB] = useState('');
  const [matchDate, setMatchDate] = useState('');

  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA ?? '');
      setScoreB(match.scoreB ?? '');
      setStatus(match.status || 'scheduled');
      setExtraTime(!!match.extraTime);
      setPenA(match.penaltyScoreA ?? '');
      setPenB(match.penaltyScoreB ?? '');
      // Convert ISO to local datetime-local input value (YYYY-MM-DDTHH:mm)
      if (match.date) {
        const d = new Date(match.date);
        const tz = d.getTimezoneOffset() * 60000;
        setMatchDate(new Date(d.getTime() - tz).toISOString().slice(0, 16));
      } else {
        setMatchDate('');
      }
    }
  }, [match]);

  if (!match) return null;

  const isKnockout = match.type !== 'group';
  const isTied = scoreA !== '' && scoreB !== '' && parseInt(scoreA) === parseInt(scoreB);
  const showPenalties = isKnockout && status === 'completed' && isTied;

  const submit = () => {
    const payload = {
      scoreA: scoreA === '' ? 0 : parseInt(scoreA),
      scoreB: scoreB === '' ? 0 : parseInt(scoreB),
      status,
    };
    if (matchDate) {
      // Convert local datetime-local back to ISO
      payload.date = new Date(matchDate).toISOString();
    }
    if (isKnockout) {
      payload.extraTime = extraTime;
      // Only save penalty scores if tied and provided
      if (showPenalties && penA !== '' && penB !== '') {
        payload.penaltyScoreA = parseInt(penA);
        payload.penaltyScoreB = parseInt(penB);
      } else {
        // Clear pens if not applicable
        payload.penaltyScoreA = null;
        payload.penaltyScoreB = null;
      }
    }
    if (isKnockout && status === 'completed' && isTied && (penA === '' || penB === '')) {
      toast.error('Knockout match is tied — please enter penalty shootout scores.');
      return;
    }
    if (isKnockout && status === 'completed' && isTied && parseInt(penA) === parseInt(penB)) {
      toast.error('Penalty shootout cannot end in a tie.');
      return;
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-amber-500/30 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-amber-300">Update Match Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            {match.type === 'group' ? `Group ${match.group}` : match.slot}
          </div>
          <div>
            <Label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-amber-400" /> Match Date & Time
            </Label>
            <Input
              type="datetime-local"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="bg-slate-900 border-slate-700 mt-1 [color-scheme:dark]"
            />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-400 truncate block">{match.teamA}</Label>
              <Input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)} className="bg-slate-900 border-slate-700 text-2xl text-center font-bold mt-1 h-14" />
            </div>
            <span className="text-2xl font-bold text-slate-500 pb-3">:</span>
            <div>
              <Label className="text-xs text-slate-400 truncate block">{match.teamB}</Label>
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

          {isKnockout && status === 'completed' && (
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={extraTime} onCheckedChange={(v) => setExtraTime(!!v)} className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950" />
                <span className="text-sm text-slate-200">Match went to Extra Time</span>
              </label>

              {showPenalties && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <Label className="text-xs text-amber-300 uppercase tracking-wider">Penalty Shootout</Label>
                  <p className="text-[11px] text-slate-400 mb-2">Match is tied — enter penalty shootout final score</p>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                    <div>
                      <Label className="text-[10px] text-slate-400 truncate block">{match.teamA} Pens</Label>
                      <Input type="number" min="0" value={penA} onChange={(e) => setPenA(e.target.value)} className="bg-slate-900 border-amber-500/40 text-lg text-center font-bold mt-1 h-11" />
                    </div>
                    <span className="text-lg font-bold text-amber-400 pb-2">:</span>
                    <div>
                      <Label className="text-[10px] text-slate-400 truncate block">{match.teamB} Pens</Label>
                      <Input type="number" min="0" value={penB} onChange={(e) => setPenB(e.target.value)} className="bg-slate-900 border-amber-500/40 text-lg text-center font-bold mt-1 h-11" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamLogoUploader({ team, logos, onUploaded, onRemoved, onRenamed }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(team.name);

  useEffect(() => { setDraftName(team.name); }, [team.name]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 256);
      await fetcher(`/api/teams/${team.id}/logo`, { method: 'POST', body: JSON.stringify({ logo: dataUrl }) });
      toast.success(`Logo updated for ${team.name}`);
      onUploaded();
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove logo for ${team.name}?`)) return;
    try {
      await fetcher(`/api/teams/${team.id}/logo`, { method: 'DELETE' });
      toast.success('Logo removed');
      onRemoved();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSaveName = async () => {
    const newName = draftName.trim();
    if (!newName) { toast.error('Name cannot be empty'); return; }
    if (newName === team.name) { setEditing(false); return; }
    try {
      await fetcher(`/api/teams/${team.id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      toast.success(`Renamed to ${newName}`);
      setEditing(false);
      onRenamed && onRenamed();
    } catch (e) {
      toast.error(e.message || 'Rename failed');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50">
      <TeamLogo name={team.name} logos={logos} size="lg" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditing(false); setDraftName(team.name); } }}
              autoFocus
              className="bg-slate-950 border-amber-500/40 h-8 text-sm"
            />
            <Button size="sm" onClick={handleSaveName} className="h-8 bg-amber-500 text-slate-950 hover:bg-amber-400 px-2.5">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraftName(team.name); }} className="h-8 px-2 text-slate-400">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="font-medium truncate text-slate-100">{team.name}</span>
              <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-amber-300 transition-colors" title="Edit name">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <div className="text-[11px] text-slate-500">Group {team.group}</div>
          </>
        )}
      </div>
      {!editing && (
        <>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy} className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 h-8 text-xs">
            <Upload className="h-3 w-3 mr-1" /> {logos[team.name] ? 'Change' : 'Upload'}
          </Button>
          {logos[team.name] && (
            <Button size="sm" variant="ghost" onClick={handleRemove} className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('home');
  const [adminSubTab, setAdminSubTab] = useState('matches');
  const [standings, setStandings] = useState({});
  const [matches, setMatches] = useState([]);
  const [bracket, setBracket] = useState({ qf: [], sf: [], final: null });
  const [teams, setTeams] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [editing, setEditing] = useState(null);
  const [matchFilter, setMatchFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const logos = useMemo(() => {
    const map = {};
    for (const t of teams) if (t.logo) map[t.name] = t.logo;
    return map;
  }, [teams]);

  const refreshAll = async () => {
    try {
      const [s, m, b, t] = await Promise.all([
        fetcher('/api/standings'),
        fetcher('/api/matches'),
        fetcher('/api/bracket'),
        fetcher('/api/teams'),
      ]);
      setStandings(s.standings || {});
      setMatches(m.matches || []);
      setBracket(b);
      setTeams(t.teams || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tok = localStorage.getItem('apfa_token');
      if (tok) setIsAdmin(true);
    }
    refreshAll();
    const interval = setInterval(refreshAll, 15000);
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

  const handleSaveScore = async (payload) => {
    try {
      await fetcher(`/api/matches/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
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

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => (a.group || '').localeCompare(b.group || '') || a.name.localeCompare(b.name)), [teams]);

  return (
    <div className="min-h-screen flex flex-col">
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

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1">
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
                  {liveMatches.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} logos={logos} />)}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm uppercase tracking-widest text-amber-300 mb-3">Recent Results</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentResults.length === 0 && <div className="text-slate-500 text-sm col-span-3">No matches completed yet.</div>}
                {recentResults.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} logos={logos} />)}
              </div>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-widest text-amber-300 mb-3">Upcoming Matches</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} logos={logos} />)}
              </div>
            </section>
          </TabsContent>

          {/* STANDINGS */}
          <TabsContent value="standings" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-4">
              {Object.keys(standings).sort().map(g => (
                <GroupTable key={g} group={g} rows={standings[g] || []} logos={logos} />
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
                    <div className="space-y-3 sm:space-y-6 flex flex-col justify-around">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Quarter Finals</div>
                      {bracket.qf.map(m => (
                        <BracketMatch key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} logos={logos} />
                      ))}
                    </div>
                    <div className="space-y-3 flex flex-col justify-around">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Semi Finals</div>
                      {bracket.sf.map(m => (
                        <div key={m.id} className="my-auto">
                          <BracketMatch match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} logos={logos} />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Final</div>
                      {bracket.final && <BracketMatch match={bracket.final} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} highlight logos={logos} />}
                    </div>
                    <div className="flex flex-col justify-center items-center">
                      <div className="text-center text-xs uppercase tracking-widest text-amber-300 mb-1">Champion</div>
                      <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/20 to-red-900/20 p-4 w-full text-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                        <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                        <div className="font-bold gold-text text-lg break-words">
                          {(() => {
                            const f = bracket.final;
                            if (!f || f.status !== 'completed') return 'TBD';
                            if (f.scoreA > f.scoreB) return f.teamA;
                            if (f.scoreB > f.scoreA) return f.teamB;
                            if (f.penaltyScoreA != null && f.penaltyScoreB != null) {
                              return f.penaltyScoreA > f.penaltyScoreB ? f.teamA : f.teamB;
                            }
                            return 'TBD';
                          })()}
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
              {filteredMatches.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={(mm) => setEditing(mm)} logos={logos} />)}
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
                  <CardHeader className="flex-row items-center justify-between flex">
                    <CardTitle className="gold-text">Admin Panel</CardTitle>
                    <Button onClick={handleReset} variant="outline" size="sm" className="border-red-500/50 text-red-300 hover:bg-red-500/10">Reset Tournament</Button>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={adminSubTab} onValueChange={setAdminSubTab}>
                      <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-grid bg-slate-950 border border-slate-800">
                        <TabsTrigger value="matches" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Match Scores
                        </TabsTrigger>
                        <TabsTrigger value="teams" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
                          <ImageIcon className="h-3.5 w-3.5 mr-1" /> Team Logos
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="matches" className="mt-4">
                        <p className="text-slate-400 text-sm mb-4">Tap any match to update its score. Knockout matches support extra time and penalty shootouts. Standings & bracket auto-update.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {matches.map(m => <MatchCard key={m.id} match={m} isAdmin onEdit={(mm) => setEditing(mm)} logos={logos} />)}
                        </div>
                      </TabsContent>

                      <TabsContent value="teams" className="mt-4">
                        <p className="text-slate-400 text-sm mb-4">Upload a logo for any team (auto-resized to 256px, JPEG). Logos appear next to team names everywhere.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {sortedTeams.map(t => (
                            <TeamLogoUploader key={t.id} team={t} logos={logos} onUploaded={refreshAll} onRemoved={refreshAll} onRenamed={refreshAll} />
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <ScoreDialog match={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} onSave={handleSaveScore} />

      <footer className="border-t border-amber-500/20 mt-8 py-8 text-center text-xs text-slate-500">
        <p>3rd APFA INT Gold Cup 2026 · TDL Bylakuppe</p>

        {/* === FINAL ROUND: pick A, B, or C === */}
        <div className="my-4 mx-auto max-w-xl space-y-5 border-y border-amber-500/10 py-6">
          <p className="text-[10px] uppercase tracking-widest text-amber-300/70">Final Round · Pick A, B or C</p>

          <div className="space-y-1.5">
            <span className="text-amber-400 font-mono text-[10px] block">A · Wide-tracked uppercase</span>
            <span className="block text-[11px] uppercase tracking-[0.4em] text-amber-300">Developed &amp; Managed by TCRC</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-amber-400 font-mono text-[10px] block">B · Italic with em-dashes</span>
            <span className="block text-sm text-slate-300 italic">— Developed and managed by TCRC —</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-amber-400 font-mono text-[10px] block">C · Combined (italic em-dashes + wide tracked gold name)</span>
            <span className="block text-sm text-slate-300 italic">
              — Developed and managed by{' '}
              <span className="not-italic uppercase tracking-[0.35em] text-amber-300 font-semibold ml-1">TCRC</span>{' '}—
            </span>
          </div>
        </div>

        <p>A celebration of Tibetan football heritage</p>
      </footer>
    </div>
  );
}

export default App;
