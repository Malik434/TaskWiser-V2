from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os
from typing import List, Optional

app = FastAPI()

# Enable CORS for local development
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "cost_model.pkl"
model = None

# Reusing the extraction logic (in a real app, this should be in a shared module)
def extract_features(title, description, tags):
    # Ensure tags is a list of lowercase strings
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(",")]
    else:
        tags = [t.lower() for t in tags]
    
    title = title or ""
    description = description or ""
    
    # Combine all text for keyword search
    full_text = (title + " " + description).lower()
    
    common_tags = [
        "frontend", "backend", "ai", "blockchain", 
        "security", "ui/ux", "devops", "marketing",
        "qa", "analytics", "mobile"
    ]
    
    features = [
        len(title),
        len(description),
        len(tags)
    ]
    
    for tag_keyword in common_tags:
        # Check if tag is in tags list OR if keyword appears in text
        has_tag = (tag_keyword in tags) or (tag_keyword in full_text)
        features.append(int(has_tag))
        
    return features

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("✅ Model loaded successfully")
    else:
        print("⚠️ Model not found. Please run train_model.py first.")

class TaskInput(BaseModel):
    title: str
    description: str
    tags: List[str]

class UpdateInput(BaseModel):
    title: str
    description: str
    tags: List[str]
    actual_cost: float

@app.get("/")
def read_root():
    return {"status": "ML Service Running"}

@app.post("/predict")
def predict(task: TaskInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    features = extract_features(task.title, task.description, task.tags)
    
    # Predict
    # Note: model is a Pipeline(StandardScaler, SGDRegressor)
    predicted_cost = model.predict([features])[0]
    
    # Ensure non-negative
    predicted_cost = max(10.0, predicted_cost)
    
    return {"predicted_cost": int(predicted_cost)}

@app.post("/update")
def update(task: UpdateInput):
    global model
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    features = extract_features(task.title, task.description, task.tags)
    X_new = np.array([features])
    y_new = np.array([task.actual_cost])
    
    # Partial fit for SGDRegressor
    # Access the regressor step inside the pipeline
    # Pipeline steps: ['standardscaler', 'sgdregressor']
    
    # For a pipeline, we can't easily call partial_fit on the whole pipeline if StandardScaler needs global stats.
    # However, for online learning, we often just retrain or update the regressor.
    # A simplified approach for this "update" endpoint without retraining the whole scaler:
    # We will just assume the scaler is fixed for now or try to update if possible.
    # Standard scaler supports partial_fit.
    
    try:
        scaler = model.named_steps['standardscaler']
        regressor = model.named_steps['sgdregressor']
        
        scaler.partial_fit(X_new)
        X_scaled = scaler.transform(X_new)
        regressor.partial_fit(X_scaled, y_new)
        
        # Save updated model
        joblib.dump(model, MODEL_PATH)
        
        return {"status": "model updated", "new_cost_learned": task.actual_cost}
    except Exception as e:
        print(f"Error updating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )
