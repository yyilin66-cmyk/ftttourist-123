import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/snake")({
  component: SnakeGame,
  head: () => ({ meta: [{ title: "贪吃蛇 - Snake Game" }] }),
});

const COLS = 20;
const ROWS = 20;
const CELL = 20;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

const DIRS: Record<Dir, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

function randFood(snake: Point[]): Point {
  while (true) {
    const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
  }
}

function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(120);
  const dirRef = useRef(dir);
  dirRef.current = dir;

  const reset = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setDir("RIGHT");
    setFood({ x: 5, y: 5 });
    setScore(0);
    setOver(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const d = dirRef.current;
      if ((k === "ArrowUp" || k === "w") && d !== "DOWN") setDir("UP");
      else if ((k === "ArrowDown" || k === "s") && d !== "UP") setDir("DOWN");
      else if ((k === "ArrowLeft" || k === "a") && d !== "RIGHT") setDir("LEFT");
      else if ((k === "ArrowRight" || k === "d") && d !== "LEFT") setDir("RIGHT");
      else if (k === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (over || paused) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const delta = DIRS[dirRef.current];
        const nh = { x: head.x + delta.x, y: head.y + delta.y };
        if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS || prev.some((s) => s.x === nh.x && s.y === nh.y)) {
          setOver(true);
          setBest((b) => Math.max(b, prev.length - 1));
          return prev;
        }
        const ate = nh.x === food.x && nh.y === food.y;
        const next = [nh, ...prev];
        if (!ate) next.pop();
        else {
          setFood(randFood(next));
          setScore((s) => s + 1);
          setSpeed((sp) => Math.max(60, sp - 2));
        }
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [food, over, paused, speed]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let j = 0; j <= ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * CELL);
      ctx.lineTo(COLS * CELL, j * CELL);
      ctx.stroke();
    }
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#22c55e" : "#16a34a";
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, [snake, food]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4 gap-4">
      <h1 className="text-3xl font-bold">🐍 贪吃蛇</h1>
      <div className="flex gap-6 text-sm">
        <span>分数: <b className="text-green-400">{score}</b></span>
        <span>最高: <b className="text-yellow-400">{best}</b></span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="rounded-lg border border-slate-700" />
        {(over || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg gap-3">
            <p className="text-xl font-bold">{over ? "游戏结束" : "已暂停"}</p>
            {over && <button onClick={reset} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded font-medium">重新开始</button>}
            {!over && <button onClick={() => setPaused(false)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded font-medium">继续</button>}
          </div>
        )}
      </div>
      <div className="text-xs text-slate-400 text-center">
        方向键 / WASD 移动 · 空格暂停
      </div>
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <div />
        <button onTouchStart={() => dirRef.current !== "DOWN" && setDir("UP")} onClick={() => dirRef.current !== "DOWN" && setDir("UP")} className="p-4 bg-slate-800 rounded">↑</button>
        <div />
        <button onTouchStart={() => dirRef.current !== "RIGHT" && setDir("LEFT")} onClick={() => dirRef.current !== "RIGHT" && setDir("LEFT")} className="p-4 bg-slate-800 rounded">←</button>
        <button onClick={() => setPaused((p) => !p)} className="p-4 bg-slate-700 rounded">⏸</button>
        <button onTouchStart={() => dirRef.current !== "LEFT" && setDir("RIGHT")} onClick={() => dirRef.current !== "LEFT" && setDir("RIGHT")} className="p-4 bg-slate-800 rounded">→</button>
        <div />
        <button onTouchStart={() => dirRef.current !== "UP" && setDir("DOWN")} onClick={() => dirRef.current !== "UP" && setDir("DOWN")} className="p-4 bg-slate-800 rounded">↓</button>
        <div />
      </div>
    </div>
  );
}
