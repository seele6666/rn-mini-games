import { Action, Difficulty, Seat } from '../types';
import { applyAction, createGame } from '../engine';
import { buildObservation } from './observation';
import { chooseAction } from './heuristic';
import { chooseHardAction } from './search';

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const wallClock = require('perf_hooks').performance;
const seats: Seat[] = [0,1,2];
const budgets = {nodeBudget:400,timeBudgetMs:150,workBudget:20000};
const turnCap = 1000;
const randomFrom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15),1 | value);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7),61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
const policySeed = (seed: number, seat: Seat, revision: number) =>
  (Math.imul(seed,0x9e3779b1) ^ Math.imul(seat+1,0x85ebca6b) ^ Math.imul(revision+1,0xc2b2ae35)) >>> 0;
interface Trial {
  seed: number; target: Seat; difficulty: Difficulty; won: boolean | null; turns: number;
  illegal: number; errors: string[]; wallMs: number;
  hard: {decisions:number;samples:number;nodes:number;workUnits:number;statuses:Record<string,number>;wallMs:number[]};
}
async function runTrial(seed: number, target: Seat, difficulty: Difficulty): Promise<Trial> {
  const start = wallClock.now();
  const row: Trial = {seed,target,difficulty,won:null,turns:0,illegal:0,errors:[],wallMs:0,
    hard:{decisions:0,samples:0,nodes:0,workUnits:0,statuses:{},wallMs:[]}};
  try {
    // Explicit identity and starting seat keep the shuffle RNG exclusive to dealing.
    let state = createGame({startingSeat:0,random:randomFrom(seed),gameId:`benchmark-${seed}`,difficulty:'normal'});
    for (const type of ['call','declineGrab','declineGrab'] as const) {
      const result = applyAction(state,{type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision});
      if (!result.ok) throw new Error(`Bidding setup: ${result.reason}`);
      state = result.state;
    }
    if (state.phase !== 'playing' || state.landlord !== 0) throw new Error('Fixed-role setup did not reach playing');
    while (state.phase !== 'finished' && row.turns < turnCap) {
      const seat = state.currentSeat;
      // Even normal/easy regenerate their actions from their own observation.
      const view = buildObservation(state,seat,{includeLegalActions:false});
      const random = randomFrom(policySeed(seed,seat,state.revision));
      let action: Action | null;
      if (seat === target && difficulty === 'hard') {
        const started = wallClock.now();
        const result = await chooseHardAction(view,{...budgets,random,clock:() => 0,yieldWork:async () => {}});
        row.hard.wallMs.push(wallClock.now()-started);
        row.hard.decisions++; row.hard.samples += result.diagnostics.samples;
        row.hard.nodes += result.diagnostics.simulatedNodes; row.hard.workUnits += result.diagnostics.workUnits;
        row.hard.statuses[result.status] = (row.hard.statuses[result.status] ?? 0)+1;
        if (result.status === 'error' || result.status === 'cancelled' || result.status === 'inactive') row.errors.push(`Hard status ${result.status} at revision ${state.revision}`);
        action = result.action;
      } else action = chooseAction(view,{difficulty:seat === target ? difficulty : 'normal',random});
      if (!action) throw new Error(`No action at revision ${state.revision}`);
      const result = applyAction(state,action);
      if (!result.ok) {row.illegal++; throw new Error(`Illegal action at revision ${state.revision}: ${result.reason}`);}
      state = result.state; row.turns++;
    }
    if (state.winner) row.won = state.winner.seats.includes(target);
  } catch (error) { row.errors.push(String(error)); }
  row.wallMs = wallClock.now()-start;
  return row;
}

test('benchmark runner completes a real seeded game and counts the target alliance victory', async () => {
  const trial = await runTrial(1,1,'normal');
  expect(trial.errors).toEqual([]);
  expect(trial.illegal).toBe(0);
  expect(trial.turns).toBeGreaterThan(0);
  expect(typeof trial.won).toBe('boolean');
});

const longTest = process.env.DOUDIZHU_BENCHMARK === '1' ? test : test.skip;
longTest('fixed 100-seed paired alliance benchmark (explicit opt-in)', async () => {
  const count = Number(process.env.DOUDIZHU_BENCHMARK_SEEDS ?? 100);
  expect(Number.isInteger(count) && count > 0 && count <= 100).toBe(true);
  const started = wallClock.now();
  const trials: Trial[] = [];
  for (let seed = 1; seed <= count; seed++) {
    for (const target of seats) {
      // The normal baseline is shared by both comparisons: 9 real games/seed.
      for (const difficulty of ['easy','normal','hard'] as const) trials.push(await runTrial(seed,target,difficulty));
    }
    if (seed % 10 === 0) console.info(`Doudizhu benchmark ${seed}/${count} seeds, ${Math.round((wallClock.now()-started)/1000)}s`);
  }
  const roles = ['overall','landlord','farmer-after-landlord','farmer-before-landlord'] as const;
  const comparisons = roles.map((role,index) => {
    const targets = index === 0 ? seats : [seats[index-1]];
    const rows = trials.filter(row => targets.includes(row.target));
    const rates = Object.fromEntries((['easy','normal','hard'] as const).map(difficulty => {
      const selected = rows.filter(row => row.difficulty === difficulty);
      const wins = selected.filter(row => row.won === true).length;
      return [difficulty,{games:selected.length,wins,winRate:wins/selected.length}];
    }));
    const pairs = (before: Difficulty, after: Difficulty) => {
      const counts = {bothWin:0,bothLose:0,improved:0,regressed:0,incomplete:0};
      for (let seed = 1; seed <= count; seed++) for (const target of targets) {
        const a = rows.find(row => row.seed === seed && row.target === target && row.difficulty === before)!;
        const b = rows.find(row => row.seed === seed && row.target === target && row.difficulty === after)!;
        if (a.won === null || b.won === null) counts.incomplete++;
        else if (a.won && b.won) counts.bothWin++;
        else if (!a.won && !b.won) counts.bothLose++;
        else if (b.won) counts.improved++;
        else counts.regressed++;
      }
      return counts;
    };
    return {role,rates,easyToNormal:pairs('easy','normal'),normalToHard:pairs('normal','hard')};
  });
  const times = trials.flatMap(row => row.hard.wallMs).sort((a,b) => a-b);
  const percentile = (fraction: number) => times.length ? times[Math.ceil(times.length*fraction)-1] : null;
  const sourceHashes = Object.fromEntries(['engine.ts','rules.ts','ai/heuristic.ts','ai/search.ts','ai/observation.ts','ai/benchmark.test.ts'].map(file =>
    [file,crypto.createHash('sha256').update(fs.readFileSync(`src/features/doudizhu/${file}`)).digest('hex')]));
  const report = {
    createdAt:new Date().toISOString(),fullAcceptanceSample:count === 100,seeds:Array.from({length:count},(_,i) => i+1),
    environment:{node:process.version,platform:process.platform,arch:process.arch,osRelease:os.release(),cpu:os.cpus()[0]?.model,jest:require('jest/package.json').version},
    parameters:{landlord:0,targetSeats:seats,otherSeats:'normal',random:'mulberry32; deal=seed; policy=seed/seat/revision hash; independent streams',
      budgets,clock:'constant 0 (deterministic work/node bounds)',yieldWork:'async no-op',wallClock:'perf_hooks.performance.now',turnCap},
    sourceHashes,actualGames:trials.length,wallMs:wallClock.now()-started,comparisons,
    totals:{illegal:trials.reduce((n,row) => n+row.illegal,0),exceptions:trials.reduce((n,row) => n+row.errors.length,0),unfinished:trials.filter(row => row.won === null).length},
    hard:{decisions:times.length,samples:trials.reduce((n,row) => n+row.hard.samples,0),nodes:trials.reduce((n,row) => n+row.hard.nodes,0),
      workUnits:trials.reduce((n,row) => n+row.hard.workUnits,0),p50Ms:percentile(.5),p95Ms:percentile(.95),maxMs:times.at(-1) ?? null},trials,
  };
  fs.mkdirSync('verification/doudizhu',{recursive:true});
  const reportPath = `verification/doudizhu/benchmark-${count}-seeds.json`;
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.info(JSON.stringify({reportPath,actualGames:report.actualGames,wallMs:report.wallMs,comparisons,totals:report.totals,hard:report.hard}));
  // Persist failed seeds and diagnostics before enforcing acceptance.
  expect(report.totals).toEqual({illegal:0,exceptions:0,unfinished:0});
  const overall = comparisons[0].rates;
  expect(overall.normal.wins).toBeGreaterThan(overall.easy.wins);
  expect(overall.hard.wins).toBeGreaterThanOrEqual(overall.normal.wins);
},3600000);
