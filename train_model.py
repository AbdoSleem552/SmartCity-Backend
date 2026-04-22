import os
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, 'data', 'gas_data.csv')
MODEL_FILE = os.path.join(BASE_DIR, 'data', 'mq2_model.pkl')

def train():
    if not os.path.exists(CSV_FILE):
        print(f"Dataset not found at {CSV_FILE}")
        return

    print("Loading data...")
    df = pd.read_csv(CSV_FILE)

    # Use ONLY the MQ2 column for features (X)
    X = df[['MQ2']]

    # Target column (y)
    y = df['Gas']

    print("Training Decision Tree model on MQ2 data...")
    clf = DecisionTreeClassifier(max_depth=5, random_state=42)
    clf.fit(X, y)

    # Save the trained model
    os.makedirs(os.path.dirname(MODEL_FILE), exist_ok=True)
    joblib.dump(clf, MODEL_FILE)

    print(f"Model successfully saved to {MODEL_FILE}")
    
    # Test predictability on existing data
    sample_val = 556
    pred = clf.predict([[sample_val]])
    print(f"Test prediction for MQ2={sample_val} -> {pred[0]}")

if __name__ == "__main__":
    train()
