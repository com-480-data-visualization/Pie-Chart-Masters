// Store data globally
let globalData = null;

// Define financial crisis related keywords globally
const financialCrisisKeywords = [
    'financial crisis', 'recession', 'bankruptcy', 'bailout', 'subprime',
    'mortgage', 'housing market', 'stock market', 'wall street', 'bank',
    'credit', 'debt', 'foreclosure', 'unemployment', 'economy',
    'dow jones', 'bear stearns', 'lehman brothers', 'aig', 'fannie mae',
    'freddie mac', 'stimulus', 'recovery', 'downturn', 'market crash',
    'financial meltdown', 'credit crunch', 'housing bubble', 'toxic assets',
    'banking crisis', 'economic crisis', 'financial markets', 'market turmoil'
];

// Function to initialize the word cloud
function initializeWordCloud() {
    // Clear any existing content
    d3.select('#word-cloud-container').selectAll('*').remove();
    
    // Load and process the data
    d3.json('src/data/google_trends/weekly_google_trends.json')
        .then(data => {
            console.log('Data loaded:', data);
            // Store data globally
            globalData = data;
            // Create slider with dates and pass the data
            createSlider(data.dates, data);
            
            // Create initial word cloud
            createWordCloud(data, data.dates[0]);
        })
        .catch(error => {
            console.error('Error loading the data:', error);
            d3.select('#word-cloud-container')
                .append('div')
                .text('Error loading data. Please try again later.');
        });
}

// Function to create the word cloud
function createWordCloud(data, date) {
    // Clear previous word cloud
    d3.select('#word-cloud-container').selectAll('*').remove();

    // Get container dimensions
    const container = d3.select('#word-cloud-container');
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    // Get the index of the current date
    const currentDateIndex = data.dates.indexOf(date);
    
    // Define crisis period (adjust these dates based on your data)
    const crisisStartIndex = data.dates.findIndex(d => d.includes('2008-09'));
    const crisisEndIndex = data.dates.findIndex(d => d.includes('2009-06'));

    // Calculate the maximum average value for scaling
    const maxAverage = Math.max(...Object.values(data.averages));
    const minAverage = Math.min(...Object.values(data.averages));

    // Filter data for the selected date
    const words = Object.entries(data.keywords).map(([keyword, values]) => {
        const isFinancialCrisis = financialCrisisKeywords.some(crisisWord => 
            keyword.toLowerCase().includes(crisisWord.toLowerCase())
        );
        
        // Calculate size based on average value
        const avgValue = data.averages[keyword];
        // Scale the size between 12 and 60 pixels based on the average value
        let size = 12 + ((avgValue - minAverage) / (maxAverage - minAverage)) * 48;
        
        // If we're in the crisis period and it's a financial crisis term, boost its size
        if (isFinancialCrisis && currentDateIndex >= crisisStartIndex && currentDateIndex <= crisisEndIndex) {
            // Get the current value for this keyword
            const currentValue = values[currentDateIndex];
            // Calculate how much more important this term is during the crisis
            const importanceRatio = currentValue / avgValue;
            // Boost the size based on the importance ratio
            size *= Math.min(importanceRatio, 2); // Cap the boost at 2x
        }
        return {
            text: keyword,
            size: size,
            isFinancialCrisis: isFinancialCrisis
        };
    });

    // Function to draw the words (original version)
    function draw(words) {
        // Get or create the SVG
        const svg = d3.select('#word-cloud-container')
            .selectAll('svg')
            .data([words])
            .join('svg')
            .attr('width', width)
            .attr('height', height);

        // Get or create the group
        const g = svg.selectAll('g')
            .data([words])
            .join('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // DATA JOIN
        const text = g.selectAll('text')
            .data(words, d => d.text);

        // EXIT: mots qui disparaissent
        text.exit()
            .transition()
            .duration(500)
            .style('opacity', 0)
            .remove();

        // ENTER: nouveaux mots
        const textEnter = text.enter()
            .append('text')
            .style('font-family', 'Arial')
            .style('fill', d => d.isFinancialCrisis ? "#e41a1c" : "#377eb8")
            .attr('text-anchor', 'middle')
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .text(d => d.text)
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // UPDATE + ENTER: mots qui restent ou apparaissent
        text.merge(textEnter)
            .transition()
            .duration(1000)
            .style('font-size', d => `${d.size}px`)
            .style('opacity', 1)
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Add click handler after the transition
        text.merge(textEnter)
            .on('click', function(event, d) {
                showWordTimeSeries(d.text, globalData);
            });
    }

    // Create the word cloud layout
    const layout = d3.layout.cloud()
        .size([width, height])
        .words(words)
        .padding(0.5)
        .rotate(() => 0)
        .font("Arial")
        .fontSize(d => d.size)
        .on("end", draw);

    layout.start();
}

// Function to create the slider and play controls
function createSlider(dates, data) {
    const slider = d3.select('#slider-container .slider')
        .attr('min', 0)
        .attr('max', dates.length - 1)
        .attr('value', 0);

    // Add date display
    const dateDisplay = d3.select('.date-display');

    // Format date function
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const months = {
            '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
            '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
            '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc'
        };
        const month = months[dateStr.substring(5, 7)];
        const year = dateStr.substring(0, 4);
        return `${month} ${year}`;
    };

    // Get play button element
    const playButton = d3.select('#play-button');

    let isPlaying = false;
    let playInterval;

    // Update word cloud when slider moves
    slider.on('input', function() {
        const index = this.value;
        const date = dates[index];
        dateDisplay.text(formatDate(date));
        createWordCloud(data, date);
    });

    // Play button click handler
    playButton.on('click', function() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            playButton.html('<i class="fas fa-pause"></i>').classed('playing', true);
            startPlayback();
        } else {
            playButton.html('<i class="fas fa-play"></i>').classed('playing', false);
            clearInterval(playInterval);
        }
    });

    // Function to handle playback with smooth speed
    function startPlayback() {
        const interval = 1500; // 1.5 seconds per date for smooth transitions

        playInterval = setInterval(() => {
            const currentIndex = parseInt(slider.property('value'));
            const nextIndex = (currentIndex + 1) % dates.length;
            
            slider.property('value', nextIndex);
            const event = new Event('input');
            slider.node().dispatchEvent(event);

            // Stop at the end of the sequence
            if (nextIndex === 0) {
                isPlaying = false;
                playButton.html('<i class="fas fa-play"></i>').classed('playing', false);
                clearInterval(playInterval);
            }
        }, interval);
    }

    // Set initial slider position and word cloud
    slider.property('value', 0);
    dateDisplay.text(formatDate(dates[0]));
    createWordCloud(data, dates[0]);
    // Set initial date display
    dateDisplay.text(formatDate(dates[0]));
}

// Add resize handler
let resizeTimeout;
window.addEventListener('resize', function() {
    // Clear the timeout if it exists
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    // Set a new timeout to debounce the resize event
    resizeTimeout = setTimeout(function() {
        if (!globalData) return; // Don't proceed if data isn't loaded yet
        
        // Get the current date from the slider
        const slider = d3.select('.slider');
        const currentIndex = parseInt(slider.property('value'));
        const currentDate = globalData.dates[currentIndex];
        
        // Recreate the word cloud with the current date
        createWordCloud(globalData, currentDate);
    }, 250); // Wait 250ms after the last resize event
});

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeWordCloud);

// Also initialize when the page is shown (for single-page applications)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        initializeWordCloud();
    }
});

// Function to show time series for a specific word
function showWordTimeSeries(word, data) {
    // Create popup if it doesn't exist
    let popup = d3.select('.popup-overlay');
    if (popup.empty()) {
        popup = d3.select('body')
            .append('div')
            .attr('class', 'popup-overlay')
            .on('click', function(event) {
                if (event.target === this) {
                    hidePopup();
                }
            });

        popup.append('div')
            .attr('class', 'popup-content')
            .html(`
                <button class="popup-close">&times;</button>
                <h2 class="popup-title"></h2>
                <div class="popup-chart"></div>
            `);

        // Add close button handler
        popup.select('.popup-close')
            .on('click', hidePopup);
    }

    // Check if the word is related to financial crisis
    const isFinancialCrisis = data.keywords[word] && 
        financialCrisisKeywords.some(crisisWord => 
            word.toLowerCase().includes(crisisWord.toLowerCase())
        );

    // Update popup content
    popup.select('.popup-title')
        .text(`Search Trends for "${word}"`);

    // Get the time series data for the word
    const timeSeriesData = data.dates.map((date, i) => ({
        date: new Date(date),
        value: data.keywords[word][i]
    }));

    // Create the time series chart
    const chartContainer = popup.select('.popup-chart');
    chartContainer.selectAll('*').remove();

    const margin = {top: 20, right: 30, bottom: 50, left: 40}; // Increased bottom margin
    let width = chartContainer.node().getBoundingClientRect().width - margin.left - margin.right;
    if (width <= 0 || isNaN(width)) width = 600; // fallback width for popup
    const height = 300 - margin.top - margin.bottom;
    console.log('SVG width:', width, 'height:', height);

    const svg = chartContainer.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleTime()
        .domain(d3.extent(timeSeriesData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(timeSeriesData, d => d.value)])
        .range([height, 0]);

    // Format date for x-axis
    const formatDate = d3.timeFormat("%b %y"); // %b gives abbreviated month name
    const formatDateLocale = (date) => {
        const formatted = formatDate(date);
        // Capitalize first letter
        return formatted.replace(/^[a-z]/, c => c.toUpperCase());
    };

    // Add X axis
    const xAxis = svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(timeSeriesData.length)
            .tickFormat((d, i) => i % 5 === 0 ? formatDateLocale(d) : ""))
            .attr('color', '#000000');

    // Hide tick lines except every 5th
    xAxis.selectAll('line')
        .style('display', (d, i) => i % 5 === 0 ? 'block' : 'none')
        .attr('color', '#000000');

    // Style the text labels
    xAxis.selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)')
        .attr('color', '#000000')
        .style('font-size', '10px');

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .attr('color', '#000000');

    // Add the line
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

    const lineColor = isFinancialCrisis ? "#e41a1c" : "#377eb8";

    svg.append('path')
        .datum(timeSeriesData)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('d', line);

    // Show the popup
    popup.classed('active', true);
}

// Function to hide the popup
function hidePopup() {
    d3.select('.popup-overlay')
        .classed('active', false);
} 