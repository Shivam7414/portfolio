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
function initCustomCursor() {
    if (matchMedia('(pointer: coarse)').matches) return;

    const cursorDot = document.createElement('div');
    const cursorOutline = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    cursorOutline.className = 'cursor-outline';
    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorOutline);

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    const interactables = document.querySelectorAll('a, button, input, textarea');
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => cursorOutline.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hovered'));
    });
}

/* -------------------------------------------------------------------------- */
/* 2. DYNAMIC BACKGROUND (Network/Constellation Effect)
/* -------------------------------------------------------------------------- */
function initNetworkBackground() {
    // Check if dynamic background canvas exists, if not create it
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);
    }
    
    // Remove static noise/gradient divs if present to avoid conflict
    const noise = document.querySelector('.bg-noise');
    const grad = document.querySelector('.bg-gradient');
    if(noise) noise.style.opacity = '0.02'; // Keep subtle texture
    if(grad) grad.style.display = 'none'; // Remove old gradient blob

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    
    // Config
    const particleCount = window.innerWidth > 768 ? 60 : 30;
    const connectionDist = 180;
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Init Particles
    for(let i=0; i<particleCount; i++) {
        particles.push(new Particle());
    }

    // Mouse interation
    let mouse = { x: null, y: null };
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Update & Draw Particles
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            // Connections
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < connectionDist) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(37, 99, 235, ${1 - dist/connectionDist})`; // Blue tint
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
            
            // Mouse Repel/Attract
            if (mouse.x) {
                const dx = particles[i].x - mouse.x;
                const dy = particles[i].y - mouse.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 200) {
                     // Subtle connection to mouse
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(139, 92, 246, ${1 - dist/200})`; // Purple tint
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }
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
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-text, .reveal-fade, .reveal-slide-left').forEach(el => observer.observe(el));
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
        sendBtn.innerText = 'Sending...';
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.7';
        
        await new Promise(r => setTimeout(r, 1500));

        sendBtn.innerText = 'Message Sent Successfully!';
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
        }, 3000);
    });
}

function initHeaderScroll() {
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });
}
