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
let bankData = [];
let bankCircles;
let totalMoneyCounter = 0; // Add counter for total money
let counterTimeout = null;
let lastCounterValue = 0;
let isInCrisisMode = false;
let isTransitioning = false;
let crisisStartDate = new Date('2007-01-03'); // First bank failure
let crisisEndDate = new Date('2012-06-30');  // Last bank failure
const maxAmount = 560923828151; // Maximum cumulative amount from the data

// Set initial dimensions for a larger map
const initialWidth = Math.min(1600, window.innerWidth * 0.98);
const initialHeight = Math.min(800, window.innerHeight * 0.85);

// Country name mappings from unemployment data names to map names
const countryNameMappings = {
    'Egypt, Arab Rep.': 'Egypt',
    '"Egypt, Arab Rep."': 'Egypt',
    'United States': 'United States',
    'USA': 'United States',
    'United States of America': 'United States',
    'Russian Federation': 'Russia',
    'Democratic Republic of the Congo': 'Dem. Rep. Congo',
    'Congo, Dem. Rep.': 'Dem. Rep. Congo',
    '"Congo, Dem. Rep."': 'Dem. Rep. Congo',
    'Congo, Rep.': 'Congo',
    '"Congo, Rep."': 'Congo',
    'Dominican Republic': 'Dominican Rep.',
    'Western Sahara': 'W. Sahara',
    'Central African Republic': 'Central African Rep.',
    'South Sudan': 'S. Sudan',
    'Lao People\'s Democratic Republic': 'Lao PDR',
    'Czech Rep.': 'Czechia',
    'Bosnia and Herzegovina': 'Bosnia and Herz.',
    'Equatorial Guinea': 'Eq. Guinea',
    'Korea, Rep.': 'South Korea',
    '"Korea, Rep."': 'South Korea',
    'Korea, Dem. People\'s Rep.': 'North Korea',
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
    'Hong Kong SAR, China': 'Hong Kong',
    '"Hong Kong SAR, China"': 'Hong Kong',
    // Add reverse mappings
    'Egypt': 'Egypt',
    'Dem. Rep. Congo': 'Dem. Rep. Congo',
    'Congo': 'Congo'
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

// Add function to format large numbers
function formatMoney(amount) {
    if (amount >= 1e12) {
        return `$${(amount / 1e12).toFixed(1)}T`;
    } else if (amount >= 1e9) {
        return `$${(amount / 1e9).toFixed(1)}B`;
    } else if (amount >= 1e6) {
        return `$${(amount / 1e6).toFixed(1)}M`;
    } else {
        return `$${amount.toFixed(0)}`;
    }
}

// Initialize the map
function initMap() {
    const container = document.getElementById('unemployment-map-container');
    width = initialWidth;
    height = initialHeight;

    // Remove any existing legends and scales
    d3.selectAll('.unemployment-legend-container').remove();
    d3.selectAll('.unemployment-legend-scale').remove();
    d3.selectAll('.unemployment-legend-title').remove();
    d3.selectAll('.unemployment-legend-labels').remove();

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

    // Adjust projection scale and translation for better fit
    projection = d3.geoMercator()
        .scale((width / 2.3) / Math.PI)
        .translate([width / 2, height / 1.8]);

    // Create a path generator
    path = d3.geoPath().projection(projection);

    // Add event listener for the switch
    document.getElementById('data-type-toggle').addEventListener('change', function(e) {
        isShowingGDP = e.target.checked;
        
        // Update the timeline if it exists
        const timelineContainer = d3.select('.timeline-container');
        if (!timelineContainer.empty()) {
            const countryName = timelineContainer.node().__countryName;
            const dataset = isShowingGDP ? gdpData : unemploymentData;
            const countryData = dataset.find(row => {
                const dataName = row['Country Name'].replace(/"/g, '').trim();
                return normalizeCountryName(dataName) === normalizeCountryName(countryName);
            });

            // Check if we have data for this country in the new mode
            const hasData = countryData && Object.keys(countryData)
                .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023)
                .some(year => !isNaN(parseFloat(countryData[year])));

            if (!hasData) {
                // If no data available in the new mode, remove the timeline
                timelineContainer.remove();
            } else {
                showTimeline(countryName, countryData);
            }
        }
        
        createScale();
        updateMap(currentYear);
    });

    // Load world map data and both datasets
    Promise.all([
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
        d3.csv('src/data/unemployment/unemployment.csv'),
        d3.csv('src/data/gdp_growth_rate.csv'),
        loadBankData()
    ]).then(([worldData, unemploymentCSV, gdpCSV, bankDataCSV]) => {
        // Process data
        unemploymentData = unemploymentCSV;
        gdpData = gdpCSV;
        bankData = bankDataCSV;
        
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

        // Create a group for bank circles
        bankCircles = svg.append('g')
            .attr('class', 'bank-circles');

        // Create initial scale
        createScale();

        // Initial update
        updateMap(currentYear);
    });
}

// Update tooltip based on mode
function updateTooltip(event) {
    if (!hoveredCountry) return;

    const tooltip = d3.select('#unemployment-tooltip');
    
    if (isInCrisisMode) {
        // In crisis mode, only show country name
        tooltip
            .style('opacity', 1)
            .style('left', (event ? event.pageX + 10 : tooltip.node().offsetLeft) + 'px')
            .style('top', (event ? event.pageY - 28 : tooltip.node().offsetTop) + 'px')
            .html(`<strong>${hoveredCountry}</strong>`);
    } else {
        // In normal mode, show full data
        const dataset = isShowingGDP ? gdpData : unemploymentData;
        const normalizedHoveredCountry = normalizeCountryName(hoveredCountry);
        const countryData = dataset.find(row => {
            const dataName = row['Country Name'].replace(/"/g, '').trim();
            return normalizeCountryName(dataName) === normalizedHoveredCountry;
        });

        if (countryData && countryData[Math.floor(currentYear)] && !isNaN(countryData[Math.floor(currentYear)])) {
            const value = parseFloat(countryData[Math.floor(currentYear)]).toFixed(2);
            tooltip
                .style('opacity', 1)
                .style('left', (event ? event.pageX + 10 : tooltip.node().offsetLeft) + 'px')
                .style('top', (event ? event.pageY - 28 : tooltip.node().offsetTop) + 'px')
                .html(`
                    <strong>${hoveredCountry}</strong><br>
                    Year: ${Math.floor(currentYear)}<br>
                    ${isShowingGDP ? 'GDP Growth' : 'Unemployment'}: ${value}%
                `);
        } else {
            tooltip
                .style('opacity', 1)
                .style('left', (event ? event.pageX + 10 : tooltip.node().offsetLeft) + 'px')
                .style('top', (event ? event.pageY - 28 : tooltip.node().offsetTop) + 'px')
                .html(`
                    <strong>${hoveredCountry}</strong><br>
                    Year: ${Math.floor(currentYear)}<br>
                    No data available
                `);
        }
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

    // Check if we have data for this country
    const hasData = Object.keys(data)
        .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023)
        .some(year => !isNaN(parseFloat(data[year])));

    if (!hasData) {
        // If no data available, don't show timeline
        return;
    }

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

    // Add title without percentage
    timelineContainer.append('div')
        .attr('class', 'timeline-title')
        .style('font-weight', 'bold')
        .style('color', 'white')
        .text(`${displayName} ${isShowingGDP ? 'GDP Growth' : 'Unemployment'} Rate`);

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
        const yearInt = Math.floor(year);
        const yearData = timelineData.find(d => d[0] === yearInt);
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
    document.getElementById('unemployment-year-display').textContent = formatYearDisplay(year);
    document.getElementById('unemployment-year-slider').value = Math.floor(year);

    // Update total money counter in crisis mode
    if (isInCrisisMode && !isTransitioning) {
        const currentDate = new Date(crisisStartDate.getTime() + ((year - 2007) * 12) * (30.44 * 24 * 60 * 60 * 1000));
        const totalAmount = bankData
            .filter(d => new Date(d.date) <= currentDate)
            .reduce((sum, d) => sum + d.amount, 0);
        
        const counterDiv = document.getElementById('total-money-counter');
        if (counterDiv) {
            counterDiv.innerHTML = `Total Bank Failures: <span style="color: #ff4444">${formatMoney(totalAmount)}</span>`;
        }
    }

    // Only show money counter in crisis mode
    const counterDisplay = document.getElementById('bank-failure-counter');
    if (counterDisplay) {
        if (isInCrisisMode && !isTransitioning) {
            const currentDate = new Date(crisisStartDate.getTime() + ((year - 2007) * 12) * (30.44 * 24 * 60 * 60 * 1000));
            totalMoneyCounter = bankData
                .filter(d => new Date(d.date) <= currentDate)
                .reduce((sum, d) => sum + d.amount, 0);

            if (totalMoneyCounter !== lastCounterValue) {
                const formattedMoney = formatMoney(totalMoneyCounter);
                counterDisplay.innerHTML = `Total Bank Failures: <span style="color: #ff4444">${formattedMoney}</span>`;
                counterDisplay.style.opacity = '1';
                lastCounterValue = totalMoneyCounter;
            }
        } else {
            counterDisplay.style.opacity = '0';
        }
    }

    if (!isInCrisisMode && !isTransitioning) {
        const dataset = isShowingGDP ? gdpData : unemploymentData;
        const colorScale = isShowingGDP ? gdpColorScale : unemploymentColorScale;

        const countryDataMap = new Map();
        dataset.forEach(row => {
            const dataName = row['Country Name'].replace(/"/g, '').trim();
            const normalizedName = normalizeCountryName(dataName);
            countryDataMap.set(normalizedName, row);
        });

        svg.selectAll('.country')
            .transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .style('fill', d => {
                const normalizedMapName = normalizeCountryName(d.properties.name);
                const countryData = countryDataMap.get(normalizedMapName);
                
                if (!countryData || !countryData[Math.floor(year)] || isNaN(countryData[Math.floor(year)])) {
                    return '#2d3436';
                }
                
                const value = parseFloat(countryData[Math.floor(year)]);
                return colorScale(value);
            })
            .style('stroke', '#dfe6e9')
            .style('stroke-width', '1.2px');
    }

    // Only update bank circles in crisis mode
    if (isInCrisisMode && !isTransitioning) {
        const currentDate = new Date(crisisStartDate.getTime() + ((year - 2007) * 12) * (30.44 * 24 * 60 * 60 * 1000));
        
        // Update all bank groups
        const bankGroups = bankCircles.selectAll('.bank-group');
        
        // First pass: calculate new amounts and update circles
        bankGroups.each(function(d) {
            const newAmount = d.amounts.reduce((sum, amount, i) => {
                return d.dates[i] <= currentDate ? sum + amount : sum;
            }, 0);
            
            // Only update if amount has changed
            if (newAmount !== d.currentAmount) {
                const group = d3.select(this);
                const prevAmount = d.currentAmount;
                d.currentAmount = newAmount;

                // Update circle with smooth transition
                group.select('circle')
                    .transition()
                    .duration(750)
                    .ease(d3.easeCubicInOut)
                    .style('opacity', newAmount > 0 ? 0.8 : 0)
                    .attr('r', newAmount > 0 ? 
                        (d.isGroup ? Math.sqrt(newAmount / maxAmount) * 70 : Math.sqrt(newAmount / maxAmount) * 50) : 0);

                // Only animate number from previous amount to new amount
                if (newAmount > 0) {
                    const label = group.select('.amount-label');
                    const i = d3.interpolateNumber(prevAmount || 0, newAmount);
                    
                    label.transition()
                        .duration(750)
                        .ease(d3.easeCubicInOut)
                        .style('opacity', 1)
                        .tween('text', function() {
                            return function(t) {
                                const formattedAmount = formatAmountLabel(i(t));
                                this.textContent = d.isGroup ? 
                                    `${d.groupName}: ${formattedAmount}` : 
                                    `${d.countryName}: ${formattedAmount}`;
                            };
                        });

                    group.select('.label-background')
                        .transition()
                        .duration(750)
                        .style('opacity', 1);
                }
            }
        });

        // Second pass: handle label positioning
        bankGroups.each(function(d1) {
            if (d1.currentAmount > 0) {
                const group = d3.select(this);
                const label = group.select('.amount-label');
                const background = group.select('.label-background');
                
                if (d1.isGroup) {
                    // Position group labels below the circle
                    const labelWidth = label.node().getComputedTextLength();
                    const circleRadius = Math.sqrt(d1.currentAmount / maxAmount) * 70;
                    
                    label
                        .attr('x', -labelWidth / 2)
                        .attr('y', circleRadius + 25);
                    
                    background
                        .attr('x', -labelWidth / 2 - 5)
                        .attr('y', circleRadius + 10)
                        .attr('width', labelWidth + 10);
                } else {
                    // Position non-group labels to the right of circle
                    const labelWidth = label.node().getComputedTextLength();
                    const circleRadius = Math.sqrt(d1.currentAmount / maxAmount) * 50;
                    
                    label
                        .attr('x', circleRadius + 10)
                        .attr('y', 5); // Adjusted to better center the text
                    
                    background
                        .attr('x', circleRadius + 5)
                        .attr('y', -10)
                        .attr('width', labelWidth + 10)
                        .attr('height', 24); // Fixed height for background
                }
            }
        });
    }

    // Update timeline if it exists and not in transition
    const timelineContainer = d3.select('.timeline-container');
    if (!isTransitioning && !timelineContainer.empty() && timelineContainer.style('display') !== 'none') {
        const updateCurrentPoint = timelineContainer.node().__updateCurrentPoint;
        if (updateCurrentPoint) {
            updateCurrentPoint(Math.floor(year));
        }
    }

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
    if (isInCrisisMode) {
        // In crisis mode, just show country name
        const tooltip = d3.select('#unemployment-tooltip');
        tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .html(`<strong>${d.properties.name}</strong>`);
        
        setTimeout(() => {
            tooltip.style('opacity', 0);
        }, 2000);
        return;
    }

    const countryName = d.properties.name;
    const dataset = isShowingGDP ? gdpData : unemploymentData;
    
    // Try different name variations to find the country data
    const countryData = dataset.find(row => {
        const dataName = row['Country Name'].replace(/"/g, '').trim();
        const normalizedDataName = normalizeCountryName(dataName);
        const normalizedClickedName = normalizeCountryName(countryName);
        return normalizedDataName === normalizedClickedName;
    });

    // Check if we have actual data for this country
    const hasData = countryData && Object.keys(countryData)
        .filter(key => !isNaN(key) && parseInt(key) >= 2000 && parseInt(key) <= 2023)
        .some(year => !isNaN(parseFloat(countryData[year])));

    if (!hasData) {
        // If no data available, remove any existing timeline and show a tooltip
        d3.select('.timeline-container').remove();
        const tooltip = d3.select('#unemployment-tooltip');
        tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .html(`<strong>${countryName}</strong><br>No ${isShowingGDP ? 'GDP' : 'unemployment'} data available`);
        
        setTimeout(() => {
            tooltip.style('opacity', 0);
        }, 2000);
        return;
    }

    const existingTimeline = d3.select('.timeline-container');
    const isCurrentCountry = !existingTimeline.empty() && 
        normalizeCountryName(existingTimeline.node().__countryName) === normalizeCountryName(countryName);

    // If clicking the same country, toggle the timeline
    if (isCurrentCountry) {
        const isVisible = existingTimeline.style('display') !== 'none';
        existingTimeline.style('display', isVisible ? 'none' : 'block');
        return;
    }

    // Show timeline with the data
    showTimeline(countryName, countryData);
}

// Play/pause animation
function toggleUnemploymentPlay() {
    const button = document.getElementById('unemployment-play-button');
    const icon = button.querySelector('i');

    if (unemploymentIsPlaying) {
        clearInterval(unemploymentInterval);
        icon.className = 'fas fa-play';
    } else {
        let lastTime = Date.now();
        
        unemploymentInterval = setInterval(() => {
            if (isTransitioning) return;
            
            const currentTime = Date.now();
            const elapsed = currentTime - lastTime;

            // Different intervals for different modes
            const requiredInterval = isInCrisisMode ? 300 : 800; // Speed up crisis mode further (from 450 to 300)
            
            if (elapsed < requiredInterval) return;
            lastTime = currentTime;

            if (isInCrisisMode) {
                const currentDate = new Date(crisisStartDate.getTime() + ((currentYear - 2007) * 12) * (30.44 * 24 * 60 * 60 * 1000));
                
                if (currentDate >= crisisEndDate) {
                    exitCrisisMode();
                    return;
                }
                
                currentYear += 1/12; // One month increment in crisis mode
            } else {
                if (Math.floor(currentYear) === 2007 && !isInCrisisMode) {
                    showCrisisAlert();
                    return;
                }
                currentYear += 1; // Full year increment in normal mode
                if (currentYear >= 2023) currentYear = 2000;
            }
            updateMap(currentYear);
        }, 100);
        icon.className = 'fas fa-pause';
    }
    unemploymentIsPlaying = !unemploymentIsPlaying;
}

// Simplify year display function
function formatYearDisplay(year) {
    if (isInCrisisMode) {
        const date = new Date(crisisStartDate.getTime() + ((year - 2007) * 12) * (30.44 * 24 * 60 * 60 * 1000));
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
        return Math.floor(year).toString();
    }
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
            
            const year = parseInt(e.target.value);
            if (isInCrisisMode) {
                // In crisis mode, convert slider year to appropriate crisis year
                const normalizedYear = Math.max(2007, Math.min(2012, year));
                currentYear = normalizedYear;
                updateMap(currentYear);
            } else {
                currentYear = year;
                updateMap(currentYear);
            }
        });

    // Handle window resize
    window.addEventListener('resize', () => {
        width = Math.min(1600, window.innerWidth * 0.98);
        height = Math.min(800, window.innerHeight * 0.85);
        
        svg.attr('width', width)
            .attr('height', height);

        projection
            .scale((width / 2.3) / Math.PI)
            .translate([width / 2, height / 1.8]);

        svg.selectAll('.country')
            .attr('d', path);

        if (bankCircles) {
            bankCircles.selectAll('circle')
                .attr('cx', d => projection([d.lon, d.lat])[0])
                .attr('cy', d => projection([d.lon, d.lat])[1]);
        }

        // Recreate scale on resize
        if (!isInCrisisMode) {
            createScale();
        }
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

// Modify loadBankData function
function loadBankData() {
    const csvData = `date;lat;lon;amount;cumulative_amount_by_location
2008-10-09;-25.274398;133.775136;1900000000;1900000000
2009-05-08;6.42375;-66.58973;2367319303;2367319303
2009-05-22;6.42375;-66.58973;2367319303;4734638606
2009-12-18;12.879721;121.774017;230000000;230000000
2011-03-17;12.879721;121.774017;2367319303;2597319303
2012-04-27;12.879721;121.774017;19000000000;21597319303
2009-02-21;17.060816;-61.796428;2367319303;2367319303
2007-02-21;35.126413;33.429859;2367319303;2367319303
2007-01-03;37.09024;-95.712891;2367319303;2367319303
2007-01-29;37.09024;-95.712891;2367319303;4734638606
2007-04-02;37.09024;-95.712891;2367319303;7101957909
2007-08-06;37.09024;-95.712891;2367319303;9469277212
2007-08-31;37.09024;-95.712891;14000000;9483277212
2007-09-28;37.09024;-95.712891;70000000000;79483277212
2008-04-01;37.09024;-95.712891;51000000;79534277212
2008-07-01;37.09024;-95.712891;1260000000;80794277212
2008-09-05;37.09024;-95.712891;200000000000;280794277212
2008-09-07;37.09024;-95.712891;7100000000;287894277212
2008-09-14;37.09024;-95.712891;182000000000;469894277212
2008-09-16;37.09024;-95.712891;1300000000;471194277212
2008-09-17;37.09024;-95.712891;21850000000;493044277212
2008-09-26;37.09024;-95.712891;600000000;493644277212
2008-09-26;37.09024;-95.712891;612000000;494256277212
2008-10-03;37.09024;-95.712891;2367319303;496623596515
2008-10-13;37.09024;-95.712891;20000000000;516623596515
2008-10-24;37.09024;-95.712891;8500000000;525123596515
2008-10-24;37.09024;-95.712891;6305000000;531428596515
2008-11-21;37.09024;-95.712891;2367319303;533795915818
2009-01-10;37.09024;-95.712891;2367319303;536163235121
2009-03-02;37.09024;-95.712891;2367319303;538530554424
2009-04-10;37.09024;-95.712891;2367319303;540897873727
2009-04-10;37.09024;-95.712891;2367319303;543265193030
2009-04-17;37.09024;-95.712891;216600000;543481793030
2009-04-24;37.09024;-95.712891;111000000;543592793030
2009-08-14;37.09024;-95.712891;2367319303;545960112333
2009-08-21;37.09024;-95.712891;2367319303;548327431636
2009-09-25;37.09024;-95.712891;2367319303;550694750939
2009-10-30;37.09024;-95.712891;2367319303;553062070242
2009-12-04;37.09024;-95.712891;2367319303;555429389545
2009-12-18;37.09024;-95.712891;2367319303;557796708848
2010-04-30;37.09024;-95.712891;550000000;558346708848
2010-11-08;37.09024;-95.712891;191800000;558538508848
2011-10-31;37.09024;-95.712891;2367319303;560905828151
2011-11-23;37.09024;-95.712891;18000000;560923828151
2012-06-11;37.09024;-95.712891;2367319303;563291147454
2008-11-02;39.399872;-8.224454;2367319303;2367319303
2010-04-15;39.399872;-8.224454;2367319303;4734638606
2010-05-24;40.463667;-3.74922;2367319303;2367319303
2011-09-30;40.463667;-3.74922;43000000000;45367319303
2012-05-25;40.463667;-3.74922;2367319303;47734638606
2008-10-17;46.818188;8.227512;376000000;376000000
2009-05-28;47.516231;14.550072;2367319303;2367319303
2009-10-05;47.516231;14.550072;2367319303;4734638606
2009-02-03;48.019573;66.923684;2367319303;2367319303
2009-02-03;48.019573;66.923684;2367319303;4734638606
2008-09-30;50.503887;4.469936;15000000000;15000000000
2008-01-01;51.165691;10.451526;2367319303;2367319303
2009-05-11;51.165691;10.451526;1050000000;3417319303
2009-12-14;51.165691;10.451526;5000000000;8417319303
2012-06-30;51.165691;10.451526;2367319303;10784638606
2007-10-09;52.132633;5.291266;328000000;328000000
2008-09-28;52.132633;5.291266;2367319303;2695319303
2009-10-21;52.132633;5.291266;2367319303;5062638606
2009-01-15;53.41291;-8.24389;2100000000;2100000000
2008-02-22;55.378051;-3.435973;2200000000;2200000000
2008-06-07;55.378051;-3.435973;4000000000;6200000000
2008-07-14;55.378051;-3.435973;896800000;7096800000
2008-09-08;55.378051;-3.435973;4900000000;11996800000
2008-09-08;55.378051;-3.435973;44000000000;55996800000
2008-09-18;55.378051;-3.435973;1900000000;57896800000
2008-09-28;55.378051;-3.435973;11200000000;69096800000
2008-10-13;55.378051;-3.435973;13000000000;82096800000
2008-10-13;55.378051;-3.435973;4000000000;86096800000
2008-10-13;55.378051;-3.435973;59200000000;145296800000
2008-10-22;55.378051;-3.435973;5580000000;150876800000
2008-11-01;55.378051;-3.435973;13900000000;164776800000
2008-11-04;55.378051;-3.435973;2367319303;167144119303
2009-03-09;55.378051;-3.435973;2367319303;169511438606
2010-02-24;55.378051;-3.435973;41000000;169552438606
2008-08-26;56.26392;9.501785;2367319303;2367319303
2008-11-08;56.879635;24.603189;2367319303;2367319303
2008-10-07;64.963051;-19.020835;2367319303;2367319303
2008-10-08;64.963051;-19.020835;1140000000;3507319303
2008-10-09;64.963051;-19.020835;1200000000;4707319303
2009-03-09;64.963051;-19.020835;2367319303;7074638606`;

    return Promise.resolve(d3.dsvFormat(';').parse(csvData).map(d => ({
        date: new Date(d.date),
        lat: +d.lat,
        lon: +d.lon,
        amount: +d.amount,
        cumulative: +d.cumulative_amount_by_location
    })));
}

// Add function to show crisis alert
function showCrisisAlert() {
    isTransitioning = true;
    
    // Fade out existing elements
    svg.selectAll('.country')
        .transition()
        .duration(1000)
        .style('fill', '#2d3436');
    
    bankCircles.selectAll('circle').remove();
    d3.select('.timeline-container').remove();

    const alertDiv = document.createElement('div');
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '50%';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translate(-50%, -50%)';
    alertDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
    alertDiv.style.color = 'white';
    alertDiv.style.padding = '30px';
    alertDiv.style.borderRadius = '10px';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.zIndex = '1000';
    alertDiv.style.fontSize = '28px';
    alertDiv.style.fontWeight = 'bold';
    alertDiv.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.7)';
    alertDiv.style.border = '2px solid white';
    alertDiv.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 15px;">⚠️ FINANCIAL CRISIS ALERT ⚠️</div>
        <div>First Bank Failure Detected</div>
        <div style="font-size: 20px; margin-top: 15px;">January 2007</div>
    `;
    document.body.appendChild(alertDiv);

    // Flash effect
    let opacity = 1;
    const flash = setInterval(() => {
        opacity = opacity === 1 ? 0.5 : 1;
        alertDiv.style.opacity = opacity;
    }, 500);

    setTimeout(() => {
        clearInterval(flash);
        alertDiv.remove();
        enterCrisisMode();
    }, 3000);
}

// Add region grouping logic
function getRegion(lat, lon) {
    // Define European region bounds (approximate)
    if (lat > 35 && lat < 70 && lon > -25 && lon < 40) {
        return 'Europe';
    }
    return null; // No specific region
}

function aggregateBankDataByLocation(data) {
    const aggregated = new Map();
    const europeGroup = {
        lat: 54,
        lon: 15,
        dates: [],
        amounts: [],
        currentAmount: 0,
        isGroup: true,
        groupName: 'Europe'
    };
    
    // Create a function to get country name from coordinates
    function getCountryName(lat, lon) {
        // Special cases for specific coordinates
        if (lat === 37.09024 && lon === -95.712891) return 'United States';
        if (lat === 6.42375 && lon === -66.58973) return 'Venezuela';
        if (lat === 17.060816 && lon === -61.796428) return 'Puerto Rico';
        
        // Try to find country name from map
        let countryName = null;
        svg.selectAll('.country').each(function(country) {
            const [x, y] = projection([lon, lat]);
            const bounds = path.bounds(country);
            if (x >= bounds[0][0] && x <= bounds[1][0] && 
                y >= bounds[0][1] && y <= bounds[1][1]) {
                countryName = country.properties.name;
            }
        });
        
        // If no match found, return Puerto Rico as default
        return countryName || 'Puerto Rico';
    }
    
    data.forEach(d => {
        const region = getRegion(d.lat, d.lon);
        
        if (region === 'Europe') {
            europeGroup.dates.push(new Date(d.date));
            europeGroup.amounts.push(d.amount);
        } else {
            const key = `${d.lat},${d.lon}`;
            if (!aggregated.has(key)) {
                const countryName = getCountryName(d.lat, d.lon);
                aggregated.set(key, {
                    lat: d.lat,
                    lon: d.lon,
                    dates: [],
                    amounts: [],
                    currentAmount: 0,
                    isGroup: false,
                    countryName: countryName
                });
            }
            const location = aggregated.get(key);
            location.dates.push(new Date(d.date));
            location.amounts.push(d.amount);
        }
    });
    
    if (europeGroup.dates.length > 0) {
        aggregated.set('Europe', europeGroup);
    }
    
    return Array.from(aggregated.values());
}

function enterCrisisMode() {
    isInCrisisMode = true;
    
    // Hide both the toggle and remove the scale
    document.getElementById('data-type-toggle').parentElement.style.display = 'none';
    d3.select('.map-scale').remove();

    // Add total money counter
    const counterDiv = document.createElement('div');
    counterDiv.id = 'total-money-counter';
    counterDiv.style.position = 'absolute';
    counterDiv.style.top = '20px';
    counterDiv.style.right = '20px';
    counterDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    counterDiv.style.color = 'white';
    counterDiv.style.padding = '15px';
    counterDiv.style.borderRadius = '8px';
    counterDiv.style.fontFamily = 'monospace';
    counterDiv.style.fontSize = '16px';
    counterDiv.style.fontWeight = 'bold';
    counterDiv.style.zIndex = '1000';
    counterDiv.innerHTML = 'Total Bank Failures: $0';
    document.getElementById('unemployment-map-container').appendChild(counterDiv);
    
    // Aggregate bank data by location
    const aggregatedBankData = aggregateBankDataByLocation(bankData);

    // Create a group for each unique bank location
    const bankGroups = bankCircles.selectAll('g')
        .data(aggregatedBankData)
        .enter()
        .append('g')
        .attr('class', d => d.isGroup ? 'bank-group region-group' : 'bank-group')
        .attr('transform', d => `translate(${projection([d.lon, d.lat])[0]},${projection([d.lon, d.lat])[1]})`);

    // Add circles to groups
    bankGroups.append('circle')
        .attr('r', 0)
        .style('fill', d => d.isGroup ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)')
        .style('stroke', 'red')
        .style('stroke-width', d => d.isGroup ? 3 : 2)
        .style('opacity', 0);

    // Add label background for better visibility
    bankGroups.append('rect')
        .attr('class', 'label-background')
        .attr('width', 0)
        .attr('height', 24)
        .attr('fill', 'rgba(0, 0, 0, 0.7)')
        .attr('rx', 4)
        .style('opacity', 0);

    // Add labels to groups
    bankGroups.append('text')
        .attr('class', 'amount-label')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-family', 'monospace')
        .style('font-size', d => d.isGroup ? '16px' : '14px')
        .style('opacity', 0)
        .style('pointer-events', 'none')
        .text(d => d.isGroup ? `${d.groupName}: $0` : (d.countryName + ': $0'));

    currentYear = 2007;
    isTransitioning = false;
    updateMap(currentYear);
}

// Function to exit crisis mode
function exitCrisisMode() {
    isTransitioning = true;
    
    // Remove the total money counter
    const counterDiv = document.getElementById('total-money-counter');
    if (counterDiv) {
        counterDiv.remove();
    }
    
    // Fade out crisis mode elements
    bankCircles.selectAll('.bank-group')
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .remove();

    // Show the toggle
    document.getElementById('data-type-toggle').parentElement.style.display = 'block';

    setTimeout(() => {
        isInCrisisMode = false;
        currentYear = 2013;
        isTransitioning = false;
        createScale();
        updateMap(currentYear);
    }, 1000);
}

// Add function to format amounts for labels
function formatAmountLabel(amount) {
    if (amount >= 1e12) {
        return `${(amount / 1e12).toFixed(1)}T`;
    } else if (amount >= 1e9) {
        return `${(amount / 1e9).toFixed(1)}B`;
    } else if (amount >= 1e6) {
        return `${(amount / 1e6).toFixed(1)}M`;
    } else {
        return `${(amount / 1e3).toFixed(0)}K`;
    }
}

// Add this after initMap function definition
function createScale() {
    // Remove any existing scale
    d3.select('.map-scale').remove();

    if (isInCrisisMode) return; // Don't show scale in crisis mode

    const scaleWidth = 180;
    const scaleHeight = 15;
    
    const scale = d3.select('#unemployment-map-container')
        .append('div')
        .attr('class', 'map-scale')
        .style('position', 'absolute')
        .style('right', '20px')
        .style('bottom', '20px')
        .style('background', 'rgba(0, 0, 0, 0.7)')
        .style('padding', '12px')
        .style('border-radius', '8px')
        .style('z-index', '1000');

    // Add title
    scale.append('div')
        .style('color', 'white')
        .style('font-size', '14px')
        .style('margin-bottom', '8px')
        .style('text-align', 'center')
        .text(isShowingGDP ? 'GDP Growth Rate (%)' : 'Unemployment Rate (%)');

    // Create SVG for gradient
    const svg = scale.append('svg')
        .attr('width', scaleWidth)
        .attr('height', scaleHeight);

    // Create gradient
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'scale-gradient')
        .attr('x1', '0%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '0%');

    if (isShowingGDP) {
        // GDP gradient stops
        gradient.selectAll('stop')
            .data([
                {offset: '0%', color: '#e31a1c'},
                {offset: '25%', color: '#fd8d3c'},
                {offset: '50%', color: '#ffffbf'},
                {offset: '75%', color: '#78c679'},
                {offset: '100%', color: '#33a02c'}
            ])
            .enter()
            .append('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);
    } else {
        // Unemployment gradient stops
        gradient.selectAll('stop')
            .data([
                {offset: '0%', color: '#4575b4'},
                {offset: '100%', color: '#d73027'}
            ])
            .enter()
            .append('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);
    }

    // Add gradient rectangle
    svg.append('rect')
        .attr('width', scaleWidth)
        .attr('height', scaleHeight)
        .style('fill', 'url(#scale-gradient)')
        .style('stroke', 'rgba(255, 255, 255, 0.3)')
        .style('stroke-width', '1px');

    // Add labels
    const labels = scale.append('div')
        .style('display', 'flex')
        .style('justify-content', 'space-between')
        .style('margin-top', '4px')
        .style('color', 'white')
        .style('font-size', '12px');

    if (isShowingGDP) {
        labels.html('<span>-10%</span><span>0%</span><span>+10%</span>');
    } else {
        labels.html('<span>0%</span><span>7.5%</span><span>15%</span>');
    }
} 