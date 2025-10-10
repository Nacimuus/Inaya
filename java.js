(function(){
    const $  = (s, r=document)=>r.querySelector(s);
    const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  
    let glassHeaderState = { header: null, handler: null };

    function initGlassHeader(){
      const header = document.querySelector('.site-header');

      if(!header){
        if(glassHeaderState.handler){
          window.removeEventListener('scroll', glassHeaderState.handler);
          glassHeaderState = { header: null, handler: null };
        }
        return;
      }

      if(glassHeaderState.header === header){
        glassHeaderState.handler?.();
        return;
      }

      if(glassHeaderState.handler){
        window.removeEventListener('scroll', glassHeaderState.handler);
      }

      const handler = () => {
        if(window.scrollY > 10){
          header.classList.add('scrolled');
        }else{
          header.classList.remove('scrolled');
        }
      };

      glassHeaderState = { header, handler };
      handler();
      window.addEventListener('scroll', handler, { passive: true });
    }

    // Inject header & footer partials into pages
    async function inject(selector, path){
      // Works both locally and when deployed at domain root.
      // If you deploy in a subfolder (e.g., /inaya/), use relative paths in your HTML instead.
      try{
        const res = await fetch(path);
        const html = await res.text();
        const mount = $(selector);
        if (mount){
            mount.innerHTML = html;
            if(path.includes('header')) initGlassHeader();
          }
        if(path.includes('header')) initNav();
        if(path.includes('footer')) initFooter();
        setActiveNav();
      }catch(err){
        console.warn('Include failed:', path, err);
      }
    }
  
    // Mobile hamburger toggle
    function initNav(){
      const btn = $('.nav-toggle');
      const nav = $('#site-nav');
      if(!btn || !nav) return;
      btn.addEventListener('click', ()=>{
        const open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  
    // Highlight current page in nav
    function setActiveNav(){
      // Normalize path (treat / and /index.html the same)
      const path = location.pathname.replace(/\/index\.html$/, '/');
      const segments = path.split('/').filter(Boolean);
      let current = segments.pop() || '';

      if (!current || !current.includes('.')) current = 'index.html';

      $$('#site-nav a').forEach(a=>{
        a.classList.remove('active');

        let href = a.getAttribute('href') || '';
        if (!href) return;

        href = href.replace(/^\.\//, '');
        if (href === '/' || href === '') href = 'index.html';

        if (href.startsWith('/')){
          const parts = href.split('/').filter(Boolean);
          href = parts.pop() || 'index.html';
        }

        if (!href.includes('.')) href = `${href}.html`;

        if (href === current) a.classList.add('active');
      });
    }
  
    // Footer: set current year
    function initFooter(){
      const y = new Date().getFullYear();
      const el = document.getElementById('year');
      if (el) el.textContent = y;
    }
  
    // Boot: look for placeholders and inject
    document.addEventListener('DOMContentLoaded', ()=>{
      if($('#header-include')) inject('#header-include','header.html');
      if($('#footer-include')) inject('#footer-include','footer.html');
    });
  })();
  // --- Blog topic filter ---
(function(){
    const container = document.querySelector('.filters');
    if(!container) return;
  
    const chips = Array.from(container.querySelectorAll('.chip'));
    const cards = Array.from(document.querySelectorAll('.bubble'));
  
    function applyFilter(topic){
      cards.forEach(card=>{
        if(topic === 'all'){
          card.style.display = '';
          return;
        }
        const tags = (card.getAttribute('data-tags') || '').split(/\s+/);
        card.style.display = tags.includes(topic) ? '' : 'none';
      });
    }
  
    container.addEventListener('click', (e)=>{
      const btn = e.target.closest('.chip');
      if(!btn) return;
      chips.forEach(c=>c.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  })();
  
  // --- First-visit popup (index only) ---
(function(){
    // Only run on index
    const isHome = /(?:^|\/)index\.html?$/.test(location.pathname) || location.pathname.endsWith('/Inaya/') || location.pathname.endsWith('/Inaya');
    if(!isHome) return;
  
    const modal = document.getElementById('giftPopup');
    if(!modal) return;
  
    const KEY = 'inayaGiftShown';
    const force = new URLSearchParams(location.search).has('gift'); // ?gift to preview
  
    function openGift(){
      modal.setAttribute('aria-hidden','false');
      // accessibility: trap basic focus on open element
      const closeBtn = modal.querySelector('[data-close]') || modal;
      closeBtn.focus?.();
      document.addEventListener('keydown', escClose);
    }
    function closeGift(){
      modal.setAttribute('aria-hidden','true');
      document.removeEventListener('keydown', escClose);
      try{ localStorage.setItem(KEY, '1'); }catch{}
    }
    function escClose(e){ if(e.key === 'Escape') closeGift(); }
  
    // open on first visit (or when ?gift present)
    const seen = (()=>{ try{ return localStorage.getItem(KEY) === '1'; }catch{ return false } })();
    if(!seen || force) openGift();
  
    // close handlers
    modal.addEventListener('click', (e)=>{
      if(e.target.matches('[data-close]')) closeGift();
    });
  })();

  // Newsletter inline confirmation
document.addEventListener('submit', e => {
    const form = e.target.closest('.newsletter-form');
    if(!form) return;
    e.preventDefault();
    const email = form.querySelector('input[name="email"]');
    form.innerHTML = `<p class="muted">✨ Thank you, ${email.value || 'friend'} — you’re on the list!</p>`;
  });
  // Glass header: solidify slightly after scrolling
(function(){
  const header = document.querySelector('.site-header');
  if(!header) return;

  const onScroll = () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  // Run once on load (in case you land mid-page), then on scroll
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();
