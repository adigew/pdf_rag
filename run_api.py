"""Run the FastAPI server."""
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Disable ChromaDB telemetry to prevent SSL errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"

if __name__ == "__main__":
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
