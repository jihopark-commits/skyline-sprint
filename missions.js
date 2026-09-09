// Fresh challenges each run. Bonus coins never count toward collection goals.
(() => {
  const catalog = [
    { id: 'score', targets: [100, 200, 300], label: n => 'Reach ' + n + ' points', value: () => Math.floor(score) },
    { id: 'coins', targets: [3, 5, 8], label: n => 'Collect ' + n + ' coins', value: () => shards },
    { id: 'jumps', targets: [6, 10, 16], label: n => 'Make ' + n + ' jumps', value: () => counts.jumps },
    { id: 'airJumps', targets: [3, 5, 8], label: n => 'Jump midair ' + n + ' times', value: () => counts.airJumps },
    { id: 'roofs', targets: [4, 7, 10], label: n => 'Land on ' + n + ' rooftops', value: () => landed.size },
    { id: 'duck', targets: [2, 4, 6], label: n => 'Duck for ' + n + ' seconds', value: () => Math.floor(counts.duck) },
    { id: 'pickups', targets: [1, 2, 3], label: n => 'Grab ' + n + ' power-ups', value: () => counts.pickups }
  ];
  let goals = [], counts, landed;
  let previous = [];
  try { const stored = JSON.parse(read('sLastMissions', '[]')); if (Array.isArray(stored)) previous = stored; } catch {}
  function selectGoals() {
    let pool = catalog.filter(goal => !previous.includes(goal.id));
    if (pool.length < 3) pool = catalog.slice();
    goals = [];
    for (let i = 0; i < 3; i++) {
      const definition = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const level = Math.floor(Math.random() * definition.targets.length);
      const target = definition.targets[level];
      goals.push({ ...definition, target, label: definition.label(target), reward: [5, 10, 15][level] });
    }
    previous = goals.map(goal => goal.id);
    save('sLastMissions', JSON.stringify(previous));
  }
  let completed = new Set(), bonus = 0, bannerTime = 0;
  const panel = document.createElement('div');
  panel.id = 'runGoals';
  panel.setAttribute('aria-label', 'Run goals');
  $('#hud').append(panel);
  const banner = document.createElement('div');
  banner.id = 'goalBanner';
  banner.hidden = true;
  banner.setAttribute('role', 'status');
  document.body.append(banner);
  const hint = document.createElement('div');
  hint.className = 'goalHint';
  hint.textContent = 'NEW · Shuffled missions! Three fresh challenges each run: jumps, rooftops, coins, ducking, power-ups and score. Earn 5–15 bonus coins per mission.';
  $('#menu .description').after(hint);

  function refresh() {
    panel.innerHTML = '<b>RUN MISSIONS</b>' + goals.map((goal, i) =>
      '<span class="' + (completed.has(i) ? 'goalDone' : '') + '">' +
      (completed.has(i) ? '✓ ' : '') + goal.label + ' <em>' +
      (completed.has(i) ? '+' + goal.reward + ' coins' : Math.min(goal.target, goal.value()) + '/' + goal.target) +
      '</em></span>').join('');
  }
  const originalReset = reset;
  reset = function () {
    completed = new Set(); bonus = 0; bannerTime = 0;
    banner.hidden = true;
    counts = { jumps: 0, airJumps: 0, duck: 0, pickups: 0 };
    landed = new Set();
    selectGoals();
    originalReset();
    refresh();
  };
  const originalUpdate = update;
  update = function (dt) {
    const pickups = roofs.map(roof => ({ roof, power: roof.power, magnet: roof.magnet }));
    const ducking = player.on && keys.ArrowDown;
    originalUpdate(dt);
    if (!run) return;
    if (ducking && player.on) counts.duck += dt;
    if (player.on) {
      const roof = roofs.find(r => Math.abs(player.y + 38 - r.y) < 1 && player.x + 12 > r.x && player.x - 12 < r.x + r.w);
      if (roof && roof !== startingRoof) landed.add(roof);
    }
    pickups.forEach(p => {
      if (p.power && !p.roof.power) counts.pickups++;
      if (p.magnet && !p.roof.magnet) counts.pickups++;
    });
    bannerTime = Math.max(0, bannerTime - dt);
    const messages = [];
    goals.forEach((goal, i) => {
      if (!completed.has(i) && goal.value() >= goal.target) {
        completed.add(i); bonus += goal.reward; coins += goal.reward;
        save('sCoins', coins);
        messages.push(goal.label + ' · +' + goal.reward + ' coins');
        burst(player.x, player.y, '#ffe59a', 24);
      }
    });
    if (messages.length) {
      banner.textContent = '✓ ' + messages.join(' / ');
      bannerTime = 3.5;
      stats();
    }
    banner.hidden = bannerTime === 0;
    refresh();
  };
  const originalJump = jump;
  jump = function () {
    const before = player && player.jumps;
    const airborne = player && !player.on && player.grace <= 0;
    originalJump();
    if (run && !paused && player.jumps !== before) {
      counts.jumps++;
      if (airborne) counts.airJumps++;
    }
  };
  c.removeEventListener('pointerdown', originalJump);
  c.addEventListener('pointerdown', jump);
  let startingRoof;
  const missionReset = reset;
  reset = function () { missionReset(); startingRoof = roofs[0]; };
  const originalFinish = finish;
  finish = function (reason) {
    if (!run) return;
    originalFinish(reason);
    banner.hidden = true;
    $('#result').textContent += ' · ' + completed.size + '/3 goals · ' + bonus + ' bonus coins';
  };
  // The original buttons stored the earlier function reference.
  $('#play').onclick = reset;
  $('#again').onclick = reset;
})();
