{
const side = document.querySelector('.side'), svg = side && side.querySelector('.garden'), stem = svg && svg.querySelector('#stem')
if (side) side.querySelectorAll('li[data-tab]').forEach(li => {
  const h = parseFloat(li.style.getPropertyValue('--hue')), f = n => { const k = (n + h / 30) % 12, v = .48 - .6 * Math.min(.48, .52) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
  if (!isNaN(h)) li.style.setProperty('--on', .2126 * f(0) + .7152 * f(8) + .0722 * f(4) > .22 ? '#111' : '#fff')
})
if (stem) {
  const mobile = matchMedia('(max-width: 820px), (pointer: coarse) and (max-height: 500px)')
  const leaves = svg.querySelector('.leaves'), ns = 'http://www.w3.org/2000/svg', top = stem.getAttribute('d').match(/M70 ([\d.]+)/)[1]
  const follow = h => { const u = new URL(h, location.href); u.origin !== location.origin || /\.\w+$/.test(u.pathname) ? location.href = u.href : (window.route || (v => location.href = v))(h) }
  let len = 0
  const scale = () => Math.max(.2, (parseFloat(getComputedStyle(svg).width) || 280) / 280)
  const fit = () => {
    const nav = side.querySelector('.nav'), H = Math.max(Number(top) + 60, Math.round((nav.getBoundingClientRect().bottom - side.getBoundingClientRect().top) / scale()) + 6, document.body.classList.contains('shut') ? Math.round((innerHeight - svg.getBoundingClientRect().top - scrollY - 16) / scale()) : 0)
    let d, y
    if (H < 400) { d = `M70 ${top} C 70 ${Number(top) + 80}, 86 ${H - 80}, 70 ${H}`; y = H }
    else { d = `M70 ${top} C 70 200, 92 320, 70 400`; y = 400 }
    while (y + 340 <= H) { d += ` C 48 ${y + 110}, 92 ${y + 220}, 70 ${y + 340}`; y += 340 }
    if (y < H) { d += ` C 56 ${y + (H - y) / 2}, 70 ${H - 4}, 70 ${H}` }
    const V = Math.min(40000, Math.max(H, Math.round(side.clientHeight / scale())))
    svg.setAttribute('viewBox', `0 0 280 ${V}`); svg.style.height = Math.round(V * scale()) + 'px'; stem.setAttribute('d', d); len = stem.getTotalLength()
  }
  const at = y => { let lo = 0, hi = len; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (stem.getPointAtLength(m).y < y) lo = m; else hi = m }; return lo }
  const pose = (g, L, k) => {
    const p = stem.getPointAtLength(L), q = stem.getPointAtLength(Math.min(len, L + 2)), side = g.side || 1
    const a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI - (side > 0 ? 0 : 180)
    g.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${a * (1 - k)}) scale(${-.5 * side} .5) translate(-77 0)`)
  }
  const ease = t => 1 - Math.pow(1 - t, 3)
  const swim = (g, L1, delay) => {
    const t0 = performance.now() + delay
    const step = now => { const t = Math.min(1, Math.max(0, (now - t0) / 1100)); pose(g, L1 * ease(t), Math.max(0, (t - .75) / .25)); if (t < 1) requestAnimationFrame(step) }
    requestAnimationFrame(step)
  }
  const row = li => li.querySelector(':scope > details > summary') || li.querySelector(':scope > a, :scope > span') || li
  const target = li => { const r = row(li).getBoundingClientRect(); return (r.top + r.height / 2 - svg.getBoundingClientRect().top) / scale() }
  const textStart = li => { const rg = document.createRange(); rg.selectNodeContents(row(li)); const r = rg.getBoundingClientRect(), b = svg.getBoundingClientRect(); return (r.left - b.left) / scale() }
  const rows = d => [...d.querySelectorAll(':scope > ul > li[data-sub]')]
  const clear = d => rows(d).forEach(li => { if (li.leaf) li.leaf.remove(); li.leaf = null })
  const grow = (d, animate) => {
    clear(d)
    const tab = d.closest('li[data-tab]'), hue = tab ? tab.style.getPropertyValue('--hue') || 120 : 120
    rows(d).forEach((li, j) => {
      if (row(li).offsetParent === null) return
      const g = document.createElementNS(ns, 'g'), u = document.createElementNS(ns, 'use')
      const col = `hsl(${hue} 60% ${li.dataset.l || 50}%)`
      g.setAttribute('class', 'leaf' + (li.classList.contains('on') ? ' lit' : '')); g.setAttribute('stroke', col); g.setAttribute('color', col)
      u.setAttribute('href', '#ffish'); g.appendChild(u); leaves.appendChild(g); li.leaf = g; g.li = li
      g.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') { g.classList.add('lit'); li.classList.add('lit') } })
      g.addEventListener('pointerleave', () => { li.classList.remove('lit'); if (!li.classList.contains('on')) g.classList.remove('lit') })
      g.addEventListener('click', () => { const a = li.querySelector(':scope > a'), d = li.querySelector(':scope > details'); if (d) d.open = !d.open; else if (a) follow(a.getAttribute('href')) })
      const L = at(target(li)), x = stem.getPointAtLength(L).x
      g.side = (j % 2 && x + 40 < textStart(li) - 4) ? 1 : -1
      animate ? swim(g, L, j * 140) : pose(g, L, 1)
    })
  }
  const shown = d => d.open && !d.parentElement.closest('details:not([open])') && d.offsetParent !== null
  const regrow = skip => { if (!mobile.matches) return; fit(); side.querySelectorAll('details').forEach(d => { if (skip && (d === skip || skip.contains(d))) return; shown(d) ? grow(d, false) : clear(d) }) }
  const toggle = (d, animate) => { const kids = [...d.querySelectorAll('details')]; if (shown(d)) { grow(d, animate); kids.forEach(x => shown(x) ? grow(x, animate) : clear(x)) } else { clear(d); kids.forEach(clear) } }
  if (mobile.matches) { fit(); side.querySelectorAll('details').forEach(d => { if (shown(d)) grow(d, true) }) }
  side.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => { if (!mobile.matches) return; fit(); toggle(d, true); regrow(d) }))
  mobile.addEventListener('change', () => regrow())
  let w0 = null
  new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w0 !== null && w !== w0) regrow(); w0 = w }).observe(side)
  let h0 = innerHeight
  addEventListener('resize', () => { if (innerHeight !== h0 && document.body.classList.contains('shut')) regrow(); h0 = innerHeight })
  addEventListener('load', () => regrow())
  if (document.fonts) document.fonts.ready.then(() => regrow())
  side.querySelectorAll('li[data-tab]').forEach(li => {
    const p = svg.querySelector(`.petal[data-tab="${li.dataset.tab}"]`)
    if (!p) return
    const on = e => { if (!mobile.matches || e.pointerType === 'touch') return; p.classList.add('lit'); li.classList.add('lit') }, off = () => { li.classList.remove('lit'); if (!li.classList.contains('on')) p.classList.remove('lit') }
    const head = li.querySelector(':scope > details > summary') || li.querySelector(':scope > a')
    if (head) { head.addEventListener('pointerenter', on); head.addEventListener('pointerleave', off) }
    p.addEventListener('pointerenter', on); p.addEventListener('pointerleave', off)
    p.addEventListener('click', () => { const d = li.querySelector(':scope > details'), a = li.querySelector(':scope > a'); if (d) d.open = !d.open; else if (a) follow(a.getAttribute('href')) })
  })
  side.addEventListener('pointerover', e => { const li = e.target.closest('li[data-sub]'); if (e.pointerType !== 'touch' && li && li.leaf && !li.contains(e.relatedTarget)) li.leaf.classList.add('lit') })
  side.addEventListener('pointerout', e => { const li = e.target.closest('li[data-sub]'); if (li && li.leaf && !li.classList.contains('on') && !li.contains(e.relatedTarget)) li.leaf.classList.remove('lit') })
  const named = (e, on) => {
    const a = e.target.closest('.tablink'), li = a && side.querySelector(`li[data-tab][data-name="${a.dataset.link}"]`), p = li && svg.querySelector(`.petal[data-tab="${li.dataset.tab}"]`)
    if (!li || a.contains(e.relatedTarget)) return
    li.classList.toggle('lit', on); if (p && (on || !li.classList.contains('on'))) p.classList.toggle('lit', on)
  }
  const page = document.querySelector('main .page')
  let shut = false
  try { shut = !!sessionStorage.getItem('shut'); sessionStorage.removeItem('shut') } catch {}
  if (shut && mobile.matches && document.body.classList.contains('home')) { document.body.classList.add('shut'); regrow() }
  shut = false
  document.addEventListener('click', e => { const x = e.target.closest('main .page .close'); if (!x || !mobile.matches || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; try { sessionStorage.setItem('world', '1') } catch {} if (new URL(x.href).pathname !== location.pathname) { shut = true; side.querySelectorAll('details[open]').forEach(d => { d.open = false }); try { sessionStorage.setItem('shut', '1') } catch {} return } e.preventDefault(); document.body.classList.add('shut'); scrollTo(0, 0); regrow() }, true)
  document.addEventListener('page', () => { document.body.classList.toggle('shut', shut && document.body.classList.contains('home')); shut = false; try { sessionStorage.removeItem('shut') } catch {} })
  if (page) { page.addEventListener('pointerover', e => { if (mobile.matches && e.pointerType !== 'touch') named(e, true) }); page.addEventListener('pointerout', e => named(e, false)) }
  document.addEventListener('page', () => { side.querySelectorAll('li[data-tab]').forEach(li => { const p = svg.querySelector(`.petal[data-tab="${li.dataset.tab}"]`); if (p) p.classList.toggle('lit', li.classList.contains('on')) }); regrow() })
  const random = document.getElementById('random'), petals = [...svg.querySelectorAll('.petal')]
  let whirl = 0, k = 0
  const spinFast = () => { petals.forEach(p => p.classList.remove('lit')); petals[k++ % petals.length].classList.add('lit') }
  const calm = () => { clearInterval(whirl); petals.forEach(p => p.classList.remove('lit')); side.querySelectorAll('li.on').forEach(li => { const p = svg.querySelector(`.petal[data-tab="${li.dataset.tab}"]`); if (p) p.classList.add('lit') }) }
  if (random && petals.length) {
    random.addEventListener('pointerenter', e => { if (!mobile.matches || e.pointerType === 'touch') return; clearInterval(whirl); whirl = setInterval(spinFast, 45) })
    random.addEventListener('pointerleave', calm)
    random.addEventListener('click', e => {
      if (!mobile.matches || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      clearInterval(whirl); e.preventDefault()
      const pages = (random.dataset.pages || '').split(' ').filter(p => p && p !== location.pathname), target = pages[Math.floor(Math.random() * pages.length)] || random.getAttribute('href'), steps = petals.length * 2 + Math.floor(Math.random() * petals.length)
      let i = 0, delay = 55
      const tick = () => { petals.forEach(p => p.classList.remove('lit')); petals[i % petals.length].classList.add('lit'); if (++i < steps) { delay *= 1.09; setTimeout(tick, delay) } else setTimeout(() => follow(target), 400) }
      tick()
    })
  }
}
}
