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
    .interpolator(d3.interpolateRgb(
        d3.color("#4575b4"),  // Blue for low unemployment (colorblind-safe)
        d3.color("#d73027")   // Red for high unemployment (colorblind-safe)
    ));

const gdpColorScale = d3.scaleLinear()
    .domain([-10, -5, 0, 5, 10])  // More color stops for smoother gradient
    .range([
        "#e31a1c",  // Bright red for very negative
        "#fd8d3c",  // Orange for slightly negative
        "#ffffbf",  // Light yellow for zero
        "#78c679",  // Light green for slightly positive
        "#33a02c"   // Bright green for very positive
    ])
    .interpolate(d3.interpolateHcl);  // Use HCL interpolation for smoother transitions

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
        
        // Update the legend title and labels with transition
        const legendTitle = document.querySelector('.unemployment-legend-title');
        legendTitle.style.opacity = 0;
        setTimeout(() => {
            legendTitle.textContent = isShowingGDP ? 'GDP Growth Rate (%)' : 'Unemployment Rate (%)';
            legendTitle.style.opacity = 1;
        }, 150);
        
        const labels = document.querySelector('.unemployment-legend-labels');
        labels.style.opacity = 0;
        setTimeout(() => {
            if (isShowingGDP) {
                labels.innerHTML = '<span>-10%</span><span>0%</span><span>+10%</span>';
            } else {
                labels.innerHTML = '<span>0%</span><span>7.5%</span><span>15%+</span>';
            }
            labels.style.opacity = 1;
        }, 150);

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
                // Remove the timeline with fade out if no valid data is available
                timelineContainer
                    .transition()
                    .duration(300)
                    .style('opacity', 0)
                    .on('end', () => timelineContainer.remove());
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

    if (isShowingGDP) {
        // GDP gradient with more color stops
        const stops = [
            { offset: "0%", color: "#e31a1c" },     // Bright red
            { offset: "25%", color: "#fd8d3c" },    // Orange
            { offset: "50%", color: "#ffffbf" },    // Light yellow
            { offset: "75%", color: "#78c679" },    // Light green
            { offset: "100%", color: "#33a02c" }    // Bright green
        ];
        stops.forEach(stop => {
            gradient.append('stop')
                .attr('offset', stop.offset)
                .attr('stop-color', stop.color);
        });
    } else {
        // Unemployment gradient (unchanged)
        const stops = [
            { offset: "0%", color: "#4575b4" },    // Blue for low
            { offset: "100%", color: "#d73027" }   // Red for high
        ];
        stops.forEach(stop => {
            gradient.append('stop')
                .attr('offset', stop.offset)
                .attr('stop-color', stop.color);
        });
    }

    // Add the gradient rectangle with transition
    newLegendScale.append('rect')
        .attr('width', 200)
        .attr('height', 20)
        .style('opacity', 0)
        .style('fill', 'url(#data-gradient)')
        .transition()
        .duration(400)
        .style('opacity', 1);
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

    // Create timeline container with black background
    const timelineContainer = d3.select('#unemployment-map-container')
        .append('div')
        .attr('class', 'timeline-container')
        .style('position', 'absolute')
        .style('left', '10px')
        .style('bottom', '10px')
        .style('background', 'rgba(0, 0, 0, 0.9)')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('border', '1px solid #333')
        .style('display', 'block');

    // Store both the normalized and display names
    const normalizedName = normalizeCountryName(countryName);
    timelineContainer.node().__countryName = normalizedName;
    
    const displayName = normalizedName === 'United States' ? 'United States of America' : countryName;
    timelineContainer.node().__displayName = displayName;

    // Add title
    timelineContainer.append('div')
        .attr('class', 'timeline-title')
        .style('font-weight', 'bold')
        .style('color', 'white')
        .text(`${displayName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate: ${parseFloat(data[currentYear]).toFixed(1)}%`);

    // Create SVG
    const svg = timelineContainer.append('svg')
        .attr('width', timelineWidth + timelineMargin.left + timelineMargin.right)
        .attr('height', timelineHeight + timelineMargin.top + timelineMargin.bottom)
        .style('background', 'black');

    const g = svg.append('g')
        .attr('transform', `translate(${timelineMargin.left},${timelineMargin.top})`);

    // Filter and prepare data
    const timelineData = Object.keys(data)
        .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023 && data[key] !== '')
        .map(year => [parseInt(year), parseFloat(data[year])])
        .filter(d => !isNaN(d[1]))
        .sort((a, b) => a[0] - b[0]);

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
        .style('color', 'white')
        .selectAll('line')
        .style('stroke', 'white');

    g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
        .style('color', 'white')
        .selectAll('line')
        .style('stroke', 'white');

    // Add grid lines
    g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-timelineWidth)
            .tickFormat('')
        )
        .style('color', 'white');

    // Create line generator
    const lineGenerator = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => x(d[0]))
        .y(d => y(d[1]))
        .curve(d3.curveMonotoneX);

    // Add the line
    g.append('path')
        .datum(timelineData)
        .attr('class', 'timeline-line')
        .attr('fill', 'none')
        .attr('stroke', '#3498db')
        .attr('stroke-width', 2)
        .attr('d', lineGenerator);

    // Add points
    g.selectAll('.timeline-point')
        .data(timelineData)
        .enter()
        .append('circle')
        .attr('class', 'timeline-point')
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', 3)
        .style('fill', '#3498db');

    // Add the current year point
    const currentPoint = g.append('circle')
        .attr('class', 'current-year-point')
        .attr('r', 6)
        .style('fill', '#e74c3c');

    // Function to update current point position
    function updateCurrentPoint(year) {
        const yearData = timelineData.find(d => d[0] === year);
        if (yearData) {
            currentPoint
                .attr('cx', x(yearData[0]))
                .attr('cy', y(yearData[1]));
        }
    }

    // Store the update function for later use
    timelineContainer.node().__updateCurrentPoint = updateCurrentPoint;
    timelineContainer.node().__scales = { x, y };
    timelineContainer.node().__data = timelineData;

    // Initial position
    updateCurrentPoint(currentYear);
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
        .duration(800)  // Longer duration for smoother transition
        .ease(d3.easeCubicInOut)  // Smooth acceleration and deceleration
        .style('fill', d => {
            const normalizedMapName = normalizeCountryName(d.properties.name);
            const countryData = countryDataMap.get(normalizedMapName);
            
            if (!countryData || !countryData[year] || isNaN(countryData[year])) {
                return '#2d3436';  // Darker gray for missing data
            }
            
            const value = parseFloat(countryData[year]);
            return colorScale(value);
        })
        .style('stroke', '#dfe6e9')
        .style('stroke-width', '0.8px');

    // Update timeline if it exists
    const timelineContainer = d3.select('.timeline-container');
    if (!timelineContainer.empty() && timelineContainer.style('display') !== 'none') {
        const storedCountryName = timelineContainer.node().__countryName;
        const countryData = countryDataMap.get(storedCountryName);

        if (countryData) {
            const value = parseFloat(countryData[year]);

            if (!isNaN(value)) {
                // Update the current year point position with smooth transition
                const updateCurrentPoint = timelineContainer.node().__updateCurrentPoint;
                if (updateCurrentPoint) {
                    updateCurrentPoint(year);
                }

                // Update title with smooth fade transition
                timelineContainer.select('.timeline-title')
                    .transition()
                    .duration(400)
                    .style('opacity', 0)
                    .transition()
                    .duration(400)
                    .text(`${timelineContainer.node().__displayName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate: ${value.toFixed(1)}%`)
                    .style('opacity', 1);
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