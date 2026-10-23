from typing import Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, status

from app.schemas import VisionAnalysisResponse, VisionStatusResponse
from app.services.vision_service import vision_service

router = APIRouter(prefix="/vision", tags=["Computer Vision"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}


@router.get("/status", response_model=VisionStatusResponse, summary="Check computer vision model status")
def get_vision_status():
    """Returns local YOLO model availability, device, and supported class count."""
    return vision_service.get_status()


@router.post(
    "/analyze",
    response_model=VisionAnalysisResponse,
    summary="Analyse construction site photo using real computer vision"
)
async def analyze_photo(
    image: UploadFile = File(..., description="Construction photograph (JPEG, PNG, WEBP, max 15MB)"),
    confidence: Optional[float] = Query(
        None,
        ge=0.05,
        le=0.95,
        description="Optional confidence threshold (0.05 to 0.95)"
    )
):
    """
    Runs local pretrained YOLOv8 inference directly on uploaded image pixels.
    Detects supported objects, marks bounding boxes, formats cautious safety recommendations,
    and returns an annotated verification image.
    """
    # 1. Validate content type if provided
    content_type = (image.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES and content_type != "application/octet-stream":
        # Check filename extension as fallback
        filename = (image.filename or "").lower()
        if not any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{content_type}'. Please upload a JPG, JPEG, PNG, or WEBP photo."
            )

    # 2. Read file content safely in memory
    try:
        image_bytes = await image.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded image stream: {str(exc)}"
        )

    # 3. Check file size
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty (0 bytes)."
        )

    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds the 15 MB limit."
        )

    # 4. Perform computer vision inference
    try:
        result = vision_service.analyze_image_bytes(
            image_bytes=image_bytes,
            confidence_threshold=confidence
        )
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except RuntimeError as run_err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(run_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Computer vision inference error: {str(exc)}"
        )
