/* main.js - Dundee Sole Premium Interactive Logic */

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Lock scrolling on page load for the preloader
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';

  // Constants (Amended 73 frame range: 54 to 126)
  const startFrame = 54;
  const endFrame = 126;
  const totalFrames = 73;
  const imageFolder = 'ezgif-21bf38fd00339ae2-jpg';
  const images = [];
  let loadedCount = 0;

  // Select DOM Elements
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPct = document.getElementById('preloader-pct');
  const canvas = document.getElementById('scrub-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const arena = document.querySelector('.canvas-scroll-arena');
  const glowC = document.getElementById('glow-c');
  const glowT = document.getElementById('glow-t');

  // Spring Interpolation Parameters
  let currentFrame = 1;
  let targetFrame = 1;
  const easingFactor = 0.08;

  // LERP Scroll Tracking & Offset Caching (Critical for reflow-free 60FPS mobile scrolling)
  let lastScrollY = window.scrollY;
  let currentScrollY = window.scrollY;
  let arenaStart = 0;
  let arenaHeight = 0;

  function updateCache() {
    arenaStart = arena.offsetTop;
    arenaHeight = arena.offsetHeight;
  }

  // 2. Preloader Sequence - Load 73 image frames into browser cache
  function preloadImages() {
    // Defensive handler to update progress and dissolve screen even if files are missing on the server
    const handleImageLoad = () => {
      loadedCount++;
      const progress = Math.round((loadedCount / totalFrames) * 100);
      
      // Update preloader UI
      if (preloaderBar) preloaderBar.style.width = `${progress}%`;
      if (preloaderPct) preloaderPct.textContent = `${progress}%`;
      
      if (loadedCount === totalFrames) {
        setTimeout(completePreloader, 600); // Elegant delay for a premium feel
      }
    };

    for (let i = startFrame; i <= endFrame; i++) {
      const img = new Image();
      // Format number to 3-digit string (e.g., 054, 120)
      const frameNum = String(i).padStart(3, '0');
      
      img.onload = handleImageLoad;
      img.onerror = () => {
        // Smart Fallback: If it fails from the subfolder path, try fetching directly from the root
        if (img.src.includes(imageFolder)) {
          console.warn(`Frame ${i} failed from folder, falling back to root path...`);
          img.src = `ezgif-frame-${frameNum}.jpg`;
        } else {
          // Defensive: If it fails from the root too, count it as loaded so it doesn't stall the preloader
          console.error(`Error preloading frame ${i} from both folder and root`);
          handleImageLoad();
        }
      };
      
      img.src = `${imageFolder}/ezgif-frame-${frameNum}.jpg`;
      images.push(img);
    }
  }

  // Fade out preloader and unlock scrolling
  function completePreloader() {
    preloader.style.opacity = '0';
    preloader.style.visibility = 'hidden';
    
    // Unlock scrolling
    document.body.style.overflow = '';
    document.body.style.height = '';
    
    // Initial size and paint first frame immediately
    resizeCanvas();
    updateCache();
    drawFrame(1, 0);
    
    // Start spring easing loop
    requestAnimationFrame(updateCanvasLoop);
  }

  // 3. Canvas Resizing & High-DPI Scaling (16:9 Cover Fit)
  function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement; // Read dimensions strictly from the 16:9 aspect ratio container wrapper
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // High-DPI sizing based on actual display bounds (guarantees perfect pixel density on Retina/phone screens)
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    
    // Update layout markers
    updateCache();
    
    // Draw current frame immediately
    const currentFraction = (currentFrame - 1) / (totalFrames - 1);
    const floatOffset = Math.sin(currentFraction * Math.PI * 2.2) * 45;
    drawFrame(Math.round(currentFrame), floatOffset);
  }

  // Cover scale fits image snuggly and applies yOffset (vertical floating displacement)
  function drawFrame(frameNumber, yOffset = 0) {
    const imgIndex = Math.max(0, Math.min(totalFrames - 1, frameNumber - 1));
    const img = images[imgIndex];
    
    if (!img || !img.complete) return;
    if (!canvas || !ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const imgWidth = img.naturalWidth || 1280;
    const imgHeight = img.naturalHeight || 720;
    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;
    
    let drawWidth, drawHeight;
    
    // Perform "Object-Fit: Cover" calculations centered on canvas
    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
    }
    
    // Scale factor to make the trainer sit edge-to-edge flush against the screen sides
    const scaleFactor = 1.0;
    drawWidth *= scaleFactor;
    drawHeight *= scaleFactor;
    
    const drawX = (canvasWidth - drawWidth) / 2;
    const drawY = (canvasHeight - drawHeight) / 2;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Scaled translation vertical float offset relative to layout scale
    const scale = drawWidth / imgWidth;
    const scaledY = yOffset * scale;
    
    ctx.drawImage(img, drawX, drawY + scaledY, drawWidth, drawHeight);
  }

  // 4. Spring Easing Loop (Decoupled LERP loop for extreme responsiveness)
  function updateCanvasLoop() {
    if (!arena) return;
    // Smoothly LERP scroll position to eliminate layout thrashing
    currentScrollY += (lastScrollY - currentScrollY) * 0.08;
    
    // Unified rotation progress: starts at bottom of viewport, completes 100% spin exactly at 75% of viewport height
    const enterBound = arenaStart - window.innerHeight;
    const rotationRange = window.innerHeight * 0.75;
    
    let rotationFraction = 0;
    if (rotationRange > 0) {
      rotationFraction = (currentScrollY - enterBound) / rotationRange;
      rotationFraction = Math.max(0, Math.min(1, rotationFraction));
    }
    
    // Calculate targeted frame (1 to 73) based on accelerated spin fraction
    targetFrame = Math.floor(rotationFraction * (totalFrames - 1)) + 1;
    
    // Smoothly interpolate the frame sequence index
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.01) {
      currentFrame += diff * easingFactor;
    } else {
      currentFrame = targetFrame;
    }
    
    // Calculate premium three-dimensional up/down vertical floating wave
    const floatFrequency = 2.2;
    const floatAmplitude = 45; // Pixel wave amplitude
    const currentFraction = (currentFrame - 1) / (totalFrames - 1);
    const floatOffset = Math.sin(currentFraction * Math.PI * floatFrequency) * floatAmplitude;
    
    const roundedFrame = Math.round(currentFrame);
    drawFrame(roundedFrame, floatOffset);
    updateSlides(roundedFrame);
    
    // Scroll-induced drifting lighting
    const scrollDrift = currentScrollY * 0.15;
    glowC.dataset.scrollY = scrollDrift;
    applyGlowDrift();
    
    requestAnimationFrame(updateCanvasLoop);
  }

  // Super-lightweight scroll handler to prevent frame-drops on touch mobile
  function handleScroll() {
    lastScrollY = window.scrollY;
  }

  // Update DOM overlays dynamically based on frame sequence
  function updateSlides(frame) {
    const welcomeSlide = document.getElementById('slide-welcome');
    const craftSlide = document.getElementById('slide-craft');
    const cultureSlide = document.getElementById('slide-culture');
    
    if (!welcomeSlide || !craftSlide || !cultureSlide) return;
    
    // 1. Desktop active classes
    welcomeSlide.classList.remove('slide-active');
    craftSlide.classList.remove('slide-active');
    cultureSlide.classList.remove('slide-active');
    
    if (frame <= 40) {
      welcomeSlide.classList.add('slide-active');
    } else if (frame <= 85) {
      craftSlide.classList.add('slide-active');
    } else {
      cultureSlide.classList.add('slide-active');
    }
  }

  // 5. Studio Glow Drifting Motion (Mouse and Touch Scroll)
  let mouseX = 0;
  let mouseY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 60; // Max 30px offset
    mouseY = (e.clientY / window.innerHeight - 0.5) * 60;
    applyGlowDrift();
  });

  function applyGlowDrift() {
    const scrollDrift = parseFloat(glowC.dataset.scrollY || 0);
    
    // Drift both radial layers oppositely
    glowC.style.transform = `translate(${mouseX}px, ${mouseY + scrollDrift}px)`;
    glowT.style.transform = `translate(${-mouseX}px, ${-mouseY + (scrollDrift * 0.5)}px)`;
  }

  // 6. Section Background theme transitioner (IntersectionObserver)
  const observerOptions = {
    root: null,
    rootMargin: '-12% 0px -12% 0px', // Faster trigger bounds (triggers color shifts earlier)
    threshold: 0.15
  };
  
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        
        // Remove existing theme classes
        document.body.classList.remove('theme-obsidian', 'theme-clinical', 'theme-terrace');
        
        if (entry.target.classList.contains('canvas-scroll-arena')) {
          document.body.classList.add('theme-obsidian');
        } else if (id === 'vault') {
          document.body.classList.add('theme-obsidian');
        } else if (id === 'clinic') {
          document.body.classList.add('theme-clinical');
        } else if (id === 'terrace') {
          document.body.classList.add('theme-terrace');
        }
      }
    });
  }, observerOptions);

  // Observe scroll arena + editorial sections
  sectionObserver.observe(arena);
  document.querySelectorAll('.editorial-section').forEach(sec => {
    sectionObserver.observe(sec);
  });

  // 7. Scroll Reveals Entrance Animating (IntersectionObserver)
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

  document.querySelectorAll('.reveal-up').forEach(elem => {
    revealObserver.observe(elem);
  });

  // Event Listeners
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', handleScroll);

  // 8. Dropdown Menu Toggles (Mobile touch compatibility)
  const heroBtn = document.getElementById('hero-dropdown-btn');
  const heroMenu = document.getElementById('hero-dropdown-menu');
  const footerBtn = document.getElementById('footer-dropdown-btn');
  const footerMenu = document.getElementById('footer-dropdown-menu');
  const burgerBtn = document.getElementById('burger-btn');
  const burgerDropdown = document.getElementById('burger-dropdown');
  
  if (heroBtn && heroMenu) {
    heroBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      heroMenu.classList.toggle('show');
      if (footerMenu) footerMenu.classList.remove('show');
      if (burgerBtn && burgerDropdown) {
        burgerBtn.classList.remove('active');
        burgerDropdown.classList.remove('show');
      }
    });
  }
  
  if (footerBtn && footerMenu) {
    footerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      footerMenu.classList.toggle('show');
      if (heroMenu) heroMenu.classList.remove('show');
      if (burgerBtn && burgerDropdown) {
        burgerBtn.classList.remove('active');
        burgerDropdown.classList.remove('show');
      }
    });
  }

  // Hamburger dropdown toggles
  if (burgerBtn && burgerDropdown) {
    burgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      burgerBtn.classList.toggle('active');
      burgerDropdown.classList.toggle('show');
      if (heroMenu) heroMenu.classList.remove('show');
      if (footerMenu) footerMenu.classList.remove('show');
    });

    // Stop propagation inside dropdown so clicks don't bubble and close it
    burgerDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Close burger menu when any link is clicked
    const burgerLinks = burgerDropdown.querySelectorAll('.burger-link');
    burgerLinks.forEach(link => {
      link.addEventListener('click', () => {
        burgerBtn.classList.remove('active');
        burgerDropdown.classList.remove('show');
      });
    });
  }
  
  // Close all dropdowns on document click
  document.addEventListener('click', () => {
    if (heroMenu) heroMenu.classList.remove('show');
    if (footerMenu) footerMenu.classList.remove('show');
    if (burgerBtn && burgerDropdown) {
      burgerBtn.classList.remove('active');
      burgerDropdown.classList.remove('show');
    }
  });

  // Initialize
  preloadImages();
});
