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

  const [date, setDate] = useState<Date>(new Date());

  const handleSave = () => {
    const mins = parseFloat(duration);
    if (!mins || mins <= 0) {
      toast.error("Please enter a valid meditation time.");
      return;
    }
    const session: Session = {
      id: crypto.randomUUID(),
      date: todayISO(date),
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
    setDate(new Date());
  };

  return (
    <section className="glass rounded-3xl p-7 sm:p-10 shadow-soft animate-bloom">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Lotus size={52} glow />
        </div>
        <h2 className="text-[1.8125rem] font-semibold text-gold mb-1">Today's Session</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "mt-1 h-auto py-1 px-2 text-[1.5rem] text-gold hover:text-gold hover:bg-background/40 font-normal",
              )}
            >
              <CalendarIcon className="mr-2 h-5 w-5 opacity-70" />
              {format(date, "EEEE, MMMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-7">
        <div className="space-y-2">
          <Label htmlFor="duration" className="text-[1.1875rem] block text-center">
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
              className="bg-background/40 border-border/60 h-12 pr-20 text-[1.3125rem]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[1.1875rem] text-muted-foreground">
              minutes
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-center">
            <Label className="text-[1.1875rem] block">How present did you feel?</Label>
            <span className="text-gold text-[1.4375rem] font-medium tabular-nums">
              {presence[0]}<span className="text-muted-foreground text-[1.0625rem]"> / 5</span>
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
          <div className="flex justify-between text-[0.9375rem] uppercase tracking-wider text-muted-foreground/70">
            <span>Scattered</span>
            <span>Fully here</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-[1.1875rem] block text-center">
            Reflections
          </Label>
          <Textarea
            id="notes"
            rows={4}
            placeholder="What arose in the stillness today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background/40 border-border/60 resize-none leading-relaxed text-[1.3125rem]"
          />
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-12 gradient-gold text-primary-foreground hover:opacity-90 shadow-glow text-[1.3125rem] font-medium rounded-xl"
        >
          Save Session
        </Button>
      </div>
    </section>
  );
}
