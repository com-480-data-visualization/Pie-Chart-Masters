// bank_map_static.js

// --- CONFIGURATION & GLOBALS ---
const dataPath       = 'src/data/bank_map/file_modified.csv';
const usaMonthlyPath = 'src/data/bank_map/monthly_failed_banks.csv';
const topoJSONPath   = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const margin = { top: 0, right: 0, bottom: 0, left: 0 };
let width   = 960, height = 500;

let svg, projection, path;
let allData = [], months = [];
let playInterval = null, isPlaying = false;

// d3 scale for bubble radius
const scaleRadius = d3.scaleSqrt()
  .domain([0, d3.max([1])])
  .range([0, 40]);  // will update domain once data loads

// --- SETUP SVG & PROJECTION ---
function initSVG() {
  // responsive sizing
  const container = document.getElementById('bankMap');
  width  = container.clientWidth;
  height = container.clientHeight;

  svg = d3.select('#bankMap')
    .append('svg')
    .attr('width',  width)
    .attr('height', height);

  projection = d3.geoMercator()
    .scale((width / 2) / Math.PI)
    .translate([width / 2, height / 1.6]);

  path = d3.geoPath().projection(projection);
}

// --- LOAD & DRAW BASE MAP ---
function drawBaseMap(world) {
  const countries = topojson.feature(world, world.objects.countries).features;

  svg.append('g')
    .selectAll('path')
    .data(countries)
    .enter().append('path')
      .attr('d', path)
      .attr('fill', '#ccc')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);
}

// --- DATA LOADING & INITIALIZATION ---
Promise.all([
  d3.json(topoJSONPath),
  d3.dsv(';', dataPath)
]).then(([world, data]) => {
  initSVG();
  drawBaseMap(world);

  // parse & prepare
  data.forEach(d => {
    d.date       = new Date(d.date);
    d.year       = d.date.getFullYear();
    d.month      = d.date.getMonth() + 1;
    d.monthStr   = `${d.year}-${String(d.month).padStart(2,'0')}`;
    d.lat        = +d.lat;
    d.lon        = +d.lon;
    d.cumulative = +d.cumulative_amount_by_location;
  });

  allData = data;
  months  = Array.from(new Set(data.map(d => d.monthStr))).sort();

  // update scale domain to actual max cumulative
  scaleRadius.domain([0, d3.max(data, d => d.cumulative)]);

  // setup controls
  const slider = d3.select('#monthSlider')
    .attr('min', 0)
    .attr('max', months.length - 1)
    .on('input', function() {
      drawBubbles(months[this.value]);
    });

  d3.select('#playButton').on('click', togglePlay);

  // initial draw
  drawBubbles(months[0]);
});

// --- DRAW BUBBLES FOR A GIVEN MONTH ---
function drawBubbles(monthStr) {
  const [y,m] = monthStr.split('-').map(Number);
  const currentDate = new Date(y, m - 1);

  // update overlay text
  d3.select('#currentDate')
    .text(currentDate.toLocaleString('default', { month:'long', year:'numeric' }));

  // filter to latest per location up to this date
  const latest = {};
  allData.forEach(d => {
    if (d.date <= currentDate) {
      const key = `${d.lat}|${d.lon}`;
      if (!latest[key] || d.date > latest[key].date) latest[key] = d;
    }
  });
  const bubData = Object.values(latest);

  const total = d3.sum(bubData, d => d.cumulative);
  d3.select('#totalAmount')
    .text(`$${(total/1e9).toFixed(2)}B`);

  // JOIN
  const circles = svg.selectAll('circle.bubble')
    .data(bubData, d => `${d.lat}|${d.lon}`);

  // EXIT
  circles.exit().remove();

  // ENTER
  const enter = circles.enter()
    .append('circle')
      .attr('class','bubble')
      .attr('cx', d => projection([d.lon,d.lat])[0])
      .attr('cy', d => projection([d.lon,d.lat])[1])
      .attr('r', 0)
      .attr('fill','red')
      .attr('fill-opacity',0.6)
      .attr('stroke','#900')
      .on('click', d => {
        if (d.lat.toFixed(2)==='37.09' && d.lon.toFixed(2)==='-95.71') {
          drawUSABarChart();
        }
      });

  // ENTER + UPDATE
  enter.merge(circles)
    .transition()
    .duration(400)
      .attr('cx', d => projection([d.lon,d.lat])[0])
      .attr('cy', d => projection([d.lon,d.lat])[1])
      .attr('r',  d => scaleRadius(d.cumulative));
}

// --- PLAY / PAUSE LOGIC ---
function togglePlay() {
  const btn = d3.select('#playButton');
  if (isPlaying) {
    clearInterval(playInterval);
    btn.text('▶ Play');
  } else {
    let idx = +d3.select('#monthSlider').property('value');
    playInterval = setInterval(() => {
      idx = (idx + 1) % months.length;
      d3.select('#monthSlider').property('value', idx);
      drawBubbles(months[idx]);
      if (idx === months.length - 1) togglePlay();
    }, 800);
    btn.text('⏸ Pause');
  }
  isPlaying = !isPlaying;
}

// --- USA BAR CHART (reuse your existing D3 code) ---
function drawUSABarChart() {
  // clear any existing modal / chart
  d3.select('#usa-bar-chart').selectAll('*').remove();

  d3.csv(usaMonthlyPath).then(data => {
    data.forEach(d => {
      d.Month = d3.timeParse('%Y-%m')(d.Month);
      d.Failed_Bank_Count = +d.Failed_Bank_Count;
    });

    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const w = 300 - margin.left - margin.right;
    const h = 200 - margin.top - margin.bottom;

    const svg2 = d3.select('#usa-bar-chart')
      .append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.Month))
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data,d=>d.Failed_Bank_Count)]).nice()
      .range([h, 0]);

    svg2.append('g')
      .attr('transform',`translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%b %y')))
      .selectAll('text').style('font-size','10px');

    svg2.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text').style('font-size','10px');

    svg2.selectAll('rect')
      .data(data)
      .enter().append('rect')
        .attr('x', d=>x(d.Month))
        .attr('y', d=>y(d.Failed_Bank_Count))
        .attr('width', w/data.length)
        .attr('height', d=>h-y(d.Failed_Bank_Count))
        .attr('fill','#ff4d4d');
  });
}
