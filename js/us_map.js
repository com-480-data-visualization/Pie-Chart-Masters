// js/us_map.js
// Requires D3 v7+ and TopoJSON

const colorScale = d3.scaleThreshold()
    .domain([1, 2, 3, 4, 5])
    .range(["#e0e7f4", "#b3c6e0", "#7fa1c1", "#3b6ea5", "#1a4173", "#0d1b2a"]);

const legendLabels = ["0-1%", "1-2%", "2-3%", "3-4%", "4-5%", "5%+"];

// Store data globally
let mapData = null;



document.addEventListener('DOMContentLoaded', function() {
    const container = d3.select('.us-map-container');
    const width = 900, height = 550;
    // Tooltip
    const tooltip = container.append('div')
        .attr('class', 'us-map-tooltip');

    // SVG
    const svg = container.append('svg')
        .attr('viewBox', '0 0 900 550');

    // Initialize variables for animation
    let isPlaying = false;
    let playInterval;
    let currentDateIndex = 0;
    let dates = [];

    // Function to format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const months = {
            '01': 'January', '02': 'February', '03': 'March', '04': 'April',
            '05': 'Mai', '06': 'June', '07': 'July', '08': 'August',
            '09': 'September', '10': 'October', '11': 'November', '12': 'December'
        };
        const month = months[dateStr.substring(5, 7)];
        const year = dateStr.substring(0, 4);
        return `${month} ${year}`;
    };

    // Function to update map for a specific date
    function updateMap(date) {
        const dataMap = {};
        mapData.forEach(d => {
            dataMap[d.state] = +d.values[date];
        });

        svg.selectAll('path')
            .transition()
            .duration(500)
            .attr('fill', d => {
                const val = dataMap[d.properties.name];
                return val != null ? colorScale(val) : "#eee";
            });
    }

    // Function to start playback
    function startPlayback() {
        playInterval = setInterval(() => {
            currentDateIndex = (currentDateIndex + 1) % dates.length;
            const date = dates[currentDateIndex];
            updateMap(date);
            d3.select('#map-slider-container .um-slider').property('value', currentDateIndex);
            d3.select('.um-date-display').text(formatDate(date));
        }, 1000);
    }

    // Load US map and data
    Promise.all([
        d3.json('src/data/others/USA_states_svg.json'),
        d3.json('src/data/mortgage/clean/mortgage_delinquency_by_state.json')
    ]).then(([us, data]) => {
        // Store data globally
        mapData = data;

        // Get all available dates
        dates = Object.keys(data[0].values).sort();
        currentDateIndex = dates.length - 1; // Start with the latest date

        // Initialize slider
        const slider = d3.select('#map-slider-container .um-slider')
            .attr('min', 0)
            .attr('max', dates.length - 1)
            .attr('value', currentDateIndex);

        // Set initial date display
        d3.select('.um-date-display').text(formatDate(dates[currentDateIndex]));

        // Build initial data map
        const dataMap = {};
        data.forEach(d => {
            dataMap[d.state] = +d.values[dates[currentDateIndex]];
        });

        // Convert TopoJSON to GeoJSON
        const states = topojson.feature(us, us.objects.states).features;

        // Projection
        const projection = d3.geoAlbersUsa().fitSize([width, height], {type: "FeatureCollection", features: states});
        const path = d3.geoPath().projection(projection);

        // Draw states
        svg.selectAll('path')
            .data(states)
            .join('path')
            .attr('d', path)
            .attr('fill', d => {
                const val = dataMap[d.properties.name];
                return val != null ? colorScale(val) : "#eee";
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mousemove', function(event, d) {
                const val = dataMap[d.properties.name];
                tooltip
                    .style('display', 'block')
                    .style('left', (event.offsetX + 20) + 'px')
                    .style('top', (event.offsetY + 20) + 'px')
                    .html(`<strong>${d.properties.name}</strong><br>
                        ${val != null ? (val.toFixed(2) + '% delinquent') : 'No data'}`);
                d3.select(this).attr('stroke', '#ff0000').attr('stroke-width', 2);
            })
            .on('mouseleave', function() {
                tooltip.style('display', 'none');
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
            });

        // Paramètres
        const legendWidth = 350;
        const legendHeight = 18;
        const legendMargin = {top: 10, right: 10, bottom: 30, left: 10};
        const nSegments = colorScale.range().length;
        const segmentWidth = legendWidth / nSegments;

        // Sélectionne le conteneur dédié à la légende
        const legendContainer = d3.select('#us-map-legend-container');
        legendContainer.selectAll('*').remove(); // Vide l'ancien contenu si besoin

        // Ajoute la nouvelle légende
        const legendSvg = legendContainer.append('svg')
            .attr('class', 'us-map-legend')
            .attr('width', legendWidth + legendMargin.left + legendMargin.right)
            .attr('height', legendHeight + legendMargin.top + legendMargin.bottom);

        // Segments de couleur
        colorScale.range().forEach((color, i) => {
            legendSvg.append('rect')
                .attr('x', legendMargin.left + i * segmentWidth)
                .attr('y', legendMargin.top)
                .attr('width', segmentWidth)
                .attr('height', legendHeight)
                .attr('fill', color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1);
        });

        // Ticks et labels
        const tickLabels = ["0-1%", "1-2%", "2-3%", "3-4%", "4-5%", "5%+"];

        tickLabels.forEach((label, i) => {
            legendSvg.append('text')
                .attr('class', 'legend-label')
                .attr('x', legendMargin.left + i * segmentWidth + segmentWidth / 2)
                .attr('y', legendMargin.top + legendHeight + 18)
                .attr('text-anchor', 'middle')
                .text(label);
        });

        // Handle slider input
        slider.on('input', function() {
            currentDateIndex = +this.value;
            const date = dates[currentDateIndex];
            updateMap(date);
            d3.select('.um-date-display').text(formatDate(date));
        });

        // Handle play button
        d3.select('#map-play-button').on('click', function() {
            isPlaying = !isPlaying;
            if (isPlaying) {
                d3.select(this).html('<i class="fas fa-pause"></i>').classed('playing', true);
                startPlayback();
            } else {
                d3.select(this).html('<i class="fas fa-play"></i>').classed('playing', false);
                clearInterval(playInterval);
            }
        });
    });
});