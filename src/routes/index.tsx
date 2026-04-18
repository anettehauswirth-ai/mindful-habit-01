import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSessions } from "@/hooks/use-sessions";
import { todayISO, type Session } from "@/lib/sessions";
import { Lotus } from "@/components/Lotus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Practice — Stillness" },
      { name: "description", content: "Log your daily mindfulness session." },
    ],
  }),
  component: LogSessionPage,
});

function LogSessionPage() {
  const { add } = useSessions();
  const [duration, setDuration] = useState("");
  const [presence, setPresence] = useState([3]);
  const [notes, setNotes] = useState("");

  const today = new Date();
  const prettyDate = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleSave = () => {
    const mins = parseFloat(duration);
    if (!mins || mins <= 0) {
      toast.error("Please enter a valid meditation time.");
      return;
    }
    const session: Session = {
      id: crypto.randomUUID(),
      date: todayISO(),
      createdAt: new Date().toISOString(),
      durationMin: mins,
      presence: presence[0],
      notes: notes.trim(),
    };
    add(session);
    toast.success("Session saved. A lotus blooms today. 🪷");
    setDuration("");
    setPresence([3]);
    setNotes("");
  };

  return (
    <section className="glass rounded-3xl p-7 sm:p-10 shadow-soft animate-bloom">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Lotus size={52} glow />
        </div>
        <h2 className="text-2xl font-semibold text-gold mb-1">Today's Session</h2>
        <p className="text-sm text-muted-foreground">{prettyDate}</p>
      </div>

      <div className="space-y-7">
        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm">
            Meditation time
          </Label>
          <div className="relative">
            <Input
              id="duration"
              type="number"
              inputMode="decimal"
              min="1"
              placeholder="20"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-background/40 border-border/60 h-12 pr-20 text-base"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              minutes
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label className="text-sm">How present did you feel?</Label>
            <span className="text-gold text-lg font-medium tabular-nums">
              {presence[0]}<span className="text-muted-foreground text-xs"> / 5</span>
            </span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={presence}
            onValueChange={setPresence}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <span>Scattered</span>
            <span>Fully here</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm">
            Reflections
          </Label>
          <Textarea
            id="notes"
            rows={4}
            placeholder="What arose in the stillness today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background/40 border-border/60 resize-none leading-relaxed"
          />
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-12 gradient-gold text-primary-foreground hover:opacity-90 shadow-glow text-base font-medium rounded-xl"
        >
          Save Session
        </Button>
      </div>
    </section>
  );
}
