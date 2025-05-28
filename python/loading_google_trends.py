from pytrends.request import TrendReq
import pandas as pd
import json
import os

# Create directory if it doesn't exist
os.makedirs('src/data/google_trends', exist_ok=True)

# Setup
pytrends = TrendReq(hl='en-US', tz=360)

# Define keyword categories
generic_keywords = [
    "weather", "facebook", "youtube", "movies", "music", "sports", "games", "travel", "food",
    "health", "education", "technology", "entertainment", "fashion", "business", "science", "politics",
    "shopping", "cars", "recipes", "restaurants", "news", "holidays", "celebrities", "tv shows", "books",
    "fitness", "gardening", "photography", "pets", "parenting", "finance", "history"
]

crisis_keywords = [
    "recession", "financial crisis", "lehman brothers", "subprime", "unemployment", "bailout", "foreclosure",
    "credit crunch", "market crash", "economic crisis", "stock market", "dow jones", "wall street",
    "financial meltdown", "housing bubble", "credit crisis", "banking crisis"
]

emotional_keywords = [
    "fear", "panic", "job loss", 
    "money problems", "bank run", "layoffs", 
    "eviction", "homelessness", "inflation", "job cuts"
]

practical_keywords = [
    "how to file bankruptcy", "unemployment benefits", "food stamps", "sell house",
    "debt help", "loan default"
]

all_keywords = generic_keywords + crisis_keywords + emotional_keywords + practical_keywords

# Split into groups of 5 (Google Trends allows only 5 keywords per query)
def chunk(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]

frames = []
for chunked_keywords in chunk(all_keywords, 5):
    pytrends.build_payload(chunked_keywords, cat=0, timeframe='2007-01-01 2012-12-31', geo='', gprop='')
    df = pytrends.interest_over_time()
    if 'isPartial' in df.columns:
        df = df.drop(columns=['isPartial'])
    frames.append(df)

# Merge all keyword columns into one DataFrame on the date index
data = pd.concat(frames, axis=1)

# Drop duplicated columns (if any)
data = data.loc[:, ~data.columns.duplicated()]

# Restructure data for easier access to individual word time series
data_dict = {
    'dates': data.index.strftime('%Y-%m-%d').tolist(),
    'keywords': {},
    'averages': {},
    'is_crisis_related': {}  # New field for crisis-related flag
}

# Add each keyword's time series data, its average, and crisis-related flag
for keyword in all_keywords:
    if keyword in data.columns:
        data_dict['keywords'][keyword] = data[keyword].tolist()
        data_dict['averages'][keyword] = float(data[keyword].mean())
        # Add crisis-related flag (1 if keyword is in crisis, emotional, or practical categories)
        data_dict['is_crisis_related'][keyword] = 1 if (
            keyword in crisis_keywords or 
            keyword in emotional_keywords or 
            keyword in practical_keywords
        ) else 0

# Save raw weekly trends
with open("src/data/google_trends/weekly_google_trends.json", 'w') as f:
    json.dump(data_dict, f, indent=2)