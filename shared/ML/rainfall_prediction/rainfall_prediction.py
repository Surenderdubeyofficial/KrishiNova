import pandas as pd
import sys

# Load the dataset into a dataframe
df = pd.read_csv('ML/rainfall_prediction/rainfall_in_india_1901-2015.csv')

# Define a function to predict rainfall for a given subdivision/state and month
def predict_rainfall(state, month):
    normalized_state = str(state).strip().upper()
    normalized_month = str(month).strip().upper()

    if normalized_month not in df.columns:
        return "Invalid month"

    # First try the exact subdivision used by the dataset.
    state_data = df[df['SUBDIVISION'].str.upper() == normalized_state]

    # Users usually type a state name like "Karnataka". In that case, use all
    # matching rainfall subdivisions instead of returning NaN.
    if state_data.empty:
        state_data = df[df['SUBDIVISION'].str.upper().str.contains(normalized_state, na=False)]

    if state_data.empty:
        return "No rainfall data found"

    avg_rainfall = state_data[normalized_month].mean()

    if pd.isna(avg_rainfall):
        return "No rainfall data found"

    return round(float(avg_rainfall), 2)

# Get the input parameters as command line arguments
Jregion = sys.argv[1]
Jmonth = sys.argv[2]

#predicted_rainfall = predict_rainfall('ANDAMAN & NICOBAR ISLANDS', 'JAN')

predicted_rainfall = predict_rainfall(Jregion, Jmonth)
print(predicted_rainfall)

