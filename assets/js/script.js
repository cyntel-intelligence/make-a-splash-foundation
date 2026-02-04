// ========================================
// MAKE A SPLASH FOUNDATION - JAVASCRIPT
// Interactive Features & Animations
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initMobileMenu();
    initSmoothScroll();
    initStatsCounter();
    initBackToTop();
    initNavbarScroll();
    initContactForm();
    initScrollAnimations();
});

// ========================================
// MOBILE MENU
// ========================================
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });

        // Close menu when clicking nav links
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = navMenu.contains(event.target);
            const isClickOnToggle = mobileMenuToggle.contains(event.target);

            if (!isClickInsideMenu && !isClickOnToggle && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
}

// ========================================
// SMOOTH SCROLL
// ========================================
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if href is just '#'
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========================================
// ANIMATED STATS COUNTER
// ========================================
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    function animateCounters() {
        if (hasAnimated) return;

        const statsSection = document.querySelector('.stats-bar');
        if (!statsSection) return;

        const statsPosition = statsSection.getBoundingClientRect().top;
        const screenPosition = window.innerHeight;

        if (statsPosition < screenPosition) {
            hasAnimated = true;

            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                const duration = 2000; // 2 seconds
                const increment = target / (duration / 16); // 60fps
                let current = 0;

                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        stat.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        stat.textContent = target + (target === 1 ? '' : '+');
                    }
                };

                updateCounter();
            });
        }
    }

    window.addEventListener('scroll', animateCounters);
    animateCounters(); // Check on load
}

// ========================================
// BACK TO TOP BUTTON
// ========================================
function initBackToTop() {
    const backToTopButton = document.getElementById('backToTop');

    if (backToTopButton) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// ========================================
// NAVBAR SCROLL EFFECT
// ========================================
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');

    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 100) {
                navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
            }
        });
    }
}

// ========================================
// CONTACT FORM
// ========================================
// Prevent default form submission immediately (module script handles the actual send)
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }
}

// ========================================
// SCROLL ANIMATIONS
// ========================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll('.program-card, .fact-card, .cta-card, .partner-card, .impact-stat-card');

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ========================================
// FORM VALIDATION HELPER
// ========================================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\(\)]+$/;
    return re.test(phone);
}

// ========================================
// SCHOLARSHIP APPLICATION FORM
// ========================================
function initScholarshipForm() {
    const scholarshipForm = document.getElementById('scholarshipForm');

    if (scholarshipForm) {
        // Show/hide spouse fields based on checkbox
        const hasSpouseCheckbox = document.getElementById('hasSpouse');
        const spouseFields = document.getElementById('spouseFields');

        if (hasSpouseCheckbox && spouseFields) {
            hasSpouseCheckbox.addEventListener('change', function() {
                spouseFields.style.display = this.checked ? 'block' : 'none';
            });
        }

        // Show/hide additional children fields
        const addChildButtons = document.querySelectorAll('.add-child-btn');
        addChildButtons.forEach((btn, index) => {
            btn.addEventListener('click', function() {
                const childFields = document.getElementById(`child${index + 2}Fields`);
                if (childFields) {
                    childFields.style.display = 'block';
                    btn.style.display = 'none';
                }
            });
        });

    }
}

// Initialize scholarship form if on that page
if (window.location.pathname.includes('apply')) {
    document.addEventListener('DOMContentLoaded', initScholarshipForm);
}

// ========================================
// DONATION FORM
// ========================================
function initDonationForm() {
    const donationForm = document.getElementById('donationForm');

    if (donationForm) {
        // Preset amount buttons
        const amountButtons = document.querySelectorAll('.amount-btn');
        const customAmountInput = document.getElementById('customAmount');

        amountButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                amountButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                customAmountInput.value = this.dataset.amount;
            });
        });

        customAmountInput.addEventListener('input', function() {
            amountButtons.forEach(b => b.classList.remove('active'));
        });

        // Form submission
        donationForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const amount = customAmountInput.value;

            if (!amount || parseFloat(amount) <= 0) {
                alert('Please enter a valid donation amount.');
                return;
            }

            // Show processing message
            alert('Redirecting to secure payment processor...\n\nNote: This is a demo. In production, this would integrate with Stripe, PayPal, or another payment processor.');

            // In a real implementation, this would redirect to payment processor
            console.log('Donation form submitted:', { amount });
        });
    }
}

// Initialize donation form if on that page
if (window.location.pathname.includes('donate')) {
    document.addEventListener('DOMContentLoaded', initDonationForm);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// PERFORMANCE OPTIMIZATION
// ========================================

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Console log for debugging (remove in production)
console.log('Make A Splash Foundation - Website Loaded Successfully');
console.log('Version: 1.0.0');
console.log('For questions: info@makeasplashfoundation.co');
