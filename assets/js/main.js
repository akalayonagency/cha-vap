/* ==========================================================================
   Cha'Vap · interactions
   - fumée temps réel (WebGL)            -> Smoke
   - bouffées de vapeur (cœurs, pouf)     -> Puffs
   - le chat : souffle, conseils, apparitions, traversée
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth < 760;
  const rand = (a, b) => a + Math.random() * (b - a);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
  };

  const TIPS = [
    'Résistance neuve ? Imbibez bien le coton d’e-liquide et patientez quelques minutes avant la première bouffée.',
    'Un goût de brûlé ? Votre résistance est sûrement en fin de vie : il est temps de la changer.',
    'Conservez vos e-liquides à l’abri de la lumière et de la chaleur : leurs arômes resteront intacts.',
    'Agitez votre flacon avant de remplir votre réservoir : les arômes se mélangent mieux.',
    'Tirage serré ou aérien ? La résistance et l’e-liquide se choisissent en fonction. On vous explique tout en boutique !',
    'Gardez toujours une résistance d’avance : la panne arrive rarement au bon moment.',
    'Changement de saveur ? Rincez votre réservoir à l’eau tiède et laissez-le bien sécher.',
    'Rechargez votre matériel avec un câble adapté, et évitez de le laisser charger toute la nuit.',
    'Vos accus voyagent avec vous ? Toujours dans un étui de protection, jamais en vrac dans une poche.',
    'Le bon taux de nicotine dépend de vos habitudes : on en parle ensemble, sans jugement.'
  ];
  let tipIndex = 0;
  const nextTip = () => TIPS[(tipIndex = (tipIndex + 1) % TIPS.length)];

  document.documentElement.classList.add('js');

  /* ------------------------------------------------------------------------
     Fumée temps réel (WebGL) : bruit fractal déformé, monte et s'écarte
     sous le curseur.
     ------------------------------------------------------------------------ */
  const VERT = 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uAmt; uniform float uMode; uniform float uSeed;
varying vec2 v;
float hash(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*noise(p);p=m*p;a*=.5;}return s;}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=vec2(v.x*asp,v.y)*1.7+uSeed;
  vec2 m=vec2(uMouse.x/uRes.y,uMouse.y/uRes.y)*1.7+uSeed;
  vec2 dm=p-m; float md=length(dm);
  p+=dm/(md+.001)*.3*exp(-md*2.6);
  float t=uTime*.05;
  p.y-=t*1.6;
  vec2 q=vec2(fbm(p+vec2(0.,t*.6)),fbm(p+vec2(5.2,1.3)-t*.5));
  vec2 r=vec2(fbm(p+2.6*q+vec2(1.7,9.2)+t*.9),fbm(p+2.6*q+vec2(8.3,2.8)-t*.7));
  float f=fbm(p+2.4*r);
  float d=pow(clamp(f*1.45+.35*length(r)-.55,0.,1.),2.)*1.7;
  float mask=1.;
  if(uMode<.5){ /* hero : nappes basses + autour du chat */
    float low=smoothstep(.85,.05,v.y);
    float cat=smoothstep(.6,.0,length((v-vec2(.27,.42))*vec2(1.3,1.)));
    mask=clamp(low*.75+cat*.6,0.,1.)*(1.-.5*smoothstep(.25,.0,abs(v.x-.72))*smoothstep(.2,.6,v.y));
  } else if(uMode>1.5){ /* pied de page */
    mask=smoothstep(1.,.0,v.y);
  } else { /* écran d'accueil */
    mask=.65+.35*smoothstep(.9,.1,v.y);
  }
  d*=mask*uAmt;
  vec3 deep=vec3(.0,.42,.52), light=vec3(.78,.99,1.);
  vec3 col=mix(deep,light,clamp(d*1.5+length(q)*.25-.25,0.,1.));
  gl_FragColor=vec4(col*d,d);
}`;

  class Smoke {
    constructor(canvas, mode) {
      this.c = canvas;
      this.mode = mode;
      this.amt = mode === 1 ? .85 : mode === 2 ? .8 : .9;
      this.boost = 0;
      this.mouse = [-9999, -9999];
      this.target = [-9999, -9999];
      this.on = false;
      this.t0 = performance.now() - rand(0, 20000);
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
      if (!gl) return;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
      gl.useProgram(pr);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      ['uRes', 'uTime', 'uMouse', 'uAmt', 'uMode', 'uSeed'].forEach(n => (this.u[n] = gl.getUniformLocation(pr, n)));
      gl.uniform1f(this.u.uMode, mode);
      gl.uniform1f(this.u.uSeed, rand(0, 50));
      this.gl = gl;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => (e.isIntersecting ? this.start() : this.stop()), { rootMargin: '80px' }).observe(canvas);
      window.addEventListener('pointermove', e => {
        const r = this.c.getBoundingClientRect();
        this.target = [(e.clientX - r.left) * this.k, (r.bottom - e.clientY) * this.k];
      }, { passive: true });
      if (reduced) this.draw(performance.now());
    }
    resize() {
      if (!this.gl) return;
      this.k = isSmall() ? .32 : .5;
      const w = Math.max(2, Math.round(this.c.clientWidth * this.k));
      const h = Math.max(2, Math.round(this.c.clientHeight * this.k));
      if (this.c.width !== w || this.c.height !== h) {
        this.c.width = w; this.c.height = h;
        this.gl.viewport(0, 0, w, h);
        this.gl.uniform2f(this.u.uRes, w, h);
        if (reduced) this.draw(performance.now());
      }
    }
    start() { if (this.on || !this.gl || reduced) return; this.on = true; const loop = now => { if (!this.on) return; this.draw(now); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
    stop() { this.on = false; cancelAnimationFrame(this.raf); }
    surge(v = 1) { this.boost = Math.max(this.boost, v); }
    draw(now) {
      const gl = this.gl;
      this.mouse[0] += (this.target[0] - this.mouse[0]) * .06;
      this.mouse[1] += (this.target[1] - this.mouse[1]) * .06;
      this.boost *= .97;
      gl.uniform1f(this.u.uTime, (now - this.t0) / 1000);
      gl.uniform2f(this.u.uMouse, this.mouse[0], this.mouse[1]);
      gl.uniform1f(this.u.uAmt, this.amt + this.boost);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  const smokes = {};
  $$('canvas[data-smoke]').forEach(c => {
    const mode = { hero: 0, gate: 1, footer: 2 }[c.dataset.smoke];
    smokes[c.dataset.smoke] = new Smoke(c, mode);
  });
  document.addEventListener('visibilitychange', () => {
    Object.values(smokes).forEach(s => (document.hidden ? s.stop() : (s.c.isConnected && isVisible(s.c) && s.start())));
  });
  function isVisible(el) { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden'; }

  /* ------------------------------------------------------------------------
     Bouffées de vapeur : particules texturées (cœur, pouf, volutes)
     ------------------------------------------------------------------------ */
  const Puffs = (() => {
    const cv = $('#puffs');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0;
    const parts = [];
    const emitters = new Set();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    addEventListener('resize', resize);

    // texture de fumée : disque doux modulé par du bruit fractal
    function vnoise(seed) {
      const g = new Float32Array(17 * 17);
      for (let i = 0; i < g.length; i++) g[i] = Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1;
      return (x, y) => {
        const xi = Math.floor(x) % 16, yi = Math.floor(y) % 16, xf = x - Math.floor(x), yf = y - Math.floor(y);
        const s = t => t * t * (3 - 2 * t), a = g[yi * 17 + xi], b = g[yi * 17 + xi + 1], c = g[(yi + 1) * 17 + xi], d = g[(yi + 1) * 17 + xi + 1];
        return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
      };
    }
    function sprite(seed, tint) {
      const S = 128, c = document.createElement('canvas');
      c.width = c.height = S;
      const k = c.getContext('2d'), img = k.createImageData(S, S), n = vnoise(seed);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2), r = Math.sqrt(dx * dx + dy * dy);
        let f = 0, a = .5, fx = x / 22, fy = y / 22;
        for (let o = 0; o < 4; o++) { f += a * n(fx, fy); fx *= 2; fy *= 2; a *= .5; }
        const fall = Math.max(0, 1 - r); const al = Math.pow(fall, 1.6) * Math.max(0, f * 1.6 - .35);
        const i = (y * S + x) * 4;
        img.data[i] = tint[0]; img.data[i + 1] = tint[1]; img.data[i + 2] = tint[2]; img.data[i + 3] = Math.min(255, al * 255);
      }
      k.putImageData(img, 0, 0);
      return c;
    }
    const sprites = [sprite(1, [225, 252, 255]), sprite(2, [190, 248, 255]), sprite(3, [120, 236, 250]), sprite(4, [240, 254, 255])];

    function add(p) {
      parts.push(Object.assign({ age: 0, life: 2.4, size: 30, grow: 30, a: .3, rot: rand(0, 6.28), vr: rand(-.6, .6), vx: 0, vy: 0, drag: .985, rise: 14, spr: sprites[(Math.random() * sprites.length) | 0] }, p));
      if (parts.length > 900) parts.splice(0, parts.length - 900);
      wake();
    }
    function wake() { if (!raf) { last = performance.now(); lastY = scrollY; raf = requestAnimationFrame(tick); } }
    let lastY = scrollY;
    function tick(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const sy = lastY - scrollY; lastY = scrollY; // la fumée suit le défilement de la page
      if (sy) for (const p of parts) { p.y += sy; if (p.travel) { p.fy += sy; p.ty += sy; } }
      emitters.forEach(fn => fn(dt));
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
        if (p.travel && p.age < p.travel) { // trajet de la bouche vers la forme
          const e = 1 - Math.pow(1 - p.age / p.travel, 3);
          p.x = p.fx + (p.tx - p.fx) * e + Math.sin(p.age * 7 + p.rot) * 3;
          p.y = p.fy + (p.ty - p.fy) * e - 18 * Math.sin(Math.PI * p.age / p.travel);
        } else {
          p.vx *= p.drag; p.vy = p.vy * p.drag - p.rise * dt;
          p.x += p.vx * dt + Math.sin((p.age + p.rot) * 1.7) * .25; p.y += p.vy * dt;
        }
        p.size += p.grow * dt; p.rot += p.vr * dt;
        const k = p.age / p.life, fade = k < .15 ? k / .15 : 1 - Math.pow((k - .15) / .85, 1.4);
        ctx.globalAlpha = Math.max(0, p.a * fade);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(p.spr, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = (parts.length || emitters.size) ? requestAnimationFrame(tick) : 0;
    }

    // nuage-cœur du logo officiel, fondu en « screen »
    const heartSrc = 'assets/img/visuels/nuage-coeur.webp?v=3';
    new Image().src = heartSrc;
    function heartPhoto(x, y, cx, cy, size, dir) {
      const im = document.createElement('img'), wrap = document.createElement('div');
      im.src = heartSrc; im.alt = ''; im.className = 'heart-photo';
      wrap.className = 'heart-wrap';
      const w = size * 1.2, h = w * 412 / 380, y0 = scrollY;
      im.style.width = w + 'px';
      wrap.appendChild(im);
      document.body.appendChild(wrap);
      const follow = () => (wrap.style.translate = `0 ${y0 - scrollY}px`);
      addEventListener('scroll', follow, { passive: true });
      const at = (px, py, s, r) => `translate(${px - w * .5}px, ${py - h / 2}px) scale(${dir * s}, ${s}) rotate(${r}deg)`;
      const a = im.animate([
        { transform: at(x, y, .12, -18 * dir), opacity: 0 },
        { transform: at(cx - dir * size * .12, cy + size * .1, .7, -6 * dir), opacity: .95, offset: .22 },
        { transform: at(cx, cy, 1, 0), opacity: 1, offset: .38 },
        { transform: at(cx + dir * size * .1, cy - size * .25, 1.1, 2 * dir), opacity: .85, offset: .68 },
        { transform: at(cx + dir * size * .25, cy - size * .7, 1.3, 4 * dir), opacity: 0 }
      ], { duration: 5600, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      a.onfinish = () => { removeEventListener('scroll', follow); wrap.remove(); };
    }

    return {
      // cœur de vapeur : la photo du nuage-cœur s'envole, entourée de particules qui partent de la bouche
      heart(x, y, o = {}) {
        if (reduced) return;
        const size = o.size || 170, dir = o.dir || 1;
        const cx = x + dir * size * (o.dx ?? .75), cy = y - size * (o.dy ?? .85);
        heartPhoto(x, y, cx, cy, size, dir);
        const s = size / 34, N = Math.round(size * .3);
        for (let i = 0; i < N; i++) {
          const t = (i / N) * Math.PI * 2 + rand(-.05, .05);
          const hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const tx = cx + hx * s * 1.05 + rand(-5, 5), ty = cy + hy * s * 1.05 + rand(-5, 5);
          add({ x, y, fx: x + rand(-4, 4), fy: y + rand(-3, 3), tx, ty, travel: rand(.8, 1.1) + i * .003, life: rand(2.6, 3.4), size: size * rand(.2, .3), grow: size * .12, a: rand(.22, .34), vx: dir * rand(4, 14), vy: rand(-16, -6), rise: 8, drag: .99 });
        }
        for (let i = 0; i < 18; i++) // traînée de la bouche
          add({ x: x + dir * rand(0, size * .3), y: y - rand(0, size * .3), vx: dir * rand(30, 80), vy: rand(-60, -20), life: rand(1.8, 2.6), size: size * rand(.14, .22), grow: size * .3, a: rand(.25, .38) });
      },
      // pouf : apparition / disparition
      poof(x, y, o = {}) {
        if (reduced) return;
        const r = o.size || 120;
        for (let i = 0; i < 46; i++) {
          const a = rand(0, Math.PI * 2), sp = rand(.4, 1) * r * 1.6;
          add({ x: x + Math.cos(a) * r * .15, y: y + Math.sin(a) * r * .15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8, drag: .93, rise: 10, life: rand(1.2, 2), size: r * rand(.35, .6), grow: r * .5, a: rand(.25, .4) });
        }
      },
      wisp(x, y, o = {}) {
        if (reduced) return;
        add({ x: x + rand(-3, 3), y: y + rand(-3, 3), vx: (o.vx ?? 18) + rand(-8, 8), vy: (o.vy ?? -26) + rand(-8, 6), life: o.life || rand(2.4, 3.4), size: o.size || rand(14, 22), grow: o.grow || rand(18, 30), a: o.a || rand(.12, .2), rise: 8, drag: .99 });
      },
      cloud(x, y, w) {
        if (reduced) return;
        add({ x: x + rand(-w * .45, w * .45), y: y + rand(-8, 8), vx: rand(-14, 14), vy: rand(-6, 6), life: rand(1.2, 1.9), size: w * rand(.3, .5), grow: w * .25, a: rand(.22, .34), rise: 4, drag: .97 });
      },
      emitter(fn) { emitters.add(fn); wake(); return () => emitters.delete(fn); }
    };
  })();

  /* ------------------------------------------------------------------------
     Bulles de conseil
     ------------------------------------------------------------------------ */
  function showBubble(el, html, ms = 5600) {
    el.innerHTML = html;
    el.classList.add('is-on');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-on'), ms);
  }
  const tipHTML = (title, text) => `<strong>${title}</strong>${text}`;

  /* ------------------------------------------------------------------------
     Le chat du hero
     ------------------------------------------------------------------------ */
  const heroCat = $('#heroCat');
  const heroImg = heroCat && $('.cat-img', heroCat);
  const heroBubble = $('#heroBubble');
  const hint = $('.hero__hint');
  const MOUTH = { x: .570, y: .319 };   // coin de la bouche sur chat-nuage.webp
  const TIP_END = { x: .438, y: .465 }; // embout du clearomiseur

  function pointOn(img, pt) {
    const r = img.getBoundingClientRect();
    return { x: r.left + r.width * pt.x, y: r.top + r.height * pt.y, w: r.width, visible: r.bottom > 0 && r.top < innerHeight };
  }
  function heroPuff(withTip) {
    if (!heroImg) return;
    const m = pointOn(heroImg, MOUTH);
    if (!m.visible) return;
    Puffs.heart(m.x, m.y, { size: Math.max(110, m.w * .32), dx: .5, dy: .95 });
    smokes.hero && smokes.hero.surge(.35);
    heroCat.classList.remove('is-puffing'); void heroCat.offsetWidth; heroCat.classList.add('is-puffing');
    if (withTip) showBubble(heroBubble, tipHTML('Le conseil du chat', nextTip()));
  }
  if (heroCat) {
    if (hint && matchMedia('(hover: none)').matches) hint.lastChild.textContent = ' Touchez le chat';
    heroCat.addEventListener('click', () => { heroPuff(true); hint && hint.classList.remove('is-on'); });
    // volutes au repos : un filet depuis l'embout, une expiration de temps en temps
    let acc = 0, breath = 0;
    let heroVisible = true;
    new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(heroCat);
    Puffs.emitter(dt => {
      if (!heroVisible || document.hidden || reduced) return;
      acc += dt; breath += dt;
      if (acc > .22) {
        acc = 0;
        const tip = pointOn(heroImg, TIP_END);
        Puffs.wisp(tip.x, tip.y, { vx: rand(-6, 10), vy: rand(-30, -18), size: tip.w * .03, grow: tip.w * .05, a: .1 });
      }
      if (breath > 6.5) {
        breath = rand(-2, 0);
        const m = pointOn(heroImg, MOUTH);
        for (let i = 0; i < 6; i++) Puffs.wisp(m.x, m.y, { vx: rand(40, 80), vy: rand(-36, -12), size: m.w * .05, grow: m.w * .12, a: .16, life: rand(2.6, 3.6) });
      }
    });
    // parallaxe à la souris
    if (!reduced) {
      const wrap = $('.hero__cat');
      addEventListener('pointermove', e => {
        if (isSmall()) return;
        const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
        wrap.style.translate = `${dx * -14}px ${dy * -10}px`;
      }, { passive: true });
    }
  }
  let heroTimer;
  function startHero() {
    if (!heroCat) return;
    setTimeout(() => {
      heroPuff(false);
      showBubble(heroBubble, tipHTML('Miaou !', 'Bienvenue chez Cha’Vap. Cliquez sur moi pour un conseil de pro.'), isSmall() ? 4200 : 6000);
    }, 1300);
    setTimeout(() => hint && hint.classList.add('is-on'), 4200);
    setTimeout(() => hint && hint.classList.remove('is-on'), 12000);
    clearInterval(heroTimer);
    heroTimer = setInterval(() => { if (!document.hidden && scrollY < innerHeight * .5) heroPuff(false); }, 11000);
    Roam.arm();
  }

  /* ------------------------------------------------------------------------
     Le chat qui passe une tête (bords de l'écran) et qui traverse sur son nuage
     ------------------------------------------------------------------------ */
  const Roam = (() => {
    const peek = $('#peek'), bubble = $('#peekBubble'), fly = $('#flyby');
    const PEEK_MOUTH = { x: .52, y: .576 };
    let busy = false, armed = false, lastShow = 0, hideT, nextT;
    const seen = new Set();
    const infos = $('#infos');
    let infosVisible = false;
    infos && new IntersectionObserver(([e]) => (infosVisible = e.isIntersecting), { threshold: .2 }).observe(infos);

    function canShow() {
      return armed && !busy && !document.hidden && !document.body.classList.contains('is-locked') && scrollY > innerHeight * .6 && performance.now() - lastShow > 14000;
    }
    function show(side) {
      if (!canShow()) return;
      busy = true; lastShow = performance.now();
      side = infosVisible ? 'right' : (side || (Math.random() < .5 ? 'left' : 'right'));
      peek.classList.toggle('peek--right', side === 'right');
      bubble.classList.toggle('is-right', side === 'right');
      peek.style.top = isSmall() ? '' : `${rand(30, 62)}%`;
      void peek.offsetWidth;
      peek.classList.add('is-out');
      peek.tabIndex = 0;
      setTimeout(() => {
        const img = $('img', peek), r = img.getBoundingClientRect();
        const x = side === 'right' ? r.right - r.width * PEEK_MOUTH.x : r.left + r.width * PEEK_MOUTH.x;
        for (let i = 0; i < 5; i++) Puffs.wisp(x, r.top + r.height * PEEK_MOUTH.y, { vx: (side === 'right' ? -1 : 1) * rand(30, 60), vy: rand(-30, -10), size: r.width * .14, grow: r.width * .3, a: .18 });
      }, 900);
      clearTimeout(hideT);
      hideT = setTimeout(hide, 6500);
    }
    function hide() {
      if (peek.matches(':hover, :focus-visible')) { hideT = setTimeout(hide, 2000); return; }
      peek.classList.remove('is-out');
      peek.tabIndex = -1;
      bubble.classList.remove('is-on');
      setTimeout(() => (busy = false), 900);
    }
    peek.addEventListener('click', () => {
      const img = $('img', peek), r = img.getBoundingClientRect(), right = peek.classList.contains('peek--right');
      const x = right ? r.right - r.width * PEEK_MOUTH.x : r.left + r.width * PEEK_MOUTH.x;
      Puffs.heart(x, r.top + r.height * PEEK_MOUTH.y, { size: 120, dir: right ? -1 : 1, dx: .9, dy: .7 });
      showBubble(bubble, tipHTML('Psst…', nextTip()), 6000);
      clearTimeout(hideT);
      hideT = setTimeout(hide, 6500);
    });

    function flyby() {
      if (reduced || busy || !armed || document.hidden || document.body.classList.contains('is-locked')) return;
      busy = true; lastShow = performance.now();
      const ltr = Math.random() < .7, dur = isSmall() ? 6500 : 8500, img = $('img', fly);
      const y0 = innerHeight * rand(.22, .5), t0 = performance.now();
      fly.style.opacity = '1';
      fly.style.scale = ltr ? '1 1' : '-1 1';
      let stop = null;
      const step = now => {
        const k = (now - t0) / dur;
        if (k >= 1) { fly.style.opacity = '0'; stop && stop(); busy = false; return; }
        const w = fly.offsetWidth, x = ltr ? -w + (innerWidth + w * 2) * k : innerWidth + w - (innerWidth + w * 2) * k;
        const y = y0 + Math.sin(k * Math.PI * 4) * 22 - Math.sin(k * Math.PI) * 40;
        fly.style.transform = `translate(${x}px, ${y}px) rotate(${Math.sin(k * Math.PI * 4 + 1) * 5}deg)`;
        requestAnimationFrame(step);
      };
      let acc = 0;
      stop = Puffs.emitter(dt => {
        acc += dt;
        const r = img.getBoundingClientRect();
        if (acc > .06) { acc = 0; Puffs.cloud(r.left + r.width * (ltr ? .3 : .7), r.bottom - r.height * .22, r.width * .7); }
      });
      requestAnimationFrame(step);
    }

    function loop() {
      clearTimeout(nextT);
      nextT = setTimeout(() => { Math.random() < .3 ? flyby() : show(); loop(); }, rand(32000, 52000));
    }
    // apparitions liées au défilement (une fois par section)
    const triggers = [['galerie', () => show()], ['univers', () => flyby()], ['infos', () => show('right')]];
    triggers.forEach(([id, fn]) => {
      const el = document.getElementById(id);
      el && new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !seen.has(id) && armed) { seen.add(id); setTimeout(fn, 1200); }
      }, { threshold: .35 }).observe(el);
    });

    return {
      arm() { if (armed) return; armed = true; setTimeout(() => show(), 20000); loop(); },
      show, flyby
    };
  })();

  /* ------------------------------------------------------------------------
     Section conseils : le chat apparaît dans un pouf de fumée
     ------------------------------------------------------------------------ */
  const tipCat = $('#tipCat'), tipText = $('#tipText'), tipNextBtn = $('#tipNext');
  const TIPCAT_MOUTH = { x: .567, y: .309 };
  function changeTip() {
    tipText.classList.add('is-out');
    setTimeout(() => { tipText.textContent = nextTip(); tipText.classList.remove('is-out'); }, 300);
    const img = $('.cat-img', tipCat), m = pointOn(img, TIPCAT_MOUTH);
    if (m.visible) Puffs.heart(m.x, m.y, { size: Math.max(100, m.w * .3), dx: .9, dy: .8 });
  }
  if (tipCat) {
    tipCat.addEventListener('click', changeTip);
    tipNextBtn.addEventListener('click', changeTip);
    if (!reduced) {
      tipCat.classList.add('is-hidden');
      new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        setTimeout(() => {
          const r = tipCat.getBoundingClientRect();
          Puffs.poof(r.left + r.width / 2, r.top + r.height * .5, { size: r.width * .45 });
          setTimeout(() => tipCat.classList.remove('is-hidden'), 160);
        }, 350);
      }, { threshold: .45 }).observe(tipCat);
    }
  }

  /* ------------------------------------------------------------------------
     Contrôle de l'âge (écran d'accueil)
     ------------------------------------------------------------------------ */
  const gate = $('#gate');
  function enterSite(animated) {
    document.body.classList.remove('is-locked');
    if (!gate) return startHero();
    if (!animated) { gate.remove(); smokes.gate && smokes.gate.stop(); return startHero(); }
    smokes.gate && smokes.gate.surge(1.2);
    Puffs.poof(innerWidth / 2, innerHeight / 2, { size: Math.min(innerWidth, 700) * .45 });
    gate.classList.add('is-leaving');
    setTimeout(() => { smokes.gate && smokes.gate.stop(); gate.remove(); }, 1200);
    setTimeout(startHero, 450);
  }
  if (gate) {
    // lien de démonstration : ?apercu saute l'écran d'âge
    if (store.get('chavap-age') === '1' || new URLSearchParams(location.search).has('apercu')) enterSite(false);
    else {
      document.body.classList.add('is-locked');
      const yes = $('[data-gate="yes"]', gate), no = $('[data-gate="no"]', gate);
      setTimeout(() => yes.focus({ preventScroll: true }), 600);
      yes.addEventListener('click', () => { store.set('chavap-age', '1'); enterSite(true); });
      no.addEventListener('click', () => { $('.gate__actions', gate).hidden = true; $('.gate__no', gate).hidden = false; });
      gate.addEventListener('keydown', e => { // garder le focus dans la fenêtre
        if (e.key !== 'Tab') return;
        const f = $$('button:not([hidden])', gate).filter(b => b.offsetParent);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      });
    }
  } else startHero();

  /* ------------------------------------------------------------------------
     En-tête, menu mobile, lien actif
     ------------------------------------------------------------------------ */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger'), menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); document.body.classList.add('is-locked'); }
    else { menu.classList.remove('is-open'); menu.hidden = true; if (!gate || !gate.isConnected) document.body.classList.remove('is-locked'); }
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  const navLinks = $$('.nav a');
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => {
        if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navObs.observe(s));

  /* ------------------------------------------------------------------------
     Apparitions au défilement + parallaxe
     ------------------------------------------------------------------------ */
  $$('[data-reveal-group]').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--d', `${i * 0.09}s`)));
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealObs.unobserve(e.target); } });
  }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-reveal-group]').forEach(el => revealObs.observe(el));
  // délai en cascade pour les éléments d'un même bloc
  $$('.boutique__text, .conseils__text, .infos__text, .infos__find, .section__head').forEach(b => $$(':scope > [data-reveal]', b).forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`)));

  const para = $$('[data-parallax]').filter(el => !el.classList.contains('hero__cat'));
  if (!reduced && para.length) {
    let ticking = false;
    const run = () => {
      ticking = false;
      if (isSmall()) { para.forEach(el => (el.style.translate = '')); return; }
      para.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax) * -.15;
        el.style.translate = `0 ${off.toFixed(1)}px`;
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ------------------------------------------------------------------------
     Rayons du hero -> met en valeur la carte produit
     ------------------------------------------------------------------------ */
  $$('.rayons a[data-product]').forEach(a => a.addEventListener('click', () => {
    const card = document.getElementById('p-' + a.dataset.product);
    if (!card) return;
    setTimeout(() => { card.classList.add('is-flash'); setTimeout(() => card.classList.remove('is-flash'), 1800); }, 700);
  }));

  /* ------------------------------------------------------------------------
     Horaires : ouvert / fermé en direct (heure de Paris)
     ------------------------------------------------------------------------ */
  const status = $('#openStatus');
  if (status) {
    const SLOTS = { 2: [[600, 780], [840, 1140]], 3: [[600, 780], [840, 1140]], 4: [[600, 780], [840, 1140]], 5: [[600, 780], [840, 1140]], 6: [[600, 780], [840, 1140]] };
    const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const fmt = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
    const update = () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
      const d = now.getDay(), min = now.getHours() * 60 + now.getMinutes(), slots = SLOTS[d] || [];
      let txt, open = false;
      const cur = slots.find(([a, b]) => min >= a && min < b);
      if (cur) { open = true; txt = `Ouvert maintenant · jusqu’à ${fmt(cur[1])}`; }
      else {
        const later = slots.find(([a]) => min < a);
        if (later) txt = min >= 780 && min < 840 ? `Pause déjeuner · réouverture à ${fmt(later[0])}` : `Fermé · ouvre aujourd’hui à ${fmt(later[0])}`;
        else {
          for (let i = 1; i <= 7; i++) {
            const nd = (d + i) % 7;
            if (SLOTS[nd]) { txt = `Fermé · ouvre ${i === 1 ? 'demain' : DAYS[nd]} à ${fmt(SLOTS[nd][0][0])}`; break; }
          }
        }
      }
      status.classList.toggle('is-open', open);
      status.classList.toggle('is-closed', !open);
      $('.status__text', status).textContent = txt;
      $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(d))));
    };
    update();
    setInterval(update, 60000);
  }

  /* ------------------------------------------------------------------------
     Galerie + visionneuse
     ------------------------------------------------------------------------ */
  const lb = $('#lightbox');
  const shots = $$('.shot');
  let cur = 0;
  function openShot(i) {
    cur = (i + shots.length) % shots.length;
    const s = shots[cur], im = $('img', lb);
    im.src = s.dataset.full; im.alt = $('img', s).alt;
    $('figcaption', lb).textContent = $('.shot__cap', s).textContent;
    if (!lb.open) lb.showModal();
  }
  if (lb && lb.showModal) {
    shots.forEach((s, i) => s.addEventListener('click', () => openShot(i)));
    $$('[data-step]', lb).forEach(b => b.addEventListener('click', () => openShot(cur + Number(b.dataset.step))));
    $('[data-close]', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') openShot(cur + 1); if (e.key === 'ArrowLeft') openShot(cur - 1); });
  }

  /* ------------------------------------------------------------------------
     Plan (chargé à la demande, rien n'est envoyé avant le clic)
     ------------------------------------------------------------------------ */
  const mapBtn = $('#mapLoad');
  mapBtn && mapBtn.addEventListener('click', () => {
    const map = $('#map');
    const f = document.createElement('iframe');
    f.title = 'Plan d’accès à la boutique Cha’Vap';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=2.3372%2C48.8506%2C2.3672%2C48.8626&layer=mapnik&marker=48.8566%2C2.3522';
    map.prepend(f);
    map.classList.add('is-live');
  });

  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
})();
