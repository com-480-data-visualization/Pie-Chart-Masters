// js/us_map.js
// Requires D3 v7+ and TopoJSON

const colorScale = d3.scaleThreshold()
    .domain([1, 2, 3, 4, 5])
    .range(["#e0e7f4", "#b3c6e0", "#7fa1c1", "#3b6ea5", "#1a4173", "#0d1b2a"]);

const legendLabels = ["0-1%", "1-2%", "2-3%", "3-4%", "4-5%", "5%+"];

// Store data globally
let mapData = null;
let timeseriesData = null;

document.addEventListener('DOMContentLoaded', function() {
    const container = d3.select('#mortgage-map-container');
    // Responsive sizing
    function getMapSize() {
        const node = container.node();
        const width = node ? node.clientWidth : 900;
        const height = node ? Math.max(350, Math.min(window.innerHeight * 0.5, node.clientHeight || 550)) : 550;
        return { width, height };
    }
    let { width, height } = getMapSize();
    // Tooltip
    const tooltip = container.append('div')
        .attr('class', 'mortgage-tooltip');

    // SVG
    const node = container.node();
    let fullWidth = node ? node.clientWidth : 900;
    let fullHeight = node ? node.clientHeight : 550;
    const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`);

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

    // Fonction pour gérer les tooltips dynamiques sur les états
    function setStateEventHandlers() {
        svg.selectAll('path')
            .on('mousemove', function(event, d) {
                const slider = d3.select('#mortgage-slider');
                const currentIndex = +slider.property('value');
                const currentDate = dates[currentIndex];
                const val = mapData.find(s => s.state === d.properties.name)?.values[currentDate];
                tooltip
                    .style('display', 'block')
                    .style('left', (event.offsetX + 20) + 'px')
                    .style('top', (event.offsetY + 20) + 'px')
                    .html(`<strong>${d.properties.name}</strong><br>
                        ${val != null ? (parseFloat(val).toFixed(2) + '% delinquent') : 'No data'}`);
                d3.select(this).attr('stroke', '#ff0000').attr('stroke-width', 2);
            })
            .on('mouseleave', function() {
                tooltip.style('display', 'none');
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
            })
            .on('click', function(event, d) {
                showStateTimeSeries(d.properties.name);
            });
    }

    // Function to update map for a specific date
    function updateMap(date) {
        const dataMap = {};
        mapData.forEach(d => {
            dataMap[d.state] = +d.values[date];
        });

        svg.selectAll('path')
            .attr('fill', d => {
                const val = dataMap[d.properties.name];
                return val != null ? colorScale(val) : "#eee";
            });
        setStateEventHandlers();
    }

    // Function to start playback
    function startPlayback() {
        playInterval = setInterval(() => {
            currentDateIndex = (currentDateIndex + 1) % dates.length;
            d3.select('#mortgage-slider').property('value', currentDateIndex);
            d3.select('#mortgage-slider').dispatch('input');
        }, 1000);
    }

    // Function to draw timeseries
    function drawTimeseries(y1Key, y2Key, selectedDate) {
        const container = d3.select("#mortgage-timeseries");
        container.selectAll("*").remove();

        const node = container.node();
        let fullWidth = node ? node.clientWidth : 400;
        let fullHeight = node ? node.clientHeight : 300;
        const margin = {top: 20, right: 60, bottom: 40, left: 60};
        const width = fullWidth - margin.left - margin.right;
        const height = fullHeight - margin.top - margin.bottom;
        const svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Data
        const y1 = timeseriesData[y1Key].data;
        const y2 = timeseriesData[y2Key].data;

        // X scale (common dates)
        const allDates = Array.from(new Set([...y1.map(d => +d.date), ...y2.map(d => +d.date)])).sort();
        const x = d3.scaleTime()
            .domain(d3.extent(allDates, d => new Date(d)))
            .range([0, width]);

        // Y scales
        const y1Scale = d3.scaleLinear()
            .domain([0, d3.max(y1, d => d.value)]).nice()
            .range([height, 0]);
        const y2Scale = d3.scaleLinear()
            .domain([0, d3.max(y2, d => d.value)]).nice()
            .range([height, 0]);

        // Axes
        svg.append("g")
            .attr("class", "x-axis main-timeseries-x")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));
        svg.append("g")
            .attr("class", "y1-axis main-timeseries-y1")
            .call(d3.axisLeft(y1Scale));
        svg.append("g")
            .attr("class", "y2-axis main-timeseries-y2")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(y2Scale));

        // Lines
        const line1 = d3.line()
            .x(d => x(d.date))
            .y(d => y1Scale(d.value));
        const line2 = d3.line()
            .x(d => x(d.date))
            .y(d => y2Scale(d.value));

        svg.append("path")
            .datum(y1)
            .attr("fill", "none")
            .attr("stroke", timeseriesData[y1Key].color)
            .attr("stroke-width", 2)
            .attr("d", line1);

        svg.append("path")
            .datum(y2)
            .attr("fill", "none")
            .attr("stroke", timeseriesData[y2Key].color)
            .attr("stroke-width", 2)
            .attr("d", line2);

        // Barre verticale rouge à la date sélectionnée
        if (selectedDate) {
            const xPos = x(new Date(selectedDate));
            svg.append("line")
                .attr("x1", xPos)
                .attr("x2", xPos)
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("pointer-events", "none");
        }

        // Legends
        svg.append("text")
            .attr("x", 0)
            .attr("y", -8)
            .attr("fill", timeseriesData[y1Key].color)
            .attr("font-size", "13px")
            .text(y1Key);

        svg.append("text")
            .attr("x", width)
            .attr("y", -8)
            .attr("fill", timeseriesData[y2Key].color)
            .attr("font-size", "13px")
            .attr("text-anchor", "end")
            .text(y2Key);
    }

    Promise.all([
        d3.json('src/data/others/USA_states_svg.json'),
        d3.json('src/data/mortgage/clean/mortgage_delinquency_by_state.json'),
        d3.csv('src/data/others/Median_Sales_Price_of_Houses_Sold_for_the_US.csv'),
        d3.csv('src/data/others/New_Privately-Owned_Housing_Units_Authorized_in_Permit-Issuing_Places_Total_Units.csv'),
        d3.csv('src/data/others/S&P_CoreLogic_Case-Shiller_U.S._National_Home_Price_Index.csv'),
        d3.csv('src/data/others/Unemployement_rate.csv')
    ]).then(([us, data, medianSales, permits, caseShiller, unemployment]) => {
        // Store data globally
        mapData = data;

        // Store timeseries data
        timeseriesData = {
            "Median Sales Price": {
                data: medianSales.map(d => ({ date: new Date(d.observation_date), value: +d.MSPUS })),
                color: "#007bff"
            },
            "New Housing Permits": {
                data: permits.map(d => ({ date: new Date(d.observation_date), value: +d.PERMIT })),
                color: "#28a745"
            },
            "Case-Shiller Index": {
                data: caseShiller.map(d => ({ date: new Date(d.observation_date), value: +d.CSUSHPINSA })),
                color: "#ff9800"
            },
            "Unemployment Rate": {
                data: unemployment.map(d => ({ date: new Date(d.observation_date), value: +d.UNRATE })),
                color: "#e91e63"
            }
        };

        // Initialize dropdowns
        const y1Select = d3.select("#y1-select");
        const y2Select = d3.select("#y2-select");
        const options = Object.keys(timeseriesData);
        options.forEach(opt => {
            y1Select.append("option").attr("value", opt).text(opt);
            y2Select.append("option").attr("value", opt).text(opt);
        });
        y1Select.property("value", options[0]);
        y2Select.property("value", options[1]);

        function updateTimeseries(selectedDate = null) {
            if (!selectedDate) {
                const slider = d3.select('#mortgage-slider');
                const currentIndex = +slider.property('value');
                selectedDate = dates[currentIndex];
            }
            drawTimeseries(y1Select.property("value"), y2Select.property("value"), selectedDate);
        }

        y1Select.on("change", updateTimeseries);
        y2Select.on("change", updateTimeseries);
        updateTimeseries();

        // Get all available dates
        dates = Object.keys(data[0].values)
            .filter(dateStr => {
                const d = new Date(dateStr);
                return d.getFullYear() < 2018 || (d.getFullYear() === 2018 && d.getMonth() === 0);
            })
            .sort();
        currentDateIndex = dates.length - 1;

        // Initialize slider
        const slider = d3.select('#mortgage-slider')
            .attr('min', 0)
            .attr('max', dates.length - 1)
            .attr('value', currentDateIndex);

        d3.select('#mortgage-date-display').text(formatDate(dates[currentDateIndex]));

        const dataMap = {};
        data.forEach(d => {
            dataMap[d.state] = +d.values[dates[currentDateIndex]];
        });

        // Convert TopoJSON to GeoJSON
        const states = topojson.feature(us, us.objects.states).features;

        ({ width, height } = getMapSize());
        svg.attr('width', '100%').attr('height', '100%').attr('viewBox', `0 0 ${width} ${height}`);

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
            .attr('stroke-width', 1);
        setStateEventHandlers();

        // Legend
        const legendWidth = 350;
        const legendHeight = 18;
        const legendMargin = {top: 10, right: 10, bottom: 30, left: 10};
        const nSegments = colorScale.range().length;
        const segmentWidth = legendWidth / nSegments;

        const legendContainer = d3.select('#mortgage-map-legend-container');
        legendContainer.selectAll('*').remove();
        const legendSvg = legendContainer.append('svg')
            .attr('width', legendWidth + legendMargin.left + legendMargin.right)
            .attr('height', legendHeight + legendMargin.top + legendMargin.bottom);

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
            d3.select('#mortgage-date-display').text(formatDate(date));
            updateTimeseries(date);
        });

        // Handle play button
        d3.select('#mortgage-play-button').on('click', function() {
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

    // Affiche un popup avec la timeseries pour un état
    function showStateTimeSeries(stateName) {
        const stateData = mapData.find(s => s.state === stateName);
        if (!stateData) return;
        const timeSeries = Object.entries(stateData.values).map(([date, value]) => ({
            date: new Date(date),
            value: +value
        }));
        let popup = d3.select('body').select('.mortgage-popup-overlay');
        if (popup.empty()) {
            popup = d3.select('body')
                .append('div')
                .attr('class', 'mortgage-popup-overlay')
                .style('position', 'fixed')
                .style('top', 0)
                .style('left', 0)
                .style('width', '100vw')
                .style('height', '100vh')
                .style('background', 'rgba(0,0,0,0.5)')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('z-index', 10000)
                .on('click', function(event) {
                    if (event.target === this) popup.remove();
                });
            popup.append('div')
                .attr('class', 'mortgage-popup-content')
                .style('background', '#fff')
                .style('padding', '20px')
                .style('border-radius', '8px')
                .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
                .style('min-width', '350px')
                .style('max-width', '90vw')
                .style('max-height', '80vh')
                .style('overflow', 'auto');
        } else {
            popup.select('.mortgage-popup-content').selectAll('*').remove();
        }
        const content = popup.select('.mortgage-popup-content');
        content.append('button')
            .text('×')
            .attr('class', 'mortgage-popup-close')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('background', 'none')
            .style('border', 'none')
            .style('font-size', '24px')
            .style('cursor', 'pointer')
            .on('click', () => popup.remove());
        content.append('h2')
            .text(`Time Series for ${stateName}`)
            .style('margin-bottom', '20px')
            .style('color', '#222');
        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = 500 - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;
        const svg = content.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        const x = d3.scaleTime()
            .domain(d3.extent(timeSeries, d => d.date))
            .range([0, width]);
        const y = d3.scaleLinear()
            .domain([0, d3.max(timeSeries, d => d.value)])
            .range([height, 0]);
        svg.append('g')
            .attr('class', 'popup-timeseries-x')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(6));
        svg.append('g')
            .attr('class', 'popup-timeseries-y')
            .call(d3.axisLeft(y));
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);
        svg.append('path')
            .datum(timeSeries)
            .attr('fill', 'none')
            .attr('stroke', '#007bff')
            .attr('stroke-width', 2)
            .attr('d', line);
    }
});