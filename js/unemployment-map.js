// Set up the SVG container
let width, height;
let svg, projection, path;
let unemploymentData = {};
let gdpData = {};
let currentYear = 2000;
let unemploymentIsPlaying = false;
let unemploymentInterval;
let hoveredCountry = null;
let isShowingGDP = false;

// Set initial dimensions for a larger map
const initialWidth = Math.min(1600, window.innerWidth * 0.98);
const initialHeight = Math.min(800, window.innerHeight * 0.85);

// Country name mappings from unemployment data names to map names
const countryNameMappings = {
    '"Egypt, Arab Rep."': 'Egypt',
    'United States': 'United States of America',
    'Russian Federation': 'Russia',
    'Democratic Republic of the Congo': 'Dem. Rep. Congo',
    'Dominican Republic': 'Dominican Rep.',
    'Western Sahara': 'W. Sahara',
    'Central African Republic': 'Central African Rep.',
    'South Sudan': 'S. Sudan',
    'Lao People\'s Democratic Republic': 'Lao PDR',
    'Czech Rep.': 'Czechia',
    'Bosnia and Herzegovina': 'Bosnia and Herz.',
    'Equatorial Guinea': 'Eq. Guinea',
    '"Korea, Rep."': 'South Korea',
    '"Korea, Dem. People\'s Rep."': 'North Korea',
    'Republic of the Congo': 'Congo',
    'Brunei Darussalam': 'Brunei',
    'Viet Nam': 'Vietnam',
    'North Macedonia': 'Macedonia',
    'Swaziland': 'eSwatini',
    'West Bank and Gaza': 'Palestine',
    'Slovak Republic': 'Slovakia',
    'Turkiye': 'Turkey',
    'Kyrgyz Republic': 'Kyrgyzstan',
    'Moldova': 'Moldova',
    'Myanmar (Burma)': 'Myanmar',
    'Timor-Leste': 'Timor-Leste',
    'Taiwan, China': 'Taiwan',
    '"Hong Kong SAR, China"': 'Hong Kong'
};

// Set up timeline dimensions first
const timelineMargin = { top: 20, right: 25, bottom: 20, left: 35 };
const timelineWidth = 320;
const timelineHeight = 150;

// Color scales for unemployment and GDP
const unemploymentColorScale = d3.scaleSequential()
    .domain([0, 15])
    .interpolator(d3.interpolateYlOrRd);

const gdpColorScale = d3.scaleSequential()
    .domain([-10, 10])
    .interpolator(d3.interpolateRdYlBu);

// Function to normalize country names
function normalizeCountryName(name) {
    // First try direct mapping
    if (countryNameMappings[name]) {
        return countryNameMappings[name];
    }
    
    // Try to handle special cases
    if (name.includes('Republic')) {
        name = name.replace('Republic', 'Rep.');
    }
    if (name.includes('Islands')) {
        name = name.replace('Islands', 'Is.');
    }
    
    return name;
}

// Initialize the map
function initMap() {
    const container = document.getElementById('unemployment-map-container');
    width = initialWidth;
    height = initialHeight;

    // Set up the SVG with the new dimensions
    svg = d3.select('#unemployment-map-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent');

    // Initialize the legend
    updateLegend();

    // Adjust projection scale and translation for better fit
    projection = d3.geoMercator()
        .scale((width / 2.3) / Math.PI)
        .translate([width / 2, height / 1.8]);

    // Create a path generator
    path = d3.geoPath().projection(projection);

    // Add event listener for the switch
    document.getElementById('data-type-toggle').addEventListener('change', function(e) {
        isShowingGDP = e.target.checked;
        
        // Update the legend title and labels
        document.querySelector('.unemployment-legend-title').textContent = 
            isShowingGDP ? 'GDP Growth Rate (%)' : 'Unemployment Rate (%)';
        
        const labels = document.querySelector('.unemployment-legend-labels');
        if (isShowingGDP) {
            labels.innerHTML = '<span>-10%</span><span>0%</span><span>+10%</span>';
        } else {
            labels.innerHTML = '<span>0%</span><span>7.5%</span><span>15%+</span>';
        }

        // Update the timeline if it exists and is visible
        const timelineContainer = d3.select('.timeline-container');
        if (!timelineContainer.empty() && timelineContainer.style('display') !== 'none') {
            const countryName = timelineContainer.select('.timeline-title').text().split(' ')[0];
            const dataset = isShowingGDP ? gdpData : unemploymentData;
            const countryData = dataset.find(row => 
                normalizeCountryName(row['Country Name'].replace(/"/g, '')) === countryName
            );
            if (countryData) {
                showTimeline(countryName, countryData, true);
            }
        }

        updateLegend();
        updateMap(currentYear);
    });

    // Load world map data and both datasets
    Promise.all([
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
        d3.csv('src/data/unemployment/unemployment.csv'),
        d3.csv('src/data/gdp_growth_rate.csv')
    ]).then(([worldData, unemploymentCSV, gdpCSV]) => {
        // Process data
        unemploymentData = unemploymentCSV;
        gdpData = gdpCSV;
        
        // Draw the map
        const countries = topojson.feature(worldData, worldData.objects.countries);
        
        svg.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', path)
            .style('stroke', '#2a2a3a')
            .style('stroke-width', '0.5px')
            .on('mouseover', handleCountryHover)
            .on('mouseout', handleCountryMouseOut)
            .on('click', handleCountryClick);

        // Initial update
        updateMap(currentYear);
    });
}

function updateLegend() {
    const legendScale = d3.select('.unemployment-legend-scale svg');
    if (!legendScale.empty()) {
        legendScale.remove();
    }

    const newLegendScale = d3.select('.unemployment-legend-scale')
        .append('svg')
        .attr('width', 200)
        .attr('height', 20);

    const gradient = newLegendScale.append('defs')
        .append('linearGradient')
        .attr('id', 'data-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

    const colorScale = isShowingGDP ? gdpColorScale : unemploymentColorScale;
    const domain = isShowingGDP ? [-10, -5, 0, 5, 10] : [0, 3.75, 7.5, 11.25, 15];

    domain.forEach((value, i) => {
        gradient.append('stop')
            .attr('offset', `${(i / (domain.length - 1)) * 100}%`)
            .attr('stop-color', colorScale(value));
    });

    newLegendScale.append('rect')
        .attr('width', 200)
        .attr('height', 20)
        .style('fill', 'url(#data-gradient)');
}

// Update tooltip
function updateTooltip(event) {
    if (!hoveredCountry) return;

    const dataset = isShowingGDP ? gdpData : unemploymentData;
    const countryData = dataset.find(row => 
        normalizeCountryName(row['Country Name'].replace(/"/g, '')) === hoveredCountry
    );

    const tooltip = d3.select('#unemployment-tooltip');
    if (countryData && countryData[currentYear] && !isNaN(countryData[currentYear])) {
        const value = parseFloat(countryData[currentYear]).toFixed(2);
        tooltip
            .style('opacity', 1)
            .style('left', (event ? event.pageX + 10 : tooltip.node().offsetLeft) + 'px')
            .style('top', (event ? event.pageY - 28 : tooltip.node().offsetTop) + 'px')
            .html(`
                <strong>${hoveredCountry}</strong><br>
                Year: ${currentYear}<br>
                ${isShowingGDP ? 'GDP Growth' : 'Unemployment'}: ${value}%
            `);
    } else {
        tooltip
            .style('opacity', 1)
            .style('left', (event ? event.pageX + 10 : tooltip.node().offsetLeft) + 'px')
            .style('top', (event ? event.pageY - 28 : tooltip.node().offsetTop) + 'px')
            .html(`
                <strong>${hoveredCountry}</strong><br>
                Year: ${currentYear}<br>
                No data available
            `);
    }
}

// Calculate appropriate y-axis domain for a country's data
function calculateYDomain(data, isGDP) {
    if (!data) return isGDP ? [-10, 10] : [0, 15];

    const values = Object.keys(data)
        .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023)
        .map(year => parseFloat(data[year]))
        .filter(v => !isNaN(v));

    if (values.length === 0) return isGDP ? [-10, 10] : [0, 15];

    if (isGDP) {
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const padding = Math.abs(maxValue - minValue) * 0.1;
        
        return [
            Math.floor(Math.min(0, minValue - padding)), 
            Math.ceil(Math.max(0, maxValue + padding))
        ];
    } else {
        return [0, Math.max(15, Math.ceil(d3.max(values)))];
    }
}

// Show timeline
function showTimeline(countryName, data, forceRedraw = false) {
    // Check if timeline exists for this country
    const existingTimeline = d3.select('.timeline-container');
    if (!existingTimeline.empty() && 
        existingTimeline.style('display') !== 'none' && 
        existingTimeline.select('.timeline-title').text().split(' ')[0] === countryName &&
        !forceRedraw) {
        updateTimelinePoint(existingTimeline);
        return;
    }

    // Remove any existing timeline
    d3.select('.timeline-container').remove();

    // Create timeline container
    const timelineContainer = d3.select('#unemployment-map-container')
        .append('div')
        .attr('class', 'timeline-container')
        .style('display', 'block');

    // Add title
    timelineContainer.append('h3')
        .attr('class', 'timeline-title')
        .text(`${countryName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate`);

    // Create SVG
    const timelineSvg = timelineContainer.append('svg')
        .attr('width', timelineWidth + timelineMargin.left + timelineMargin.right)
        .attr('height', timelineHeight + timelineMargin.top + timelineMargin.bottom);

    const g = timelineSvg.append('g')
        .attr('transform', `translate(${timelineMargin.left},${timelineMargin.top})`);

    // Filter data to only include years from 2000 onwards
    const years = Object.keys(data)
        .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023 && data[key] !== '');
    const values = years.map(year => parseFloat(data[year])).filter(v => !isNaN(v));

    const x = d3.scaleLinear()
        .domain([2000, 2023])
        .range([0, timelineWidth]);

    // Calculate y domain based on the data type and values
    const yDomain = calculateYDomain(data, isShowingGDP);
    const y = d3.scaleLinear()
        .domain(yDomain)
        .range([timelineHeight, 0])
        .nice();

    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${timelineHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    g.append('g')
        .call(d3.axisLeft(y).ticks(5));

    // Create line generator
    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => x(d[0]))
        .y(d => y(d[1]));

    // Create the line path
    const timelineData = years.map(year => [parseInt(year), parseFloat(data[year])]);

    // Add the line (always blue)
    g.append('path')
        .datum(timelineData)
        .attr('class', 'timeline-line')
        .attr('d', line)
        .style('stroke', '#4a90e2');

    // Add points (all blue except current year in red)
    g.selectAll('.timeline-point')
        .data(timelineData)
        .enter()
        .append('circle')
        .attr('class', 'timeline-point')
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', d => d[0] === currentYear ? 6 : 4)
        .style('fill', d => d[0] === currentYear ? '#ff4b4b' : '#4a90e2');

    // Add hover functionality
    const hoverLine = g.append('line')
        .attr('class', 'hover-line')
        .style('display', 'none')
        .style('stroke', '#fff')
        .style('stroke-width', '1px')
        .style('stroke-dasharray', '3,3');

    const hoverText = g.append('text')
        .attr('class', 'hover-text')
        .style('display', 'none')
        .style('fill', '#fff')
        .style('text-anchor', 'middle')
        .style('font-size', '12px');

    const overlay = g.append('rect')
        .attr('class', 'overlay')
        .attr('width', timelineWidth)
        .attr('height', timelineHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all');

    overlay.on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const bisect = d3.bisector(d => d[0]).left;
        const i = bisect(timelineData, x0);
        
        if (i > 0) {
            const d0 = timelineData[i - 1];
            const d1 = timelineData[i] || d0;
            const d = x0 - d0[0] > d1[0] - x0 ? d1 : d0;

            hoverLine
                .style('display', null)
                .attr('x1', x(d[0]))
                .attr('x2', x(d[0]))
                .attr('y1', 0)
                .attr('y2', timelineHeight);

            hoverText
                .style('display', null)
                .attr('x', x(d[0]))
                .attr('y', y(d[1]) - 10)
                .text(`${d[0]}: ${d[1].toFixed(1)}%`);
        }
    })
    .on('mouseout', function() {
        hoverLine.style('display', 'none');
        hoverText.style('display', 'none');
    });

    // Store scales and data in the container for updates
    timelineContainer.node().__scales = { x, y };
    timelineContainer.node().__data = timelineData;
}

// Update timeline point
function updateTimelinePoint(timelineContainer) {
    if (!timelineContainer || timelineContainer.empty() || timelineContainer.style('display') === 'none') return;

    const countryName = timelineContainer.select('.timeline-title').text().split(' ')[0];
    const dataset = isShowingGDP ? gdpData : unemploymentData;
    const countryData = dataset.find(row => 
        normalizeCountryName(row['Country Name'].replace(/"/g, '')) === countryName
    );

    if (!countryData || !countryData[currentYear]) return;

    const { x, y } = timelineContainer.node().__scales;
    const value = parseFloat(countryData[currentYear]);

    // Update all points to be blue
    timelineContainer.selectAll('.timeline-point')
        .style('fill', '#4a90e2')
        .attr('r', 4);

    // Update or create the point for the current year
    const currentYearPoints = timelineContainer.selectAll('.timeline-point')
        .filter(d => d[0] === currentYear);

    if (!currentYearPoints.empty()) {
        currentYearPoints
            .style('fill', '#ff4b4b')
            .attr('r', 6);
    }

    // Update title to show current value
    timelineContainer.select('.timeline-title')
        .text(`${countryName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate`);
}

// Update map colors based on year
function updateMap(year) {
    currentYear = year;
    document.getElementById('unemployment-year-display').textContent = year;
    document.getElementById('unemployment-year-slider').value = year;

    svg.selectAll('.country')
        .transition()
        .duration(200)
        .style('fill', d => {
            const dataset = isShowingGDP ? gdpData : unemploymentData;
            const colorScale = isShowingGDP ? gdpColorScale : unemploymentColorScale;
            
            const countryData = dataset.find(row => {
                const mapName = d.properties.name;
                const dataName = row['Country Name'].replace(/"/g, '');
                return mapName === normalizeCountryName(dataName);
            });
            
            if (!countryData || !countryData[year] || isNaN(countryData[year])) {
                return '#ccc';
            }
            
            const value = parseFloat(countryData[year]);
            return colorScale(isShowingGDP ? Math.max(-10, Math.min(10, value)) : Math.min(value, 15));
        });

    // Update timeline if it exists and is visible
    const timelineContainer = d3.select('.timeline-container');
    if (!timelineContainer.empty() && timelineContainer.style('display') !== 'none') {
        updateTimelinePoint(timelineContainer);
    }

    // Update tooltip if a country is being hovered
    if (hoveredCountry) {
        updateTooltip();
    }
}

// Handle country hover
function handleCountryHover(event, d) {
    hoveredCountry = d.properties.name;
    updateTooltip(event);
}

// Handle country mouse out
function handleCountryMouseOut() {
    hoveredCountry = null;
    d3.select('#unemployment-tooltip').style('opacity', 0);
}

// Handle country click
function handleCountryClick(event, d) {
    const countryName = d.properties.name;
    const dataset = isShowingGDP ? gdpData : unemploymentData;
    const countryData = dataset.find(row => 
        normalizeCountryName(row['Country Name'].replace(/"/g, '')) === countryName
    );

    const existingTimeline = d3.select('.timeline-container');
    const isCurrentCountry = !existingTimeline.empty() && 
        existingTimeline.style('display') !== 'none' && 
        existingTimeline.select('.timeline-title').text().split(' ')[0] === countryName;

    if (isCurrentCountry) {
        existingTimeline.style('display', 'none');
        return;
    }

    if (countryData) {
        showTimeline(countryName, countryData);
    }
}

// Play/pause animation
function toggleUnemploymentPlay() {
    const button = document.getElementById('unemployment-play-button');
    const icon = button.querySelector('i');

    if (unemploymentIsPlaying) {
        clearInterval(unemploymentInterval);
        icon.className = 'fas fa-play';
    } else {
        unemploymentInterval = setInterval(() => {
            currentYear = currentYear >= 2023 ? 2000 : currentYear + 1;
            updateMap(currentYear);
        }, 1000);
        icon.className = 'fas fa-pause';
    }
    unemploymentIsPlaying = !unemploymentIsPlaying;
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();

    // Set up event listeners
    document.getElementById('unemployment-play-button')
        .addEventListener('click', toggleUnemploymentPlay);

    document.getElementById('unemployment-year-slider')
        .addEventListener('input', (e) => {
            if (unemploymentIsPlaying) {
                toggleUnemploymentPlay();
            }
            updateMap(parseInt(e.target.value));
        });

    // Handle window resize
    window.addEventListener('resize', () => {
        width = Math.min(1600, window.innerWidth * 0.98);  // Updated to match new initialWidth
        height = Math.min(800, window.innerHeight * 0.85);  // Updated to match new initialHeight
        
        svg.attr('width', width)
            .attr('height', height);

        projection
            .scale((width / 2.3) / Math.PI)  // Updated scale factor
            .translate([width / 2, height / 1.8]);  // Updated translation

        svg.selectAll('.country')
            .attr('d', path);
    });
}); 