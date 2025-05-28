const csvPath = 'src/data/bank_map/file_modified.csv';

let isPlaying = false;
let playInterval = null;

let map = L.map('bankMap').setView([20, 0], 2); // Centered world view

// Base map tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

let bubbles = [];
let monthOptions = []; // to hold YYYY-MM options

// Utility: scale bubble size based on amount
function scaleRadius(amount) {
  return Math.sqrt(amount) / 10000;
}

// Load CSV using D3
d3.dsv(";", csvPath).then(data => {
  // Parse and clean
  data.forEach(d => {
    d.date = new Date(d.date);
    d.year = d.date.getFullYear();
    d.month = d.date.getMonth() + 1;
    d.lat = +d.lat;
    d.lon = +d.lon;
    d.amount = +d.amount;
    d.cumulative = +d.cumulative_amount_by_location;

    // Format: YYYY-MM
    const monthStr = `${d.year}-${String(d.month).padStart(2, '0')}`;
    d.monthStr = monthStr;
    d.monthYear = d.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  // Get sorted unique months
  monthOptions = Array.from(new Set(data.map(d => d.monthStr))).sort();

  // Setup slider
  const slider = document.getElementById('monthSlider');
  slider.min = 0;
  slider.max = monthOptions.length - 1;
  slider.value = 0;

  // Initial draw
  drawBubbles(monthOptions[+slider.value]);

  // On slider move
  slider.addEventListener('input', () => {
    const monthStr = monthOptions[+slider.value];
    drawBubbles(monthStr);
  });

  // Play/pause control
  document.getElementById('playButton').addEventListener('click', () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      document.getElementById('playButton').innerText = '⏸ Pause';
      playInterval = setInterval(() => {
        let index = +slider.value;
        if (index >= monthOptions.length - 1) {
          clearInterval(playInterval);
          isPlaying = false;
          document.getElementById('playButton').innerText = '▶ Play';
          return;
        }
        slider.value = index + 1;
        drawBubbles(monthOptions[slider.value]);
      }, 400); // 1 month per second
    } else {
      clearInterval(playInterval);
      document.getElementById('playButton').innerText = '▶ Play';
    }
  });

  // Draw function
  function drawBubbles(selectedMonthStr) {
    // Convert to Date
    const [year, month] = selectedMonthStr.split('-').map(Number);
    const selectedDate = new Date(year, month - 1);

    // Update current date display
    document.getElementById('currentDate').innerText =
      selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Clear old bubbles
    bubbles.forEach(b => map.removeLayer(b));
    bubbles = [];

    const latestByLocation = {};
    let total = 0;

    data.forEach(d => {
      if (d.date <= selectedDate) {
        const key = `${d.lat},${d.lon}`;
        if (!latestByLocation[key] || d.date > latestByLocation[key].date) {
          latestByLocation[key] = d;
        }
      }
    });

    for (const key in latestByLocation) {
      const d = latestByLocation[key];
      total += d.cumulative;

      const circle = L.circleMarker([d.lat, d.lon], {
        radius: scaleRadius(d.cumulative),
        color: 'red',
        fillOpacity: 0.6,
        weight: 1
      }).bindPopup(`
        <strong>Location:</strong> [${d.lat.toFixed(2)}, ${d.lon.toFixed(2)}]<br>
        <strong>Date:</strong> ${d.monthYear}<br>
        <strong>Cumulative Amount:</strong> $${(d.cumulative / 1e9).toFixed(2)}B
      `).addTo(map);

      bubbles.push(circle);


          if (d.lat === 37.09024 && d.lon === -95.712891) {
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <strong>United States</strong><br>
        <div id="usa-bar-chart" style="width: 300px; height: 200px;"></div>
      `;

      const circle = L.circleMarker([d.lat, d.lon], {
        radius: scaleRadius(d.cumulative),
        color: 'red',
        fillOpacity: 0.6,
        weight: 1
      }).addTo(map);

      circle.bindPopup(popupContent);

      circle.on('popupopen', () => {
        drawUSABarChart();
      });

      bubbles.push(circle);
      }

    }

    document.getElementById('totalAmount').innerText =
      `Total: $${(total / 1e9).toFixed(2)}B`;
  }
});


function drawUSABarChart() {

  const container = d3.select("#usa-bar-chart");

  container.selectAll("*").remove();
  d3.csv("src/data/bank_map/monthly_failed_banks.csv").then(data => {
    data.forEach(d => {
      d.Month = d3.timeParse("%Y-%m")(d.Month);
      d.Failed_Bank_Count = +d.Failed_Bank_Count;
    });

    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const width = 300 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select("#usa-bar-chart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.Month))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Failed_Bank_Count)])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%b %y")))
      .selectAll("text")
      .style("font-size", "10px");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("font-size", "10px");

    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.Month))
      .attr("y", d => y(d.Failed_Bank_Count))
      .attr("width", width / data.length)
      .attr("height", d => height - y(d.Failed_Bank_Count))
      .attr("fill", "#ff4d4d");
  });
}
