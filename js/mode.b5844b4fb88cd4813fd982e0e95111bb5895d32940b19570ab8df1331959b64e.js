{
const q = matchMedia('(max-width: 820px), (max-width: 1000px) and (hover: none), (max-width: 1000px) and (pointer: coarse), (pointer: coarse) and (max-height: 500px)'), h = document.documentElement
const show = () => h.classList.toggle('flower', q.matches)
show()
q.addEventListener('change', show)
window.flower = q
}
