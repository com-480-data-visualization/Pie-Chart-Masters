# Project of Data Visualization (COM-480) : 

## Visualizing the 2008 Subprime Crisis

| Student's name | SCIPER |
| -------------- | ------ |
|Jérôme Baras | 326256 |
|Marc Bonhôte Tomasini | 325411 |
|Eliot Goncalves | 330553 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (21st March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

------------------------------------------------------------------------------------------------------------------------------

### Dataset

To analyze the 2008 financial crisis, we chose multiple datasets covering both micro-level factors (mortgage lending) and macro-level effects (unemployment, global economic indicators). This allows us to examine both causes and consequences across different scales. 

**1. Economic and Market Data in the USA**  
- **[US Real Estate Prices (FRED – ASPUS)](https://fred.stlouisfed.org/series/ASPUS)**  
  - Compare real estate prices before and after the crisis.  
- **[Unemployment Rate (FRED – UNRATE)](https://fred.stlouisfed.org/series/UNRATE)**  
  - Track unemployment as a key social impact.  
- **[Wealth of the Poorest Households (FRED – WFRBLB50107)](https://fred.stlouisfed.org/series/WFRBLB50107)**  
  - Assess the crisis’s impact on the most vulnerable groups.
- **[State-Level Debt-to-Income ratio (Federal Reserve)](https://www.federalreserve.gov/releases/z1/dataviz/household_debt/state/map/#year:2008)**
  - Show that debt levels were a clear indicator of instability

**2. Financial Institutions & Banking Sector**  
- **[Banks Acquired/Bankrupted (Wikipedia)](https://en.wikipedia.org/wiki/List_of_banks_acquired_or_bankrupted_during_the_Great_Recession)**  
  - List of affected institutions (location, losses, etc.).  
- **[Subprime Crisis Write-downs (Wikipedia)](https://en.wikipedia.org/wiki/List_of_writedowns_due_to_subprime_crisis)**  
  - Show losses by institution or region.  
- **[FDIC Failed Bank List](https://www.fdic.gov/bank-failures/failed-bank-list)**  
  - Analyze official USA bank failures (dates, assets, acquiring institutions) to understand spatial and temporal patterns.

**3. Global Data & Confidence Indicators**  
- **[OECD Consumer Confidence Index](https://www.oecd.org/fr/data/indicators/consumer-confidence-index-cci.html?oecdcontrol-b2a0dbca4d-var3=2005-05&oecdcontrol-b2a0dbca4d-var4=2012-02)**  
  - Map worldwide consumer confidence in relation to the crisis.  
- **[World Bank – World Development Indicators (WDI)](https://data.worldbank.org/indicator)**  
  - Evaluate global crisis impact (GDP, debt, unemployment, healthcare).

**4. US Mortgage Sector**  
- **[Complete Mortgage Data (HMDA, CFPB)](https://www.consumerfinance.gov/data-research/hmda/historic-data/?geo=nationwide&records=all-records&field_descriptions=labels)**  
  - This dataset reveals mortgage lending trends before the collapse, highlighting contributing factors.
- **[Mortgages 90+ Days Delinquent (CFPB)](https://www.consumerfinance.gov/data-research/mortgage-performance-trends/mortgages-90-or-more-days-delinquent/)**  
  - Identify delinquency clusters on a map over time. This dataset provides actual performance data, enabling clearer spatio-temporal insights into mortgage defaults.

**5. Stock Market & Sentiment Analysis**  
- **[Financial Market Data (Yahoo)](https://finance.yahoo.com/)**  
  - Retrieve historical indices (S&P 500, Dow, NASDAQ), visualize crash and recovery, compare sector performance.  
- **[Google Trends](https://trends.google.fr/trends?geo=CH&hl=fr)**  
  - Study searches for “mortgage”, “subprime”, "crisis" etc.; identify interest peaks; gauge public sentiment.

--------------------------------------------------------------------------------------------------------------

### Problematic

Our visualization project explores the 2008 subprime mortgage crisis, focusing on its **geographic** and **temporal** evolution in the USA and internationally. 

Through interactive visualizations, we aim to highlight key aspects of the crisis:  

**1. Understand the dynamics of mortgage defaults:**
- With an interactive map of the USA, we want to highlight how mortgage defaults spread over time in order to identify regional clusters of high default rates.
- This visualization will also highlight the geographic origins of mortgage defaults.
- By adding other economic factors (such as real estate price, unemployment, and other factors), we can highlight possible correlations on another visualization. 

**2. Understand the international and socioeconomic impact of mortgage defaults:**
- With an interactive map of the world, we want to highlight how the crisis spread in the world through various economic indicators (Consumer index, ...) and see which countries were most affected by the financial crisis.
- Using time-series graphs of various socioeconomic indicators (such as unemployment, net worth, and household debt...), we want to highlight how household wealth eroded post-crisis.

**3. Understand the effects on financial markets:**
- We will create a time series of major stock indices, marking key crisis events to understand how financial markets reacted.
- With a bubble map of company losses and bankruptcies, we aim to highlight the major financial institutions that collapsed with their geographical distribution.
   
**4. Identify the early warning signals and their spread:**
- With a heatmap or a word cloud using Google Trends, we want to highlight how economic fear propagated.
- We will complement this with a time series to analyze when economic fear began to spread.
  
By identifying patterns and trends, our analysis aims to provide a complete view of the crisis—its causes, its widespread impact, and the signals that preceded it. While some visualizations explore early warning signs, most focus on understanding the economic and financial consequences of the meltdown. The project is designed to be accessible, even for those without a financial background.  

--------------------------------------------------------------------------------------------------------------------

### Exploratory Data Analysis

For our chosen subject, the most relevant datasets we chose, such as US real estate prices, unemployment rate, and OECD consumer confidence index, are available from reputable sources. These datasets are typically clean, pre-processed single-feature time series that provide strong insight on the crisis's impact (real estate price boom and then drop, unemployment growth, growing debt load before the crisis, etc.).

The HMDA Mortgage dataset will require the most preprocessing and advanced data analysis, potentially incorporating Machine Learning techniques. While we will use HMDA data from 2007–2010 in practice, we will here explore the 2007 dataset since it is representative of the aggregate. This dataset includes 953,569 mortgage applications and 78 features covering loan details, borrower demographics (population, gender), and lending decisions. Key categorical variables include loan type, loan purpose, property type, and applicant credit factors, while numerical features such as loan amounts, income, and approval rates provide insights on the lending characteristics leading up to the crisis and assess how borrower characteristics influenced loan approval and potential defaults. After preprocessing, more than 20 features were dropped due to excessive missing values or irrelevance. 

The dataset seems to provide a very broad view of the mortgage situation in the USA, as it includes all types of transactions and applicants : 
- Loan amounts range from $1,000 to nearly $100M (median: $140K; mean: $182K). (This data spread might require us to remove outliers). 
- Incomes span from $1K to almost $10M (median: $69K; mean: $95.6K).
- Loans are geographically diverse, covering 16,075 ZIP codes across 1,711 counties in all 50 states.
- Concerning the loan purpose, refinancing is the primary (~50%), followed by home purchases (~41%) and home improvements (~9%).

This last point provides a first good insight on the situation in 2007, as it was common to cover loan payment via refinancing, taking advantage of the continuously growing real estate prices (until the burst), with debt accumulating until a breaking point. 

---------------------------------------------------------------------------------------------------

### Related work

Multiple institutions and researchers have used the HMDA dataset for similar analyses: 

- Urban Institute & Housing Finance Policy Center: Analyzed mortgage denial rates, small-dollar lending, and racial disparities in lending.
(https://apps.urban.org/features/mortgages-by-race/)
- Federal Reserve & CFPB: Regularly published reports on mortgage market trends using HMDA data.
- Journalists & Data Scientists: Used HMDA data to map the mortgage crisis, focusing on regional default rates and their impact on minority communities (https://jhucovid19.policymap.com/blog/using-hmda-data-to-understand-lending-activity-in-detroit)
- Academic Studies: Researchers have built models to analyze how mortgage defaults propagated through the banking system. While the exact datasets may vary slightly, they contain similar types of financial information.

Our approach is original because most projects done on this dataset focused on specific aspects (for instance, the relationship between ethnic groups and mortgage approvals), and did not provide a full overview of the local and international socio-economic consequences. In our project, leveraging the use of different datasets, we aim to integrate multiple perspectives, such as the international economic impact, the impact on the quality of life, on institutional collapses and analyze the fear of the crisis. All these elements will be combined into dynamic visualizations to offer an interactive and complete understanding of the crisis.

We found inspiration in the Urban Institute visualization (see URL above), although it lacks interactivity. We would like to pursue and deepen the usage they made of the map.
We also looked at projects from students in previous years, and the project on Formula 1 history (https://formula1viz.altervista.org/index.html) is very well realized and it would also be interesting to have an interactive map linked to displayed graphs and statistics.

----------------------------------------------------------------------------------------------------------

## Milestone 2 (18th April, 5pm)

**10% of the final grade**


## Milestone 3 (30th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

