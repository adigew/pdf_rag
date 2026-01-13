"""Ollama model endpoints."""
from fastapi import APIRouter, HTTPException
from typing import List
import ollama
import logging

from ..models import ModelInfo

router = APIRouter(prefix="/api/v1/models", tags=["models"])
logger = logging.getLogger(__name__)


def is_chat_model(model_name: str, model_size: int) -> bool:
    """
    Intelligently detect if a model supports chat (vs embedding-only).

    Uses multiple heuristics:
    1. Name patterns: Check for common embedding model indicators
    2. Size check: Embedding models are typically < 1GB
    """
    model_lower = model_name.lower()

    # Heuristic 1: Explicit name-based exclusion (Strongest Signal)
    # Common embedding model name patterns
    embedding_indicators = [
        'embed', 'embedding', 'bge', 'e5', 'sentence',
        'mpnet', 'minilm', 'retrieval'
    ]

    for indicator in embedding_indicators:
        if indicator in model_lower:
            logger.info(f"🔍 Model '{model_name}' name contains '{indicator}', likely embedding model")
            return False

    # Heuristic 2: Size check (Secondary Signal)
    # Embedding models are typically small (< 400MB)
    # Some small chat models (like TinyLlama) can be around 600MB-1GB
    # So we lower the threshold to avoid filtering valid tiny LLMs
    SIZE_THRESHOLD = 400_000_000  # 400 MB
    if model_size < SIZE_THRESHOLD:
        logger.info(f"🔍 Model '{model_name}' is very small ({model_size / 1e9:.2f}GB), likely embedding model")
        return False
        
    # Heuristic 3: Try to get model details (Optional/Slower, but accurate)
    try:
        model_info = ollama.show(model_name)
        # Check modelfile for embedding-specific configurations
        if hasattr(model_info, 'modelfile'):
            modelfile = model_info.modelfile if isinstance(model_info.modelfile, str) else ''
            if 'embed' in modelfile.lower():
                logger.info(f"🔍 Model '{model_name}' has 'embed' in modelfile, likely embedding model")
                return False
    except Exception as e:
        logger.debug(f"Could not get detailed info for {model_name}: {e}")

    # Default: assume it's a chat model
    logger.info(f"✅ Model '{model_name}' appears to be a chat model")
    return True


@router.get("", response_model=List[ModelInfo])
def list_models():
    """List available Ollama chat models (auto-detects and excludes embedding models)."""
    try:
        models_info = ollama.list()
        chat_models = []

        logger.info(f"📊 Analyzing {len(models_info.models)} models...")

        for model in models_info.models:
            model_dict = model.model_dump()
            model_name = model_dict.get('model', '')
            model_size = model_dict.get('size', 0)

            # Intelligently detect if this is a chat-capable model
            if is_chat_model(model_name, model_size):
                chat_models.append(ModelInfo(
                    name=model_name,
                    size=model_size,
                    modified_at=str(model_dict.get('modified_at', ''))
                ))
                logger.info(f"✅ Added chat model: {model_name}")
            else:
                logger.info(f"⏭️  Skipped non-chat model: {model_name}")

        if not chat_models:
            logger.warning("⚠️  No chat models found! Please install a chat model with: ollama pull llama3.2")
            raise HTTPException(
                status_code=404,
                detail="No chat models found. Please install one with: ollama pull llama3.2"
            )

        logger.info(f"🎯 Returning {len(chat_models)} chat models")
        return chat_models

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")
