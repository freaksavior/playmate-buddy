import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Gamepad2,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { GAMES, getGame, type GameDef } from "@/lib/games";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pixel Arcade — Play games with an AI game host" },
      {
        name: "description",
        content:
          "Chat with Pixel, an AI game host. Play 20 Questions, Trivia, Hangman, Riddles, Word Chain and Story Detective — right in your browser.",
      },
      {
        property: "og:title",
        content: "Pixel Arcade — Play games with an AI game host",
      },
      {
        property: "og:description",
        content:
          "Chat with Pixel, an AI game host. Six party games, zero setup — just pick a game and play.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const game = activeGameId ? getGame(activeGameId) : null;

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      {game ? (
        <ChatScreen key={game.id} game={game} onExit={() => setActiveGameId(null)} />
      ) : (
        <GameLobby onPick={(id) => setActiveGameId(id)} />
      )}
    </div>
  );
}

function GameLobby({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-4 py-12 sm:py-20">
      <div className="flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
        <Gamepad2 className="h-4 w-4" />
        AI Game Host
      </div>
      <h1 className="font-display mt-6 text-center text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
        Pixel<span className="text-primary"> Arcade</span>
      </h1>
      <p className="mt-4 max-w-md text-center text-lg text-muted-foreground">
        Pick a game and play against Pixel, your AI game host. No setup, no
        downloads — just chat.
      </p>

      <div className="mt-12 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => onPick(g.id)}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className={cn("text-4xl", g.accent)}>{g.emoji}</div>
            <h2 className="font-display mt-3 text-lg font-semibold text-card-foreground group-hover:text-primary">
              {g.name}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {g.tagline}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              <Sparkles className="h-3.5 w-3.5" /> Play now
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatScreen({ game, onExit }: { game: GameDef; onExit: () => void }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { game: game.id },
      }),
    [game.id],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  // Seed the game opener as the first bot message.
  useEffect(() => {
    setMessages([
      {
        id: "opener",
        role: "assistant",
        parts: [{ type: "text", text: game.opener }],
      },
    ]);
  }, [game.id, game.opener, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    sendMessage({ text: trimmed });
  };

  const restart = () => {
    setMessages([
      {
        id: `opener-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: game.opener }],
      },
    ]);
  };

  return (
    <div className="mx-auto flex h-screen w-full max-w-3xl flex-col px-4">
      <header className="flex items-center gap-3 border-b border-border py-4">
        <button
          onClick={onExit}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back to games"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={cn("text-2xl", game.accent)}>{game.emoji}</div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-lg font-semibold text-foreground">
            {game.name}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Hosting: Pixel · {isBusy ? "thinking…" : "your move"}
          </p>
        </div>
        <button
          onClick={restart}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> New game
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const text = m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("");
          if (!text) return null;
          return (
            <div
              key={m.id}
              className={cn("flex", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap sm:max-w-[75%]",
                  isUser
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-card text-card-foreground",
                )}
              >
                {text}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Pixel is thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Pixel glitched out — please try sending that again.
          </div>
        )}
      </div>

      {messages.length <= 1 && !isBusy && (
        <div className="flex flex-wrap gap-2 pb-3">
          {game.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/20"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-border py-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your move…"
          className="min-w-0 flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
