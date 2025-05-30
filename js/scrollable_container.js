if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Always scroll to top on page load (even on refresh)
window.addEventListener('load', function () {
    window.scrollTo(0, 0);
});

// Initialize the scrollable container
// Version avec interception du scroll pour scroll par section

document.addEventListener('DOMContentLoaded', function() {
    // Select the important elements
    const container = document.querySelector('.container');
    const sections = Array.from(document.querySelectorAll('.section'));
    const navDots = Array.from(document.querySelectorAll('.nav-dot'));
    
    if (!container || sections.length === 0 || navDots.length === 0) {
        console.error('Required elements not found');
        return;
    }

    // Initialize variables
    let currentSection = 0;
    let isScrolling = false;
    let touchStartY = 0;
    let lastScrollTime = Date.now();
    
    // Function to update active navigation dot and section
    function updateNavigation(index) {
        navDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        sections.forEach((section, i) => {
            section.classList.toggle('active', i === index);
        });
    }

    // Function to scroll to a specific section
    function scrollToSection(index) {
        if (isScrolling || index < 0 || index >= sections.length) return;
        isScrolling = true;
        currentSection = index;
        sections[index].scrollIntoView({ behavior: 'smooth' });
        updateNavigation(index);
        setTimeout(() => {
            isScrolling = false;
        }, 1000);
    }

    // Handle navigation dot clicks
    navDots.forEach((dot, index) => {
        dot.addEventListener('click', () => scrollToSection(index));
    });

    // Handle wheel events
    container.addEventListener('wheel', (e) => {
        // Heuristic: if deltaY is small or deltaX is not zero, it's probably a touchpad
        if (Math.abs(e.deltaY) < 15 || e.deltaX !== 0) {
            // Let the browser handle the scroll natively (no section snap)
            return;
        }
        e.preventDefault();
        const now = Date.now();
        if (now - lastScrollTime < 500) return;
        lastScrollTime = now;
        if (isScrolling) return;
        if (e.deltaY > 0 && currentSection < sections.length - 1) {
            scrollToSection(currentSection + 1);
        } else if (e.deltaY < 0 && currentSection > 0) {
            scrollToSection(currentSection - 1);
        }
    }, { passive: false });

    // Handle touch events for mobile
    container.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastScrollTime < 500) return;
        if (isScrolling) return;
        const touchEndY = e.touches[0].clientY;
        const deltaY = touchStartY - touchEndY;
        if (Math.abs(deltaY) > 50) {
            lastScrollTime = now;
            if (deltaY > 0 && currentSection < sections.length - 1) {
                scrollToSection(currentSection + 1);
            } else if (deltaY < 0 && currentSection > 0) {
                scrollToSection(currentSection - 1);
            }
        }
    }, { passive: false });

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        const now = Date.now();
        if (now - lastScrollTime < 500) return;
        if (isScrolling) return;
        if (e.key === 'ArrowDown' && currentSection < sections.length - 1) {
            lastScrollTime = now;
            scrollToSection(currentSection + 1);
        } else if (e.key === 'ArrowUp' && currentSection > 0) {
            lastScrollTime = now;
            scrollToSection(currentSection - 1);
        }
    });

    // Set initial state
    updateNavigation(currentSection);
});
