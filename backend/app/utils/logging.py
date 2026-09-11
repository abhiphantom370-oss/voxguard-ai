import logging
import sys

def setup_logging(level=logging.INFO):
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    
    root_logger = logging.getLogger("voxguard")
    root_logger.setLevel(level)
    if not root_logger.handlers:
        root_logger.addHandler(handler)
        
    return root_logger
