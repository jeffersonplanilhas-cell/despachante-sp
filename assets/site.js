/* Despachante São Paulo — experiência V2 "Condensação"
   Lei de movimento: entrada fragmentada → organização por condensação → ação acelera → conclusão estabiliza.
   Sem dependências. Respeita prefers-reduced-motion. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NUM = '5516999856385';
  const SRC = { ig: 'pelo Instagram', story: 'pelos stories do Instagram', google: 'pelo Google', qr: 'pelo QR code' }[new URLSearchParams(location.search).get('src')] || 'pelo site';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => 1 - Math.pow(1 - t, 3);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ============ dados (somente fatos verificáveis; ver 00_AUDIT) ============ */
  const PROBLEMS = [
    { id: 'usado', label: 'Vou comprar um usado', msg: 'conferir um usado antes de comprar',
      frags: ['IPVA atrasado', 'multas', 'gravame', 'restrição', 'vendedor ≠ dono', 'vistoria', 'prazo de 30 dias'], hot: [2, 4],
      path: ['Manda a placa antes de pagar qualquer coisa.', 'A gente confere débitos, restrições e gravame no nome do carro.', 'Com tudo limpo, a gente cuida da transferência. O prazo legal é de 30 dias.'] },
    { id: 'vendi', label: 'Vendi e a multa chega pra mim', msg: 'um veículo que vendi e continua no meu nome',
      frags: ['comunicação de venda', 'comprador não transferiu', 'multa no seu nome', 'pontos na CNH'], hot: [0, 1],
      path: ['Manda a placa e o que você tem da venda.', 'A gente verifica em nome de quem o veículo está hoje.', 'Orienta a comunicação de venda e o que fazer com o que já chegou.'] },
    { id: 'licenciamento', label: 'Licenciamento atrasado', msg: 'licenciamento / IPVA',
      frags: ['IPVA', 'multas', 'taxa R$ 174,08', 'CRLV-e', 'prazo vencido'], hot: [0, 4],
      path: ['Manda a placa.', 'A gente levanta tudo que precisa ser quitado antes.', 'Resolve o licenciamento. O CRLV-e sai digital, direto no seu celular.'] },
    { id: 'transferir', label: 'Transferir pro meu nome', msg: 'transferência para o meu nome',
      frags: ['ATPV-e', 'vistoria', 'débitos', 'documentos pessoais', 'prazo de 30 dias'], hot: [1, 4],
      path: ['Manda a placa e o documento de venda.', 'A gente confere pendências e explica a vistoria.', 'Cuida da transferência até o documento sair no seu nome.'] },
    { id: 'segundavia', label: 'Perdi o documento', msg: '2ª via de documento',
      frags: ['CRV', 'CRLV-e', '2ª via', 'documento danificado'], hot: [0],
      path: ['Conta o que perdeu ou estragou.', 'A gente vê qual documento precisa de 2ª via. Às vezes é só baixar o digital de novo.', 'Quando é 2ª via mesmo, a gente resolve.'] },
    { id: 'restricao', label: 'Tem restrição no carro', msg: 'uma restrição/bloqueio no veículo',
      frags: ['restrição administrativa', 'bloqueio judicial', 'gravame', 'licenciamento travado'], hot: [0, 2],
      path: ['Manda a placa.', 'A gente descobre qual restrição é e o que ela significa.', 'Explica quem pode baixar e cuida do que for administrativo.'] },
    { id: 'conferir', label: 'Não sei. Só quero conferir', msg: 'conferir a situação do meu veículo',
      frags: ['?', 'débitos', 'restrições', 'prazos'], hot: [0],
      path: ['Manda a placa.', 'A gente levanta o que existe no nome do veículo.', 'Explica em português claro o que fazer, e se precisa fazer.'] },
  ];
  const QA = [
    ['Preciso ir até Franca?', 'Não. Dá pra começar e acompanhar pelo WhatsApp. Se o serviço exigir vistoria do veículo ou um documento original, a gente avisa antes e explica onde e como fazer perto de você.'],
    ['Atendem veículo de outra cidade?', 'Sim, veículo registrado no estado de São Paulo. Os serviços do Detran-SP são estaduais: a base é Franca, o atendimento é digital.'],
    ['O documento no celular vale?', 'Vale. Com o licenciamento pago, o CRLV-e sai digital e pode ser apresentado no celular ou impresso em papel comum.', 'Fonte: Detran-SP'],
    ['Quanto custa licenciar em 2026?', 'A taxa do licenciamento 2026 em SP é R$ 174,08, mais IPVA e multas pendentes, que precisam estar quitados. O valor do nosso serviço depende do caso: manda a placa que a gente passa.', 'Fonte: Agência SP'],
    ['Comprei um usado. Qual o prazo pra transferir?', '30 dias a partir da compra. Passou disso, é infração. Antes de pagar, vale conferir débitos, restrições e gravame pela placa.', 'CTB, arts. 123 e 233'],
    ['Dá pra fazer sozinho?', 'Muita coisa dá, pelo portal do Detran-SP ou Poupatempo. A gente entra quando trava, quando o prazo aperta ou quando você simplesmente não quer perder tempo com isso. E explica o que era.'],
  ];

  /* ============ estado → mensagem do WhatsApp ============ */
  const S = { p: null, city: null, plate: '' };
  function msgParts() {
    const parts = [[`Oi! Vim ${SRC}.`, false]];
    if (S.p) parts.push([' Preciso resolver: ', false], [S.p.msg, true], ['.', false]);
    if (S.city === 'fora de SP') parts.push([' Estou fora do estado, com veículo de SP.', false]);
    else if (S.city) parts.push([' Estou em/perto de ', false], [S.city, true], ['.', false]);
    if (S.plate) parts.push([' Placa: ', false], [S.plate, true], ['.', false]);
    if (!S.p && !S.plate) parts.push([' Quero ajuda com: ', false]);
    return parts;
  }
  const message = () => msgParts().map(p => p[0]).join('');
  const waURL = () => `https://wa.me/${NUM}?text=${encodeURIComponent(message())}`;
  const bMsg = $('#bMsg'), dockCtx = $('#dockCtx'), cCity = $('#cCity');
  function sync() {
    const url = waURL();
    $$('[data-wa]').forEach(a => { a.href = url; a.target = '_blank'; a.rel = 'noopener'; });
    dockCtx.textContent = S.p ? S.p.label : (S.city || '');
    bMsg.innerHTML = msgParts().map(([t, m]) => m ? `<mark>${esc(t)}</mark>` : esc(t)).join('');
    if (S.city) cCity.innerHTML = `${esc(S.city)} · <a href="#mapa">trocar</a>`;
  }

  /* ============ chips (diagnóstico + compositor compartilham estado) ============ */
  function buildChips(box, onPick) {
    box.innerHTML = PROBLEMS.map(p => `<button type="button" class="chip" role="radio" aria-checked="false" data-id="${p.id}">${esc(p.label)}</button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) onPick(PROBLEMS.find(p => p.id === b.dataset.id), true); });
  }
  function pick(p, fromUser) {
    S.p = p;
    $$('.chip').forEach(c => c.setAttribute('aria-checked', String(c.dataset.id === p.id)));
    showDiag(p);
    sync();
  }
  buildChips($('#chips'), pick);
  buildChips($('#chips2'), pick);

  const frags = $('#frags'), path = $('#path');
  function showDiag(p) {
    $('#panelEmpty').hidden = true;
    $('#panelBody').hidden = false;
    frags.innerHTML = p.frags.map((f, i) => `<span class="frag${p.hot.includes(i) ? ' hot' : ''}">${esc(f)}</span>`).join('');
    const items = [...frags.children], w = frags.clientWidth || 320;
    if (!RM) {
      // entrada fragmentada: cada peça nasce fora do lugar e condensa
      items.forEach(el => { el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = `translate(${rand(-w / 2, w / 2)}px,${rand(-140, 180)}px) rotate(${rand(-50, 50)}deg) scale(.8)`; });
      void frags.offsetWidth;
      items.forEach((el, i) => { el.style.transition = ''; el.style.transitionDelay = `${i * 45}ms`; el.style.opacity = ''; el.style.transform = ''; });
    }
    path.classList.remove('on');
    path.innerHTML = p.path.map(s => `<li>${esc(s)}</li>`).join('');
    setTimeout(() => path.classList.add('on'), RM ? 0 : 380);
  }

  /* ============ 00 · HERO: fragmentos → marca real ============ */
  const hero = $('#entrada'), field = $('#field'), ctx = field.getContext('2d'), bar = $('#bar'), badge = $('.badge');
  const heroSys = $('#heroSys'), tagsBox = $('#tags');
  const logoImg = new Image();
  logoImg.src = 'assets/logo.webp';
  const crisp = new Image();
  crisp.src = 'assets/logo.webp'; crisp.alt = ''; crisp.className = 'hero-logo';
  Object.assign(crisp.style, { position: 'absolute', pointerEvents: 'none', opacity: '0', transition: 'opacity .35s', zIndex: 1 });
  hero.appendChild(crisp);

  let W = 0, H = 0, dpr = 1, L = 0, parts = [], lc = { x: 0, y: 0 }, morph = 0, running = false, introDone = false, idle = 0, t0 = 0, gap = 4;
  const ptr = { x: -9999, y: -9999, on: false };

  function layout() {
    W = hero.clientWidth; H = hero.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    field.width = Math.round(W * dpr); field.height = Math.round(H * dpr);
    field.style.width = `${W}px`; field.style.height = `${H}px`;
    const desk = innerWidth >= 900;
    L = Math.round(desk ? Math.min(W * 0.36, H * 0.7, 540) : Math.min(W * 0.78, 380));
    lc = desk ? { x: W * 0.74, y: H * 0.52 } : { x: W / 2, y: 64 + 18 + L / 2 };
    hero.style.setProperty('--logo-h', `${L}px`);
    Object.assign(crisp.style, { width: `${L}px`, height: `${L}px`, left: `${lc.x - L / 2}px`, top: `${lc.y - L / 2}px` });
  }
  function sample() {
    const off = document.createElement('canvas'); off.width = off.height = L;
    const o = off.getContext('2d', { willReadFrequently: true }); o.drawImage(logoImg, 0, 0, L, L);
    const d = o.getImageData(0, 0, L, L).data;
    gap = Math.max(3, Math.round(L / (innerWidth >= 900 ? 105 : 80)));
    const next = [];
    for (let y = 0; y < L; y += gap) for (let x = 0; x < L; x += gap) {
      const i = (y * L + x) * 4; if (d[i + 3] < 150) continue;
      next.push({ ox: x - L / 2 + gap / 2, oy: y - L / 2 + gap / 2, c: d[i] > d[i + 1] + 60 ? 0 : 1 });
    }
    parts = next.map((q, k) => {
      const old = parts[k];
      return Object.assign(q, { x: old ? old.x : rand(0, W), y: old ? old.y : rand(0, H), vx: 0, vy: 0, rot: old ? old.rot : rand(-1.4, 1.4), delay: rand(0, 650), st: Math.random() < .35 ? rand(.6, 2.2) : 0 });
    });
  }
  function target(p) {
    const r = badge.getBoundingClientRect();
    const bx = r.left + r.width / 2, by = r.top + r.height / 2 + scrollY;
    const s = lerp(1, 30 / L, morph);
    return { x: lerp(lc.x, bx, morph) + p.ox * s, y: lerp(lc.y, by, morph) + p.oy * s, s };
  }
  const COLORS = ['#E81820', '#383838'];
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, field.width, field.height);
    const base = gap * .86;
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = COLORS[c];
      for (const p of parts) {
        if (p.c !== c) continue;
        const t = target(p), dist = Math.hypot(t.x - p.x, t.y - p.y);
        const w = Math.max(1, base * t.s * (1 + Math.min(dist / 160, 1) * p.st)), h = Math.max(1, base * t.s);
        if (Math.abs(p.rot) < .02) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h); }
        else { const cs = Math.cos(p.rot) * dpr, sn = Math.sin(p.rot) * dpr; ctx.setTransform(cs, sn, -sn, cs, p.x * dpr, p.y * dpr); ctx.fillRect(-w / 2, -h / 2, w, h); }
      }
    }
  }
  function tick(now) {
    const el = now - t0, R = innerWidth >= 900 ? 95 : 72;
    let energy = 0;
    for (const p of parts) {
      const t = target(p); let ax, ay;
      if (el > 650 + p.delay) { ax = (t.x - p.x) * .075; ay = (t.y - p.y) * .075; }
      else { ax = rand(-.25, .25); ay = rand(-.25, .25); }
      if (ptr.on) {
        const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R * 7; ax += dx / d * f; ay += dy / d * f; p.rot += rand(-.5, .5) * f / 7; }
      }
      p.vx = (p.vx + ax) * .8; p.vy = (p.vy + ay) * .8; p.x += p.vx; p.y += p.vy; p.rot *= .92;
      energy += Math.abs(p.vx) + Math.abs(p.vy);
    }
    draw();
    if (!introDone && el > 700) heroSys.lastElementChild.textContent = 'organizando';
    if (!introDone && el > 1500) { introDone = true; hero.classList.add('is-in'); heroSys.classList.add('ok'); heroSys.lastElementChild.textContent = 'organizado'; }
    idle = (energy / parts.length < .03 && !ptr.on) ? idle + 1 : 0;
    const settled = introDone && idle > 12 && morph < .01;
    crisp.style.opacity = settled ? '1' : '0';
    if (introDone && idle > 40) { running = false; setTimeout(() => { if (!running) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, field.width, field.height); } }, 380); return; }
    requestAnimationFrame(tick);
  }
  function kick() { if (!running && parts.length) { running = true; crisp.style.opacity = '0'; draw(); requestAnimationFrame(tick); } }

  function scatterTags() {
    const words = ['IPVA', 'MULTA', 'GRAVAME', 'VISTORIA', 'ATPV-e', 'CRLV-e', 'RESTRIÇÃO', 'PRAZO', 'RENAVAM', 'CRV'];
    tagsBox.innerHTML = '';
    words.forEach((w, i) => {
      const t = document.createElement('span'); t.className = 'tag'; t.textContent = w;
      const x = rand(W * .05, W * .9), y = rand(H * .12, H * .88);
      t.style.transform = `translate(${x}px,${y}px) rotate(${rand(-25, 25)}deg)`;
      tagsBox.appendChild(t);
      setTimeout(() => { t.style.transform = `translate(${lc.x - 20}px,${lc.y}px) rotate(0) scale(.2)`; t.style.opacity = '0'; }, 520 + i * 60);
    });
  }
  function startHero() {
    layout(); sample();
    if (RM) { parts.forEach(p => { const t = target(p); p.x = t.x; p.y = t.y; p.rot = 0; }); introDone = true; hero.classList.add('is-in'); heroSys.classList.add('ok'); heroSys.lastElementChild.textContent = 'organizado'; crisp.style.opacity = '1'; return; }
    scatterTags(); t0 = performance.now(); running = true; requestAnimationFrame(tick);
  }
  logoImg.decode().then(startHero).catch(() => { layout(); hero.classList.add('is-in'); crisp.style.opacity = '1'; });

  function setPtr(e) { const r = field.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true; kick(); }
  field.addEventListener('pointermove', setPtr);
  field.addEventListener('pointerdown', setPtr);
  ['pointerleave', 'pointerup', 'pointercancel'].forEach(ev => field.addEventListener(ev, () => { ptr.on = false; kick(); }));

  /* ============ 02 · PROCESSO ============ */
  const proc = $('#processo'), road = $('#road'), car = $('#roadCar'), rfBox = $('#roadFrags');
  const stations = $$('.stations i'), stages = $$('#stages li');
  let rfs = [], roadW = 0, roadL = 0;
  function buildRoad() {
    const rw = road.clientWidth, rh = road.clientHeight, n = innerWidth < 600 ? 24 : 42;
    roadL = rw * .05; roadW = rw * .9;
    rfBox.innerHTML = '';
    rfs = Array.from({ length: n }, (_, i) => {
      const el = document.createElement('i'); el.className = 'rf';
      const ox = roadL + (i + .5) / n * roadW - 7, oy = rh / 2 - 2;
      let sy = rand(8, rh - 16); if (Math.abs(sy - rh / 2) < 22) sy += sy < rh / 2 ? -26 : 26;
      el.style.cssText = `--x:${ox + rand(-40, 40)}px;--y:${sy}px;--r:${rand(-70, 70)}deg;--ox:${ox}px;--oy:${oy}px`;
      rfBox.appendChild(el); return { el, ox };
    });
  }
  function onProc() {
    const r = proc.getBoundingClientRect(), total = proc.offsetHeight - innerHeight;
    if (r.bottom < 0 || r.top > innerHeight) return;
    const q = clamp(-r.top / total, 0, 1), drive = clamp(q / .82, 0, 1);
    const cx = roadL + drive * roadW - car.offsetWidth / 2;
    car.style.setProperty('--cx', `${cx}px`);
    for (const f of rfs) f.el.classList.toggle('done', f.ox < cx + car.offsetWidth * .35);
    const idx = Math.min(3, Math.round(drive * 3));
    stations.forEach((s, i) => s.classList.toggle('on', drive >= i / 3 - .02));
    stages.forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('past', i < idx); });
    proc.classList.toggle('assembled', q > .88);
  }

  /* ============ 03 · MAPA ============ */
  const M = window.SPMAP, svg = $('#map'), NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  let dots = [], outline, route, pin, mapCar, nearSet = [];
  const F = M.cities.Franca;
  function buildMap() {
    svg.setAttribute('viewBox', `0 -20 ${M.w} ${M.h + 40}`);
    outline = mk('path', { d: M.d, class: 'outline' });
    const g = mk('g', {});
    dots = M.dots.map(([x, y]) => ({ x, y, el: mk('circle', { cx: x, cy: y, r: 3.4, class: 'd' }, g) }));
    route = mk('path', { class: 'route', d: '' });
    mk('circle', { cx: F[0], cy: F[1], r: 7, class: 'pulse' });
    mk('circle', { cx: F[0], cy: F[1], r: 7, class: 'base' });
    const lbl = mk('text', { x: F[0] + 16, y: F[1] - 10 }); lbl.textContent = 'FRANCA · BASE';
    pin = mk('circle', { r: 0, class: 'pin' });
    mapCar = mk('image', { href: 'assets/fusca.webp', width: 36, height: 38, opacity: 0 });
    const sel = $('#citySel');
    Object.keys(M.cities).sort((a, b) => a.localeCompare(b, 'pt')).forEach(n => sel.add(new Option(n, n)));
    sel.addEventListener('change', () => { const c = M.cities[sel.value]; if (c) go(c[0], c[1], sel.value, c[2]); });
  }
  function svgPt(e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  let mv = null;
  svg.addEventListener('pointermove', e => {
    if (mv) return; mv = requestAnimationFrame(() => {
      mv = null; const p = svgPt(e);
      nearSet.forEach(d => d.el.classList.remove('near'));
      nearSet = dots.filter(d => (d.x - p.x) ** 2 + (d.y - p.y) ** 2 < 4900);
      nearSet.forEach(d => d.el.classList.add('near'));
    });
  });
  svg.addEventListener('click', e => {
    const p = svgPt(e);
    const inside = outline.isPointInFill(new DOMPoint(p.x, p.y));
    if (!inside) return go(p.x, p.y, 'fora de SP', null);
    let best = null, bd = 1e9;
    for (const [n, c] of Object.entries(M.cities)) { const d = (c[0] - p.x) ** 2 + (c[1] - p.y) ** 2; if (d < bd) { bd = d; best = n; } }
    go(p.x, p.y, best, M.cities[best][2]);
  });
  let routeAnim = 0;
  function go(x, y, city, km) {
    S.city = city; sync();
    const roMain = $('#roMain'), roSub = $('#roSub');
    if (city === 'fora de SP') { roMain.innerHTML = 'Fora de <em>SP?</em>'; roSub.textContent = 'Se o veículo é registrado em São Paulo, a gente atende do mesmo jeito, pelo WhatsApp.'; }
    else if (city === 'Franca') { roMain.innerHTML = 'Franca: <em>é aqui.</em>'; roSub.textContent = 'Av. Miguel Sábio de Mello, 60 — Jardim Santana. Ou tudo pelo WhatsApp, se preferir.'; }
    else { roMain.innerHTML = `${esc(city)}: <em>0 km</em> até a gente.`; roSub.textContent = `Franca fica a uns ${km} km em linha reta. Você não precisa percorrer nenhum deles: começa pelo WhatsApp.`; }
    $$('.map .d.lit').forEach(d => d.classList.remove('lit'));
    pin.setAttribute('cx', x); pin.setAttribute('cy', y); pin.setAttribute('r', 6);
    const mx = (F[0] + x) / 2, my = (F[1] + y) / 2, dx = x - F[0], dy = y - F[1], len0 = Math.hypot(dx, dy) || 1;
    const k = .22 * len0, cx = mx + (dy / len0) * k * (dx > 0 ? -1 : 1), cy = my - Math.abs(dx / len0) * k - k * .3;
    route.setAttribute('d', `M${F[0]},${F[1]} Q${cx},${cy} ${x},${y}`);
    const len = route.getTotalLength();
    route.style.strokeDasharray = len;
    const id = ++routeAnim, dur = RM ? 0 : 1100, start = performance.now();
    const pts = Array.from({ length: 30 }, (_, i) => route.getPointAtLength(len * i / 29));
    const step = now => {
      if (id !== routeAnim) return;
      const t = dur ? clamp((now - start) / dur, 0, 1) : 1, e = ease(t);
      route.style.strokeDashoffset = String(len * (1 - e));
      const pt = route.getPointAtLength(len * e);
      mapCar.setAttribute('x', pt.x - 18); mapCar.setAttribute('y', pt.y - 30); mapCar.setAttribute('opacity', 1);
      const lim = Math.floor(e * 29);
      for (let i = 0; i <= lim; i++) for (const d of dots) if ((d.x - pts[i].x) ** 2 + (d.y - pts[i].y) ** 2 < 260) d.el.classList.add('lit');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ============ 04 · PERGUNTAS ============ */
  $('#qa').innerHTML = QA.map(([q, a, src], i) => `<div class="q"><button type="button" aria-expanded="false" aria-controls="a${i}">${esc(q)}<i aria-hidden="true"></i></button><div class="a" id="a${i}" role="region"><div><p>${esc(a)}${src ? `<small>${esc(src)}</small>` : ''}</p></div></div></div>`).join('');
  $('#qa').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const q = b.parentElement, open = !q.classList.contains('open');
    $$('.q.open').forEach(x => { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
    if (open) { q.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
  });

  /* ============ 05 · COMPOSITOR ============ */
  const plate = $('#plate'), plateBox = $('#plateBox'), plateMsg = $('#plateMsg');
  plate.addEventListener('input', () => {
    const v = plate.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    plate.value = v;
    const ok = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(v);
    plateBox.classList.toggle('ok', ok); plateMsg.classList.toggle('ok', ok);
    plateMsg.textContent = ok ? 'placa válida' : v.length === 7 ? 'confere: 3 letras + 4 caracteres (ABC1D23 ou ABC1234)' : 'opcional · ajuda a conferir mais rápido';
    S.plate = ok ? v : ''; sync();
  });
  const launch = $('#launch'), composer = $('#composer');
  composer.addEventListener('submit', e => {
    e.preventDefault();
    const url = waURL();
    if (RM) { location.href = url; return; }
    // ação = aceleração: palavras condensam no anel, o anel fecha, o fusca sai
    const words = message().split(' ');
    bMsg.innerHTML = words.map(w => `<span class="w">${esc(w)}</span>`).join(' ');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    [...bMsg.children].forEach((s, i) => {
      const r = s.getBoundingClientRect();
      s.style.transitionDelay = `${i * 14}ms`;
      s.style.transform = `translate(${cx - r.left - r.width / 2}px,${cy - r.top - r.height / 2}px) scale(.1) rotate(${rand(-40, 40)}deg)`;
      s.style.opacity = '0';
    });
    setTimeout(() => launch.classList.add('on'), 380);
    setTimeout(() => launch.classList.add('go'), 1050);
    setTimeout(() => { location.href = url; }, 1400);
  });
  addEventListener('pageshow', () => { launch.classList.remove('on', 'go'); sync(); });

  /* ============ sistema: barra, status, progresso, dock ============ */
  const ring = $('#ring'), dock = $('#dock'), status = $('#status');
  const C = 2 * Math.PI * 19;
  let agoraVisible = false;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    ring.style.strokeDashoffset = String(C * (1 - clamp(y / max, 0, 1)));
    bar.classList.toggle('scrolled', y > 8);
    const hh = H || innerHeight;
    const m = RM ? (y > hh * .4 ? 1 : 0) : ease(clamp(y / (hh * .55), 0, 1));
    if (m !== morph) { morph = m; kick(); }
    field.style.opacity = String(1 - clamp((morph - .85) / .15, 0, 1));
    bar.classList.toggle('docked', morph > .97);
    dock.classList.toggle('on', y > hh * .8 && !agoraVisible);
    onProc();
  }
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) status.textContent = en.target.dataset.status;
    if (en.target.id === 'agora') { agoraVisible = en.isIntersecting; onScroll(); }
  }), { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  $$('[data-status]').forEach(s => io.observe(s));

  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); if (logoImg.complete) { sample(); kick(); } buildRoad(); onScroll(); }, 160); });

  // altura do hero muda quando as fontes carregam: canvas nunca pode esticar
  let lastH = 0;
  new ResizeObserver(() => { const h = hero.clientHeight; if (Math.abs(h - lastH) < 2) return; lastH = h; const oldL = L; layout(); if (parts.length && L !== oldL) sample(); kick(); }).observe(hero);

  buildMap(); buildRoad(); sync(); onScroll();
})();
