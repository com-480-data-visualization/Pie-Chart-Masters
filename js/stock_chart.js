// js/stock_chart.js

// 1. Load the data
d3.csv("src/data/stock/global_indices_cum_growth.csv", d => {
  d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
  for (let key of Object.keys(d)) {
    if (key !== "Date") d[key] = +d[key];
  }
  return d;
}).then(data => {

  // 2. Set up margins and SVG
  const container = d3.select("#stock-chart");
  const margin = { top: 40, right: 100, bottom: 50, left: 60 };
  const width = container.node().clientWidth - margin.left - margin.right;
  const height = container.node().clientHeight - margin.top - margin.bottom;

  const svg = container.append("svg")
      .attr("width",  width  + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);


  // 3. Prepare scales, color, line generator
  const countries = data.columns.filter(c => c !== "Date");

  const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.Date))
      .range([0, width]);

  const y = d3.scaleLinear()
      .domain([
        d3.min(countries, c => d3.min(data, d => d[c])),
        d3.max(countries, c => d3.max(data, d => d[c]))
      ]).nice()
      .range([height, 0]);

  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(countries);

  const line = d3.line()
      .x(d => x(d.Date))
      .y(d => y(d.value));

  const series = countries.map(name => ({
    name,
    values: data.map(d => ({ Date: d.Date, value: d[name] }))
  }));

  // 4. Draw axes
  svg.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y));

  // Using a template literal
  svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));


  // 5. Draw lines and tag them
  const pathSelection = svg.selectAll(".line")
    .data(series)
    .enter().append("path")
      .attr("class", "line")
      .attr("d", d => line(d.values))
      .attr("stroke", d => color(d.name))
      .attr("data-name", d => d.name)    // <-- tag for legend lookup
      .on("mouseover", function(event, d) {
        d3.select(this).raise().attr("stroke-width", 3);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("stroke-width", 1.5);
      });

  // 6. Build the legend under the chart
  const legend = container.append("div")
      .attr("class", "legend")
      .style("display", "grid")
      .style("grid-template-columns", "repeat(auto-fill, minmax(140px, 1fr))")
      .style("gap", "8px")
      .style("margin-top", "16px")
      .style("color", "#fff");

  series.forEach(serie => {
    const item = legend.append("label")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "6px")
        .style("cursor", "pointer");

    // checkbox
    item.append("input")
        .attr("type", "checkbox")
        .property("checked", true)
        .on("change", function() {
          const visible = this.checked;
          pathSelection
            .filter(d => d.name === serie.name)
            .style("opacity", visible ? 1 : 0);
        });

    // color swatch
    item.append("div")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", color(serie.name))
        .style("border-radius", "2px");

    // country name
    item.append("span")
        .text(serie.name)
        .on("mouseover", () => {
          pathSelection
            .filter(d => d.name === serie.name)
            .classed("halo", true)
            .raise();
        })
        .on("mouseout", () => {
          pathSelection
            .filter(d => d.name === serie.name)
            .classed("halo", false);
        });
  });

     pathSelection.each(function() {
    const path = d3.select(this);
    const totalLength = this.getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength);
  });

  // 8. ANIMATE LINES (only transition dashoffset)
  function animateLines() {
    pathSelection.each(function() {
      d3.select(this)
        .transition()
          .duration(3000)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);
    });
  }

  // 9. OBSERVER (as before)
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateLines();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(document.querySelector("#sectionstockmarket"));

  // === TRADE UI Setup ===
  const tradeButton = document.getElementById("trade-button");
  const tradePanel = document.getElementById("trade-panel");

  tradeButton.addEventListener("click", () => {
    tradePanel.style.display = "flex";
  });

  // Populate country index dropdown from the dataset's country indices
  const indexSelect = document.getElementById("indexSelect");
  indexSelect.innerHTML = countries.map(c => `<option value="${c}">${c}</option>`).join("");



  // Handle Trade calculation
  document.getElementById("calculateTrade").addEventListener("click", () => {
    const amount = parseFloat(document.getElementById("investmentInput").value) || 0;
    const index = document.getElementById("indexSelect").value;
    const lastValue = data[data.length - 1][index];
    const result = (amount * lastValue).toFixed(2);
    document.getElementById("tradeResult").textContent = `In 2012, you'd have: $${result}`;
  });

  // Handle close
  document.getElementById("closeTrade").addEventListener("click", () => {
    tradePanel.style.display = "none";
  });


  function drawBankLossChart() {
    d3.dsv(";", "src/data/stock/bankswritedown.csv", d => {
      return {
        company: d.Company.trim(),
        country: d.Country.trim(),
        loss: +d["Loss (Billion USD)"].replace(",", ".")
      };
    }).then(data => {
      const totalByCountry = d3.rollups(data, v => d3.sum(v, d => d.loss), d => d.country)
        .map(([country, total]) => ({ country, total }))
        .sort((a, b) => d3.descending(a.total, b.total));

      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#222")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "6px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      const container = d3.select("#bank-loss-chart");
      const margin = { top: 40, right: 30, bottom: 100, left: 60 };
      const width = container.node().clientWidth - margin.left - margin.right;
      const height = container.node().clientHeight - margin.top - margin.bottom;

      if (width <= 0 || height <= 0) {
        console.warn("Chart container has zero size, skipping rendering.");
        return;
      }

      const svg = container.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
          .domain(totalByCountry.map(d => d.country))
          .range([0, width])
          .padding(0.2);

      const y = d3.scaleLinear()
          .domain([0, d3.max(totalByCountry, d => d.total)]).nice()
          .range([height, 0]);

      svg.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x))
          .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

      svg.append("g")
          .call(d3.axisLeft(y));

      svg.selectAll(".bar")
        .data(totalByCountry)
        .enter()
        .append("rect")
          .attr("class", "bar")
          .attr("x", d => x(d.country))
          .attr("y", d => y(d.total))
          .attr("width", x.bandwidth())
          .attr("height", d => height - y(d.total))
          .attr("fill", "#69b3a2")
          .on("mouseover", function(event, d) {
            const companies = data
              .filter(item => item.country === d.country)
              .map(item => `${item.company}: ${item.loss.toFixed(2)}B`)
              .join("<br>");

            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.country}</strong><br>${companies}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
          });
    });
  }


    // Button to open modal
   document.getElementById("bank-loss-button").addEventListener("click", () => {
    document.getElementById("bank-loss-modal").style.display = "block";
    setTimeout(drawBankLossChart, 100); // Give time for layout to render
  });

}); // <-- This closes .then(...)
