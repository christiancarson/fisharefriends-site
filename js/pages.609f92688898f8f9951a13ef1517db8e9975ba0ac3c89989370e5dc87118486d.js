{
const main = document.querySelector('main'), page = main && main.querySelector('.page'), side = document.querySelector('.side')
if (page && side) {
  history.scrollRestoration = 'manual'
  let current = location.pathname
  const read = async path => (await fetch(path)).text()
  const norm = el => el.innerHTML.replace(/ (class|style)="[^"]*"/g, '').replace(/ open(="")?/g, '')
  const built = d => [...d.querySelectorAll('script[src], link[rel=stylesheet]')].map(e => e.getAttribute('src') || e.getAttribute('href')).join()
  const swap = doc => {
    const m = doc.querySelector('main'), p = m && m.querySelector('.page'), nav = doc.querySelector('.side .nav'), here = side.querySelector('.nav')
    if (!p || !nav || !here || norm(nav) !== norm(here) || built(doc) !== built(document)) return false
    document.title = doc.title
    document.body.className = doc.body.className
    main.className = m.className
    main.setAttribute('style', m.getAttribute('style') || '')
    page.replaceChildren(...p.childNodes)
    const was = [...here.querySelectorAll('li, details')], now = [...nav.querySelectorAll('li, details')], own = now.some(el => el.classList.contains('on'))
    was.forEach((el, i) => { if (el.tagName === 'DETAILS') { if (own && el.open !== now[i].open) el.open = now[i].open } else { el.classList.remove('lit'); el.classList.toggle('on', now[i].classList.contains('on')) } })
    return true
  }
  const route = async (h, push = true) => {
    const path = h.split('#')[0] || location.pathname
    if (push) history.pushState(null, '', h)
    if (path !== current) {
      let doc = null
      try { doc = new DOMParser().parseFromString(await read(path), 'text/html') } catch {}
      if (new URL(path, location.href).pathname !== location.pathname) return
      if (!doc || !swap(doc)) { location.reload(); return }
      current = path
      scrollTo(0, 0); page.scrollTop = 0; const port = page.querySelector(':scope > .port'); if (port) port.scrollTop = 0
    }
    const id = h.split('#')[1], to = id && document.getElementById(id)
    if (to) to.scrollIntoView()
    document.dispatchEvent(new CustomEvent('page', { detail: { path } }))
  }
  window.route = route
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest('a[href]')
    if (!a || a.dataset.full || a.target || a.hasAttribute('download')) return
    const u = new URL(a.href, location.href)
    if (u.origin !== location.origin || /\.\w+$/.test(u.pathname) || (u.pathname === location.pathname && u.hash)) return
    e.preventDefault()
    route(u.pathname + u.hash)
  })
  addEventListener('popstate', () => route(location.pathname + location.hash, false))
  const aim = () => {
    const m = page.querySelector('.intro .arrow'), x = page.querySelector('.close'), port = page.querySelector(':scope > .port'), r = m && m.getClientRects()[0], c = x && x.getBoundingClientRect(), v = port && port.getBoundingClientRect()
    let w = page.querySelector(':scope > .wire')
    const io = m && m.closest('.intro')
    if (io && !io.watched) { io.watched = true; ro.observe(io) }
    const o = page.getBoundingClientRect(), ox = o.left + page.clientLeft, oy = o.top + page.clientTop, round = parseFloat(getComputedStyle(page).borderTopRightRadius) > 0
    const edge = y => round ? o.left + o.width / 2 + Math.sqrt(Math.max(0, (o.width / 2) ** 2 - (y - o.top - o.height / 2) ** 2)) - 14 : innerWidth - 9
    const sx = r ? r.right + 6 : 0, sy = r ? (r.top + r.bottom) / 2 : 0, ex = c ? c.left + c.width / 2 : 0, ey = c ? c.bottom + 7 : 0
    const xr = r && c ? Math.min(Math.max(sx + 20, io.getBoundingClientRect().right + 12), edge(ey), edge(sy)) : 0
    if (!r || !c || !c.width || !v || r.top < v.top || r.bottom > v.bottom + 1 || sy - ey < 60 || xr < sx + 4) { if (w) w.remove(); return }
    const k = Math.min(22, (xr - sx) / 2, (sy - ey) / 4), h = Math.min(56, (sy - ey) / 3), tx = ex + (xr - ex) * .3, a = Math.atan2(-h, tx - xr + 1)
    const p = (x, y) => `${Math.round((x - ox) * 10) / 10} ${Math.round((y - oy) * 10) / 10}`
    if (!w) { w = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); w.setAttribute('class', 'wire'); w.setAttribute('aria-hidden', 'true'); page.appendChild(w) }
    w.innerHTML = `<g filter="url(#wobble)" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M${p(sx, sy)} C${p(sx + (xr - sx) * .6, sy + 1.5)} ${p(xr + 1, sy - k * .3)} ${p(xr, sy - k)} C${p(xr + 3, sy - k - (sy - k - ey) * .4)} ${p(xr - 1, ey + h)} ${p(tx, ey)}"/><path d="M${p(tx - 11 * Math.cos(a - .45), ey - 11 * Math.sin(a - .45))} L${p(tx, ey)} L${p(tx - 11 * Math.cos(a + .45), ey - 11 * Math.sin(a + .45))}"/></g>`
  }
  addEventListener('resize', aim)
  addEventListener('scroll', aim, { capture: true, passive: true })
  document.addEventListener('page', aim)
  document.addEventListener('animationend', aim)
  if (document.fonts) { document.fonts.ready.then(aim); document.fonts.addEventListener('loadingdone', aim) }
  const ro = new ResizeObserver(() => aim())
  ro.observe(page)
}
}
