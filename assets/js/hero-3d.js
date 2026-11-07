/* Gardens RFC: the 3D stadium that fills the homepage hero (three.js r128 in assets/js/vendor/three-r128-bloom.js).
   A floodlit pitch with the posts, three big screens (team photo, stadium, crest), a ticker ring overhead and the
   squad flying one by one into the team photo on the grass; then every 11 seconds a conversion sails through the posts.
   The pulsing crest covers the hero while the scene is built (.is-ready lifts it). When WebGL is unavailable the
   hero gets .no-3d and shows the still photo instead. Waits for the crest intro (intro.js) to lift before the
   players fly in. Reduced motion: one still frame of the finished scene. Images are in assets/img/hero3d. */
(() => {
  const canvas = document.getElementById("hero-stage");
  if (!canvas) return;
  const hero = canvas.parentElement;
  const fail = () => hero.classList.add("no-3d");

  // The menu and score ribbon are fixed over the top of the hero: the scene and the club name fit in the
  // space below them (--hdr in style.css). Measured only while the header is at full height, at the top of the page.
  const header = document.querySelector(".site-header");
  const fitHeader = () => { if (header && !header.classList.contains("solid")) hero.style.setProperty("--hdr", header.offsetHeight + "px"); };
  fitHeader();
  if (header && window.ResizeObserver) new ResizeObserver(fitHeader).observe(header);

  if (!window.WebGLRenderingContext) { fail(); return; }
  // three.js is fetched from here rather than listed in the page, so the scene starts building at once
  // instead of waiting behind the Google Sheet content (api/content) that the page loads first
  const lib = document.createElement("script");
  lib.src = "assets/js/vendor/three-r128-bloom.js";
  lib.onload = start;
  lib.onerror = fail;
  document.head.append(lib);

  function start() {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
    catch { fail(); return; }
    const small = Math.min(innerWidth, innerHeight) < 700;
    renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const DIR = "assets/img/hero3d/";
    const IMG = {
      players: Array.from({ length: 15 }, (_, i) => DIR + "player-" + String(i).padStart(2, "0") + ".webp"),
      team: DIR + "team.jpg",
      stadium: DIR + "stadium.jpg",
      crest: DIR + "crest.webp"
    };
    // Where each player stands in the team photo (fractions of the photo), used to place them on the pitch
    const PL = [{"x0": 0.0, "x1": 0.181640625, "y0": 0.17885024840312277, "y1": 0.8786373314407381, "feet": 0.8812663915565118}, {"x0": 0.779296875, "x1": 0.958984375, "y0": 0.14762242725337119, "y1": 0.8807665010645848, "feet": 0.8816531352577183}, {"x0": 0.1396484375, "x1": 0.29931640625, "y0": 0.4201561391057488, "y1": 0.8942512420156139, "feet": 0.8957681540820174}, {"x0": 0.69580078125, "x1": 0.85205078125, "y0": 0.44073811213626685, "y1": 0.9198012775017743, "feet": 0.9239517547629081}, {"x0": 0.431640625, "x1": 0.64697265625, "y0": 0.46770759403832507, "y1": 0.9276082327892122, "feet": 0.9303377908201739}, {"x0": 0.5478515625, "x1": 0.7197265625, "y0": 0.36905606813342795, "y1": 0.9063165365507452, "feet": 0.9054630839968506}, {"x0": 0.55908203125, "x1": 0.72998046875, "y0": 0.21930447125621008, "y1": 0.5287437899219305, "feet": 0.5255749866926899}, {"x0": 0.3662109375, "x1": 0.49365234375, "y0": 0.4088005677785664, "y1": 0.872959545777147, "feet": 0.8745144044701473}, {"x0": 0.369140625, "x1": 0.52978515625, "y0": 0.20652945351312987, "y1": 0.518097941802697, "feet": 0.5138874257008517}, {"x0": 0.2138671875, "x1": 0.431640625, "y0": 0.20085166784953867, "y1": 0.8807665010645848, "feet": 0.8796024579710788}, {"x0": 0.484375, "x1": 0.62158203125, "y0": 0.16678495386799147, "y1": 0.5542938254080908, "feet": 0.5544304505910663}, {"x0": 0.724609375, "x1": 0.80517578125, "y0": 0.22427253371185238, "y1": 0.5188076650106459, "feet": 0.5178114794263441}, {"x0": 0.17626953125, "x1": 0.283203125, "y0": 0.2150461320085167, "y1": 0.4315117104329312, "feet": 0.5244112901437189}, {"x0": 0.66552734375, "x1": 0.76416015625, "y0": 0.1660752306600426, "y1": 0.44499645138396027, "feet": 0.472845723224583}, {"x0": 0.11083984375, "x1": 0.20361328125, "y0": 0.170333569907736, "y1": 0.49751596877217885, "feet": 0.6013648396607745}];
    // Club colours (style.css: --red, --leaf, --gold)
    const COL = { red: 0xc60204, green: 0x0f5a3a, gold: 0xffc62b };
    const FONT = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010503);
    scene.fog = new THREE.Fog(0x010503, 38, 75);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

    // ---------- helpers ----------
    const texLoader = new THREE.TextureLoader();
    const loadTex = src => new Promise(res => texLoader.load(src, t => { t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
    function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.userData = { c, g }; return t; }
    const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    const easeOut = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
    const clamp01 = t => Math.max(0, Math.min(1, t));
    function glowSprite() { return canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,230,160,.8)"); r.addColorStop(1, "rgba(255,200,60,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }

    Promise.all([Promise.all(IMG.players.map(loadTex)), loadTex(IMG.team), loadTex(IMG.stadium), loadImg(IMG.crest),
      document.fonts ? document.fonts.load("900 80px " + FONT).catch(() => {}) : null]).then(build);

    function build([pTex, tTeam, tStadium, crestImg]) {
      if (!pTex[0]) { fail(); return; }
      const updaters = [];

      // ---------- lights ----------
      scene.add(new THREE.HemisphereLight(0x9fd8b0, 0x101010, 0.55));
      const key = new THREE.PointLight(0xffd27a, 1.4, 40); key.position.set(-6, 9, 8); scene.add(key);
      const rim = new THREE.PointLight(0xff3550, 1.2, 35); rim.position.set(8, 6, -4); scene.add(rim);
      const sun = new THREE.DirectionalLight(0xfff1d6, 0.9); sun.position.set(-4, 14, 12); scene.add(sun);

      // ---------- grass pitch ----------
      const grassTex = canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = "#2c7429"; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 24000; i++) {
          const x = Math.random() * w, y = Math.random() * h, l = 3 + Math.random() * 8, c = Math.random();
          g.strokeStyle = c < .35 ? "rgba(18,64,20,.55)" : c < .7 ? "rgba(78,148,58,.45)" : "rgba(150,200,95,.28)";
          g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 3, y - l); g.stroke();
        }
      });
      grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(36, 36);
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 }));
      grass.rotation.x = -Math.PI / 2; scene.add(grass);
      const pitchTex = canvasTex(2048, 2048, (g, w, h) => {
        const u = w / 90, Z = z => (z + 45) * u, X = x => (x + 45) * u;
        for (let z = -45, i = 0; z < 45; z += 3.2, i++) { g.fillStyle = i % 2 ? "rgba(255,255,240,0.07)" : "rgba(0,0,0,0.10)"; g.fillRect(0, Z(z), w, 3.2 * u); }
        g.fillStyle = "rgba(255,255,255,0.9)";
        g.fillRect(0, Z(-9.5) - 2, w, 5);                                       // try line under the posts
        for (let x = -45; x < 45; x += 2.2) g.fillRect(X(x), Z(-4.5) - 2, 1.1 * u, 4);   // dashed 5 m line
        g.fillRect(0, Z(12.5) - 2, w, 5);                                       // 22 m line
        for (let x = -45; x < 45; x += 2.2) g.fillRect(X(x), Z(5.5) - 2, 1.1 * u, 4);    // dashed 15 m line
        const v = g.createRadialGradient(w / 2, h * 0.55, w * 0.1, w / 2, h * 0.55, w * 0.5); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(.7, "rgba(1,5,3,0.55)"); v.addColorStop(1, "rgba(1,5,3,1)");
        g.fillStyle = v; g.fillRect(0, 0, w, h);
      });
      const pitch = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: pitchTex, transparent: true, depthWrite: false }));
      pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.01; scene.add(pitch);

      // ---------- big screens ----------
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0f0e, metalness: .85, roughness: .35 });
      const ledRed = new THREE.MeshBasicMaterial({ color: 0xff2a2c });
      const ledGreen = new THREE.MeshBasicMaterial({ color: 0x2fbf75 });
      const ledGold = new THREE.MeshBasicMaterial({ color: 0xffd23a });
      const screens = [];
      function panel(tex, w, h, x, y, z, ry, accent) {
        const g = new THREE.Group();
        const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, h + 0.5, 0.3), frameMat); fr.position.z = -0.18; g.add(fr);
        const sm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, opacity: 0 });
        g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), sm)); screens.push(sm);
        const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.07, 0.07), accent || ledRed); top.position.set(0, h / 2 + 0.28, 0.02); g.add(top);
        const bot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.07, 0.07), ledGold); bot.position.set(0, -h / 2 - 0.28, 0.02); g.add(bot);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, y - h / 2, 0.25), frameMat); leg.position.set(0, -(h / 2) - (y - h / 2) / 2, -0.2); g.add(leg);
        g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); return g;
      }
      // Big enough to fill the view from side to side behind the team
      if (tTeam) panel(tTeam, 13, 13 / 1.453, -13.4, 5.1, -6.2, 0.5);
      if (tStadium) panel(tStadium, 14.2, 14.2 * 455 / 800, 13.8, 4.7, -6.4, -0.5, ledGreen);

      // Centre screen: the crest on a turning sunburst; flashes CONVERTED! when the ball goes over
      const cTex = canvasTex(1280, 720, () => {});
      let flashT = -10;
      function drawCentre(t) {
        const { g } = cTex.userData, w = 1280, h = 720;
        const bg = g.createRadialGradient(w * .5, h * .55, 40, w * .5, h * .55, w * .7); bg.addColorStop(0, "#137049"); bg.addColorStop(.55, "#0a3d28"); bg.addColorStop(1, "#020c07");
        g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.save(); g.translate(w * .5, h * .55); g.rotate(t * 0.15);
        for (let i = 0; i < 18; i++) { g.rotate(Math.PI * 2 / 18); g.fillStyle = i % 2 ? "rgba(255,255,255,0.07)" : "rgba(198,2,4,0.12)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, -70); g.lineTo(w, 70); g.fill(); }
        g.restore();
        // chevrons running along the bottom
        g.fillStyle = "rgba(198,2,4,0.9)";
        for (let i = 0; i < 6; i++) { const x = ((t * 120 + i * 230) % (w + 300)) - 150; g.globalAlpha = .25; g.beginPath(); g.moveTo(x, h - 60); g.lineTo(x + 40, h - 60); g.lineTo(x + 70, h - 30); g.lineTo(x + 40, h); g.lineTo(x, h); g.lineTo(x + 30, h - 30); g.fill(); }
        g.globalAlpha = 1;
        if (crestImg) { const ch = 330, cw = ch * crestImg.width / crestImg.height; g.drawImage(crestImg, w * .5 - cw / 2, 70, cw, ch); }
        const f = Math.max(0, 1 - (t - flashT) / 1.8);
        g.textAlign = "center";
        if (f > 0) {
          g.fillStyle = `rgba(255,198,43,${0.35 * f})`; g.fillRect(0, 0, w, h);
          g.font = "900 150px " + FONT; g.fillStyle = "#fff"; g.shadowColor = "#ffc62b"; g.shadowBlur = 40;
          g.fillText("CONVERTED!", w / 2, 560); g.shadowBlur = 0;
        } else {
          g.font = "900 120px " + FONT; g.fillStyle = "#fff"; g.fillText("GARDENS RFC", w / 2, 515);
          g.font = "800 46px " + FONT; g.fillStyle = "#ffc62b"; g.fillText("UITENHAGE  ·  EST. 1932  ·  DIE HOK", w / 2, 575);
        }
        cTex.needsUpdate = true;
      }
      panel(cTex, 15, 15 * 9 / 16, 0, 6.8, -15, 0, ledGold);

      // Ticker ring overhead
      const tick = canvasTex(4096, 160, (g, w, h) => {
        g.fillStyle = "#07140d"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#c60204"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
        g.font = "900 104px " + FONT; g.textBaseline = "middle";
        const items = ["GARDENS RFC", "UITENHAGE", "EST. 1932", "DIE HOK", "GREEN · WHITE · RED"]; let x = 30, i = 0;
        while (x < w) { const s = items[i % items.length]; g.fillStyle = i % 2 ? "#ffc62b" : "#ffffff"; g.fillText(s, x, h / 2 + 6); x += g.measureText(s).width + 50; g.fillStyle = "#c60204"; g.fillText("◆", x, h / 2 + 4); x += 90; i++; }
      });
      tick.wrapS = THREE.RepeatWrapping; tick.repeat.x = -2;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 1.4, 96, 1, true, Math.PI * 0.62, Math.PI * 0.76),
        new THREE.MeshBasicMaterial({ map: tick, side: THREE.BackSide, toneMapped: false }));
      ring.position.set(0, 12.2, -1); scene.add(ring);
      updaters.push((t, dt) => { tick.offset.x += dt * 0.025; });
      const ringEdge = new THREE.Mesh(new THREE.CylinderGeometry(22.05, 22.05, 0.06, 96, 1, true, Math.PI * 0.62, Math.PI * 0.76), new THREE.MeshBasicMaterial({ color: 0xff2a2c, side: THREE.BackSide }));
      ringEdge.position.set(0, 11.45, -1); scene.add(ringEdge);

      // ---------- rugby posts, padded in green, white and red ----------
      const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: .4 });
      const padTex = canvasTex(256, 512, (g, w, h) => { const cols = ["#c60204", "#0f5a3a", "#f5f6f1"]; for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 3]; g.fillRect(0, i * h / 8, w, h / 8); } });
      const posts = new THREE.Group();
      [-2.8, 2.8].forEach(x => {
        const up = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 13, 16), white); up.position.set(x, 6.5, 0); posts.add(up);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), new THREE.MeshStandardMaterial({ map: padTex, roughness: .7 })); pad.position.set(x, 1, 0); posts.add(pad);
      });
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.6, 16), white); bar.rotation.z = Math.PI / 2; bar.position.y = 3; posts.add(bar);
      posts.position.set(0, 0, -9.5); scene.add(posts);

      // ---------- floodlight beams ----------
      const beamMat = c => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uC: { value: new THREE.Color(c) }, uA: { value: 0.14 } },
        vertexShader: "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: "uniform vec3 uC; uniform float uA; varying vec2 vUv; void main(){ float a=pow(vUv.y,1.6)*uA*(0.6+0.4*sin(vUv.x*40.)); gl_FragColor=vec4(uC*a,1.);}" });
      const beams = [];
      // Four coloured beams over the pitch
      [[-7, COL.gold], [-2, 0xffffff], [3, COL.red], [8, 0x2fbf75]].forEach(([x, c], i) => {
        const b = new THREE.Mesh(new THREE.ConeGeometry(3.2, 16, 32, 1, true), beamMat(c));
        b.geometry.translate(0, -8, 0); b.position.set(x, 15, -2); b.userData.ph = i * 1.7; b.userData.lean = 0; scene.add(b); beams.push(b);
      });
      // and a floodlight at the top on each side: a glowing lamp, its white beam leaning in over the team
      const lampTex = glowSprite();
      [[-11.5, 0.36], [13.5, -0.36]].forEach(([x, lean], i) => {
        const b = new THREE.Mesh(new THREE.ConeGeometry(3.4, 16, 32, 1, true), beamMat(0xfff1d6));
        b.material.uniforms.uA.value = 0.3;
        b.geometry.translate(0, -8, 0); b.position.set(x, 9.6, 0.5); b.userData.ph = 4 + i * 2.3; b.userData.lean = lean; scene.add(b); beams.push(b);
        // a wide warm glow round a small white-hot centre
        [[4.6, 0xfff1d6], [1.5, 0xffffff]].forEach(([size, c]) => {
          const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          lamp.scale.set(size, size, 1); lamp.position.set(x, 9.6, 0.5); scene.add(lamp);
        });
      });
      updaters.push(t => beams.forEach(b => { b.rotation.z = b.userData.lean + Math.sin(t * 0.4 + b.userData.ph) * (b.userData.lean ? 0.16 : 0.28); b.rotation.x = Math.cos(t * 0.33 + b.userData.ph) * 0.15; }));

      // ---------- players ----------
      // One by one, a second apart, each player flies into their place in the team photo on the grass: in turn from
      // above, up out of the grass, from the left and from the right, taking 2.2 seconds to land. The team photo stands
      // at the front of the pitch.
      const TW = 15.6, TH = TW * 1409 / 2048, X0 = 2.8, FWD = 3.4;     // team photo: size, and how far forward it stands
      const STEP = 1.0, FLY = 2.2, FIRST = 1.0;
      const FORMED = FIRST + (PL.length - 1) * STEP + FLY;             // the whole team in place
      const pVS = "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
      const pFS = `uniform sampler2D map; uniform float uReveal; uniform float uTime; varying vec2 vUv;
        void main(){ vec4 c=texture2D(map,vUv); if(c.a<0.45) discard;
          float front=uReveal*1.2-0.1; if(vUv.y>front) discard;
          float d=front-vUv.y; float live=step(uReveal,0.995); float glow=smoothstep(0.09,0.0,d)*live;
          vec3 col=pow(c.rgb,vec3(2.2));
          col*=mix(1.0,0.9+0.1*sin(vUv.y*600.+uTime*10.),live);
          col=mix(col, vec3(1.0,0.72,0.15)*2.4, glow*0.9);
          gl_FragColor=vec4(col,1.0); }`;
      const shTex = canvasTex(256, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(0,0,0,.75)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.setTransform(1, 0, 0, .5, 0, h / 4); g.fillStyle = r; g.fillRect(0, 0, w, h * 2); });
      const ringGeo = new THREE.RingGeometry(0.82, 1, 64);
      const players = PL.map((p, k) => {
        const w = (p.x1 - p.x0) * TW, h = (p.y1 - p.y0) * TH;
        const row = p.y1 < 0.62 ? 2 : (p.feet >= 0.89 ? 0 : 1);
        const base = row === 0 ? p.y1 : 0.88;
        const z = (row === 0 ? 1.1 : row === 1 ? 0.25 : -0.55) + FWD;
        const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { map: { value: pTex[k] }, uReveal: { value: 0 }, uTime: { value: 0 } }, vertexShader: pVS, fragmentShader: pFS });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        const g = new THREE.Group(); g.add(mesh); scene.add(g);
        const x = X0 + ((p.x0 + p.x1) / 2 - 0.5) * TW;
        let shadow = null;
        if (row !== 2) {
          shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.15, 1.1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0 }));
          shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, 0.02, z + 0.1); scene.add(shadow);
        }
        const halo = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffcf3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        halo.rotation.x = -Math.PI / 2; halo.position.set(x, 0.03, z); scene.add(halo);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.5, 6, 32, 1, true), beamMat(0xffc840));
        col.material.uniforms.uA.value = 0; col.rotation.x = Math.PI; col.position.set(x, 3, z); scene.add(col);
        return { g, mesh, mat, row, h, w, shadow, halo, col, x, z, fy: (base - (p.y0 + p.y1) / 2) * TH, spin: (k % 2 ? 1 : -1) };
      });
      // Front row first, so the back row (head and chest only in the photo) lands behind players already there;
      // the directions take turns: above, below, left, right
      const FROM = [[0, 14], [0, 0], [-20, 0], [20, 0]];                  // start offset [x, y]; "below" rises out of the grass
      players.slice().sort((a, b) => a.row - b.row || a.x - b.x).forEach((p, i) => {
        p.start = FIRST + i * STEP; p.from = i % 4;
        p.ox = FROM[p.from][0]; p.oy = p.from === 1 ? -(p.h + 0.3) : FROM[p.from][1];
      });
      function updatePlayers(t) {
        players.forEach(p => {
          const s = clamp01((t - p.start) / FLY), e = easeOut(s);
          p.g.position.set(p.x + p.ox * (1 - e), 0, p.z);
          p.mesh.position.y = p.fy + p.oy * (1 - e);
          p.g.rotation.y = (1 - e) * Math.PI * 0.5 * p.spin;
          p.g.visible = t >= p.start;
          p.mat.uniforms.uReveal.value = ease((t - p.start) / (FLY * 0.8)); p.mat.uniforms.uTime.value = t;
          // a ring of light and a beam where each player lands
          const pulse = Math.sin(clamp01((t - p.start - FLY + 0.9) / 1.8) * Math.PI);
          p.halo.material.opacity = pulse * 0.95; p.halo.scale.setScalar((p.w * 0.45) * (0.6 + 0.7 * s));
          p.col.material.uniforms.uA.value = pulse * 0.55;
          if (p.shadow) p.shadow.material.opacity = e;
        });
      }

      const glowTex = glowSprite();
      // ---------- floating dust in the floodlights ----------
      const N = 700, dp = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { dp[i * 3] = (Math.random() - .5) * 36; dp[i * 3 + 1] = Math.random() * 12; dp[i * 3 + 2] = (Math.random() - .5) * 26 - 2; }
      const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.09, map: glowTex, color: 0xffd27a, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })));
      updaters.push((t, dt) => { const a = dGeo.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3 + 1] += dt * (0.15 + (i % 7) * 0.03); a[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.08; if (a[i * 3 + 1] > 12) a[i * 3 + 1] = 0; } dGeo.attributes.position.needsUpdate = true; });

      // ---------- rugby ball, its trail and the burst over the posts ----------
      const ballTex = canvasTex(1024, 512, (g, w, h) => {
        const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#e9e3d3"); bg.addColorStop(.5, "#fbf8f0"); bg.addColorStop(1, "#e9e3d3");
        g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(0,0,0,0.05)"; for (let i = 0; i < 9000; i++) { g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        [[.16, "#c60204"], [.84, "#0f5a3a"]].forEach(([v, c]) => { g.fillStyle = c; g.fillRect(0, v * h - 14, w, 28); g.fillStyle = "#ffc62b"; g.fillRect(0, v * h + 14, w, 6); g.fillRect(0, v * h - 20, w, 6); });
        g.strokeStyle = "rgba(90,80,60,.55)"; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); }
        g.strokeStyle = "#fff"; g.lineWidth = 5; for (let y = h * .32; y < h * .68; y += 16) { g.beginPath(); g.moveTo(w / 2 - 12, y); g.lineTo(w / 2 + 12, y); g.stroke(); }
        g.fillStyle = "#c60204"; g.font = "900 54px " + FONT; g.textAlign = "center"; g.save(); g.translate(w * 0.75, h / 2); g.rotate(-Math.PI / 2); g.fillText("GARDENS RFC", 0, 18); g.restore();
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 32), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .55, metalness: 0 }));
      ball.scale.set(1, 1.62, 1); ball.visible = false; scene.add(ball);
      const TR = 48, trPos = new Float32Array(TR * 3), trCol = new Float32Array(TR * 3);
      const trGeo = new THREE.BufferGeometry(); trGeo.setAttribute("position", new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute("color", new THREE.BufferAttribute(trCol, 3));
      const trail = new THREE.Points(trGeo, new THREE.PointsMaterial({ size: 0.55, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      trail.frustumCulled = false; scene.add(trail); const hist = [];
      const BN = 220, bPos = new Float32Array(BN * 3), bCol = new Float32Array(BN * 3), bVel = []; let burstT = -10;
      const bGeo = new THREE.BufferGeometry(); bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute("color", new THREE.BufferAttribute(bCol, 3));
      const burst = new THREE.Points(bGeo, new THREE.PointsMaterial({ size: 0.32, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      burst.frustumCulled = false; scene.add(burst);
      function fireBurst(p) { burstT = clock; for (let i = 0; i < BN; i++) { bPos.set([p.x, p.y, p.z], i * 3); bVel[i] = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(2 + Math.random() * 5); } }
      const P0 = new THREE.Vector3(-1.2, 0.35, 10), P1 = new THREE.Vector3(-0.6, 10.5, -1.5), P2 = new THREE.Vector3(0.2, 5.5, -14);
      const KICK_START = FORMED + 1.0, KICK_EVERY = 11, KICK_DUR = 2.1; let lastKick = -1, scored = false;
      const bez = (t, o) => { const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return o.set(P0.x * a + P1.x * b + P2.x * c, P0.y * a + P1.y * b + P2.y * c, P0.z * a + P1.z * b + P2.z * c); };

      // ---------- post-processing: bloom on the lights and screens ----------
      const composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.55, 0.78));
      composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));

      // ---------- size & pointer ----------
      let wide = true, depth = 1;
      const gl = renderer.getContext();
      const MAX = Math.min(4096, renderer.capabilities.maxTextureSize);
      function resize() {
        const W = hero.clientWidth, H = hero.clientHeight;
        if (!W || !H) return;
        wide = W / H > 1.15;
        // Pull the camera back so the whole team and stage fit; short, wide spaces (laptops, under the menu) furthest
        depth = Math.max(1.25, Math.min(1.5, W / H / 1.9));
        scene.fog.near = 38 * depth; scene.fog.far = 75 * depth;
        // Sharp on high-density screens, but never a bigger picture than the graphics card can draw:
        // past its limit the browser shrinks the picture and only part of the scene would show
        let pr = Math.min(devicePixelRatio, small ? 1.5 : 2, MAX / W, MAX / H);
        renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
        if (gl.drawingBufferWidth < Math.floor(W * pr)) { pr = gl.drawingBufferWidth / W; renderer.setPixelRatio(pr); renderer.setSize(W, H, false); }
        composer.setPixelRatio(pr); composer.setSize(W, H);
        camera.aspect = W / H; camera.fov = wide ? 42 : 58;
        // On wide screens the scene sits to the right of the headline
        if (wide) camera.setViewOffset(W, H, -W * 0.14, 0, W, H); else camera.clearViewOffset();
        camera.updateProjectionMatrix();
        if (reduce) render();
      }
      // Follows the hero itself, not only the window: it also changes size with the page layout and browser zoom
      if (window.ResizeObserver) new ResizeObserver(resize).observe(hero); else addEventListener("resize", resize);
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      if (!reduce) addEventListener("pointermove", e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; });

      // ---------- animate ----------
      let clock = 0, last = performance.now(), visible = true;
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
      const tmp = new THREE.Vector3(), prev = new THREE.Vector3(), target = new THREE.Vector3();
      const START_CAM = new THREE.Vector3(-2, 13, 34);
      const INTRO = 4.2;
      function orbit(u, out) {
        const a = 0.3 * Math.sin(u * Math.PI * 2 / 24); const R = wide ? 16.5 * depth : 22;
        return out.set(R * Math.sin(a) + 1.4, 3.6 + 0.9 * Math.sin(u * Math.PI * 2 / 12 + 0.6), R * Math.cos(a) + 1.5);
      }

      function step(t, dt) {
        // screens power on with a flicker
        screens.forEach((m, i) => { const k = clamp01((t - 0.3 - i * 0.35) / 0.6); m.opacity = k < 1 ? k * (0.6 + 0.4 * Math.round(Math.random())) : 1; });
        updatePlayers(t);

        // the conversion
        const since = t - KICK_START; let bp = -1;
        if (since >= 0 && !reduce) {
          const n = Math.floor(since / KICK_EVERY), lt = since - n * KICK_EVERY;
          if (n !== lastKick) { lastKick = n; scored = false; hist.length = 0; }
          if (lt < KICK_DUR) bp = lt / KICK_DUR;
        }
        if (bp >= 0) {
          ball.visible = true; bez(bp, ball.position);
          ball.rotation.set(-bp * Math.PI * 7, 0, 0.25);
          hist.unshift(ball.position.clone()); if (hist.length > TR) hist.pop();
          if (!scored && ball.position.z < -9.5) { scored = true; flashT = t; fireBurst(new THREE.Vector3(ball.position.x, ball.position.y, -9.5)); }
        } else { ball.visible = false; if (hist.length) hist.pop(); }
        for (let i = 0; i < TR; i++) { const p = hist[i]; const f = p ? (1 - i / TR) : 0; if (p) trPos.set([p.x, p.y, p.z], i * 3); trCol.set([f * 1.0, f * 0.75, f * 0.25], i * 3); }
        trGeo.attributes.position.needsUpdate = true; trGeo.attributes.color.needsUpdate = true;
        const bt = t - burstT;
        for (let i = 0; i < BN; i++) {
          if (bt < 2.5 && bVel[i]) {
            bPos[i * 3] += bVel[i].x * dt; bPos[i * 3 + 1] += bVel[i].y * dt; bPos[i * 3 + 2] += bVel[i].z * dt; bVel[i].y -= 4 * dt; bVel[i].multiplyScalar(0.985);
            const f = Math.max(0, 1 - bt / 2.5), red = i % 3 === 0, green = i % 3 === 1;
            bCol.set(red ? [f, f * 0.05, f * 0.05] : green ? [f * 0.2, f * 0.8, f * 0.45] : [f, f, f * 0.9], i * 3);
          } else bCol.set([0, 0, 0], i * 3);
        }
        bGeo.attributes.position.needsUpdate = true; bGeo.attributes.color.needsUpdate = true;

        if (reduce || (Math.floor(t * 60) % 2) === 0) drawCentre(t);
        updaters.forEach(f => f(t, dt));

        // camera: a slow sweep in, then a gentle orbit that leans with the pointer and follows the kick
        mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
        orbit(Math.max(0, t - INTRO), tmp);
        if (t < INTRO) { const k = ease(t / INTRO); orbit(0, prev); tmp.copy(START_CAM).lerp(prev, k); }
        const follow = bp >= 0 ? Math.sin(bp * Math.PI) * 0.6 : 0;
        camera.position.set(tmp.x + mouse.x * 2.2, tmp.y - mouse.y * 1.2 + follow * 0.6, tmp.z);
        target.set(1.4 + mouse.x * 0.6, 3.1 + follow * 1.6, -1.5);
        camera.lookAt(target);
      }
      function render() { composer.render(); }

      resize();
      if (reduce) {
        // One still frame with the whole squad on the pitch
        clock = FORMED + 0.5; step(clock, 0); render();
      } else {
        const frame = now => {
          requestAnimationFrame(frame);
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          // hold the scene while the crest intro plays, and while the hero is scrolled off screen
          if (!visible || html.classList.contains("intro-playing")) return;
          clock += dt; step(clock, dt); render();
        };
        step(0, 0); render();
        requestAnimationFrame(frame);
      }
      hero.classList.add("is-ready");
    }
  }
})();
