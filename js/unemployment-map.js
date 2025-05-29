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
    'United States': 'United States',
    'USA': 'United States',
    'United States of America': 'United States',
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

// Create SVG for line graph
const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const graphWidth = 600 - margin.left - margin.right;
const graphHeight = 400 - margin.top - margin.bottom;

function createGraph() {
    d3.select('#line-graph').selectAll('*').remove();
    
    const svg = d3.select('#line-graph')
        .append('svg')
        .attr('width', graphWidth + margin.left + margin.right)
        .attr('height', graphHeight + margin.top + margin.bottom)
        .style('background-color', 'black')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes with white color
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${graphHeight})`)
        .style('color', 'white');

    svg.append('g')
        .attr('class', 'y-axis')
        .style('color', 'white');

    return svg;
}

// Function to normalize country names
function normalizeCountryName(name) {
    // Remove quotes and trim
    name = name.replace(/"/g, '').trim();
    console.log('Normalizing name:', name);
    
    // Special case for USA variations
    if (name === 'United States' || name === 'USA' || name === 'United States of America') {
        console.log('USA special case, returning: United States');
        return 'United States';
    }
    
    // First try direct mapping
    if (countryNameMappings[name]) {
        console.log('Found in mappings:', name, '->', countryNameMappings[name]);
        return countryNameMappings[name];
    }
    
    // Try reverse mapping
    for (const [key, value] of Object.entries(countryNameMappings)) {
        if (value === name) {
            console.log('Found in reverse mappings:', name, '<-', key);
            return value;
        }
    }
    
    console.log('No mapping found, returning original:', name);
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

    // Set willReadFrequently on all canvas elements
    document.querySelectorAll('canvas').forEach(canvas => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
    });

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
            const storedCountryName = timelineContainer.node().__countryName;
            const dataset = isShowingGDP ? gdpData : unemploymentData;
            const countryData = dataset.find(row => {
                const dataName = row['Country Name'].replace(/"/g, '').trim();
                return normalizeCountryName(dataName) === storedCountryName;
            });

            // Check if we have valid data for the current year
            const hasValidData = countryData && countryData[currentYear] && !isNaN(countryData[currentYear]);
            
            if (hasValidData) {
                const displayName = timelineContainer.node().__displayName;
                showTimeline(displayName, countryData);
            } else {
                // Remove the timeline if no valid data is available
                timelineContainer.remove();
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
    const normalizedHoveredCountry = normalizeCountryName(hoveredCountry);
    const countryData = dataset.find(row => {
        const dataName = row['Country Name'].replace(/"/g, '').trim();
        return normalizeCountryName(dataName) === normalizedHoveredCountry;
    });

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
function showTimeline(countryName, data) {
    // Remove any existing timeline
    d3.select('.timeline-container').remove();

    // Create timeline container
    const timelineContainer = d3.select('#unemployment-map-container')
        .append('div')
        .attr('class', 'timeline-container')
        .style('position', 'absolute')
        .style('left', '10px')
        .style('bottom', '10px')
        .style('background', 'rgba(0, 0, 0, 0.9)')  // Changed to black background
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('border', '1px solid #333')  // Darker border
        .style('display', 'block');

    // Store both the normalized and display names
    const normalizedName = normalizeCountryName(countryName);
    timelineContainer.node().__countryName = normalizedName;
    
    // Use full name for USA, otherwise use the provided name
    const displayName = normalizedName === 'United States' ? 'United States of America' : countryName;
    timelineContainer.node().__displayName = displayName;

    // Add title with data type
    timelineContainer.append('div')
        .attr('class', 'timeline-title')
        .style('font-weight', 'bold')
        .style('color', 'white')  // White text
        .text(`${displayName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate: ${parseFloat(data[currentYear]).toFixed(1)}%`);

    // Create SVG with black background
    const svg = timelineContainer.append('svg')
        .attr('width', timelineWidth + timelineMargin.left + timelineMargin.right)
        .attr('height', timelineHeight + timelineMargin.top + timelineMargin.bottom)
        .style('background', 'black');  // Black background

    const g = svg.append('g')
        .attr('transform', `translate(${timelineMargin.left},${timelineMargin.top})`);

    // Filter data to only include years from 2000 onwards
    const years = Object.keys(data)
        .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023 && data[key] !== '')
        .map(year => parseInt(year))
        .sort((a, b) => a - b);

    const values = years.map(year => parseFloat(data[year])).filter(v => !isNaN(v));

    // Create scales
    const x = d3.scaleLinear()
        .domain([2000, 2023])
        .range([0, timelineWidth]);

    const yDomain = calculateYDomain(data, isShowingGDP);
    const y = d3.scaleLinear()
        .domain(yDomain)
        .range([timelineHeight, 0])
        .nice();

    // Add axes with white color
    g.append('g')
        .attr('transform', `translate(0,${timelineHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')))
        .style('color', 'white')  // White text and lines
        .selectAll('line')
        .style('stroke', 'white');  // White tick lines

    g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
        .style('color', 'white')  // White text and lines
        .selectAll('line')
        .style('stroke', 'white');  // White tick lines

    // Create line generator
    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => x(d[0]))
        .y(d => y(d[1]))
        .curve(d3.curveMonotoneX);

    // Create the line path
    const timelineData = years.map(year => [year, parseFloat(data[year])]);

    // Add grid lines in white
    g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-timelineWidth)
            .tickFormat('')
        )
        .style('color', 'white');  // White grid lines

    // Add the line with blue color
    g.append('path')
        .datum(timelineData)
        .attr('class', 'timeline-line')
        .attr('fill', 'none')
        .attr('stroke', '#4a90e2')  // Bright blue color
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add points in blue
    g.selectAll('.timeline-point')
        .data(timelineData)
        .enter()
        .append('circle')
        .attr('class', 'timeline-point')
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', 4)
        .style('fill', '#4a90e2');  // Blue points

    // Highlight current year point in red
    g.append('circle')
        .attr('class', 'current-year-point')
        .attr('cx', x(currentYear))
        .attr('cy', y(parseFloat(data[currentYear])))
        .attr('r', 6)
        .style('fill', '#ff4b4b');  // Keep red for current point

    // Add hover effects with white tooltip
    const tooltip = g.append('g')
        .attr('class', 'timeline-tooltip')
        .style('display', 'none');

    tooltip.append('rect')
        .attr('class', 'tooltip-bg')
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', 'rgba(255,255,255,0.9)');  // White background for tooltip

    tooltip.append('text')
        .attr('class', 'tooltip-text')
        .attr('fill', 'black')  // Black text for better contrast on white background
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em');

    g.selectAll('.timeline-point, .current-year-point')
        .on('mouseover', function(event, d) {
            const [x, y] = d3.pointer(event, g.node());
            tooltip.style('display', null)
                .attr('transform', `translate(${x},${y})`);
            
            tooltip.select('.tooltip-text')
                .text(`${d[0]}: ${d[1].toFixed(1)}%`);

            const bbox = tooltip.select('.tooltip-text').node().getBBox();
            tooltip.select('.tooltip-bg')
                .attr('x', bbox.x - 5)
                .attr('y', bbox.y - 2)
                .attr('width', bbox.width + 10)
                .attr('height', bbox.height + 4);
        })
        .on('mouseout', () => tooltip.style('display', 'none'));

    // Store scales and data for updates
    timelineContainer.node().__scales = { x, y };
    timelineContainer.node().__data = timelineData;
}

// Update map colors based on year
function updateMap(year) {
    currentYear = year;
    document.getElementById('unemployment-year-display').textContent = year;
    document.getElementById('unemployment-year-slider').value = year;

    // Cache the dataset and colorScale to avoid repeated lookups
    const dataset = isShowingGDP ? gdpData : unemploymentData;
    const colorScale = isShowingGDP ? gdpColorScale : unemploymentColorScale;

    // Create a map for faster data lookups
    const countryDataMap = new Map();
    dataset.forEach(row => {
        const dataName = row['Country Name'].replace(/"/g, '').trim();
        const normalizedName = normalizeCountryName(dataName);
        countryDataMap.set(normalizedName, row);
    });

    svg.selectAll('.country')
        .transition()
        .duration(100) // Reduced transition time
        .style('fill', d => {
            const normalizedMapName = normalizeCountryName(d.properties.name);
            const countryData = countryDataMap.get(normalizedMapName);
            
            if (!countryData || !countryData[year] || isNaN(countryData[year])) {
                return '#ccc';
            }
            
            const value = parseFloat(countryData[year]);
            return colorScale(isShowingGDP ? Math.max(-10, Math.min(10, value)) : Math.min(value, 15));
        });

    // Update timeline if it exists and is visible
    const timelineContainer = d3.select('.timeline-container');
    if (!timelineContainer.empty() && timelineContainer.style('display') !== 'none') {
        const storedCountryName = timelineContainer.node().__countryName;
        const countryData = countryDataMap.get(storedCountryName);

        if (countryData) {
            const { x, y } = timelineContainer.node().__scales;
            const value = parseFloat(countryData[year]);

            if (!isNaN(value)) {
                // Update the current year point position
                timelineContainer.select('.current-year-point')
                    .attr('cx', x(year))
                    .attr('cy', y(value));

                // Update title with current value using the stored display name
                const displayName = timelineContainer.node().__displayName;
                timelineContainer.select('.timeline-title')
                    .text(`${displayName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate: ${value.toFixed(1)}%`);
            }
        }
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
    console.log('Clicked country:', countryName);
    
    const dataset = isShowingGDP ? gdpData : unemploymentData;
    
    // Try different name variations to find the country data
    const countryData = dataset.find(row => {
        const dataName = row['Country Name'].replace(/"/g, '').trim();
        const normalizedDataName = normalizeCountryName(dataName);
        const normalizedClickedName = normalizeCountryName(countryName);
        console.log('Comparing:', {
            original: { dataName, countryName },
            normalized: { normalizedDataName, normalizedClickedName }
        });
        return normalizedDataName === normalizedClickedName;
    });

    console.log('Found country data:', countryData ? 'yes' : 'no');

    const existingTimeline = d3.select('.timeline-container');
    const isCurrentCountry = !existingTimeline.empty() && 
        normalizeCountryName(existingTimeline.node().__countryName) === normalizeCountryName(countryName);
    console.log('Is current country:', isCurrentCountry);

    // If clicking the same country, toggle the timeline
    if (isCurrentCountry) {
        console.log('Toggling timeline visibility');
        const isVisible = existingTimeline.style('display') !== 'none';
        console.log('Current visibility:', isVisible ? 'visible' : 'hidden');
        existingTimeline.style('display', isVisible ? 'none' : 'block');
        return;
    }

    // If we found data for this country
    if (countryData) {
        console.log('Showing timeline for:', countryName);
        showTimeline(countryName, countryData);
    } else {
        console.log('No data found for:', countryName);
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

// Update graph styles
function updateGraphStyles() {
    // Style the axes
    d3.selectAll('.x-axis text, .y-axis text')
        .style('fill', 'white');
    
    d3.selectAll('.x-axis line, .y-axis line, .x-axis path, .y-axis path')
        .style('stroke', 'white');
}

// Call this after creating or updating the graph
updateGraphStyles(); 