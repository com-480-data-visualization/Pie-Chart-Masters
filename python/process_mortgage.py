import pandas as pd
import json
import os

os.makedirs('src/data', exist_ok=True)

csv_path = 'src/data/mortgage/rawa/StateMortgagesPercent-90-plusDaysLate-thru-2024-06.csv'
df = pd.read_csv(csv_path)

df_states = df[df['RegionType'] == 'State']

# Trouver toutes les colonnes de date (après 'Name' et 'FIPSCode')
date_columns = [col for col in df.columns if col[:4].isdigit() and '-' in col]

data = []
for _, row in df_states.iterrows():
    values = {date: float(row[date]) for date in date_columns}
    data.append({
        'state': row['Name'],
        'values': values
    })

with open('src/data/mortgage/clean/mortgage_delinquency_by_state.json', 'w') as f:
    json.dump(data, f, indent=2)