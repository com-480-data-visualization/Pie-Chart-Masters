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
        <h2>Aide section 2</h2>
        <p>Texte d'explication pour la section 3.</p>
    `,
    sectionstockmarket: `
        <h2>Aide section 3</h2>
        <p>Texte d'explication pour la section 3.</p>
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
                    <b>Shifting focus:</b> As you move the slider or play the animation, you can see how public anxiety and attention evolved—certain terms become more prominent during key events (e.g., “Lehman Brothers”, “bailout”, “unemployment”) and especially from September 2008 until Juli 2009 which corresponds to the Lehman Brothers bankruptcy and the election of USA period.
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

function bindHelpPopupToTitle(selector, contentHTML, tooltipText = "Cliquez-moi pour avoir plus d'infos") {
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