"""
Linguistic Intelligence — Atomic Decomposition Pipeline Engine Adapter
======================================================================
Exposes AtomicDecompositionPipeline wrapping LinguisticPipeline to provide
a unified opaque-box pipeline interface for testing and end-to-end execution.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from linguistic_intelligence.config import (
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_CATALOG_PATH,
    DEFAULT_LEVELS_PATH,
)
from linguistic_intelligence.pipeline import (
    IntegratedSkillToken,
    LinguisticPipeline,
    ProvenanceRecord,
    SidecarLinguisticMetadata,
)


class AtomicDecompositionPipeline(LinguisticPipeline):
    """
    Unified end-to-end atomic decomposition pipeline.
    Inherits full functionality from LinguisticPipeline.
    """

    def __init__(
        self,
        catalog_path: str = DEFAULT_CATALOG_PATH,
        acronyms_path: str = DEFAULT_ACRONYMS_PATH,
        levels_path: str = DEFAULT_LEVELS_PATH,
    ) -> None:
        super().__init__(
            catalog_path=catalog_path,
            acronyms_path=acronyms_path,
            levels_path=levels_path,
        )


__all__ = [
    "AtomicDecompositionPipeline",
    "LinguisticPipeline",
    "IntegratedSkillToken",
    "ProvenanceRecord",
    "SidecarLinguisticMetadata",
]
