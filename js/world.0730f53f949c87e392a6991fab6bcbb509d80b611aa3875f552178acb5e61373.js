{
const cv = document.querySelector('canvas.world'), page = document.querySelector('main .page')
if (cv) (async () => {
  const seen = () => { try { return !!sessionStorage.getItem('world') } catch { return false } }
  const enter = () => { try { sessionStorage.setItem('world', '1') } catch {} if (page && page.querySelector('.intro.front')) page.replaceChildren() }
  let early = false
  if (page) page.addEventListener('click', e => { if (!e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.target.closest('.close') && page.querySelector('.intro.front')) { e.preventDefault(); early = true } })
  if (seen()) enter()
  const text = async u => (await fetch(u)).text()
  const [map, pool, linked, shed] = await Promise.all([cv.dataset.world, cv.dataset.waters, cv.dataset.links, cv.dataset.sheds].map(async u => u ? JSON.parse(await text(u)) : { sheds: [] }))
  const links = linked.waters, names = linked.names, D = Math.PI / 180, wrap = cv.parentNode, dpr = () => devicePixelRatio || 1
  const globe = lines => {
    const n = lines.reduce((t, l) => t + l.length / 2, 0), xyz = new Float32Array(n * 3), starts = new Int32Array(lines.length), ll = new Float32Array(n * 2)
    let i = 0
    lines.forEach((l, j) => { starts[j] = i; let lon = 0, lat = 0; for (let k = 0; k < l.length; k += 2) { lon += l[k]; lat += l[k + 1]; const a = lon / 1e4 * D, b = lat / 1e4 * D, c = Math.cos(b); xyz[i * 3] = c * Math.cos(a); xyz[i * 3 + 1] = c * Math.sin(a); xyz[i * 3 + 2] = Math.sin(b); ll[i * 2] = lon / 1e4; ll[i * 2 + 1] = lat / 1e4; i++ } })
    return { xyz, starts, ll, n }
  }
  const land = ['world', 'landx', 'region', 'local'].map(k => globe(map[k]))
  const waters = Object.keys(pool).sort().map(slug => {
    const w = pool[slug], g = globe(w.lines), box = [Infinity, Infinity, -Infinity, -Infinity]
    for (let i = 0; i < g.n; i++) { box[0] = Math.min(box[0], g.ll[i * 2]); box[1] = Math.min(box[1], g.ll[i * 2 + 1]); box[2] = Math.max(box[2], g.ll[i * 2]); box[3] = Math.max(box[3], g.ll[i * 2 + 1]) }
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2
    let pin = [cx, cy], best = Infinity
    for (let i = 0; i < g.n; i++) { const d = (g.ll[i * 2] - cx) ** 2 + (g.ll[i * 2 + 1] - cy) ** 2; if (d < best) { best = d; pin = [g.ll[i * 2], g.ll[i * 2 + 1]] } }
    return { slug, title: w.title, lands: w.lands, href: w.href, g, box, pin }
  })
  const holds = (g, x, y) => { let c = false; for (let r = 0; r < g.starts.length; r++) for (let b = r + 1 < g.starts.length ? g.starts[r + 1] : g.n, i = g.starts[r], j = b - 1; i < b; j = i++) { const xi = g.ll[i * 2], yi = g.ll[i * 2 + 1], xj = g.ll[j * 2], yj = g.ll[j * 2 + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c } return c }
  const apart = (g, x, y) => { let d = Infinity; for (let i = 0; i < g.n; i++) d = Math.min(d, ((g.ll[i * 2] - x) * Math.cos(y * D)) ** 2 + (g.ll[i * 2 + 1] - y) ** 2); return d }
  const sheds = shed.sheds.map(s => {
    const g = globe(s.rings), c = [0, 0, 0]
    for (let i = 0; i < g.n * 3; i++) c[i % 3] += g.xyz[i]
    const k = Math.hypot(...c) || 1; c.forEach((v, i) => c[i] = v / k)
    let rad = 0; for (let i = 0; i < g.n; i++) rad = Math.max(rad, Math.acos(Math.min(1, c[0] * g.xyz[i * 3] + c[1] * g.xyz[i * 3 + 1] + c[2] * g.xyz[i * 3 + 2])))
    return { h: s.h, g, c, rad, ws: [], tris: s.tris }
  })
  for (const w of waters) { const s = sheds.find(s => holds(s.g, ...w.pin)) || sheds.reduce((a, s) => !a || apart(s.g, ...w.pin) < apart(a.g, ...w.pin) ? s : a, null); if (s) s.ws.push(w) }
  const find = h => { const own = waters.filter(w => w.href === h), ks = links[h] || []; return own.length ? own : waters.filter(w => ks.includes(w.slug)) }
  const hue = parseFloat(wrap.style.getPropertyValue('--hue') || cv.style.getPropertyValue('--hue')) || 215, blue = `hsl(${hue}, 60%, 48%)`, shore = `hsl(${hue}, 40%, 72%)`, fade = `hsla(${hue}, 60%, 48%, .2)`
  const bounds = ws => [Math.min(...ws.map(w => w.box[0])), Math.min(...ws.map(w => w.box[1])), Math.max(...ws.map(w => w.box[2])), Math.max(...ws.map(w => w.box[3]))]
  const centre = ws => { const b = bounds(ws); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] }
  const mid = waters.map(w => centre([w])), ml = mid.reduce((t, p) => t + p[0], 0) / (mid.length || 1), mb = mid.reduce((t, p) => t + p[1], 0) / (mid.length || 1)
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  const unit = () => Math.max(13, Math.min(cv.width, cv.height) / dpr() / 2 - 9) * dpr()
  const vs = '#version 300 es\nin vec3 a, b; in vec4 c, k; in float e; uniform vec4 m, o, v; out vec4 h; const vec2 q[6] = vec2[6](vec2(0, 1), vec2(0, -1), vec2(1, -1), vec2(0, 1), vec2(1, -1), vec2(1, 1));\nvec2 at(vec3 p) { float u = -p.x * m.x + p.y * m.y, w = -p.x * m.z * m.y - p.y * m.z * m.x + p.z * m.w, d = length(vec2(u, w)); return o.xy + o.z * vec2(u, -w) / (p.x * m.w * m.y + p.y * m.w * m.x + p.z * m.z > 0. || d == 0. ? 1. : d); }\nvoid main() { vec2 A = at(a), B = at(b), s = q[gl_VertexID % 6], t = B - A; float l = length(t); t = l > 0. ? t / l : vec2(0); vec2 P = o.w > 0. ? mix(A, B, s.x) + o.w * ((s.x * 2. - 1.) * t + s.y * vec2(-t.y, t.x)) : A; h = k; gl_Position = k.a == 0. || acos(clamp(dot(vec3(m.w * m.y, m.w * m.x, m.z), c.xyz), -1., 1.)) > c.w + v.z ? vec4(2, 2, 2, 1) : vec4(P.x / v.x * 2. - 1., 1. - P.y / v.y * 2., e, 1); }'
  const fs = '#version 300 es\nprecision highp float; uniform vec4 d; in vec4 h; out vec4 f; void main() { if (distance(gl_FragCoord.xy, d.xy) > d.z) discard; f = vec4(h.rgb, 1) * d.w; }'
  const gpu = s => {
    const c = s.c, k = document.createElement('canvas'), gl = sheds.length && sheds.every(b => b.tris) && k.getContext('webgl2', { preserveDrawingBuffer: true })
    if (!gl) return null
    const pg = gl.createProgram(), n = sheds.reduce((t, b) => t + b.g.n, 0), xyz = new Float32Array(n * 3), cr = new Float32Array(n * 5), fc = new Uint32Array(n), sc = new Uint32Array(n), ix = [], ends = [], hex = new Map(), op = getComputedStyle(c)
    for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); gl.attachShader(pg, x) }
    gl.linkProgram(pg)
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return null
    let o = 0, was = []
    sheds.forEach((b, i) => { const row = [...b.c, b.rad, 1 - 2 * (i + 1) / (sheds.length + 1)]; b.o = o; xyz.set(b.g.xyz, o * 3); for (let j = 0; j < b.g.n; j++) cr.set(row, (o + j) * 5); b.g.starts.forEach((v, j) => ends.push(o + (b.g.starts[j + 1] || b.g.n) - 1)); for (let j = 0, x = 0, y = 0, z = 0; j < b.tris.length; j += 3) ix.push(o + (x += b.tris[j]), o + (y += b.tris[j + 1]), o + (z += b.tris[j + 2])); o += b.g.n })
    const buf = (t, d, u) => { const x = gl.createBuffer(); gl.bindBuffer(t, x); gl.bufferData(t, d, u); return x }, pb = buf(gl.ARRAY_BUFFER, xyz, gl.STATIC_DRAW), cb = buf(gl.ARRAY_BUFFER, cr, gl.STATIC_DRAW), fb = buf(gl.ARRAY_BUFFER, fc, gl.DYNAMIC_DRAW), kb = buf(gl.ARRAY_BUFFER, sc, gl.DYNAMIC_DRAW)
    const vao = (col, d) => { const v = gl.createVertexArray(); gl.bindVertexArray(v); for (const [nm, b, sz, ty, st, off] of [['a', pb, 3, gl.FLOAT, 12, 0], ['b', d && pb, 3, gl.FLOAT, 12, 12], ['c', cb, 4, gl.FLOAT, 20, 0], ['e', cb, 1, gl.FLOAT, 20, 16], ['k', col, 4, gl.UNSIGNED_BYTE, 4, 0]]) if (b) { const l = gl.getAttribLocation(pg, nm); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, ty, nm === 'k', st, off); gl.vertexAttribDivisor(l, d) } return v }
    const fv = vao(fb, 0), nt = ix.length
    buf(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(ix), gl.STATIC_DRAW)
    const sv = vao(kb, 1), u = Object.fromEntries(['m', 'o', 'v', 'd'].map(x => [x, gl.getUniformLocation(pg, x)]))
    const px = col => { if (!hex.has(col)) { s.ctx.fillStyle = col; const v = parseInt(s.ctx.fillStyle.slice(1), 16); hex.set(col, new Uint32Array(new Uint8Array([v >> 16, v >> 8 & 255, v & 255, 255]).buffer)[0]) } return hex.get(col) }
    const tone = sel => { for (const b of sheds) { const w = sel && b.ws.find(w => sel.has(w)), col = !sel ? `hsl(${b.h}, 70%, 55%)` : s.pick ? s.tint : s.inks.get(w) || blue; fc.fill(sel && !w ? 0 : px(col), b.o, b.o + b.g.n); sc.fill(sel && !w ? 0 : px(sel ? col : '#fff'), b.o, b.o + b.g.n) } for (const e of ends) sc[e] = 0; gl.bindBuffer(gl.ARRAY_BUFFER, fb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, fc); gl.bindBuffer(gl.ARRAY_BUFFER, kb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, sc) }
    gl.useProgram(pg); gl.enable(gl.BLEND); gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST)
    k.className = 'sheds'; k.setAttribute('aria-hidden', 'true'); c.after(k)
    k.addEventListener('webglcontextlost', e => { if (k.isConnected) { e.preventDefault(); s.gpu = null; k.hidden = true; s.draw() } })
    k.addEventListener('webglcontextrestored', () => { if (k.isConnected) { k.remove(); s.gpu = gpu(s); s.draw() } })
    return (sel, f, a, b, cap) => {
      if (k.width !== c.width || k.height !== c.height) { k.width = c.width; k.height = c.height }
      const now = [s.pick, s.dim, s.tint, s.inks], ox = s.ox(), oy = s.oy(), r = s.radius(), H = c.height
      if (now.some((x, i) => x !== was[i])) { was = now; tone(sel) }
      gl.viewport(0, 0, c.width, H); gl.blendColor(0, 0, 0, +op.opacity); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.uniform4f(u.m, Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b)); gl.uniform4f(u.v, c.width, H, cap, 0)
      gl.uniform4f(u.o, ox, oy, r, 0); gl.uniform4f(u.d, ox, H - oy, unit(), (sel ? .16 : .26) * f); gl.bindVertexArray(fv); gl.drawElements(gl.TRIANGLES, nt, gl.UNSIGNED_INT, 0)
      gl.clear(gl.DEPTH_BUFFER_BIT); gl.uniform4f(u.o, ox, oy, r, dpr() / 2); gl.uniform4f(u.d, ox, H - oy, unit(), (sel ? .5 : .9) * f); gl.bindVertexArray(sv); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n - 1)
    }
  }
  const scene = c => {
    const s = { c, ctx: c.getContext('2d'), lon0: ml, lat0: mb, z: 1, hot: [], dim: null, only: null, pick: null, inks: new Map(), hue: -1, tint: blue, due: false, fly: 0, sailing: false, paths: new Map(), extra: () => {}, onstep: () => {} }
    s.size = () => { const w = Math.round(c.clientWidth * dpr()), h = Math.round(c.clientHeight * dpr()); if (c.width === w && c.height === h) return false; c.width = w; c.height = h; return true }
    s.ox = () => c.width / 2
    s.oy = () => c.height / 2
    s.radius = () => unit() * s.z
    s.lens = (x, y) => Math.hypot(x - s.ox(), y - s.oy()) <= unit()
    s.trace = g => {
      const p = new Path2D(), r = s.radius(), ox = s.ox(), oy = s.oy(), a = s.lon0 * D, b = s.lat0 * D, sa = Math.sin(a), ca = Math.cos(a), sb = Math.sin(b), cb = Math.cos(b)
      let pen = false, next = 0, line = 0
      for (let i = 0; i < g.n; i++) {
        if (i === next) { pen = false; line++; next = line < g.starts.length ? g.starts[line] : Infinity }
        const x = g.xyz[i * 3], y = g.xyz[i * 3 + 1], w = g.xyz[i * 3 + 2]
        if (x * cb * ca + y * cb * sa + w * sb <= 0) { pen = false; continue }
        const X = ox + r * (-x * sa + y * ca), Y = oy - r * (-x * sb * ca - y * sb * sa + w * cb)
        pen ? p.lineTo(X, Y) : p.moveTo(X, Y); pen = true
      }
      return p
    }
    s.shape = g => {
      const p = new Path2D(), r = s.radius(), ox = s.ox(), oy = s.oy(), a = s.lon0 * D, b = s.lat0 * D, sa = Math.sin(a), ca = Math.cos(a), sb = Math.sin(b), cb = Math.cos(b)
      let next = 0, line = 0
      for (let i = 0; i < g.n; i++) {
        const first = i === next, x = g.xyz[i * 3], y = g.xyz[i * 3 + 1], w = g.xyz[i * 3 + 2], u = -x * sa + y * ca, v = -x * sb * ca - y * sb * sa + w * cb, k = x * cb * ca + y * cb * sa + w * sb > 0 ? 1 : 1 / (Math.hypot(u, v) || 1)
        if (first) { if (i) p.closePath(); line++; next = line < g.starts.length ? g.starts[line] : Infinity; p.moveTo(ox + r * u * k, oy - r * v * k) } else p.lineTo(ox + r * u * k, oy - r * v * k)
      }
      p.closePath(); return p
    }
    s.proj = (lon, lat) => {
      const r = s.radius(), a = s.lon0 * D, b = s.lat0 * D, A = lon * D, B = lat * D, x = Math.cos(B) * Math.cos(A), y = Math.cos(B) * Math.sin(A), v = Math.sin(B)
      return [s.ox() + r * (-x * Math.sin(a) + y * Math.cos(a)), s.oy() - r * (-x * Math.sin(b) * Math.cos(a) - y * Math.sin(b) * Math.sin(a) + v * Math.cos(b)), x * Math.cos(b) * Math.cos(a) + y * Math.cos(b) * Math.sin(a) + v * Math.sin(b) > 0]
    }
    s.where = w => s.proj(...w.pin)
    s.at = (X, Y) => { const k = c.getBoundingClientRect(), r = s.radius(), x = ((X - k.left) * dpr() - s.ox()) / r, y = (s.oy() - (Y - k.top) * dpr()) / r, q = Math.hypot(x, y); if (q > 1) return null; const d = Math.asin(q), sd = Math.sin(d), cd = Math.cos(d), b = s.lat0 * D; return [s.lon0 + Math.atan2(x * sd, q * cd * Math.cos(b) - y * sd * Math.sin(b)) / D, Math.asin(cd * Math.sin(b) + (q ? y * sd * Math.cos(b) / q : 0)) / D] }
    s.paint = () => {
      s.due = false
      const r = s.radius(), ctx = s.ctx
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height)
      ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = s.hue < 0 ? shore : `hsl(${s.hue}, 75%, 45%)`; ctx.lineWidth = 2 * dpr()
      ctx.beginPath(); ctx.arc(s.ox(), s.oy(), unit(), 0, 2 * Math.PI); ctx.save(); ctx.clip()
      const sel = s.pick || s.dim, f = Math.min(1, Math.sqrt(12 / s.z)), A = s.lon0 * D, B = s.lat0 * D, view = [Math.cos(B) * Math.cos(A), Math.cos(B) * Math.sin(A), Math.sin(B)], cap = Math.asin(Math.min(1, 1 / s.z)) + .02
      if (s.gpu) s.gpu(sel, f, A, B, cap); else for (const b of sheds) { const w = sel && b.ws.find(w => sel.has(w)); if ((sel && !w) || Math.acos(Math.max(-1, Math.min(1, view[0] * b.c[0] + view[1] * b.c[1] + view[2] * b.c[2]))) > b.rad + cap) continue; const col = !sel ? `hsl(${b.h}, 70%, 55%)` : s.pick ? s.tint : s.inks.get(w) || blue, p = s.shape(b.g); ctx.fillStyle = col; ctx.strokeStyle = sel ? col : '#fff'; ctx.globalAlpha = (sel ? .16 : .26) * f; ctx.fill(p, 'evenodd'); ctx.globalAlpha = (sel ? .5 : .9) * f; ctx.lineWidth = dpr(); ctx.stroke(p) }
      ctx.restore(); ctx.stroke(); ctx.save(); ctx.clip()
      if (s.z < 5) ctx.stroke(s.trace(land[0]))
      else { ctx.stroke(s.trace(land[1])); ctx.lineWidth = 1.4 * dpr(); ctx.stroke(s.trace(land[2])); ctx.stroke(s.trace(land[3])) }
      for (const w of waters) { if (s.only && !s.only.has(w)) { s.paths.delete(w); continue } const p = s.trace(w.g), on = s.hot.includes(w), faint = !on && s.dim && !s.dim.has(w); s.paths.set(w, p); ctx.strokeStyle = s.hue >= 0 ? `hsl(${(s.hue + 150) % 360}, 75%, 45%)` : on ? s.tint : faint ? fade : s.dim ? s.inks.get(w) || blue : blue; ctx.lineWidth = (on ? 5.5 : faint ? 2 : 3) * dpr(); ctx.stroke(p) }
      ctx.restore()
      c.dataset.view = `${s.lon0.toFixed(4)} ${s.lat0.toFixed(4)} ${s.z.toFixed(4)}`
      s.extra()
    }
    s.draw = () => { if (!s.due) { s.due = true; requestAnimationFrame(s.paint) } }
    s.hit = (X, Y) => { const k = c.getBoundingClientRect(), x = (X - k.left) * dpr(), y = (Y - k.top) * dpr(); if (!s.lens(x, y)) return null; s.ctx.setTransform(1, 0, 0, 1, 0, 0); s.ctx.lineWidth = 18 * dpr(); for (let i = waters.length - 1; i >= 0; i--) { const p = s.paths.get(waters[i]); if (p && s.ctx.isPointInStroke(p, x, y)) return waters[i] }; return null }
    s.sail = (lon, lat, zt, ms, turns, done) => {
      cancelAnimationFrame(s.fly)
      const a0 = s.lon0, b0 = s.lat0, z0 = Math.log(s.z), dl = ((lon - a0 + 540) % 360) - 180, t0 = performance.now()
      s.sailing = true
      const step = now => {
        const t = Math.min(1, (now - t0) / (ms || 900)), e = ease(t)
        s.lon0 = a0 + dl * e + (turns || 0) * 360 * (1 - Math.pow(1 - t, 3)); s.lat0 = b0 + (lat - b0) * e; s.z = Math.exp(z0 + (Math.log(zt) - z0) * e)
        if (turns) s.hue = (now / 4) % 360
        s.draw(); s.onstep()
        if (t < 1) s.fly = requestAnimationFrame(step); else { s.sailing = false; s.lon0 = ((s.lon0 + 540) % 360) - 180; if (turns) { s.hue = -1; c.classList.remove('rainbow') } done && done() }
      }
      s.fly = requestAnimationFrame(step)
    }
    s.gpu = gpu(s)
    return s
  }
  const G = scene(cv)
  const tip = wrap.querySelector('.tip'), side = document.querySelector('.side'), nav = side && side.querySelector('.nav'), tabs = nav ? [...nav.querySelectorAll(':scope > li[data-tab]')] : []
  const marks = document.createElement('div')
  marks.className = 'marks'; wrap.insertBefore(marks, tip)
  let inside = false, held = null, dragged = false, touch = false, manual = false, spin = [0, 0], glide = 0, soon = 0, away = 0, twirl = 0, pend = false, spun = false, quiet = 0, tw = 0, th = 0, focus = [], tags = [], overlay = false, cw = 0, ch = 0, dockAt = [0, 0], dockFrom = null, dockT0 = 0, dockGap = 30, keep = false
  let base = { ws: [], title: '', note: '', from: null, tip: false }, shown = null
  const same = (a, b) => a.length === b.length && a.every((w, i) => w === b[i])
  const span = ws => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const w of ws) for (const [lo, la] of [[w.box[0], w.box[1]], [w.box[2], w.box[1]], [w.box[0], w.box[3]], [w.box[2], w.box[3]], w.pin]) { const [x, y, f] = G.proj(lo, la); if (f) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } }
    return x0 < Infinity ? [x0, y0, x1, y1].map(v => v / dpr()) : null
  }
  const dock = low => {
    if (!overlay) return null
    const W = cv.width / dpr(), H = cv.height / dpr()
    let L = G.ox() / dpr() - cw / 2, T = G.oy() / dpr() - ch / 2
    L = Math.min(Math.max(8, L), W - cw - 8); T = Math.min(Math.max(8, T), H - ch - 8)
    if (!base.from) {
      if (dockFrom) { const t = Math.min(1, (performance.now() - dockT0) / 900), e = ease(t); L = dockFrom[0] + (L - dockFrom[0]) * e; T = dockFrom[1] + (T - dockFrom[1]) * e; if (t < 1) G.draw(); else dockFrom = null }
      dockAt = [L, T]
    }
    page.style.transform = `translate(${Math.round(dockAt[0])}px, ${Math.round(dockAt[1])}px)`; page.classList.add('docked')
    return [dockAt[0], dockAt[1], dockAt[0] + cw, dockAt[1] + ch]
  }
  const blend = () => { dockFrom = dockAt.slice(); dockT0 = performance.now() }
  const guess = () => { const T = G.oy() / dpr() - ch / 2; return [G.ox() / dpr() - cw / 2, T, G.ox() / dpr() + cw / 2, T + ch] }
  const lay = () => {
    const d = dpr(), W = cv.width / d, H = cv.height / d, ctx = G.ctx, frozen = overlay && !!base.from, within = (b, x, y) => x > b[0] && x < b[2] && y > b[1] && y < b[3]
    const fixed = frozen ? [dockAt[0], dockAt[1], dockAt[0] + cw, dockAt[1] + ch] : null, boxes = fixed ? [fixed] : [], spots = [], meets = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
    if (!tip.hidden && base.from && same(G.hot, base.ws)) {
      const sp = span(G.hot)
      if (sp) {
        const my = (sp[1] + sp[3]) / 2 - th / 2, cap = [[sp[0] - 18 - tw, sp[1]], [sp[0] - 18 - tw, my], [sp[2] + 18, sp[1]], [sp[2] + 18, my], [(sp[0] + sp[2]) / 2 - tw / 2, sp[1] - 14 - th], [(sp[0] + sp[2]) / 2 - tw / 2, sp[3] + 14], [sp[0] - 18 - tw, sp[3] - th], [sp[2] + 18, sp[3] - th], [G.ox() / d - unit() / d - 14 - tw, G.oy() / d - th / 2], [G.ox() / d + unit() / d + 14, G.oy() / d - th / 2]].map(([x, y]) => { const L = Math.max(0, Math.min(x, W - tw)), T = Math.max(0, Math.min(y, H - th)); return [L, T, L + tw, T + th] }).find(c => !meets(c, sp) && !(fixed && meets(c, fixed))) || [8, 8, 8 + tw, 8 + th]
        tip.style.left = cap[0] + 'px'; tip.style.top = cap[1] + 'px'; boxes.push(cap)
      }
    }
    const card0 = overlay && !frozen ? guess() : null
    const pts = tags.map(t => { const [x, y, f] = G.where(t.w); return { t, x: x / d, y: y / d, f } }).filter(p => p.f && p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H && G.lens(p.x * d, p.y * d) && !(fixed && within(fixed, p.x, p.y))).sort((p, q) => p.y - q.y), groups = []
    for (const p of pts) { const g = groups.find(g => Math.abs(g.x - p.x) < 30 && Math.abs(g.y - p.y) < 30); if (g) g.m.push(p); else groups.push({ x: p.x, y: p.y, m: [p] }) }
    for (const g of groups) {
      const wd = Math.max(...g.m.map(p => p.t.wd)), ht = g.m.reduce((n, p) => n + p.t.ht + 2, -2), cy = g.m.reduce((n, p) => n + p.y, 0) / g.m.length, right = Math.max(...g.m.map(p => p.x)) + 10, left = Math.min(...g.m.map(p => p.x)) - 10 - wd
      const low = card0 ? Math.min(H, card0[1] - 4) : H, want = Math.max(0, Math.min(cy - ht / 2, H - ht)), start = Math.min(want, Math.max(0, low - ht))
      let spot = null
      for (const reach of [8, 44, ht + 40]) for (const L of right + wd <= W ? [right, left] : [left, right]) {
        if (spot || L < 0 || L + wd > W) continue
        const hit = T => boxes.find(b => L < b[2] && L + wd > b[0] && T < b[3] && T + ht > b[1])
        let T = start, b
        while ((b = hit(T)) && want - (b[1] - 2 - ht) <= reach && b[1] - 2 - ht >= 0) T = b[1] - 2 - ht
        if (hit(T)) { T = start; while ((b = hit(T)) && b[3] + 2 - want <= Math.min(reach, 60) && b[3] + 2 + ht <= low) T = b[3] + 2 }
        if (!hit(T)) spot = [L, T]
      }
      if (!spot) continue
      const [L, T] = spot, flip = L < right
      boxes.push([L, T, L + wd, T + ht])
      let y0 = T
      for (const p of g.m) { spots.push({ t: p.t, x: p.x, y: p.y, L: flip ? L + wd - p.t.wd : L, T: y0 }); y0 += p.t.ht + 2 }
    }
    const card = dock(spots.length ? Math.max(...spots.map(p => p.T + p.t.ht)) : -Infinity), shown = new Set()
    const ink = inkOf(base.from || here())
    const tab = base.from && base.from.closest('li[data-tab]'), on = tab && tab.style.getPropertyValue('--on') || '#fff'
    marks.classList.toggle('hover', !!base.from); marks.style.setProperty('--pill', ink); marks.style.setProperty('--on', on); marks.style.color = ink; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ink
    for (const { t, x, y, L, T } of spots) {
      if (card && !frozen && (within(card, x, y) || (L < card[2] && L + t.wd > card[0] && T < card[3] && T + t.ht > card[1]))) continue
      shown.add(t); t.a.style.transform = `translate(${Math.round(L)}px, ${Math.round(T)}px)`
      ctx.beginPath(); ctx.arc(x * d, y * d, 3 * d, 0, 2 * Math.PI); ctx.fill()
    }
    for (const t of tags) t.a.hidden = !shown.has(t)
  }
  G.extra = lay
  const measure = () => tags.forEach(t => { const h = t.a.hidden; t.a.hidden = false; t.wd = t.a.offsetWidth; t.ht = t.a.offsetHeight; t.a.hidden = h })
  if (document.fonts) { document.fonts.ready.then(() => { measure(); G.draw() }); document.fonts.addEventListener('loadingdone', () => { measure(); G.draw() }) }
  const turnBy = (dx, dy) => { const r = G.radius(); if (!r) return; G.lat0 = Math.min(89, Math.max(-89, G.lat0 + dy / r / D)); G.lon0 = ((G.lon0 - dx / (r * Math.max(.2, Math.cos(G.lat0 * D))) / D + 540) % 360) - 180; G.draw() }
  const look = (lon, lat, z, dx, dy) => {
    const r = unit() * z, x2 = dx / r, y2 = -dy / r, A = lon * D, B = lat * D, q = x2 / Math.cos(B)
    if (!r || Math.abs(q) >= 1 || x2 * x2 + y2 * y2 >= 1) return [lon, lat]
    const d = Math.asin(q), z2 = Math.sqrt(1 - x2 * x2 - y2 * y2)
    return [(A - d) / D, Math.min(89, Math.max(-89, (Math.atan2(z2, y2) - Math.atan2(Math.cos(B) * Math.cos(d), Math.sin(B))) / D))]
  }
  const zoom = (X, Y, f) => {
    const p = G.at(X, Y), k = cv.getBoundingClientRect()
    G.z = Math.min(300, Math.max(1, G.z * f)); manual = true
    const dx = (X - k.left) * dpr() - G.ox(), dy = (Y - k.top) * dpr() - G.oy()
    if (p && Math.hypot(dx, dy) < G.radius()) [G.lon0, G.lat0] = look(p[0], p[1], G.z, dx, dy)
    G.draw()
  }
  const frame = ws => {
    const b = bounds(ws), lon = (b[0] + b[2]) / 2, lat = (b[1] + b[3]) / 2, d = dpr(), R = unit()
    if (!R) return [lon, lat, G.z]
    const fw = Math.max(60 * d, 1.5 * R - Math.min(150 * d, R * .5)), fh = Math.max(60 * d, R * 1.4)
    const wkm = Math.max(60, (b[2] - b[0]) * 111 * Math.cos(lat * D)), hkm = Math.max(60, (b[3] - b[1]) * 111)
    const z = Math.min(300, Math.max(1, Math.min(fw * .75 / wkm, fh * .75 / hkm) * 6371 / R))
    return [lon, lat, z]
  }
  const basins = ws => sheds.filter(b => b.ws.some(w => ws.includes(w)))
  const cover = bs => {
    const v = bs.reduce((t, s) => t.map((x, i) => x + s.c[i]), [0, 0, 0]), l0 = Math.atan2(v[1], v[0]) / D, b = [Infinity, Infinity, -Infinity, -Infinity]
    for (const s of bs) for (let i = 0; i < s.g.n; i++) { const x = ((s.g.ll[i * 2] - l0 + 540) % 360) - 180, y = s.g.ll[i * 2 + 1]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y) }
    const lon = ((l0 + (b[0] + b[2]) / 2 + 540) % 360) - 180, lat = (b[1] + b[3]) / 2, p = [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)]
    let q = 1
    for (const s of bs) for (let i = 0; i < s.g.n; i++) q = Math.min(q, p[0] * s.g.xyz[i * 3] + p[1] * s.g.xyz[i * 3 + 1] + p[2] * s.g.xyz[i * 3 + 2])
    return [lon, lat, q > 0 ? Math.min(300, Math.max(1, .86 / Math.sqrt(1 - q * q))) : 1]
  }
  const still = () => { cancelAnimationFrame(G.fly); cancelAnimationFrame(glide); cancelAnimationFrame(twirl); clearTimeout(away); G.sailing = false; if (G.hue >= 0) { G.hue = -1; cv.classList.remove('rainbow') } }
  const tabOf = li => li && li.closest('li[data-tab]')
  const rows = ws => ws.map(w => side && side.querySelector(`li[data-sub] > a[href="${w.href}"]`)).filter(Boolean).map(a => a.parentNode)
  const lamps = li => { const t = tabOf(li); return [li, li.leaf, t && t.petal].filter(Boolean) }
  const mark = (ws, on) => rows(ws).forEach(li => lamps(li).forEach(x => !(x.li || x).classList.contains('on') && x.classList.toggle('lit', on)))
  const inkOf = li => { const tab = tabOf(li), h = tab ? parseFloat(tab.style.getPropertyValue('--hue')) : NaN; return isNaN(h) ? blue : `hsl(${h}, 60%, 48%)` }
  const glow = (li, on) => { if (li) lamps(li).forEach(x => !(x.li || x).classList.contains('on') && x.classList.toggle('lit', on)) }
  const here = () => decodeURIComponent(location.pathname) === '/' ? chosen() : nav && [...nav.querySelectorAll('li.on')].pop() || null
  const light = (ws, title, note, from, tipped) => {
    mark(G.hot, false); G.hot = ws; if (!from && (tipped || decodeURIComponent(location.pathname) !== '/')) mark(G.hot, true)
    G.pick = (tipped || from) && ws.length ? new Set(ws) : null
    if (held !== from) { glow(held, false); held = from || null; glow(held, true) }
    const src = from || here()
    G.tint = inkOf(src)
    cv.classList.toggle('over', ws.length > 0)
    tip.hidden = !(tipped && ws.length && (title || note))
    if (!tip.hidden) { const tab = tabOf(src), h = tab ? parseFloat(tab.style.getPropertyValue('--hue')) : NaN; tip.firstChild.textContent = title; tip.lastChild.textContent = note; tip.style.color = tab && tab.style.getPropertyValue('--on') === '#111' && !isNaN(h) ? `hsl(${h}, 60%, 32%)` : G.tint; tw = tip.offsetWidth; th = tip.offsetHeight }
    G.draw()
  }
  const put = (x, top, bottom, gap, up) => {
    const W = cv.width / dpr(), H = cv.height / dpr(), x0 = 0
    let t = up ? top - gap - th : bottom + gap
    if (t < 0) t = bottom + gap
    if (t + th > H) t = Math.max(0, top - gap - th)
    tip.style.left = Math.min(Math.max(x0, x - tw / 2), Math.max(x0, W - tw)) + 'px'; tip.style.top = t + 'px'
  }
  const place = () => { if (tip.hidden || (base.from && same(G.hot, base.ws))) return; const sp = span(G.hot); if (sp) put((sp[0] + sp[2]) / 2, sp[1], sp[3], 12, true) }
  G.onstep = place
  const restore = () => { light(base.ws, base.title, base.note, base.from, base.tip); place() }
  const label = ws => {
    tags = ws.map(w => { const a = document.createElement('a'); a.href = w.href; a.textContent = w.title; a.hidden = true; a.addEventListener('mouseenter', () => { clearTimeout(away); light([w], w.title, w.lands, base.from, true); place() }); a.addEventListener('mouseleave', restore); return { w, a } })
    marks.replaceChildren(...tags.map(t => t.a)); measure()
  }
  const set = (ws, title, note, from, tipped, named = true) => { base = { ws, title, note, from, tip: tipped, named }; G.only = from ? new Set(ws) : null; label(named ? ws : []); restore() }
  const sail = (lon, lat, zt, ms, turns, done) => { still(); G.sail(lon, lat, zt, ms, turns, done) }
  const who = h => { const n = names[h] || []; return n.length > 9 ? n.slice(0, 9).join(', ') + ' …' : n.join(', ') }
  const visit = (ws, title, from, note, hush) => { sail(...frame(ws)); set(ws, ws.length === 1 && !note ? ws[0].title : title, note || (ws.length === 1 ? ws[0].lands : ''), from, !hush, !hush) }
  const show = (ws, li, title, h) => { if (performance.now() < quiet || lure) return; clearTimeout(away); clearTimeout(soon); soon = setTimeout(() => visit(ws, title, li, waters.some(w => w.href === h) ? '' : who(h), true), 120) }
  const own = () => { const h = decodeURIComponent(location.pathname); return h === '/' ? (shown ? waters.filter(w => shown.has(w)) : []) : find(h) }
  const rest = () => own().length ? frame(own()) : [ml, mb, 1]
  const settle = () => set(focus, '', '', null, false, focus.length === 1 && focus[0].href === decodeURIComponent(location.pathname))
  const back = () => { manual = false; if (base.from) blend(); settle(); sail(...rest()) }
  const hide = () => { clearTimeout(soon); clearTimeout(away); if (!inside && !lure) away = setTimeout(back, 600) }
  const entries = () => [...document.querySelectorAll('main .page .post, main .page .entry, main .page li')].map(el => { const a = el.querySelector('a[href]'), h = a && decodeURIComponent(a.getAttribute('href')), ws = a ? find(h) : []; return ws.length ? { el, ws } : null }).filter(Boolean)
  const port = () => (page && page.querySelector(':scope > .port')) || page
  const current = () => { const r = page ? port().getBoundingClientRect() : null, top = r ? Math.max(0, r.top) : 0, y = top + (Math.min(innerHeight, r ? r.bottom : innerHeight) - top) * .4; let e = null; for (const x of entries()) if (x.el.getBoundingClientRect().top <= y) e = x; return e }
  const refocus = () => {
    const e = (page && port().scrollTop) || scrollY ? current() : null, ws = e ? e.ws : own()
    if (same(ws, focus)) return
    focus = ws
    if (!base.from && !spun && !lure) settle()
  }
  const go = h => { const u = new URL(h, location.href); u.origin !== location.origin || /\.\w+$/.test(u.pathname) ? location.href = u.href : (window.route || (v => location.href = v))(h) }
  const keyOf = el => { const a = el && el.querySelector(':scope > a[href]'), h = el && (el.dataset.href || (a && a.getAttribute('href'))); return h ? decodeURIComponent(h) : '' }
  const box = li => li.querySelector(':scope > details')
  const kids = li => { const d = box(li); return d ? [...d.querySelectorAll(':scope > ul > li')] : [] }
  const wsOf = li => { const d = box(li), as = d ? [li, ...d.querySelectorAll('li[data-href], a[href]')] : [li.querySelector(':scope > a[href]')].filter(Boolean), out = []; for (const a of as) { const h = a.dataset.href || a.getAttribute('href'); if (h) for (const w of find(decodeURIComponent(h))) if (!out.includes(w)) out.push(w) } return out }
  const chosen = () => { let li = null; for (const t of tabs) { const d = box(t); if (!d || !d.open) continue; li = t; for (;;) { const n = kids(li).find(c => box(c) && box(c).open); if (!n) break; li = n } } return li }
  const relayer = move => {
    const li = chosen(), ws = li ? wsOf(li) : []
    shown = ws.length ? new Set(ws) : null; G.dim = shown
    G.inks = new Map(); if (li) { const ink = inkOf(li); for (const w of ws) G.inks.set(w, ink) }
    if (move && decodeURIComponent(location.pathname) === '/') { focus = own(); if (!base.from && !spun && !lure) { manual = false; settle(); sail(...rest()) } }
    G.draw()
  }
  let due = 0, lure = null, hook = 0, stash = null, berth = [0, 0], sent = ''
  const unstash = () => { if (stash) { page.replaceChildren(...stash); stash = null; fit(); port().scrollTop = berth[0]; scrollTo(scrollX, berth[1]) } }
  const unhook = () => { if (!lure) return; lure = null; clearTimeout(hook); still(); cv.classList.remove('rainbow'); G.lon0 = ((G.lon0 % 360) + 540) % 360 - 180; light([]); unstash(); settle() }
  const refresh = move => { cancelAnimationFrame(due); due = requestAnimationFrame(() => relayer(move)) }
  if (side) side.addEventListener('toggle', () => refresh(true), true)
  const fit = () => {
    const grew = G.size(), was = overlay ? ch : -1
    overlay = !!page && page.offsetParent !== null && getComputedStyle(page).position === 'absolute'
    if (page) { const R = unit() / dpr(), w = overlay ? Math.round(2 * R + 4) + 'px' : '', pad = overlay ? `${Math.round(R * .42)}px ${Math.round(R * .22)}px` : ''; if (page.style.width !== w) { page.style.width = w; page.style.height = w } if (page.style.padding !== pad) page.style.padding = pad }
    cw = overlay ? page.offsetWidth : 0; ch = overlay ? page.offsetHeight : 0
    if (!overlay && page) page.style.transform = ''
    if ((grew || (overlay ? ch : -1) !== was) && cv.width && !manual && !base.from && !spun && !lure) { still(); [G.lon0, G.lat0, G.z] = rest(); place() }
    if (grew) G.paint(); else G.draw()
  }
  let refit = 0
  const later = () => { cancelAnimationFrame(refit); refit = requestAnimationFrame(() => fit()) }
  const down = new Map()
  let last = null, start = null, vel = [0, 0], t = 0
  const move = e => {
    if (!down.has(e.pointerId)) return
    down.set(e.pointerId, [e.clientX, e.clientY])
    const now = [...down.values()]
    if (touch && !dragged && now.length === 1) { const dx = e.clientX - start[0], dy = e.clientY - start[1]; if (Math.hypot(dx, dy) < 6 || Math.abs(dy) > Math.abs(dx)) { last = now; return } }
    if (now.length === 1) { const dx = (now[0][0] - last[0][0]) * dpr(), dy = (now[0][1] - last[0][1]) * dpr(), dt = Math.max(1, e.timeStamp - t); vel = [dx / dt, dy / dt]; t = e.timeStamp; turnBy(dx, dy) }
    else if (now.length === 2 && last.length === 2) {
      const d0 = Math.hypot(last[0][0] - last[1][0], last[0][1] - last[1][1]), d1 = Math.hypot(now[0][0] - now[1][0], now[0][1] - now[1][1])
      const mx = (now[0][0] + now[1][0]) / 2, my = (now[0][1] + now[1][1]) / 2, ox = (last[0][0] + last[1][0]) / 2, oy = (last[0][1] + last[1][1]) / 2
      turnBy((mx - ox) * dpr(), (my - oy) * dpr()); zoom(mx, my, d0 ? d1 / d0 : 1)
    }
    last = now
    if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 4) { dragged = true; manual = true }
  }
  const coast = now => { if (!down.size && Math.hypot(...spin) > .01 && now - t < 3000) { turnBy(spin[0] * 16, spin[1] * 16); spin = [spin[0] * .94, spin[1] * .94]; glide = requestAnimationFrame(coast) } }
  const up = e => { down.delete(e.pointerId); last = [...down.values()]; if (!down.size) { cv.classList.remove('held'); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (e.type === 'pointerup' && dragged && e.timeStamp - t < 80) { spin = vel; t = e.timeStamp; glide = requestAnimationFrame(coast) }; setTimeout(() => { dragged = false }) } }
  cv.addEventListener('pointerdown', e => { if (e.button) return; unhook(); still(); touch = e.pointerType === 'touch'; spin = [0, 0]; vel = [0, 0]; t = e.timeStamp; if (e.pointerType === 'mouse') down.clear(); if (!down.size) { addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up) }; down.set(e.pointerId, [e.clientX, e.clientY]); last = [...down.values()]; start = [e.clientX, e.clientY]; dragged = false; cv.classList.add('held') })
  cv.addEventListener('wheel', e => { e.preventDefault(); unhook(); still(); zoom(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.deltaMode ? .05 : e.ctrlKey ? .01 : .003))) }, { passive: false })
  let pinch = 1
  cv.addEventListener('gesturestart', e => { e.preventDefault(); unhook(); pinch = 1 })
  cv.addEventListener('gesturechange', e => { e.preventDefault(); zoom(e.clientX, e.clientY, e.scale / pinch); pinch = e.scale })
  cv.addEventListener('dblclick', e => { e.preventDefault(); still(); zoom(e.clientX, e.clientY, 2.5) })
  const peeked = () => !same(G.hot, base.ws) || (!tip.hidden && !base.tip)
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || lure) return
    const w = down.size ? null : G.hit(e.clientX, e.clientY)
    if (w) { if (!same(G.hot, [w]) || tip.hidden) light([w], w.title, w.lands, base.from, true); const r = wrap.getBoundingClientRect(); put(e.clientX - r.left, e.clientY - r.top, e.clientY - r.top, 24, false) }
    else if (peeked()) restore()
  })
  cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && !lure && peeked()) restore() })
  wrap.addEventListener('pointerenter', () => { inside = true; clearTimeout(away) })
  wrap.addEventListener('pointerleave', e => { inside = false; if (e.pointerType !== 'touch' && base.from) hide() })
  if (side) side.addEventListener('mouseover', e => { const a = e.target.closest('.side li > a[href]'), h = a && decodeURIComponent(a.getAttribute('href')), ws = a ? find(h) : []; if (ws.length) show(ws, a.parentNode, a.textContent.trim(), h) })
  if (side) side.addEventListener('mouseout', e => { const a = e.target.closest('.side li > a[href]'); if (a && !(e.relatedTarget && a.contains(e.relatedTarget)) && find(decodeURIComponent(a.getAttribute('href'))).length) hide() })
  if (page) {
    const named = a => tabs.find(t => t.dataset.name === a.dataset.link) || (nav && [...nav.querySelectorAll('li[data-sub] > a[href]')].filter(x => x.getAttribute('href') === a.getAttribute('href')).map(x => x.closest('li'))[0])
    page.addEventListener('mouseover', e => { const a = e.target.closest('.tablink'); if (a) glow(named(a), true) })
    page.addEventListener('mouseout', e => { const a = e.target.closest('.tablink'); if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) glow(named(a), false) })
  }
  const whirl = now => { G.lon0 -= 1.2; G.hue = (now / 4) % 360; G.draw(); twirl = requestAnimationFrame(whirl) }
  document.addEventListener('gofish', e => {
    const d = e.detail
    if (d.spin) { spun = true; still(); clearTimeout(soon); G.only = null; light([]); tags = []; marks.replaceChildren(); G.z = 1; cv.classList.add('rainbow'); twirl = requestAnimationFrame(whirl) }
    else if (d.spin === false && spun) { spun = false; still(); set(base.ws, base.title, base.note, base.from, base.tip, base.named); spin = [1.2 * D * G.radius() * Math.max(.2, Math.cos(G.lat0 * D)) / 16, 0]; t = performance.now(); glide = requestAnimationFrame(coast) }
    else if (d.spin === false) restore()
    if (d.go) {
      const ws = find(decodeURIComponent(d.go)), bs = basins(ws), to = bs.length ? cover(bs) : ws.length ? frame(ws) : [ml, mb, 1], a = nav && nav.querySelector(`a[href="${d.go}"], li[data-href="${d.go}"]`), li = a && a.closest('li')
      clearTimeout(hook); clearTimeout(soon); lure = d.go; spun = false
      if (page && page.firstChild) { berth = [port().scrollTop, scrollY]; stash = [...page.childNodes]; page.replaceChildren(); fit() }
      G.only = null; light([]); tags = []; marks.replaceChildren()
      sail(to[0], to[1], 1, Math.max(600, d.ms - 80), 3, () => {
        if (!ws.length) { lure = null; sent = d.go; return go(d.go) }
        light(ws, '', '', li, !li); G.tint = inkOf(li)
        sail(...to, Math.min(650, 300 + 110 * Math.log(to[2])), 0, () => { hook = setTimeout(() => { lure = null; sent = d.go; go(d.go) }, 300) })
      })
      cv.classList.add('rainbow')
    }
  })
  const scrolled = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; refocus() }) } }
  addEventListener('scroll', scrolled, { passive: true })
  if (page) page.addEventListener('scroll', scrolled, { passive: true, capture: true })
  cv.addEventListener('click', e => {
    if (dragged) { dragged = false; return }
    const w = G.hit(e.clientX, e.clientY)
    if (w && touch && !G.hot.includes(w)) { light([w], w.title, w.lands, null, true); place() }
    else if (w) go(w.href)
  })
  addEventListener('keydown', e => { if (e.key === 'Escape') { clearTimeout(away); unhook(); back() } })
  const kept = (() => { try { return sessionStorage.getItem('globe') } catch { return null } })()
  const arrive = animate => {
    clearTimeout(soon); clearTimeout(away); clearTimeout(hook); spun = false; lure = stash = null; sent = ''; manual = keep
    const h = decodeURIComponent(location.hash.slice(1)), asked = h.startsWith('/') ? find(h) : waters.filter(w => w.slug === h)
    focus = own(); base = { ws: [], title: '', note: '', from: null, tip: false, named: false }; settle()
    if (asked.length) visit(asked, h.split('/').filter(Boolean).pop().replace(/-/g, ' '), undefined, h.startsWith('/') ? who(h) : '')
    else if (keep) still()
    else if (animate) sail(...rest())
    else if (focus.length) { still(); [G.lon0, G.lat0, G.z] = rest() }
    else if (kept) [G.lon0, G.lat0, G.z] = kept.split(' ').map(Number)
    G.draw(); place()
  }
  for (let i = 0; i < 120 && getComputedStyle(cv).display !== 'block'; i++) await new Promise(r => requestAnimationFrame(r))
  if (early || seen()) enter()
  try { sessionStorage.removeItem('globe') } catch {} fit(); relayer(false); arrive(false)
  new ResizeObserver(later).observe(cv)
  if (page) new ResizeObserver(later).observe(page)
  const turn = close => { if (stash && !page.firstChild) unstash(); if (close) enter(); quiet = performance.now() + 700; manual = true; relayer(false); const had = overlay; fit(); if (had && overlay) blend(); else dockFrom = null; arrive(true); keep = false; refresh(false) }
  document.addEventListener('page', () => turn(true))
  if (page) page.addEventListener('click', e => { if (!e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.target.closest('.close') && page.querySelector('.intro.front')) { e.preventDefault(); keep = true; turn(true) } })
  addEventListener('pagehide', () => { try { sessionStorage.setItem('globe', [G.lon0, G.lat0, G.z].join(' ')) } catch {} })
})()
}
