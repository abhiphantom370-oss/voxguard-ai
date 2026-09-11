import os

def is_cloud_lite() -> bool:
    """
    Returns True if the backend is running in Render Cloud-Lite mode.
    In Cloud-Lite mode, heavy ML models (PyTorch, Whisper, AASIST)
    are bypassed to operate comfortably under Render Free's 512 MB RAM limit.
    """
    return os.environ.get("VOXGUARD_CLOUD_LITE", "false").lower() in ("true", "1", "yes")
