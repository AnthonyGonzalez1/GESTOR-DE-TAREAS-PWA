/* ============================================================
   UPTC · Motor de presentaciones reutilizable
   Contrato de marcado esperado por diapositiva:
   <section class="slide [slide--title|slide--divider]"
            data-section="clave-seccion"
            data-section-label="Nombre visible de la sección"
            data-slide-label="Nombre corto de esta diapositiva">
     ... contenido, con elementos class="fragment" para revelado progresivo ...
   </section>
   Requiere: contenedor <div class="stage" id="stage"> con
   .sidebar nav#sideNav, .topbar .tb-section-name#tbSectionName,
   .topbar .tb-pills#tbPills, .viewport#viewport (con las diapositivas dentro),
   botones #prevBtn #nextBtn #fsBtn #sidebarToggle, y #slideCount.
   ============================================================ */
(function(){
  const stage = document.getElementById('stage');
  const viewport = document.getElementById('viewport');
  const slides = Array.from(viewport.querySelectorAll('.slide'));
  const sideNav = document.getElementById('sideNav');
  const tbSectionName = document.getElementById('tbSectionName');
  const tbPills = document.getElementById('tbPills');
  const slideCount = document.getElementById('slideCount');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const fsBtn = document.getElementById('fsBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const fragHint = document.getElementById('fragHint');

  let current = 0;

  // ---- construir mapa de secciones a partir del data-* de cada diapositiva ----
  const sections = []; // [{key,label,indices:[]}]
  const sectionByKey = {};
  slides.forEach((s, i) => {
    const key = s.dataset.section || 'general';
    const label = s.dataset.sectionLabel || key;
    if (!sectionByKey[key]) {
      const entry = { key, label, indices: [] };
      sectionByKey[key] = entry;
      sections.push(entry);
    }
    sectionByKey[key].indices.push(i);
  });

  function sectionOf(i){
    const key = slides[i].dataset.section || 'general';
    return sectionByKey[key];
  }

  // ---- sidebar ----
  sections.forEach((sec, si) => {
    const btn = document.createElement('button');
    btn.className = 'side-link';
    btn.innerHTML = '<span class="idx">'+String(si+1).padStart(2,'0')+'</span><span class="lbl">'+sec.label+'</span>';
    btn.addEventListener('click', () => goTo(sec.indices[0], {frag:'full'}));
    sideNav.appendChild(btn);
    sec.navBtn = btn;
  });

  // ---- fragmentos ----
  function fragmentsOf(slide){ return Array.from(slide.querySelectorAll('.fragment')); }
  function revealCount(slide){ return parseInt(slide.dataset.fragShown || '0', 10); }
  function setReveal(slide, n){
    const frags = fragmentsOf(slide);
    frags.forEach((f, i) => f.classList.toggle('revealed', i < n));
    slide.dataset.fragShown = String(n);
  }

  // ---- render de topbar (píldoras de la sección activa) ----
  function renderTopbar(){
    const sec = sectionOf(current);
    tbSectionName.textContent = sec.label;
    tbPills.innerHTML = '';
    sec.indices.forEach((idx) => {
      const s = slides[idx];
      const label = s.dataset.slideLabel || (s.classList.contains('slide--divider') ? 'Introducción' : ('Diapositiva '+(idx+1)));
      const pill = document.createElement('button');
      pill.className = 'tb-pill' + (idx === current ? ' active' : '');
      pill.textContent = label;
      pill.addEventListener('click', () => goTo(idx, {frag:'full'}));
      tbPills.appendChild(pill);
    });
  }

  function renderSidebar(){
    const sec = sectionOf(current);
    sections.forEach(s => s.navBtn.classList.toggle('active', s.key === sec.key));
  }

  function renderHint(){
    const slide = slides[current];
    const frags = fragmentsOf(slide);
    const shown = revealCount(slide);
    if (frags.length > 0 && shown < frags.length) {
      fragHint.style.display = 'flex';
      fragHint.querySelector('.hint-txt').textContent = 'Clic o → para continuar ('+shown+'/'+frags.length+')';
    } else {
      fragHint.style.display = 'none';
    }
  }

  function renderNav(){
    slideCount.textContent = String(current+1).padStart(2,'0') + ' / ' + slides.length;
    const slide = slides[current];
    const frags = fragmentsOf(slide);
    prevBtn.disabled = (current === 0 && revealCount(slide) === 0);
    nextBtn.disabled = (current === slides.length-1 && revealCount(slide) >= frags.length);
  }

  function renderAll(){
    renderTopbar();
    renderSidebar();
    renderHint();
    renderNav();
  }

  function goTo(i, opts){
    opts = opts || {frag:'full'};
    if (i < 0 || i >= slides.length) return;
    slides[current].classList.remove('active');
    current = i;
    const slide = slides[current];
    slide.classList.add('active');
    const frags = fragmentsOf(slide);
    setReveal(slide, opts.frag === 'reset' ? 0 : frags.length);
    renderAll();
  }

  function next(){
    const slide = slides[current];
    const frags = fragmentsOf(slide);
    const shown = revealCount(slide);
    if (shown < frags.length) { setReveal(slide, shown+1); renderHint(); renderNav(); return; }
    if (current < slides.length-1) goTo(current+1, {frag:'reset'});
  }
  function prev(){
    const slide = slides[current];
    const shown = revealCount(slide);
    if (shown > 0) { setReveal(slide, shown-1); renderHint(); renderNav(); return; }
    if (current > 0) goTo(current-1, {frag:'full'});
  }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  fragHint.addEventListener('click', next);

  document.addEventListener('keydown', (e) => {
    // Si este motor vive dentro de una página con varias "vistas" (p. ej. el
    // archivo único del curso) y la presentación no es la vista visible en
    // este momento, ignora el teclado para no avanzar diapositivas "detrás".
    if (stage.offsetParent === null) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { prev(); e.preventDefault(); }
    else if (e.key === 'Home') { goTo(0, {frag:'full'}); }
    else if (e.key === 'End') { goTo(slides.length-1, {frag:'full'}); }
    else if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
    else if (e.key === 'b' || e.key === 'B') { toggleSidebar(); }
  });

  let touchX = null;
  viewport.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; });
  viewport.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx > 60) prev(); else if (dx < -60) next();
    touchX = null;
  });

  function toggleFullscreen(){
    if (!document.fullscreenElement) stage.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  }
  document.addEventListener('fullscreenchange', () => {
    stage.classList.toggle('present-mode', !!document.fullscreenElement);
  });
  fsBtn.addEventListener('click', toggleFullscreen);

  function toggleSidebar(){ stage.classList.toggle('sidebar-collapsed'); }
  sidebarToggle.addEventListener('click', toggleSidebar);

  goTo(0, {frag:'full'});
})();
