// Final verification with all engine logic
const debts = [
  { id: '1', name: 'Discover It',     balanceCents: 482000, aprBps: 2499, minPaymentCents: 9600 },
  { id: '2', name: 'Chase Sapphire',  balanceCents: 210000, aprBps: 2199, minPaymentCents: 4500 },
  { id: '3', name: 'CareCredit',      balanceCents: 124000, aprBps: 0,    minPaymentCents: 0 },
];

function simulate(method, extraPerMonthCents) {
  const sorted = debts.slice().sort((a, b) =>
    method === 'snowball' ? a.balanceCents - b.balanceCents : b.aprBps - a.aprBps
  );
  const active = sorted.map(d => ({ ...d }));
  let totalInterest = 0;
  const originalTotalMins = active.reduce((s, d) => s + d.minPaymentCents, 0);
  const MAX = 360;
  const perDebtMonths = new Map();
  const perDebtStart = new Map(active.map(d => [d.id, d.balanceCents]));

  for (let m = 1; m <= MAX; m += 1) {
    if (active.length === 0) break;
    for (const d of active) {
      const r = d.aprBps / 120000;
      const interest = Math.round(d.balanceCents * r);
      d.balanceCents += interest;
      totalInterest += interest;
    }
    for (const d of active) {
      d.balanceCents -= Math.min(d.minPaymentCents, d.balanceCents);
    }
    const head = active[0];
    if (head.balanceCents > 0) {
      const activeMins = active.reduce((s, d) => s + d.minPaymentCents, 0);
      const freedMins = originalTotalMins - activeMins;
      const cascade = extraPerMonthCents + freedMins;
      const apply = Math.min(cascade, head.balanceCents);
      head.balanceCents -= apply;
    }
    const stillActive = [];
    for (const d of active) {
      if (d.balanceCents <= 0) d.balanceCents = 0;
      else {
        stillActive.push(d);
        perDebtMonths.set(d.id, m);
      }
    }
    active.length = 0;
    active.push(...stillActive);
  }
  // Unpayable check
  const unpayable = [];
  for (const d of active) {
    const startBal = perDebtStart.get(d.id) ?? 0;
    if (d.balanceCents >= startBal && d.aprBps > 0) unpayable.push(d.name);
  }
  const totalMonths = perDebtMonths.size > 0 ? Math.max(...perDebtMonths.values()) : 0;
  console.log(`  ${totalMonths}mo, $${(totalInterest/100).toFixed(2)} interest${unpayable.length ? ', unpayable: ' + unpayable.join(', ') : ''}`);
  for (const d of debts) {
    const months = perDebtMonths.get(d.id) ?? 0;
    console.log(`    ${d.name}: ${months}mo`);
  }
}

console.log('SNOWBALL, $0 extra:'); simulate('snowball', 0);
console.log('SNOWBALL, $244/mo extra:'); simulate('snowball', 24400);
console.log('AVALANCHE, $0 extra:'); simulate('avalanche', 0);
console.log('AVALANCHE, $244/mo extra:'); simulate('avalanche', 24400);
console.log('SNOWBALL, $500/mo extra:'); simulate('snowball', 50000);
console.log('AVALANCHE, $500/mo extra:'); simulate('avalanche', 50000);
