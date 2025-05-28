// Set up the SVG container
let width, height;
let svg, projection, path;
let unemploymentData = {};
let currentYear = 2000;
let unemploymentIsPlaying = false;
let unemploymentInterval;
let hoveredCountry = null;

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
    'Czechia': 'Czech Rep.',
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

// Set up timeline dimensions first
const timelineMargin = { top: 20, right: 25, bottom: 20, left: 35 };
const timelineWidth = 320;
const timelineHeight = 150;

// Color scale for unemployment rates
const unemploymentColorScale = d3.scaleSequential()
    .domain([0, 15])
    .interpolator(d3.interpolateYlOrRd);

// Initialize the map
function initMap() {
    const container = document.getElementById('unemployment-map-container');
    width = container.offsetWidth;
    height = container.offsetHeight;

    // Set up the SVG
    svg = d3.select('#unemployment-map-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create a projection
    projection = d3.geoMercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2]);

    // Create a path generator
    path = d3.geoPath().projection(projection);

    // Load world map data and unemployment data
    Promise.all([
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
        d3.csv('src/data/unemployment/unemployment.csv')
    ]).then(([worldData, unemploymentCSV]) => {
        // Process unemployment data
        unemploymentData = unemploymentCSV;
        
        // Debug: Print all country names from both datasets
        console.log('Map country names:', topojson.feature(worldData, worldData.objects.countries).features.map(f => f.properties.name));
        console.log('Unemployment country names:', unemploymentData.map(row => row['Country Name']));
        
        // Draw the map
        const countries = topojson.feature(worldData, worldData.objects.countries);
        
        svg.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', path)
            .on('mouseover', handleCountryHover)
            .on('mouseout', handleCountryMouseOut)
            .on('click', handleCountryClick);

        // Initial update
        updateMap(currentYear);
    });
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
            // Debug Egypt matching
            if (d.properties.name === 'Egypt') {
                console.log('Found Egypt in map data:', d.properties.name);
                console.log('Looking for Egypt in unemployment data...');
                const egyptData = unemploymentData.find(row => row['Country Name'] === '"Egypt, Arab Rep."');
                console.log('Egypt unemployment data:', egyptData);
                if (egyptData) {
                    console.log('Egypt unemployment value for year', year, ':', egyptData[year]);
                }
            }

            // Find the unemployment data entry that matches this map country
            const countryData = unemploymentData.find(row => {
                if (d.properties.name === 'Egypt') {
                    return row['Country Name'].includes('Egypt');
                }
                const mapName = d.properties.name;
                const unemploymentName = row['Country Name'].replace(/"/g, '');
                return mapName === normalizeCountryName(unemploymentName);
            });
            
            if (!countryData || !countryData[year] || isNaN(countryData[year])) {
                if (d.properties.name === 'Egypt') {
                    console.log('No data found for Egypt or data is invalid');
                }
                return '#ccc';
            }
            
            const value = parseFloat(countryData[year]);
            if (d.properties.name === 'Egypt') {
                console.log('Final unemployment value for Egypt:', value);
            }
            return unemploymentColorScale(Math.min(value, 15));
        });

    // Update timeline points if timeline is visible
    const timelineContainer = d3.select('.timeline-container');
    if (!timelineContainer.empty() && timelineContainer.style('display') !== 'none') {
        timelineContainer.selectAll('.timeline-point')
            .classed('current', d => d.year === currentYear);
    }

    // Update tooltip if a country is being hovered
    if (hoveredCountry) {
        updateTooltip();
    }
}

// Handle country hover
function handleCountryHover(event, d) {
    hoveredCountry = d;
    updateTooltip(event);
}

// Update tooltip content and position
function updateTooltip(event) {
    if (!hoveredCountry) return;

    // Find the unemployment data entry that matches this map country
    const countryData = unemploymentData.find(row => {
        if (hoveredCountry.properties.name === 'Egypt') {
            return row['Country Name'].includes('Egypt');
        }
        const mapName = hoveredCountry.properties.name;
        const unemploymentName = row['Country Name'].replace(/"/g, '');
        return mapName === normalizeCountryName(unemploymentName);
    });

    const tooltip = d3.select('#unemployment-tooltip');
    
    let content = hoveredCountry.properties.name;
    if (countryData && countryData[currentYear] && !isNaN(countryData[currentYear])) {
        content += `<br>Unemployment Rate (${currentYear}): ${parseFloat(countryData[currentYear]).toFixed(1)}%`;
    } else {
        content += '<br>No data available';
    }

    tooltip.html(content)
        .style('left', (event ? event.pageX + 10 : parseInt(tooltip.style('left'))) + 'px')
        .style('top', (event ? event.pageY - 28 : parseInt(tooltip.style('top'))) + 'px')
        .style('opacity', 1);

    d3.select(event ? event.currentTarget : null)
        .style('stroke-width', '1')
        .style('stroke', '#000');
}

// Handle country mouseout
function handleCountryMouseOut() {
    hoveredCountry = null;
    d3.select('#unemployment-tooltip')
        .style('opacity', 0);

    d3.select(this)
        .style('stroke-width', '0.5')
        .style('stroke', '#fff');
}

// Handle country click
function handleCountryClick(event, d) {
    // Find the unemployment data entry that matches this map country
    const countryData = unemploymentData.find(row => {
        if (d.properties.name === 'Egypt') {
            return row['Country Name'].includes('Egypt');
        }
        if (d.properties.name === 'United States of America') {
            return row['Country Name'] === 'United States';
        }
        const mapName = d.properties.name;
        const unemploymentName = row['Country Name'].replace(/"/g, '');
        return mapName === normalizeCountryName(unemploymentName);
    });

    if (!countryData) return;

    const timelineContainer = d3.select('.timeline-container');
    
    // If timeline is already shown for this country, hide it
    if (!timelineContainer.empty() && 
        timelineContainer.style('display') === 'block' && 
        timelineContainer.select('.timeline-title').text() === `${d.properties.name} Unemployment Rate`) {
        timelineContainer.style('display', 'none');
        return;
    }

    // Create timeline data
    const timelineData = Object.entries(countryData)
        .filter(([key]) => !isNaN(key) && key >= 2000 && key <= 2023) // Only use years between 2000 and 2023
        .map(([year, value]) => ({
            year: parseInt(year),
            value: parseFloat(value)
        }))
        .filter(d => !isNaN(d.value));

    showTimeline(d.properties.name, timelineData);
}

// Show timeline for country
function showTimeline(countryName, data) {
    const timelineContainer = d3.select('.timeline-container');
    if (timelineContainer.empty()) {
        // Create timeline container if it doesn't exist
        d3.select('#unemployment-map-container')
            .append('div')
            .attr('class', 'timeline-container')
            .style('left', '20px')
            .style('bottom', '20px');
    }

    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = 360;
    const height = 200;

    const x = d3.scaleLinear()
        .domain([2000, 2023]) // Fixed domain for consistent timeline
        .range([0, width - margin.left - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(15, d3.max(data, d => d.value))]) // Use at least 15 as max for consistency
        .range([height - margin.top - margin.bottom, 0]);

    const line = d3.line()
        .defined(d => !isNaN(d.value)) // Skip points with NaN values
        .x(d => x(d.year))
        .y(d => y(d.value));

    const timelineDiv = d3.select('.timeline-container')
        .style('display', 'block')
        .html('');

    timelineDiv.append('h3')
        .attr('class', 'timeline-title')
        .text(`${countryName} Unemployment Rate`);

    const svg = timelineDiv.append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));

    // Add line
    g.append('path')
        .datum(data)
        .attr('class', 'timeline-line')
        .attr('d', line);

    // Add points
    g.selectAll('.timeline-point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'timeline-point')
        .attr('cx', d => x(d.year))
        .attr('cy', d => y(d.value))
        .attr('r', 4)
        .classed('current', d => d.year === currentYear);
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
        width = document.getElementById('unemployment-map-container').offsetWidth;
        height = document.getElementById('unemployment-map-container').offsetHeight;
        
        svg.attr('width', width)
            .attr('height', height);

        projection.scale(width / 2 / Math.PI)
            .translate([width / 2, height / 2]);

        svg.selectAll('.country')
            .attr('d', path);
    });
}); 