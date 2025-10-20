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

const SKETCH_PADDING = 4;
const THROTTLE = 100;

export default function Home() {
  const { setTheme, theme } = useTheme();

  const [answer, setAnswer] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [sketchBoundingBox, setSketchBoundingBox] = useState<number[] | null>(
    null,
  );
  const [guessedCorrectly, setGuessedCorrectly] = useState(false);

  const sketchBoundingBoxRef = useRef(sketchBoundingBox);

  useEffect(() => {
    sketchBoundingBoxRef.current = sketchBoundingBox;
  }, [sketchBoundingBox]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classifierRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const lastGuessTimeRef = useRef(0);

  const loadClassifier = async () => {
    classifierRef.current = await pipeline(
      "image-classification",
      "Xenova/quickdraw-mobilevit-small",
    );
  };

  const randomizeAnswer = () =>
    setAnswer(WORDS[Math.floor(Math.random() * WORDS.length)]);

  const makeGuess = async () => {
    const currentBoundingBox = sketchBoundingBoxRef.current;

    if (!canvasRef.current || !classifierRef.current || !currentBoundingBox)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [origLeft, origTop, right, bottom] = currentBoundingBox;

    let left = origLeft;
    let top = origTop;

    const width = right - left;
    const height = bottom - top;
    let sketchSize = 2 * SKETCH_PADDING;

    if (width >= height) {
      sketchSize += width;
      top = Math.max(top - (width - height) / 2, 0);
    } else {
      sketchSize += height;
      left = Math.max(left - (height - width) / 2, 0);
    }

    const imgData = ctx.getImageData(
      left - SKETCH_PADDING,
      top - SKETCH_PADDING,
      sketchSize,
      sketchSize,
    );

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 224;
    tempCanvas.height = 224;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    const tempCanvas2 = document.createElement("canvas");
    tempCanvas2.width = sketchSize;
    tempCanvas2.height = sketchSize;
    const tempCtx2 = tempCanvas2.getContext("2d");
    if (!tempCtx2) return;

    tempCtx2.putImageData(imgData, 0, 0);

    tempCtx.drawImage(tempCanvas2, 0, 0, 224, 224);

    const imageData = tempCtx.getImageData(0, 0, 224, 224);
    const data = new Uint8ClampedArray(224 * 224);

    for (let i = 0; i < data.length; i++) {
      data[i] = imageData.data[i * 4 + 3];
    }

    const img = new RawImage(data, 224, 224, 1);
    const output = await classifierRef.current(img, { top_k: 1 });

    if (output && output[0]) {
      setGuess(output[0].label);
      setConfidence(output[0].score);
    }
  };

  const clear = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setGuess(null);
    setConfidence(null);
    setSketchBoundingBox(null);
    setGuessedCorrectly(false);
  };

  const skip = () => {
    clear();
    randomizeAnswer();
  };

  useEffect(() => {
    loadClassifier();
    randomizeAnswer();

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineWidth = 15;
    ctx.strokeStyle = "black";

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "C" || e.key === "c") {
        clear();
      } else if (e.key === "S" || e.key === "s") {
        skip();
      }
    };

    const handleMousedown = (e: MouseEvent) => {
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const handleMousemove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;

      const x = e.offsetX;
      const y = e.offsetY;
      const brushRadius = 4;

      setSketchBoundingBox((prev) =>
        prev === null
          ? [x, y, x, y]
          : [
              Math.min(prev[0], x - brushRadius),
              Math.min(prev[1], y - brushRadius),
              Math.max(prev[2], x + brushRadius),
              Math.max(prev[3], y + brushRadius),
            ],
      );

      ctx.lineTo(x, y);
      ctx.stroke();

      const now = Date.now();
      if (now - lastGuessTimeRef.current > THROTTLE) {
        lastGuessTimeRef.current = now;
        makeGuess();
      }
    };

    const handleMouseleave = () => {
      isDrawingRef.current = false;
    };

    const handleMouseup = () => {
      isDrawingRef.current = false;
    };

    window.addEventListener("keydown", handleKeydown);
    canvas.addEventListener("mousedown", handleMousedown);
    canvas.addEventListener("mousemove", handleMousemove);
    canvas.addEventListener("mouseleave", handleMouseleave);
    canvas.addEventListener("mouseup", handleMouseup);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      canvas.removeEventListener("mousedown", handleMousedown);
      canvas.removeEventListener("mousemove", handleMousemove);
      canvas.removeEventListener("mouseleave", handleMouseleave);
      canvas.removeEventListener("mouseup", handleMouseup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (guess && guess === answer) {
      setGuessedCorrectly(true);
    }
  }, [guess, answer, guessedCorrectly]);

  return (
    <>
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
      <main className="flex flex-col gap-4 px-4 pb-4">
        <p className="text-center text-2xl font-light">
          Draw &quot;{answer}&quot; {guessedCorrectly ? "✅" : ""}
        </p>
        <canvas
          ref={canvasRef}
          className="mx-auto rounded-2xl border bg-white"
          style={{ width: "500px", height: "500px" }}
        />
        <p className="text-center text-xl font-light">
          {guess && confidence
            ? `${guess} (${(confidence * 100).toFixed(2)}%)`
            : "Start drawing..."}
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
    </>
  );
}
