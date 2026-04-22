import os
import joblib
import pandas as pd

class MQ2Analyzer:
    """
    Real trained Decision Tree for MQ2.
    Loads the scikit-learn model from data/mq2_model.pkl.
    """

    # Mapping custom CSV labels back to our standard UI states
    LABEL_MAP = {
        "NoGas": "CLEAN_AIR",
        "Gas": "GAS_WARNING",
        "Smoke": "SMOKE_ALARM",
        "Perfume": "PERFUME",
        "CLEAN_AIR": "CLEAN_AIR",
        "GAS_WARNING": "GAS_WARNING",
        "SMOKE_ALARM": "SMOKE_ALARM",
        "PERFUME": "PERFUME"
    }

    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), 'data', 'mq2_model.pkl')
        self.model = None

        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print(f"[MQ2 ML] Loaded model from {self.model_path}")
            except Exception as e:
                print(f"[MQ2 ML] Error loading model: {e}")
        else:
            print(f"[MQ2 ML] Warning: Model file not found at {self.model_path}. Run train_model.py first.")

    def predict(self, gas_value: int) -> str:
        """
        Runs the ML inference and returns a human-readable state string.
        """
        if self.model is None:
            # Fallback mock prediction if model hasn't been trained yet
            if gas_value < 700:
                return "CLEAN_AIR"
            elif gas_value < 1500:
                return "GAS_WARNING"
            else:
                return "SMOKE_ALARM"

        try:
            # The model expects a 2D array of features. We only trained on MQ2.
            # Using a DataFrame matches the training feature names to prevent UserWarnings.
            X = pd.DataFrame({"MQ2": [gas_value]})
            pred = self.model.predict(X)
            raw_label = str(pred[0])
            
            # Map "NoGas" / "Gas" outputs from the custom CSV to Dashboard states
            return self.LABEL_MAP.get(raw_label, "GAS_WARNING")
        except Exception as e:
            print(f"[MQ2 ML] Inference error: {e}")
            return "CLEAN_AIR"

# Instantiate a global analyzer to be used by the MQTT handler
mq2_evaluator = MQ2Analyzer()

def predict_gas_state(gas_value: int) -> str:
    """Convenience function to be imported into mqtt_handler.py"""
    return mq2_evaluator.predict(gas_value)

if __name__ == "__main__":
    print(mq2_evaluator.predict(560))

