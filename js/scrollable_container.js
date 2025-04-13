// Initialize the scrollable container
document.addEventListener('DOMContentLoaded', function() {
    // Select the importants elements
    const container = document.querySelector('.container');
    const sections = document.querySelectorAll('.section');
    const navDots = document.querySelectorAll('.nav-dot');
    
    // Initialize the variables
    let currentSection = 0;
    let isScrolling = false;
    let scrollTimeout;
    let lastScrollTime = Date.now();
    
    // Function to update active navigation dot and section
    function updateNavigation() {
        // Update navigation dots
        navDots.forEach((dot, index) => {
            if (index === currentSection) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        // Update active section for animations
        sections.forEach((section, index) => {
            if (index === currentSection) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }
    
    // Function to scroll to a specific section with improved animation
    function scrollToSection(index) {
        if (isScrolling) return;
        
        // Update variables
        isScrolling = true;
        currentSection = index;
        
        // Clear any existing scroll timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // Add a transition class to the container for smoother scrolling
        container.classList.add('scrolling');
        
        // Scroll to the section with smooth behavior
        sections[index].scrollIntoView({behavior: 'smooth'});
        updateNavigation();
        
        // Reset scrolling flag after animation completes
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            container.classList.remove('scrolling');
        }, 800); // Match the CSS transition duration
    }
    
    // Handle navigation dot clicks
    navDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            scrollToSection(index);
        });
    });
    
    // Handle wheel or trackpad events for scrolling 
    // (by detecting scroll intent manually instead of nomral browser scrolling)
    container.addEventListener('wheel', (e) => {
        // Disables normal page scrolling to prevent double scrolling
        e.preventDefault();
        
        // Capture the current time (used for debouncing)
        const now = Date.now();

        // Debounce rapid scrolling
        // If less than 300ms since last scroll, ignore
        if (now - lastScrollTime < 300) return;
        lastScrollTime = now;
        
        // if the page is already scrolling, ignore
        if (isScrolling) return;
        
        // Determine the direction of the scroll
        if (e.deltaY > 0 && currentSection < sections.length - 1) {
            // Scrolling down
            scrollToSection(currentSection + 1);
        } else if (e.deltaY < 0 && currentSection > 0) {
            // Scrolling up
            scrollToSection(currentSection - 1);
        }
    }, {passive: false});
    
    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        // if the page is already scrolling, ignore
        if (isScrolling) return;

        // Capture the current time (used for debouncing)
        const now = Date.now();
        // Debounce rapid scrolling
        // If less than 300ms since last scroll, ignore
        if (now - lastScrollTime < 300) return;
        lastScrollTime = now;
        
        // Determine the direction of the arrow key press
        if (e.key === 'ArrowDown' && currentSection < sections.length - 1) {
            // Scrolling down
            scrollToSection(currentSection + 1);
        } else if (e.key === 'ArrowUp' && currentSection > 0) {
            // Scrolling up
            scrollToSection(currentSection - 1);
        }
    });
    
    // Initial navigation update
    updateNavigation();
}); 