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
        initGlassHeader();
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
// --- Testimonial carousel: infinite with clones + arrows always visible ---
(function(){
    const root = document.querySelector('#proofCarousel[data-carousel]');
    if(!root) return;
  
    const track = root.querySelector('.carousel-track');
    const slidesOrig = Array.from(root.querySelectorAll('.slide'));
    const prev = root.querySelector('.prev');
    const next = root.querySelector('.next');
    const dotsWrap = root.querySelector('.carousel-dots');
  
    // Clone first/last for seamless loop
    const firstClone = slidesOrig[0].cloneNode(true);
    const lastClone  = slidesOrig[slidesOrig.length - 1].cloneNode(true);
    firstClone.classList.remove('is-active');
    lastClone.classList.remove('is-active');
    track.insertBefore(lastClone, track.firstChild);
    track.appendChild(firstClone);
  
    const slides = Array.from(track.querySelectorAll('.slide')); // now includes clones
  
    let index = 1;            // start on the first REAL slide
 
  
    // Set initial position
    function syncHeight(){
      const activeSlide = slides[index];
      if(!activeSlide) return;
      const newHeight = activeSlide.offsetHeight;
      if(newHeight) root.style.height = `${newHeight}px`;
    }

    function setPosition(noAnim=false){
      if(noAnim) track.style.transition = 'none';
      track.style.transform = `translateX(-${index * 100}%)`;

  syncHeight();
      if(noAnim){
        // force reflow then restore transition
        void track.offsetHeight;
        track.style.transition = '';
      }
    }
    setPosition(true);
  
    // Build dots for real slides only
    slidesOrig.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', `Go to testimonial ${i+1}`);
      b.addEventListener('click', () => goTo(i + 1)); // +1 because of leading clone
      dotsWrap.appendChild(b);
    });
  
    function updateDots(){
      const dotIndex = (index - 1 + slidesOrig.length) % slidesOrig.length; // 0..n-1
      dotsWrap.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('is-active', i===dotIndex));
    }
  
    function goTo(i){
      index = i;
      track.style.transition = 'transform .35s ease';
      setPosition();
    }
  
    function nextSlide(){ goTo(index + 1); }
    function prevSlide(){ goTo(index - 1); }
  
    // Handle seamless jump after transition (when on clones)
    track.addEventListener('transitionend', ()=>{
      if (slides[index] === firstClone) {
        index = 1; // jump to first real slide
        setPosition(true);
      }
      if (slides[index] === lastClone) {
        index = slides.length - 2; // jump to last real slide
        setPosition(true);
      }
      updateDots();
    });
  
    // Arrows
    prev.addEventListener('click', prevSlide);
    next.addEventListener('click', nextSlide);
  
    // Keyboard
    root.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowLeft') prevSlide();
      if(e.key === 'ArrowRight') nextSlide();
    });
    root.tabIndex = 0;
  
    // Swipe
    let startX = 0, dx = 0;
    
      const swipeThreshold = () => Math.min(60, root.clientWidth * 0.25);

      function handleSwipeEnd(){
        if (Math.abs(dx) > swipeThreshold()) {
          dx < 0 ? nextSlide() : prevSlide();
        }
      dx = 0;
    }

    // Pointer events (covering touch + pen where supported)
    const supportsPointer = 'PointerEvent' in window;

    if(supportsPointer){
      let activePointerId = null;
      root.addEventListener('pointerdown', e => {
        if(e.pointerType === 'mouse' && e.button !== 0) return;
        activePointerId = e.pointerId;
        startX = e.clientX;
        dx = 0;
        root.setPointerCapture?.(activePointerId);
      });
      root.addEventListener('pointermove', e => {
        if(e.pointerId !== activePointerId) return;
        dx = e.clientX - startX;
      });
      root.addEventListener('pointerup', e => {
        if(e.pointerId !== activePointerId) return;
        handleSwipeEnd();
        root.releasePointerCapture?.(activePointerId);
        activePointerId = null;
      });
      root.addEventListener('pointercancel', () => {
        dx = 0;
        activePointerId = null;
      });
    }

    // Touch fallback for older Safari
    if(!supportsPointer){
      root.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        if(!touch) return;
        startX = touch.clientX;
        dx = 0;
      }, { passive:true });
      root.addEventListener('touchmove',  e => {
        const touch = e.touches[0];
        if(!touch) return;
        dx = touch.clientX - startX;
      }, { passive:true });
      root.addEventListener('touchend',   () => {
        handleSwipeEnd();
      });
    }
  
    // Autoplay (loop forever)
    let timer = setInterval(nextSlide, 5000);
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { if(!timer) timer = setInterval(nextSlide, 5000); };
  
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
  
    // Resize safety (keeps transform aligned)
    window.addEventListener('resize', ()=>{
      syncHeight();
      setPosition(true);
    }, { passive:true });

    // Ensure height is correct once media/fonts settle
    window.addEventListener('load', syncHeight, { once: true });

    // Init
    updateDots();
  })();
// CEO video play handling (supports MP4 and YouTube privacy embed)
(function () {
  var frames = document.querySelectorAll('.ceo-video__frame');
  if (!frames.length) return;

  frames.forEach(function(frame){
    var playBtn = frame.querySelector('.ceo-video__play');
    if (!playBtn) return;

    playBtn.addEventListener('click', function(){
      frame.classList.add('is-playing');

      if (frame.dataset.player === 'mp4') {
        var vid = frame.querySelector('video');
        if (vid) {
          // ensure video fills wrapper (remove 16:9 spacer when real media paints)
          vid.style.objectFit = 'contain'; // optional; keep 'cover' for cinematic
          vid.play().catch(function(){ /* ignore autoplay restrictions */ });
          vid.setAttribute('controls', 'controls');
        }
      } else if (frame.dataset.player === 'youtube') {
        var src = frame.dataset.src;
        var existing = frame.querySelector('iframe');
        if (!existing) {
          var iframe = document.createElement('iframe');
          iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.src = src;
          frame.appendChild(iframe);
        }
      }
    }, { passive: true });
  });
})();
(function(){
  var viewport = document.querySelector('.trusted-viewport');
  var track    = document.querySelector('.trusted-track');
  var leftBtn  = document.querySelector('.trusted-arrow.left');
  var rightBtn = document.querySelector('.trusted-arrow.right');

  if (!viewport || !track || !leftBtn || !rightBtn) return;

  // Step equals ~80% of the visible area for meaningful jumps
  function getStep() {
    return Math.max(200, Math.floor(viewport.clientWidth * 0.8));
  }

  rightBtn.addEventListener('click', function(){
    viewport.scrollBy({ left:  getStep(), behavior: 'smooth' });
  });
  leftBtn.addEventListener('click', function(){
    viewport.scrollBy({ left: -getStep(), behavior: 'smooth' });
  });

  // Optional: drag/swipe support for desktop (mobile already scrolls)
  var isDown = false, startX = 0, startScroll = 0;

  viewport.addEventListener('pointerdown', function(e){
    isDown = true;
    viewport.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startScroll = viewport.scrollLeft;
  });
  viewport.addEventListener('pointermove', function(e){
    if (!isDown) return;
    var dx = e.clientX - startX;
    viewport.scrollLeft = startScroll - dx;
  });
  ['pointerup','pointercancel','pointerleave'].forEach(function(type){
    viewport.addEventListener(type, function(){ isDown = false; });
  });

  // Optional: auto loop (very gentle)
  // Uncomment to enable
  /*
  var auto;
  function startAuto(){
    stopAuto();
    auto = setInterval(function(){
      viewport.scrollBy({ left: 1, behavior: 'auto' });
      // If reached end, jump back to start seamlessly
      if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2) {
        viewport.scrollTo({ left: 0, behavior: 'auto' });
      }
    }, 15);
  }
  function stopAuto(){ if (auto) clearInterval(auto); }
  startAuto();
  viewport.addEventListener('mouseenter', stopAuto);
  viewport.addEventListener('mouseleave', startAuto);
  */
})();
(function(){
  var section = document.querySelector('#ceo-profile');
  if (!section) return;

  var orbit   = section.querySelector('.ceo-orbit');
  var avatar  = section.querySelector('.ceo-avatar');
  var svg     = section.querySelector('.ceo-links');
  var paths   = {
    c1: section.querySelector('#link-c1'),
    c2: section.querySelector('#link-c2'),
    c3: section.querySelector('#link-c3'),
    c4: section.querySelector('#link-c4')
  };
  var cards = {
    c1: section.querySelector('#c1'),
    c2: section.querySelector('#c2'),
    c3: section.querySelector('#c3'),
    c4: section.querySelector('#c4')
  };

  function bb(el){ return el.getBoundingClientRect(); }
  function centerInOrbit(el){ var r=bb(el), p=bb(orbit); return {x:(r.left+r.width/2)-p.left, y:(r.top+r.height/2)-p.top}; }

  // pick the nearest corner of the card from the avatar center
  function targetCorner(card, avatarCenter){
    var r = bb(card), p = bb(orbit);
    var corners = [
      { x: r.left - p.left,           y: r.top  - p.top  },                 // TL
      { x: r.right - p.left,          y: r.top  - p.top  },                 // TR
      { x: r.left - p.left,           y: r.bottom - p.top },                // BL
      { x: r.right - p.left,          y: r.bottom - p.top }                 // BR
    ];
    var best = corners[0], bestD = Infinity;
    for (var i=0;i<corners.length;i++){
      var dx = corners[i].x - avatarCenter.x, dy = corners[i].y - avatarCenter.y;
      var d = dx*dx + dy*dy;
      if (d < bestD){ bestD = d; best = corners[i]; }
    }
    return best;
  }

  function edgePoint(from, to, radius){
    var dx = to.x - from.x, dy = to.y - from.y, L = Math.max(1, Math.hypot(dx, dy));
    return { x: from.x + dx/L * radius, y: from.y + dy/L * radius };
  }

  function insetPoint(from, to, inset){
    var dx = to.x - from.x, dy = to.y - from.y, L = Math.max(1, Math.hypot(dx, dy));
    return { x: to.x - dx/L * inset, y: to.y - dy/L * inset };
  }

  function draw(){
    if (!orbit || !avatar || !svg) return;

    var ob = bb(orbit);
    svg.setAttribute('viewBox', `0 0 ${ob.width} ${ob.height}`);

    var aC = centerInOrbit(avatar);
    var aR = bb(avatar).width / 2;

    Object.keys(cards).forEach(function(k){
      var card = cards[k], path = paths[k];
      if (!card || !path) return;

      // Arrow should start at avatar edge and end near the closest corner of the card
      var corner = targetCorner(card, aC);
      var start  = edgePoint(aC, corner, aR + 6);
      var end    = insetPoint(start, corner, 10);  // stop 10px before corner so the marker sits nicely

      // Control point: gentle curve biased away from the avatar → card direction
      var midX = (start.x + end.x)/2, midY = (start.y + end.y)/2;
      var biasX = (end.x < aC.x) ? -40 : 40;
      var biasY = (end.y < aC.y) ? -60 : 60;
      var cx = midX + biasX, cy = midY + biasY;

      path.setAttribute('d', `M ${start.x},${start.y} Q ${cx},${cy} ${end.x},${end.y}`);

      // If you added a dashed glow clone, mirror the same 'd' there as well:
      var glow = path.nextElementSibling;
      if (glow && glow.classList && glow.classList.contains('glow')) {
        glow.setAttribute('d', path.getAttribute('d'));
      }
    });
  }

  function safeDraw(){ requestAnimationFrame(function(){ setTimeout(draw, 50); }); }

  window.addEventListener('load', safeDraw, { once: true });
  window.addEventListener('resize', safeDraw);
  window.addEventListener('orientationchange', function(){ setTimeout(safeDraw, 120); });

  if (avatar && avatar.complete === false) avatar.addEventListener('load', safeDraw, { once: true });

  var ro = new ResizeObserver(safeDraw);
  ro.observe(orbit);
  Object.values(cards).forEach(function(el){ if (el) ro.observe(el); });
})();
document.addEventListener('DOMContentLoaded', function () {
  if (window.AOS && typeof AOS.init === 'function') {
    AOS.init({
      once: true,           // animate once
      duration: 700,        // smooth, premium
      easing: 'ease-out',
      offset: 60
    });
  }
});
(function(){
  var viewport = document.querySelector('.pillars-viewport');
  var cards    = document.querySelectorAll('.pillar-card');
  if (!viewport || !cards.length) return;

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        // micro fade/slide
        e.target.animate(
          [{ opacity:0, transform:'translateY(8px)' }, { opacity:1, transform:'translateY(0)' }],
          { duration:450, easing:'ease-out' }
        );
      }
    });
  }, { root: viewport, threshold: 0.6 });

  cards.forEach(c => io.observe(c));
})();

// INAYA FAQ accordion
(function(){
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(function(item){
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    if (!btn || !panel) return;

    // measure content for smooth height animation
    function setMax(open){
      if (open) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        panel.setAttribute('aria-hidden','false');
        btn.setAttribute('aria-expanded','true');
        item.classList.add('open');
      } else {
        panel.style.maxHeight = '0px';
        panel.setAttribute('aria-hidden','true');
        btn.setAttribute('aria-expanded','false');
        item.classList.remove('open');
      }
    }

    // start collapsed
    setMax(false);

    btn.addEventListener('click', function(){
      var open = btn.getAttribute('aria-expanded') === 'true';
      // If you want only one open at a time, close others:
      // items.forEach(i => { if (i!==item) { var b=i.querySelector('.faq-q'); var p=i.querySelector('.faq-a'); if(b&&p){ b.setAttribute('aria-expanded','false'); p.style.maxHeight='0px'; p.setAttribute('aria-hidden','true'); i.classList.remove('open'); } } });
      setMax(!open);
    });

    // keyboard support (Enter/Space)
    btn.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });

    // re-measure if content wraps differently on resize
    window.addEventListener('resize', function(){
      if (btn.getAttribute('aria-expanded') === 'true') {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
})();
document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('ebookForm');
  if (!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();

    if (!name || !email) {
      alert('Please enter your name and email.');
      return;
    }

    alert(`Thank you ${name}! Your eBook will be sent to ${email}.`);
    form.reset();
  });
});

// --- INAYA Mini-Bot (safe, no crash) ---
// --- INAYA Mini-Bot (upgraded chat) ---
(function(){
  var root = document.querySelector('.inaya-bot');
  if (!root) return; // no bot on this page

  var toggle      = root.querySelector('.inaya-bot-toggle');
  var windowEl    = root.querySelector('.inaya-bot-window');
  var closeBtn    = root.querySelector('.inaya-bot-close');
  var chat        = root.querySelector('.inaya-bot-chat');
  var typing      = root.querySelector('.typing-indicator');
  var questionBtns = root.querySelectorAll('.bot-q');

  if (!toggle || !windowEl || !chat) return;

  function openBot(){
    windowEl.classList.add('is-open');
    windowEl.setAttribute('aria-hidden', 'false');
  }

  function closeBot(){
    windowEl.classList.remove('is-open');
    windowEl.setAttribute('aria-hidden', 'true');
  }

  toggle.addEventListener('click', function(){
    if (windowEl.classList.contains('is-open')) {
      closeBot();
    } else {
      openBot();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeBot);
  }

  // Close with ESC
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && windowEl.classList.contains('is-open')) {
      closeBot();
    }
  });

  // Helper: add a chat bubble
  function addBubble(role, text){
    if (!chat || !text) return;
    var div = document.createElement('div');
    div.className = 'chat-bubble ' + (role === 'user' ? 'chat-bubble--user' : 'chat-bubble--bot');
    div.innerHTML = text.replace(/\n/g, '<br>');
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  // Show/hide typing indicator
  function showTyping(show){
    if (!typing) return;
    typing.classList.toggle('is-hidden', !show);
    if (show) {
      chat.scrollTop = chat.scrollHeight;
    }
  }

  // When user clicks a predefined question
  if (questionBtns.length) {
    questionBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var answer = btn.getAttribute('data-answer') || '';
        var qText  = btn.textContent.trim();

        // 1) show user bubble
        addBubble('user', qText);

        // 2) show typing indicator, then bot answer
        showTyping(true);
        setTimeout(function(){
          showTyping(false);
          addBubble('bot', answer);
        }, 450);
      });
    });
  }
})();
