/* ============================================
   SHIVAM KUMAR - INTERACTIVE ENGINE 2025
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initMobileNav();
    initIDETerminal();
    initHeaderScroll();
});

/* -------------------------------------------------------------------------- */
/* 1. SCROLL REVEAL (Intersection Observer)
/* -------------------------------------------------------------------------- */
function initScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll(
        '.reveal-text, .reveal-fade, .reveal-slide-left'
    );
    
    revealElements.forEach(el => observer.observe(el));
}

/* -------------------------------------------------------------------------- */
/* 2. MOBILE NAVIGATION
/* -------------------------------------------------------------------------- */
function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.mobile-nav');
    const links = document.querySelectorAll('.mobile-link');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const isActive = nav.classList.contains('active');
        if (isActive) {
            nav.classList.remove('active');
            toggle.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            nav.classList.add('active');
            toggle.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    links.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            toggle.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

/* -------------------------------------------------------------------------- */
/* 3. IDE CONTACT TERMINAL SIMULATION
/* -------------------------------------------------------------------------- */
function initIDETerminal() {
    const sendBtn = document.getElementById('sendBtn');
    const terminal = document.getElementById('terminal-output');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const msgInput = document.getElementById('message');

    if (!sendBtn || !terminal) return;

    sendBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const msg = msgInput.value.trim();

        // 1. Validation Logic
        if (!name || !email || !msg) {
            terminal.innerHTML = '<span class="terminal-error">Error: Missing arguments for Mail::send(). params $name, $email, $msg are required.</span>';
            return;
        }

        // 2. Simulation Logic
        sendBtn.disabled = true;
        terminal.innerHTML = '> Compiling payload...<br>';
        
        await wait(600);
        terminal.innerHTML += '> Connecting to SMTP server...<br>';
        
        await wait(800);
        terminal.innerHTML += '> Authenticating...<br>';

        await wait(800);
        
        // 3. Success (Simulation) - In a real app, you'd fetch() here
        terminal.innerHTML += '<span style="color: #27c93f;">> Success: Mail Dispatched. HTTP 200 OK.</span><br>> Await response from server (Shivam).';
        
        // Clear inputs after success
        setTimeout(() => {
            nameInput.value = '';
            emailInput.value = '';
            msgInput.value = '';
            sendBtn.disabled = false;
        }, 1000);
    });
}

/* -------------------------------------------------------------------------- */
/* 4. HEADER SCROLL EFFECT
/* -------------------------------------------------------------------------- */
function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
