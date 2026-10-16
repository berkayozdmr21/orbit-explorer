import {it,expect} from 'vitest';
import {flightAt,EVENTS,ROCKETS} from './launch';
it('starts safely on the launch pad with full fuel',()=>{const f=flightAt(0);expect(f.altitude).toBe(0);expect(f.engine).toBe(false);expect(f.fuel).toBe(1);});
it('ignites at lift-off and changes stages at separation',()=>{expect(flightAt(5).engine).toBe(true);expect(flightAt(89.9).stage).toBe(1);expect(flightAt(90).stage).toBe(2);});
it('cuts off the engine at the planned cutoff',()=>expect(flightAt(220).engine).toBe(false));
it('keeps the altitude continuous across both flight phases',()=>{expect(Math.abs(flightAt(89.999).altitude-flightAt(90.001).altitude)).toBeLessThan(.01);expect(Math.abs(flightAt(219.999).altitude-flightAt(220.001).altitude)).toBeLessThan(.01);});
it('never produces negative fuel or descending main flight',()=>{let altitude=0;for(let t=0;t<=240;t++){const f=flightAt(t);expect(f.fuel).toBeGreaterThanOrEqual(0);expect(f.fuel).toBeLessThanOrEqual(1);expect(f.altitude).toBeGreaterThanOrEqual(altitude);altitude=f.altitude;}});
it('clamps invalid and out-of-bounds playheads',()=>{expect(flightAt(-5).time).toBe(0);expect(flightAt(500).time).toBe(240);expect(flightAt(NaN).time).toBe(0);});
it('has three original rockets and ordered flight events',()=>{expect(new Set(ROCKETS.map(r=>r.id)).size).toBe(3);expect(EVENTS.map(e=>e.time)).toEqual([...EVENTS.map(e=>e.time)].sort((a,b)=>a-b));});
