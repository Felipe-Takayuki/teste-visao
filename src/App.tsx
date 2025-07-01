import { useEffect, useRef, useState } from "react";
import axios from "axios";

interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Detection {
  class: string;
  confidence: number;
  box: DetectionBox;
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);

  // Inicia a câmera
  useEffect(() => {
  const initCamera = async () => {
    try {
      // Primeiro: pedir permissão
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Agora podemos listar as câmeras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      let selectedDeviceId: string | undefined;

      if (videoDevices.length > 1) {
        selectedDeviceId = videoDevices[1].deviceId;
      } else if (videoDevices.length > 0) {
        selectedDeviceId = videoDevices[0].deviceId;
      }

      if (!selectedDeviceId) {
        console.log("Nenhuma câmera encontrada.");
        return;
      }

      // Fechar o stream inicial (libera câmera)
      initialStream.getTracks().forEach((track) => track.stop());

      // Iniciar com a câmera selecionada
      const finalStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = finalStream;
      }
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
    }
  };

  initCamera();

  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, []);


  const startDetection = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);

    intervalRef.current = setInterval(() => {
      captureAndSend();
    }, 200);
  };

  const stopDetection = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  };

  const captureAndSend = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const response = await axios.post<{ results: Detection[] }>(
          "http://localhost:8000/predict/",
          formData
        );
        drawDetections(response.data.results);
      } catch (err) {
        console.error("Erro na detecção:", err);
      }
    }, "image/jpeg");
  };

  const drawDetections = (detections: Detection[]) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00FF00";

    detections.forEach((det) => {
      const { x1, y1, x2, y2 } = det.box;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillText(`${det.class} (${(det.confidence * 100).toFixed(1)}%)`, x1, y1 - 5);
    });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Teste - Síntegra Experience</h1>
      <div style={{ position: "relative", display: "inline-block" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "640px", height: "auto" }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      </div>
      <br />
      {!running ? (
        <button onClick={startDetection}>▶️ Iniciar detecção</button>
      ) : (
        <button onClick={stopDetection}>⏹️ Parar detecção</button>
      )}
    </div>
  );
}

export default App;
