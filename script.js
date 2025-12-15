/* ============================================
   SHIVAM KUMAR - CREATIVE SYSTEM ARCHITECT 2025
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initNetworkBackground(); // New Connection Animation
    initScrollReveal();
    initMobileNav();
    initContactForm();
    initHeaderScroll();
    if (typeof feather !== 'undefined') feather.replace();
});

/* -------------------------------------------------------------------------- */
/* 1. CUSTOM CURSOR
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 1. CUSTOM CURSOR (Playful Fluid Physics)
/* -------------------------------------------------------------------------- */
function initCustomCursor() {
    if (matchMedia('(pointer: coarse)').matches) return;

    const cursorDot = document.createElement('div');
    const cursorOutline = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    cursorOutline.className = 'cursor-outline';
    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorOutline);

    // Positions
    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;

    // Track mouse
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Dot moves instantly
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
        
        // Reset idle timer or add wake effect here if needed
    });

    // Smooth Animation Loop
    const animateCursor = () => {
        // 1. Calculate distance (velocity)
        const distX = mouseX - outlineX;
        const distY = mouseY - outlineY;
        
        // 2. Physics easing (Linear Interpolation)
        // Revert to 0.15 for cleaner lens feel, less "draggy"
        outlineX += distX * 0.15; 
        outlineY += distY * 0.15;

        // 3. Calculate Velocity Magnitude
        const velocity = Math.sqrt(distX * distX + distY * distY);
        const maxStretch = 0.40; 
        const scaleAmount = Math.min(velocity * 0.0035, maxStretch);
        
        // 4. Calculate Angle of Movement
        const angle = Math.atan2(distY, distX); // In radians

        // 5. Apply Transform: Translate -> Rotate -> Scale (Stretch X, Squash Y)
        const scaleX = 1 + scaleAmount;
        const scaleY = 1 - scaleAmount;
        
        cursorOutline.style.transform = `
            translate(${outlineX}px, ${outlineY}px)
            rotate(${angle}rad)
            scale(${scaleX}, ${scaleY})
            translate(-50%, -50%)
        `;
        
        // Note: We use a second translate(-50%, -50%) to counteract the centering offset 
        // because we are managing position manually now. 
        // *Correction*: Actually simpler to just set left/top and use transform for rotation/scale.
        // Let's stick to the previous style.left/top method but add transform for deformation.
        
        cursorOutline.style.left = `${outlineX}px`;
        cursorOutline.style.top = `${outlineY}px`;
        cursorOutline.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX}, ${scaleY})`;

        requestAnimationFrame(animateCursor);
    };
    animateCursor();

    // Hover States
    const interactables = document.querySelectorAll('a, button, input, textarea, .mindset-card, .project-card');
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => cursorOutline.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hovered'));
    });
}

/* -------------------------------------------------------------------------- */
/* 2. DYNAMIC BACKGROUND (Network/Constellation Effect)
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 2. DYNAMIC BACKGROUND (Cybernetic Field)
/* -------------------------------------------------------------------------- */
function initNetworkBackground() {
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);
    }
    
    // Ensure styles are correct
    const noise = document.querySelector('.bg-noise');
    if(noise) noise.style.opacity = '0.04'; // Slightly visible texture

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let blobs = [];
    
    // Configuration
    // Configuration
    const particleCount = window.innerWidth > 768 ? 45 : 20; 
    // Brand colors: Strict Accent Blue
    const colors = ['#4F7DFF']; 

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // ---------------------------------------------
    // SHAPE HELPERS
    // ---------------------------------------------
    function drawHexagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(x + r * Math.cos(i * 2 * Math.PI / 6), y + r * Math.sin(i * 2 * Math.PI / 6));
        }
        ctx.closePath();
        ctx.stroke();
    }

    function drawCross(ctx, x, y, s) {
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s);
        ctx.lineTo(x, y + s);
        ctx.stroke();
    }

    // ---------------------------------------------
    // CLASSES
    // ---------------------------------------------
    class BackgroundBlob {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 400 + 400;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < -this.size || this.x > width + this.size) this.vx *= -1;
            if (this.y < -this.size || this.y > height + this.size) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            g.addColorStop(0, this.color + '05'); // VERY low opacity (approx 2%)
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class CyberParticle {
        constructor() {
            this.init();
        }

        init(reset = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 2 + 0.5; // Depth factor
            
            // Type: 0=circle, 1=hex, 2=cross
            this.type = Math.floor(Math.random() * 3);
            this.size = Math.random() * 3 + 1;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            
            // Velocity based on depth
            this.vx = (Math.random() - 0.5) * 0.3 * this.z;
            this.vy = (Math.random() - 0.5) * 0.3 * this.z;
            
            // Fading
            this.alpha = Math.random() * 0.5 + 0.1;
            this.targetAlpha = this.alpha;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Simple wrap around interactions
            if (this.x < -50) this.x = width + 50;
            if (this.x > width + 50) this.x = -50;
            if (this.y < -50) this.y = height + 50;
            if (this.y > height + 50) this.y = -50;

            // Mouse Interaction
            if (mouse.x) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Slight magnetic pull
                if (dist < 400) {
                    const force = (400 - dist) / 400;
                    this.vx += (dx / dist) * force * 0.02 * this.z;
                    this.vy += (dy / dist) * force * 0.02 * this.z;
                    this.targetAlpha = 0.8; // Brighten near mouse
                } else {
                    this.targetAlpha = 0.3 * this.z; // Return to dim
                }
            } else {
                this.targetAlpha = 0.3 * this.z;
            }

            // Smooth Alpha Transition
            this.alpha += (this.targetAlpha - this.alpha) * 0.05;
            
            // Friction to normalize speed after mouse interaction
            this.vx *= 0.99;
            this.vy *= 0.99;
            
            // Maintain minimum movement
            if (Math.abs(this.vx) < 0.1) this.vx += (Math.random()-0.5)*0.01;
            if (Math.abs(this.vy) < 0.1) this.vy += (Math.random()-0.5)*0.01;
        }

        draw() {
            ctx.strokeStyle = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.lineWidth = 1.5;

            if (this.type === 0) { // Circle (Filled)
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 1) { // Hexagon (Stroked)
                drawHexagon(ctx, this.x, this.y, this.size * 2);
            } else { // Cross
                drawCross(ctx, this.x, this.y, this.size * 1.5);
            }
            
            ctx.globalAlpha = 1;
        }
    }

    // Init
    for(let i=0; i<3; i++) blobs.push(new BackgroundBlob()); // 3 Giant Aura Blobs
    for(let i=0; i<particleCount; i++) particles.push(new CyberParticle());

    // Mouse Tracking
    let mouse = { x: null, y: null };
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

    // Animation Loop
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Draw Auras created deep depth
        blobs.forEach(b => { b.update(); b.draw(); });

        // Draw Particles
        particles.forEach(p => { p.update(); p.draw(); });
        
        requestAnimationFrame(animate);
    }
    animate();
}

/* -------------------------------------------------------------------------- */
/* 3. SCROLL REVEAL
/* -------------------------------------------------------------------------- */
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Trigger Text Scramble if applicable
                if (entry.target.classList.contains('reveal-decode')) {
                    const scrambler = new TextScramble(entry.target);
                    // Start immediately for faster feedback
                    scrambler.setText(entry.target.getAttribute('data-text') || entry.target.innerText);
                    observer.unobserve(entry.target);
                }
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-text, .reveal-fade, .reveal-slide-left, .reveal-decode').forEach(el => observer.observe(el));
}

/* -------------------------------------------------------------------------- */
/* 3.5. TEXT DECODER EFFECT
/* -------------------------------------------------------------------------- */
class TextScramble {
    constructor(el) {
        this.el = el;
        // Cleaner characters for a professional "Data" look
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; 
        this.update = this.update.bind(this);
    }
    
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            // Faster animation: reduced random range
            const start = Math.floor(Math.random() * 20); 
            const end = start + Math.floor(Math.random() * 20);
            this.queue.push({ from, to, start, end });
        }
        
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    
    update() {
        let output = '';
        let complete = 0;
        
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }
        
        this.el.innerHTML = output;
        
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

/* -------------------------------------------------------------------------- */
/* 4. MOBILE NAV
/* -------------------------------------------------------------------------- */
function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.mobile-nav');
    const links = document.querySelectorAll('.mobile-link');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const isActive = nav.classList.contains('active');
        toggle.classList.toggle('active', !isActive);
        nav.classList.toggle('active', !isActive);
        document.body.style.overflow = isActive ? '' : 'hidden';
    });

    links.forEach(l => l.addEventListener('click', () => {
        nav.classList.remove('active');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
    }));
}

/* -------------------------------------------------------------------------- */
/* 5. CONTACT FORM
/* -------------------------------------------------------------------------- */
function initContactForm() {
    const sendBtn = document.getElementById('finalSendBtn');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const msgInput = document.getElementById('message');

    if (!sendBtn) return;

    sendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const msg = msgInput.value.trim();

        if (!name || !email || !msg) {
            sendBtn.innerText = 'Please fill all fields';
            sendBtn.style.background = '#ef4444';
            setTimeout(() => {
                sendBtn.innerText = 'Send Message';
                sendBtn.style.background = '';
            }, 2000);
            return;
        }

        const originalText = sendBtn.innerText;
        sendBtn.innerText = 'Opening Email...';
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.7';
        
        // Construct Mailto Link
        const subject = encodeURIComponent(`Portfolio Inquiry from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`);
        const mailtoLink = `mailto:ojhashivam7414@gmail.com?subject=${subject}&body=${body}`;
        
        // Trigger Email Client
        window.location.href = mailtoLink;
        
        await new Promise(r => setTimeout(r, 1500));

        sendBtn.innerText = 'Email Client Opened!';
        sendBtn.style.background = '#10b981';
        sendBtn.style.color = '#fff';
        sendBtn.style.opacity = '1';
        
        setTimeout(() => {
            nameInput.value = '';
            emailInput.value = '';
            msgInput.value = '';
            sendBtn.innerText = originalText;
            sendBtn.disabled = false;
            sendBtn.style.background = ''; 
            sendBtn.style.color = '';
        }, 5000);
    });
}

function initHeaderScroll() {
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });
}
