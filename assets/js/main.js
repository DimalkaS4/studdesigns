// Shared site script: theme toggle, simple GSAP-like reveal (no dependency), color swaps, and nav highlighting.
(function(){
  // Theme toggle
  const themeToggle = () => {
    const buttons = document.querySelectorAll('.theme-toggle');
    if(buttons.length===0) return;
    let current = localStorage.getItem('theme') || 'light';
    const applyState = () => {
      document.body.classList.toggle('dark', current==='dark');
      buttons.forEach(btn => {
        const icon = btn.querySelector('.theme-icon');
        if(icon){ icon.className = `theme-icon fas ${current==='dark' ? 'fa-moon' : 'fa-sun'}`; }
      });
    };
    applyState();
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        current = document.body.classList.contains('dark') ? 'light' : 'dark';
        document.body.classList.toggle('dark', current==='dark');
        localStorage.setItem('theme', current);
        applyState();
      });
    });
  }

  // GSAP Animations (robust with error handling so other features still work)
  const initAnimations = () => {
    try {
      if (typeof gsap === 'undefined') {
        console.warn('[stud] GSAP not loaded, using visibility fallback');
        document.querySelectorAll('.reveal').forEach(el => el.style.visibility = 'visible');
        return;
      }

      if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
      } else {
        console.warn('[stud] ScrollTrigger missing, proceeding without scroll animations');
      }

      const hero = document.querySelector('.hero');
      if (hero) {
        const heroElements = hero.querySelectorAll('h1, p, .btn');
        gsap.fromTo(heroElements,
          { y: 50, opacity: 0, visibility: 'hidden' },
          {
            y: 0,
            opacity: 1,
            visibility: 'visible',
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
            delay: 0.2
          }
        );
      }

      const revealElements = document.querySelectorAll('.reveal');
      revealElements.forEach(el => {
        if (hero && hero.contains(el)) return;
        const animConfig = {
          y: 0,
          opacity: 1,
          visibility: 'visible',
          duration: 0.8,
          ease: 'power2.out'
        };
        if (typeof ScrollTrigger !== 'undefined') {
          animConfig.scrollTrigger = {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          };
        }
        gsap.fromTo(el, { y: 50, opacity: 0, visibility: 'hidden' }, animConfig);
      });

      document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          gsap.to(card, {
            duration: 0.5,
            rotationY: ((x - rect.width / 2) / rect.width) * 5,
            rotationX: ((y - rect.height / 2) / rect.height) * -5,
            ease: 'power2.out',
            transformPerspective: 1000,
            transformOrigin: 'center'
          });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            duration: 0.5,
            rotationY: 0,
            rotationX: 0,
            ease: 'power2.out'
          });
        });
      });
      console.log('[stud] Animations initialized');
    } catch (err) {
      console.error('[stud] Animation init error:', err);
      document.querySelectorAll('.reveal').forEach(el => el.style.visibility = 'visible');
    }
  }

  // Nav active detection
  const initNav = () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const page = path.toLowerCase();
    document.querySelectorAll('a.nav-link').forEach(a => {
      const href = (a.getAttribute('href')||'').split('/').pop().toLowerCase();
      if(href && page && href===page) a.classList.add('active-nav');
    })

    // Mobile toggle logic with backdrop, focus trap & persisted state
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('mobile-navigation');
    if(toggle && nav){
      const icon = toggle.querySelector('i');
      let restoreFocusEl = null;
      let keydownHandler = null;
      const getFocusable = () => Array.from(nav.querySelectorAll('a.nav-link, button'));
      const ensureBackdrop = () => {
        let backdrop = document.querySelector('.menu-backdrop');
        if(!backdrop){
          backdrop = document.createElement('div');
          backdrop.className = 'menu-backdrop';
          document.body.appendChild(backdrop);
          // Direct click handler on backdrop to close menu
          backdrop.addEventListener('click', () => {
            if(nav.classList.contains('open')) closeMenu();
          });
          backdrop.dataset.bound = 'true';
        } else if(!backdrop.dataset.bound){
          backdrop.addEventListener('click', () => {
            if(nav.classList.contains('open')) closeMenu();
          });
          backdrop.dataset.bound = 'true';
        }
        return backdrop;
      };
      const closeMenu = () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
        toggle.setAttribute('aria-label','Open menu');
        // Keep chevron-down; rotation handled via CSS on aria-expanded
        if(icon) icon.className = 'fas fa-chevron-down';
        localStorage.setItem('menuOpen','false');
        const backdrop = document.querySelector('.menu-backdrop');
        if(backdrop){ backdrop.classList.remove('show'); }
        if(keydownHandler){ document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
        if(restoreFocusEl){ restoreFocusEl.focus(); restoreFocusEl = null; }
      };
      toggle.addEventListener('click',()=>{
        const isOpen = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        // Icon stays chevron-down; CSS rotates when expanded. Ensure base class present.
        if(icon && !icon.classList.contains('fa-chevron-down')) icon.className = 'fas fa-chevron-down';
        localStorage.setItem('menuOpen', isOpen ? 'true' : 'false');
        const backdrop = ensureBackdrop();
        backdrop.classList.toggle('show', isOpen);
        if(isOpen){
          restoreFocusEl = document.activeElement;
          const focusables = getFocusable();
          focusables[0]?.focus();
          keydownHandler = (e) => {
            if(!nav.classList.contains('open')) return;
            if(e.key === 'Tab'){
              const f = getFocusable();
              if(f.length===0) return;
              const idx = f.indexOf(document.activeElement);
              if(e.shiftKey){
                if(idx<=0){ e.preventDefault(); f[f.length-1].focus(); }
              } else {
                if(idx===f.length-1){ e.preventDefault(); f[0].focus(); }
              }
            }
            if(e.key === 'Escape'){ closeMenu(); }
          };
          document.addEventListener('keydown', keydownHandler);
        }
      });
      nav.querySelectorAll('a.nav-link').forEach(l=>{
        l.addEventListener('click',(e)=>{
          console.debug('[stud] nav link clicked:', l.getAttribute('href'));
          if(nav.classList.contains('open')) {
            // Delay closing slightly to avoid any potential navigation interference on some mobile browsers
            setTimeout(closeMenu,50);
          }
        });
      });
      document.addEventListener('click',(e)=>{
        const backdrop = document.querySelector('.menu-backdrop');
        if(!nav.classList.contains('open')) return;
        if(backdrop && e.target===backdrop){ closeMenu(); return; }
        if(e.target===nav || nav.contains(e.target) || e.target===toggle) return;
        closeMenu();
      });
      window.addEventListener('resize',()=>{ if(window.innerWidth>760 && nav.classList.contains('open')) closeMenu(); });
      if(window.innerWidth <= 760 && localStorage.getItem('menuOpen')==='true'){
        toggle.click(); // restore previous state with correct chevron semantics
      }
    }
  }

  // Color swap helper (expects data attributes and matching IDs)
  const colorSwap = () => {
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.addEventListener('click', (e)=>{
        const parent = s.closest('[data-product]');
        if(!parent) return;
        const color = s.dataset.color;
        const mapping = JSON.parse(parent.dataset.product);
        if(mapping && mapping[color]){
          const fit = parent.querySelector('.img-fit');
          const fabric = parent.querySelector('.img-fabric');
          if(fit) fit.src = `images/${mapping[color].fit}`;
          if(fabric) fabric.src = `images/${mapping[color].fabric}`;
        }
        // Update displayed color name if an element with id ending in selected-color-name exists
        const nameEl = parent.querySelector('[id$="selected-color-name"]');
        if(nameEl){
          nameEl.textContent = color;
        }
        parent.querySelectorAll('.color-swatch').forEach(sw=>sw.classList.remove('selected'));
        s.classList.add('selected');
      })
    })
  }

  // Size guide with diagram swap
  const initSizeGuide = () => {
    const tableEl = document.getElementById('size-table-container');
    if(!tableEl) return;
    const diagramEl = document.getElementById('size-diagram');
    const menBtn = document.getElementById('toggle-men');
    const womenBtn = document.getElementById('toggle-women');
    const sizesJson = tableEl.dataset.sizes;
    let sizeData = null;
    try { sizeData = sizesJson ? JSON.parse(sizesJson) : null } catch(e){ sizeData=null }

    const DIAGRAMS = {
      men: { src: 'images/men-size-diagram.png', alt: "Men's sizing diagram: chest, length, sleeve measurements" },
      women: { src: 'images/women-sizing-diagram.png', alt: "Women's sizing diagram: bust, length, sleeve measurements" }
    };

    const render = (gender) => {
      const data = sizeData ? sizeData[gender] : null;
      if(!data){ tableEl.innerHTML = '<div class="card">Size data missing</div>'; return }
      if(diagramEl){
        diagramEl.src = DIAGRAMS[gender].src;
        diagramEl.alt = DIAGRAMS[gender].alt;
        // Adjust diagram sizing: smaller for women
        if(gender === 'women') {
          diagramEl.style.maxWidth = '300px';
        } else {
          diagramEl.style.maxWidth = '420px';
        }
      }
      if(menBtn && womenBtn){
        if(gender==='men'){
          menBtn.classList.add('btn-primary');
          womenBtn.classList.remove('btn-primary');
          womenBtn.style.background = 'var(--color-border)';
        } else {
          womenBtn.classList.add('btn-primary');
          menBtn.classList.remove('btn-primary');
          menBtn.style.background = 'var(--color-border)';
        }
      }
      const headers = gender==='men' ? ['Size','Chest (in)','Length (in)','Sleeve (in)'] : ['Size','Bust (in)','Length (in)','Sleeve (in)'];
      let html = `<table class="min-w-full"><thead><tr>${headers.map(h=>`<th style="text-align:left;padding:.6rem">${h}</th>`).join('')}</tr></thead><tbody>`;
      Object.keys(data).forEach(size => {
        const vals = Object.values(data[size]);
        html += `<tr><td style="padding:.6rem;font-weight:700">${size}</td><td style="padding:.6rem">${vals[0]}</td><td style="padding:.6rem">${vals[1]}</td><td style="padding:.6rem">${vals[2]}</td></tr>`;
      });
      html += '</tbody></table>';
      tableEl.innerHTML = html;
    }

    menBtn?.addEventListener('click', () => render('men'));
    womenBtn?.addEventListener('click', () => render('women'));
    render('men');
  }

  // Initialize on DOM ready (static header already present)
  document.addEventListener('DOMContentLoaded', ()=>{
    themeToggle();
    initAnimations();
    initNav();
    colorSwap();
    initSizeGuide();
  });

})();
