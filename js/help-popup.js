const helpTexts = {
    sectionmortgage: `
        <h2>Understanding US Mortgage Delinquency Rates (2008–2014)</h2>
        <p>
            This interactive map shows how the percentage of homeowners who were more than 90 days late on their mortgage payments evolved across US states during and after the 2008 financial crisis.
        </p>
        <ul>
            <li style="margin-left: 1.5em;">
                <b>What is a mortgage delinquency?</b><br>
                A mortgage is considered “delinquent” when the borrower is late on payments. Here, we focus on serious delinquencies (90+ days overdue), which are a strong indicator of financial distress.
            </li>
            <li>
                <b>What do you see?</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                    <b>Sharp rise in 2008–2010:</b> Most states saw a dramatic increase in delinquency rates, peaking around 2010. This reflects the impact of the housing bubble burst and the economic downturn.
                    </li>
                    <li>
                    <b>Regional differences:</b> States like Nevada, Florida, and California were especially hard hit, with delinquency rates far above the national average. This is linked to overheated housing markets and risky lending practices in those areas.
                    </li>
                    <li>
                    <b>Gradual recovery:</b> After 2010, delinquency rates slowly declined as the economy improved and housing markets stabilized, but some states took much longer to recover.
                    </li>
                </ul>
            </li>
            <li>
                <b>Economic indicators descriptions:</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                    <b>Median Sales Price:</b> The median price of homes sold in the US. This reflects the overall health and value of the housing market.
                    </li>
                    <li>
                    <b>New Housing Permits:</b> The number of new privately-owned housing units authorized by building permits. This is a leading indicator of future construction activity and economic confidence.
                    </li>
                    <li>
                    <b>Case-Shiller Index:</b> A widely used measure of US home prices, tracking changes in the value of residential real estate.
                    </li>
                    <li>
                    <b>Unemployment Rate:</b> The percentage of the labor force that is jobless. High unemployment often leads to more mortgage delinquencies.
                    </li>
                </ul>
            </li>
        </ul>
        <p>
            <b>Key takeaway:</b> The mortgage crisis was not uniform across the US. Some states experienced much deeper and longer-lasting problems, highlighting the importance of local economic conditions and lending practices.
        </p>
    `,
    sectionglobalunemployement: `
        <h2>Interactive World Map: Unemployment &amp; GDP Growth (1995–2019)</h2>
        <p>
            <!-- Introductory description of the world map visualization -->
        </p>
        <ul>
            <li style="margin-left: 1.5em;">
                <b>What is this map showing?</b><br>
                <!-- Brief explanation of the two indicators and the color gradient -->
            </li>
            <li>
                <b>What do you see?</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                        <b>Regional unemployment trends:</b> <!-- Placeholder -->
                    </li>
                    <li>
                        <b>GDP growth patterns:</b> <!-- Placeholder -->
                    </li>
                    <li>
                        <b>Emerging vs. developed economies:</b> <!-- Placeholder -->
                    </li>
                </ul>
            </li>
            <li>
                <b>How to interact?</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                        Select indicator (unemployment vs. GDP) and year via controls.
                    </li>
                    <li>
                        Hover over a country to see its precise value.
                    </li>
                </ul>
            </li>
            <li>
                <b>Great Recession bubble overlay (2007–2010):</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                        When the timeline reaches 2007–2010, bubbles appear showing banks acquired or bankrupted.
                    </li>
                    <li>
                        Bubble size corresponds to the transaction value, highlighting the global spread of collapse all around the world, with a total transaction size reaching almost 1 trillion dollars.
                    </li>
                </ul>
            </li>
            <li>
                <b>Connection to mortgage-backed securities:</b><br>
                The bubbles you see are the largest bank failures and acquisitions during 2007–2010, all driven by losses on mortgage-backed securities (MBS). Remember the first section of this site: the US mortgage delinquency map, the Case-Shiller home-price index, and rising unemployment all illustrated how the housing market imploded. Those same housing loans were pooled into MBS—when borrowers defaulted and home prices plunged, the securities became nearly worthless. Financial institutions around the world, especially in Western markets and increasingly in China, were heavily exposed to these products. As those underlying assets collapsed, banks suffered massive writedowns, destabilizing the global banking system and triggering the wave of failures shown here.
            </li>
        </ul>
        <p>
            <b>Key takeaway:</b> <!-- Placeholder for summary of insights -->
        </p>

    `,
    sectionstockmarket: `
                <h2>Understanding Global Stock Market Performance (2003–2012)</h2>
        <p>
            This interactive chart shows how national stock indices evolved across emerging and developed countries from 2003 to 2012, covering the global financial crisis and its aftermath.
        </p>
        <ul>
            <li style="margin-left: 1.5em;">
                <b>What are you looking at?</b><br>
                Each line represents the growth of a country’s stock market index, normalized to $1 in 2003. This lets you compare performance across countries on a common scale, regardless of index level.
            </li>
            <li>
                <b>What do you see?</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                        <b>A global crash in 2008–2009:</b> All countries experienced a sharp drop in stock prices during the financial crisis. This reflects widespread economic stress and a collapse in investor confidence.
                    </li>
                    <li>
                        <b>Different recovery paths:</b> Emerging markets like Brazil, India, and Turkey bounced back quickly and even outperformed, while developed countries such as the US, France, and Germany took longer to recover. You can experience that using the trade button that simulates holding an investment in the stock index of your choice from 2003 to 2012. You can see that returns on western stock are pretty much flat on the period whereas emerging market provided very high returns.
                    </li>
                </ul>
            </li>
            <li>
                <b>How to explore this?</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                        Filter countries using the legend to isolate trends and compare performances. You can hover your mouse on top of a country name to see it stand out among the other paths.
                    </li>
                    <li>
                        Use the <b>Trade</b> button to simulate an investment in any country’s index and see its value grow from 2003 to 2012 — highlighting the impact of the crisis and the differences in long-term recovery.
                    </li>
                    <li>
                        Click the <b>Bank Loss</b> button to access a global view of bank underwriting losses. The bar chart shows that losses were heavily concentrated in Western financial institutions. Hovering over the bars reveals which major banks were most affected.
                    </li>
                </ul>
            </li>
        </ul>
        <p>
            <b>Key takeaway:</b> The financial crisis was global, but its impact varied. Emerging markets recovered faster and often outperformed, while developed countries faced a slower rebound. This chart helps visualize those differences and understand the financial market situation at that time.
        </p>

    `,
    sectionwordcloud: `
        <h2>Understanding the Word Cloud: Public Anxiety During the Crisis</h2>
        <p>
            This interactive word cloud visualizes the most common search terms related to the financial crisis, showing how public concern and focus shifted over time.
        </p>
        <ul>
            <li style="margin-left: 1.5em;">
                <b>What is a word cloud?</b><br>
                A word cloud displays words with a size proportional to their frequency or importance. Here, it reflects how often certain terms were searched for on the internet during the crisis years.
            </li>
            <li>
                <b>What do you see?</b>
                <ul style="margin-left: 1.5em;">
                    <li>
                    <b>Big, bold words:</b> The larger the word, the more frequently it was searched for at that time.
                    </li>
                    <li>
                    <b>Shifting focus:</b> As you move the slider or play the animation, you can see how public anxiety and attention evolved—certain terms become more prominent during key events (e.g., “Lehman Brothers”, “bailout”, “unemployment”) and especially from September 2008 until July 2009 which corresponds to the Lehman Brothers bankruptcy and the election of USA period.
                    </li>
                </ul>
            </li>
        </ul>
        <p>
            <b>Key takeaway:</b> The word cloud offers a unique window into the collective anxiety and focus of the public during the financial crisis, highlighting how certain fears and topics dominated the conversation at different moments.
        </p>
    `,
};

function showHelpPopup(contentHTML) {
    if (document.querySelector('.help-popup-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'help-popup-overlay';
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) overlay.remove();
    });
    const content = document.createElement('div');
    content.className = 'help-popup-content';
    content.innerHTML = `
        <button class="help-popup-close" title="Fermer">×</button>
        ${contentHTML}
    `;
    content.querySelector('.help-popup-close').onclick = () => overlay.remove();
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

function bindHelpPopupToTitle(selector, contentHTML, tooltipText = "Click on me to have additional insights") {
    document.querySelectorAll(selector).forEach(title => {
        if (!title.querySelector('.help-title-tooltip')) {
            const tooltip = document.createElement('span');
            tooltip.className = 'help-title-tooltip';
            tooltip.textContent = tooltipText;
            title.appendChild(tooltip);
        }
        // Ajoute la classe pour le style
        title.classList.add('has-tooltip');
        // Ouvre la popup au clic
        title.addEventListener('click', function(e) {
            e.stopPropagation();
            showHelpPopup(contentHTML);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.help-helpicon-container .help-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            const key = icon.parentElement.getAttribute('data-help');
            if (key && helpTexts[key]) {
                showHelpPopup(helpTexts[key]);
            } else {
                showHelpPopup('<h2>Aide</h2><p>Aucune aide spécifique pour cette section.</p>');
            }
        });
    });
});