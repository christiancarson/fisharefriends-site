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
      if (!doc || !swap(doc)) { location.href = h; return }
      current = path
      scrollTo(0, 0); page.scrollTop = 0; const port = page.querySelector(':scope > .port'); if (port) port.scrollTop = 0
    }
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
}
}
