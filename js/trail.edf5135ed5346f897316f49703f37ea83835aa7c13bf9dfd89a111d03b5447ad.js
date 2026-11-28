{
const side = document.querySelector('.side'), nav = side && side.querySelector('.nav'), band = document.querySelector('.band')
if (nav && band) {
  const trail = document.createElement('nav')
  trail.className = 'trail'; trail.setAttribute('aria-label', 'where you are'); trail.hidden = true
  const box = li => li.querySelector(':scope > details')
  const name = li => [...box(li).querySelector(':scope > summary').childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
  let last = null
  const up = li => { const out = []; for (let x = li; x && nav.contains(x); x = x.parentElement.closest('li')) out.unshift(x); return out }
  const down = li => { const out = []; for (let x = li; ;) { x = [...box(x).querySelector(':scope > ul').children].find(c => box(c) && box(c).open); if (!x) return out; out.push(x) } }
  const path = () => { let li = last; while (li && nav.contains(li) && !up(li).every(x => box(x).open)) li = li.parentElement.closest('li'); if (!li || !nav.contains(li)) li = [...nav.children].find(c => box(c) && box(c).open); return li ? [...up(li), ...down(li)] : [] }
  const fold = li => { const d = box(li); d.querySelectorAll('details[open]').forEach(x => { x.open = false }); d.open = false }
  const button = (text, go) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.addEventListener('click', go); return b }
  const draw = () => {
    const p = path(), up = !side.offsetParent
    if (up ? trail.parentNode !== band : trail.nextElementSibling !== nav) up ? band.append(trail) : nav.before(trail)
    trail.hidden = !p.length
    if (!p.length) return trail.replaceChildren()
    trail.style.setProperty('--hue', p[0].style.getPropertyValue('--hue'))
    const back = button('\u2039', () => fold(p[p.length - 1]))
    back.className = 'back'; back.setAttribute('aria-label', 'back')
    const bits = [back]
    p.forEach((li, i) => {
      if (i) { const s = document.createElement('span'); s.setAttribute('aria-hidden', 'true'); s.textContent = '\u203a'; bits.push(s) }
      if (i < p.length - 1) bits.push(button(name(li), () => fold(p[i + 1])))
      else { const b = document.createElement('b'); b.setAttribute('aria-current', 'true'); b.textContent = name(li); bits.push(b) }
    })
    trail.replaceChildren(...bits)
  }
  side.addEventListener('toggle', e => { if (e.target.tagName === 'DETAILS' && e.target.open) last = e.target.parentElement; draw() }, true)
  document.addEventListener('page', draw)
  if (window.flower) window.flower.addEventListener('change', draw)
  addEventListener('resize', draw)
  draw()
}
}
