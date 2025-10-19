"use client";

import { Github } from "@/components/icons/github";
import { SketchGuesser } from "@/components/icons/sketch-guesser";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Kbd } from "@/components/ui/kbd";
import { WORDS } from "@/data/words";
import { pipeline, RawImage } from "@huggingface/transformers";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const THROTTLE = 10;

export default function Home() {
  const { setTheme, theme } = useTheme();

  const [answer, setAnswer] = useState("");
  const [guess, setGuess] = useState("");
  const [confidence, setConfidence] = useState(0);

  // Use refs to maintain values across renders
  const drawingRef = useRef(false);
  const lastGuessTimeRef = useRef(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const classifierRef = useRef<any>(null);

  const loadPipe = async () => {
    classifierRef.current = await pipeline(
      "image-classification",
      "Xenova/quickdraw-mobilevit-small",
    );
  };

  const getAnswer = () => WORDS[Math.floor(Math.random() * WORDS.length)];

  const getImage = () => {
    if (!canvasRef.current) return null;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 224;
    tempCanvas.height = 224;

    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return null;

    // Fill with white background (QuickDraw expects white bg, black strokes)
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, 224, 224);

    // Draw the canvas content
    tempCtx.drawImage(canvasRef.current, 0, 0, 224, 224);

    const { data } = tempCtx.getImageData(0, 0, 224, 224);

    const grayscaleData = new Uint8ClampedArray(224 * 224);
    for (let i = 0; i < data.length; i += 4) {
      // Average RGB channels for proper grayscale conversion
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      grayscaleData[i / 4] = (r + g + b) / 3;
    }

    return new RawImage(grayscaleData, 224, 224, 1);
  };

  const makeGuess = async () => {
    const classifier = classifierRef.current;
    if (!classifier) return;

    const image = getImage();
    if (!image) return;

    const output = await classifier(image, { top_k: 1 });
    if (!output) return;

    setGuess(output[0].label);
    setConfidence(output[0].score);
  };

  const clear = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear and refill with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setGuess("");
    setConfidence(0);
  };

  const skip = () => {
    clear();
    setAnswer(getAnswer());
  };

  useEffect(() => {
    loadPipe();
    setAnswer(getAnswer());

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.height = canvas.clientHeight;
    canvas.width = canvas.clientWidth;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";

    // Fill canvas with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const handleMouseDown = (e: MouseEvent) => {
      drawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const handleMouseUp = () => {
      drawingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawingRef.current) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();

      const now = Date.now();
      if (now - lastGuessTimeRef.current > THROTTLE) {
        lastGuessTimeRef.current = now;
        makeGuess();
      }
    };

    const handleMouseLeave = () => {
      drawingRef.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "C" || e.key === "c") {
        clear();
      } else if (e.key === "S" || e.key === "s") {
        skip();
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="max-h-screen max-w-screen">
      <header className="w-full p-4">
        <div className="flex justify-between">
          <Button variant="ghost" asChild>
            <Link href="/">
              <SketchGuesser className="size-6" />
              <h1 className="text-lg font-extralight">sketch-guesser</h1>
            </Link>
          </Button>
          <div className="flex">
            <Button
              onClick={() => {
                setTheme(theme === "light" ? "dark" : "light");
              }}
              size="icon"
              variant="ghost"
            >
              <Sun className="scale-100 rotate-0 !transition-transform dark:scale-0 dark:rotate-90" />
              <Moon className="absolute scale-0 rotate-90 !transition-transform dark:scale-100 dark:rotate-0" />
            </Button>
            <Button size="icon" variant="ghost" asChild>
              <a
                href="https://github.com/natebabyak/sketch-guesser"
                target="_blank"
              >
                <Github />
              </a>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex flex-col gap-4 px-4">
        <p className="text-center text-2xl font-light">Draw "{answer}"</p>
        <div className="w-full max-w-5xl">
          <canvas ref={canvasRef} className="w-full rounded-2xl border" />
        </div>
        <p className="text-center font-light">
          {guess} {guess && `- ${(confidence * 100).toFixed(2)}%`}
        </p>
        <ButtonGroup className="mx-auto">
          <Button onClick={clear} variant="outline">
            Clear
            <Kbd>C</Kbd>
          </Button>
          <Button onClick={skip} variant="outline">
            Skip
            <Kbd>S</Kbd>
          </Button>
          <Button disabled={true} variant="outline">
            Exit
            <Kbd>esc</Kbd>
          </Button>
        </ButtonGroup>
      </main>
    </div>
  );
}
