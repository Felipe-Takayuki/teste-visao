export interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Detection {
  class: string;
  confidence: number;
  box: DetectionBox;
}