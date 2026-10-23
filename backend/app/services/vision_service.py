import base64
import io
import os
import time
from datetime import datetime, timezone
from typing import List, Optional
import cv2
import numpy as np
from PIL import Image

from app.config import settings
from app.schemas import VisionAnalysisResponse, VisionDetectionItem, VisionStatusResponse


class VisionService:
    """Singleton service for computer vision hazard detection using YOLOv8."""

    _instance = None
    _model = None
    _model_loaded = False
    _model_name = "YOLOv8n (COCO-80 Pretrained)"
    _device = "cpu"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._ensure_model_loaded()

    def _ensure_model_loaded(self):
        if self._model_loaded and self._model is not None:
            return

        from ultralytics import YOLO

        # Search candidates for weights
        model_path = settings.YOLO_MODEL_PATH
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        candidates = [
            model_path,
            os.path.join(base_dir, model_path),
            os.path.join(backend_dir, model_path),
            os.path.join(base_dir, "yolov8n.pt"),
            os.path.join(backend_dir, "yolov8n.pt"),
            "yolov8n.pt"
        ]

        found_path = "yolov8n.pt"
        for c in candidates:
            if os.path.exists(c) and os.path.isfile(c):
                found_path = c
                break

        try:
            self._model = YOLO(found_path)
            self._model_loaded = True

            try:
                import torch
                self._device = "cuda:0" if torch.cuda.is_available() else "cpu"
            except Exception:
                self._device = "cpu"
        except Exception as e:
            self._model_loaded = False
            self._model = None
            raise RuntimeError(f"Failed to initialize YOLO vision model from '{found_path}': {str(e)}")

    def get_status(self) -> VisionStatusResponse:
        """Returns vision service availability, model specs, and supported classes."""
        try:
            self._ensure_model_loaded()
        except Exception:
            pass

        if not self._model_loaded or self._model is None:
            return VisionStatusResponse(
                available=False,
                model="Unavailable",
                supportedClassesCount=0,
                sampleClasses=[],
                device="none"
            )

        names = self._model.names
        sample_classes = [names[i] for i in sorted(names.keys())[:15]]
        return VisionStatusResponse(
            available=True,
            model=self._model_name,
            supportedClassesCount=len(names),
            sampleClasses=sample_classes,
            device=self._device
        )

    def _format_location(self, x1: float, y1: float, x2: float, y2: float, img_w: int, img_h: int) -> str:
        cx = (x1 + x2) / 2.0 / img_w
        cy = (y1 + y2) / 2.0 / img_h

        v_pos = "Upper" if cy < 0.33 else "Foreground / Lower" if cy > 0.66 else "Mid-level"
        h_pos = "Left" if cx < 0.33 else "Right" if cx > 0.66 else "Center"
        return f"{v_pos} {h_pos} sector (bounds: {int(x1)},{int(y1)} to {int(x2)},{int(y2)})"

    def analyze_image_bytes(
        self,
        image_bytes: bytes,
        confidence_threshold: Optional[float] = None
    ) -> VisionAnalysisResponse:
        """
        Runs real YOLO inference on uploaded image bytes.
        Returns genuine detections, bounding boxes, cautious risk assessment, and annotated image.
        """
        self._ensure_model_loaded()
        if not self._model_loaded or self._model is None:
            raise RuntimeError("YOLO Vision Model is not loaded or unavailable.")

        if not image_bytes or len(image_bytes) == 0:
            raise ValueError("Empty image payload received.")

        # Max 15 MB image limit
        if len(image_bytes) > 15 * 1024 * 1024:
            raise ValueError("Image file exceeds the 15 MB processing limit.")

        # Validate image decoding with PIL to guard against malformed/corrupt files
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            pil_img.verify()
            # Re-read image data
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_np = np.array(pil_img)
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        except Exception as exc:
            raise ValueError(f"Corrupt, invalid, or unsupported image format: {str(exc)}")

        img_h, img_w = img_bgr.shape[:2]
        conf_thresh = confidence_threshold if confidence_threshold is not None else settings.VISION_CONFIDENCE_THRESHOLD

        start_time = time.time()
        # Perform real object detection on image pixels
        results = self._model.predict(img_bgr, conf=conf_thresh, verbose=False)
        inference_time_ms = round((time.time() - start_time) * 1000, 2)

        detections: List[VisionDetectionItem] = []
        result = results[0]
        boxes = result.boxes

        person_count = 0
        vehicle_count = 0
        other_count = 0

        if boxes is not None and len(boxes) > 0:
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                cls_name = self._model.names.get(cls_id, f"class_{cls_id}").lower()
                conf = float(box.conf[0].item())
                xyxy = [float(v) for v in box.xyxy[0].tolist()]
                x1, y1, x2, y2 = xyxy

                norm_bbox = [
                    round(x1 / img_w, 4),
                    round(y1 / img_h, 4),
                    round((x2 - x1) / img_w, 4),
                    round((y2 - y1) / img_h, 4)
                ]

                location_str = self._format_location(x1, y1, x2, y2, img_w, img_h)

                if cls_name == "person":
                    person_count += 1
                    detections.append(VisionDetectionItem(
                        id=f"DET-PER-{i+1:02d}",
                        name=f"Personnel in Operational Sector ({cls_name})",
                        className=cls_name,
                        category="Personnel & PPE Protocol",
                        severity="Medium",
                        numericSeverity=3,
                        numericLikelihood=3,
                        location=location_str,
                        confidence=round(conf, 3),
                        explanation=(
                            f"YOLOv8 detected personnel with {conf:.1%} confidence. "
                            "Pretrained COCO weights confirm human presence, but cannot verify whether mandatory "
                            "PPE (ANSI hardhat, high-vis vest, fall-arrest harness) is worn. Manual verification required."
                        ),
                        recommendation=(
                            "Verify worker is equipped with mandatory PPE (hardhat, reflective vest, protective boots) "
                            "and authorized for this sector."
                        ),
                        bbox=[round(v, 1) for v in xyxy],
                        normalizedBbox=norm_bbox
                    ))
                elif cls_name in ["truck", "bus", "car", "train", "motorcycle"]:
                    vehicle_count += 1
                    sev = "High" if cls_name in ["truck", "bus"] else "Medium"
                    detections.append(VisionDetectionItem(
                        id=f"DET-VEH-{i+1:02d}",
                        name=f"Active Machinery / Vehicle ({cls_name})",
                        className=cls_name,
                        category="Equipment hazard",
                        severity=sev,
                        numericSeverity=4 if sev == "High" else 3,
                        numericLikelihood=4 if sev == "High" else 3,
                        location=location_str,
                        confidence=round(conf, 3),
                        explanation=(
                            f"YOLOv8 detected vehicular equipment ({cls_name}) with {conf:.1%} confidence. "
                            "Active equipment lanes create collision, rollover, and blind-spot crush risks."
                        ),
                        recommendation=(
                            "Enforce equipment travel exclusion perimeter, verify backup alarms, "
                            "and station certified ground spotters."
                        ),
                        bbox=[round(v, 1) for v in xyxy],
                        normalizedBbox=norm_bbox
                    ))
                elif cls_name in ["traffic light", "stop sign", "fire hydrant"]:
                    other_count += 1
                    detections.append(VisionDetectionItem(
                        id=f"DET-SGN-{i+1:02d}",
                        name=f"Traffic / Perimeter Marker ({cls_name})",
                        className=cls_name,
                        category="Access & Perimeter Control",
                        severity="Low",
                        numericSeverity=2,
                        numericLikelihood=2,
                        location=location_str,
                        confidence=round(conf, 3),
                        explanation=f"YOLOv8 identified perimeter marker ({cls_name}) with {conf:.1%} confidence.",
                        recommendation="Ensure unimpeded visibility and unobstructed access to emergency and traffic markers.",
                        bbox=[round(v, 1) for v in xyxy],
                        normalizedBbox=norm_bbox
                    ))
                else:
                    other_count += 1
                    detections.append(VisionDetectionItem(
                        id=f"DET-OBJ-{i+1:02d}",
                        name=f"Staging Material / Object ({cls_name})",
                        className=cls_name,
                        category="Housekeeping & Staging",
                        severity="Low",
                        numericSeverity=2,
                        numericLikelihood=2,
                        location=location_str,
                        confidence=round(conf, 3),
                        explanation=f"YOLOv8 detected {cls_name} with {conf:.1%} confidence in this sector.",
                        recommendation="Review staging layout to prevent corridor obstruction or tripping hazards (OSHA 1926.25).",
                        bbox=[round(v, 1) for v in xyxy],
                        normalizedBbox=norm_bbox
                    ))

        # Generate annotated image with bounding boxes
        annotated_b64 = None
        try:
            annotated_mat = result.plot()
            success, enc = cv2.imencode(".jpg", annotated_mat, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if success:
                annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(enc).decode('utf-8')}"
        except Exception:
            pass

        # Formulate cautious preliminary risk assessment
        if not detections:
            cautious_risk_level = "Indeterminate"
            summary = (
                f"No COCO-80 objects (personnel, vehicles, or equipment) detected above {conf_thresh:.0%} threshold. "
                "General-purpose YOLO does not detect sub-surface excavations, harness anchorages, or chemical hazards."
            )
        else:
            if any(d.severity == "Critical" for d in detections):
                cautious_risk_level = "Critical"
            elif any(d.severity == "High" for d in detections):
                cautious_risk_level = "High"
            elif any(d.severity == "Medium" for d in detections):
                cautious_risk_level = "Medium"
            else:
                cautious_risk_level = "Low"

            summary_parts = []
            if person_count > 0:
                summary_parts.append(f"{person_count} personnel")
            if vehicle_count > 0:
                summary_parts.append(f"{vehicle_count} vehicle(s)")
            if other_count > 0:
                summary_parts.append(f"{other_count} other object(s)")

            summary = f"Detected {', '.join(summary_parts)}. Preliminary safety review compiled."

        disclaimer = (
            "Detections performed by local YOLOv8 pretrained on standard COCO-80 categories. "
            "Standard COCO weights do not verify specialized construction PPE compliance (hard hats, harnesses) "
            "or soil shoring stability. Certified on-site safety review is mandatory."
        )

        return VisionAnalysisResponse(
            status="success",
            mode="live",
            model=self._model_name,
            inferenceTimeMs=inference_time_ms,
            summary=summary,
            detectionsCount=len(detections),
            cautiousRiskLevel=cautious_risk_level,
            hazards=detections,
            annotatedImage=annotated_b64,
            modelDisclaimer=disclaimer,
            timestamp=datetime.now(timezone.utc).isoformat()
        )


vision_service = VisionService.get_instance()
