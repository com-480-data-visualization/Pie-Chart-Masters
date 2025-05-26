// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing animation...");
    
    // Paramètres
    const width = window.innerWidth;
    const height = window.innerHeight;
    const nCurves = 7; // nombre de courbes
    const nPoints = 120; // nombre de points par courbe
    const startY = height * 0.2; // point de départ commun, plus haut
    const crashPoint = 0.015*width; // crash plus tôt
    const recoveryPoint = 0.035*width; // recovery plus tôt aussi

    // Générateur de ligne lissée
    const line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveMonotoneX);

    // Génère une trajectoire stochastique avec crash marqué et recovery
    function generateStochasticCurve(curveIndex) {
        const baseDrift = 0.5 + (Math.random() - 0.5) * 0.5;
        const crashDrift = 8 + Math.random() * 6;
        const recoveryDrift = -3 - Math.random() * 0.5;
        const shockAmplitude = 15 + Math.random() * 7 + curveIndex * 1.5; // variations stochastiques plus grandes
        let data = [{x: 0, y: startY}];
        for (let i = 1; i < nPoints; i++) {
            let prev = data[i-1].y;
            let drift;
            if (i < crashPoint) {
                drift = baseDrift;
            } else if (i < recoveryPoint) {
                drift = crashDrift;
            } else {
                drift = recoveryDrift;
            }
            let shock = (Math.random() - 0.5) * shockAmplitude;
            let y = Math.max(50, Math.min(height-50, prev + drift + shock));
            data.push({x: i * (width / nPoints), y});
        }
        return data;
    }

    function initStochasticAnimation() {
        console.log("Initializing animation with dimensions:", width, "x", height);
        
        // Création du SVG
        const svg = d3.select("#stochastic-animation")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("background", "none");

        // Génère et dessine plusieurs courbes
        for (let c = 0; c < nCurves; c++) {
            let curve = generateStochasticCurve(c);
            let path = svg.append("path")
                .datum(curve)
                .attr("fill", "none")
                .attr("stroke", "#ff0000")
                .attr("stroke-width", 2.5)
                .attr("opacity", 0.7)
                .attr("d", line);

            // Animation du tracé
            const totalLength = path.node().getTotalLength();
            path
                .attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(3500)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0);
        }
    }

    // Initialiser l'animation
    initStochasticAnimation();
}); 