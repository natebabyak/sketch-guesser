"use client";

import { Github } from "@/components/icons/github";
import { SketchGuesser } from "@/components/icons/sketch-guesser";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { pipeline } from "@huggingface/transformers";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  const { setTheme, theme } = useTheme();

  let drawing = false;

  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    canvas.height = canvas.clientHeight;
    canvas.width = canvas.clientWidth;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    ctx.lineCap = "round";
    ctx.lineWidth = 4;

    canvas.addEventListener("mousedown", (e) => {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener("mouseup", () => {
      drawing = false;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });

    canvas.addEventListener("mouseleave", () => {
      drawing = false;
    });
  }, []);

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
                setTheme(theme == "light" ? "dark" : "light");
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
      <main className="grid gap-4 px-4">
        <h1 className="text-center text-2xl">Draw "word"</h1>
        <div className="w-full max-w-7xl">
          <canvas id="canvas" className="w-full rounded-2xl border" />
        </div>
        <ButtonGroup className="mx-auto">
          <Button variant="outline">Clear</Button>
          <Button variant="outline">Skip</Button>
          <Button variant="outline">Exit</Button>
        </ButtonGroup>
      </main>
    </>
  );
}
