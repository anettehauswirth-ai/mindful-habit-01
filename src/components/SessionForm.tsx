import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { todayISO, type NewSession } from "@/lib/sessions";

export type SessionFormInitialValues = {
  date?: Date;
  durationMin?: number;
  presence?: number;
  notes?: string;
};

export type SessionFormProps = {
  initialValues?: SessionFormInitialValues;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (values: NewSession) => void | Promise<void>;
  onCancel?: () => void;
  /**
   * When true the form reverts to its initial state after a successful submit.
   * Useful for the "log a session" screen where the user logs many sessions
   * in a row; not useful for an edit dialog.
   */
  resetOnSubmit?: boolean;
  /**
   * When true the duration input is focused on mount. Used on the "log a
   * session" screen where duration is the first thing the user needs to
   * enter; the edit dialog leaves this off so focus stays on the dialog.
   */
  autoFocusDuration?: boolean;
};

const MAX_DURATION_MIN = 1440; // 24 hours
const MAX_NOTES_LENGTH = 2000;
const NOTES_COUNTER_THRESHOLD = Math.floor(MAX_NOTES_LENGTH * 0.8);

/** End of the user's current local day — safe upper bound for the date picker. */
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDate(value?: Date): Date {
  return value instanceof Date && !Number.isNaN(value.valueOf())
    ? value
    : new Date();
}

export function SessionForm({
  initialValues,
  submitLabel = "Save Session",
  cancelLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
  resetOnSubmit = false,
  autoFocusDuration = false,
}: SessionFormProps) {
  const defaults = {
    date: toDate(initialValues?.date),
    duration:
      initialValues?.durationMin !== undefined
        ? String(initialValues.durationMin)
        : "",
    presence: initialValues?.presence ?? 3,
    notes: initialValues?.notes ?? "",
  };

  const [date, setDate] = useState<Date>(defaults.date);
  const [duration, setDuration] = useState<string>(defaults.duration);
  const [presence, setPresence] = useState<number[]>([defaults.presence]);
  const [notes, setNotes] = useState<string>(defaults.notes);

  // If the caller passes new initialValues (e.g. opening an edit dialog for a
  // different session), sync the form. We key on the durationMin+notes+date
  // combo which is stable enough for our use case.
  useEffect(() => {
    setDate(defaults.date);
    setDuration(defaults.duration);
    setPresence([defaults.presence]);
    setNotes(defaults.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialValues?.date?.toISOString(),
    initialValues?.durationMin,
    initialValues?.presence,
    initialValues?.notes,
  ]);

  const handleSubmit = async () => {
    const mins = parseFloat(duration);
    if (!Number.isFinite(mins) || mins <= 0) {
      toast.error("Please enter how long you sat, in minutes.");
      return;
    }
    if (mins > MAX_DURATION_MIN) {
      toast.error("That's more than 24 hours — please double-check the time.");
      return;
    }
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > MAX_NOTES_LENGTH) {
      toast.error(
        `Reflections are limited to ${MAX_NOTES_LENGTH.toLocaleString()} characters.`,
      );
      return;
    }
    await onSubmit({
      date: todayISO(date),
      durationMin: mins,
      presence: presence[0],
      notes: trimmedNotes,
    });
    if (resetOnSubmit) {
      setDate(new Date());
      setDuration("");
      setPresence([3]);
      setNotes("");
    }
  };

  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      noValidate
    >
      <div className="text-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
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
              disabled={(d) => d > endOfToday()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="duration"
          className="text-[1.1875rem] block text-center"
        >
          Enter meditation time:
        </Label>
        <div className="relative mx-auto w-[14rem]">
          <Input
            id="duration"
            type="number"
            inputMode="decimal"
            min="1"
            max={MAX_DURATION_MIN}
            placeholder="20"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            autoFocus={autoFocusDuration}
            className="bg-background/40 border-border/60 h-12 pr-20 !text-[1.5625rem] md:!text-[1.5625rem] text-center"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[1.0625rem] text-muted-foreground">
            minutes
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-center">
          <Label className="text-[1.1875rem] block">
            How present did you feel?
          </Label>
          <span className="text-gold text-[1.4375rem] font-medium tabular-nums">
            {presence[0]}
            <span className="text-muted-foreground text-[1.0625rem]">
              {" "}
              / 5
            </span>
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
          Enter your reflections:
        </Label>
        <Textarea
          id="notes"
          rows={4}
          maxLength={MAX_NOTES_LENGTH}
          placeholder="What arose in the stillness today..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-background/40 border-border/60 resize-none leading-relaxed text-[1.3125rem]"
        />
        {notes.length >= NOTES_COUNTER_THRESHOLD && (
          <p
            className={cn(
              "text-xs text-right tabular-nums",
              notes.length >= MAX_NOTES_LENGTH
                ? "text-destructive"
                : "text-muted-foreground/70",
            )}
            aria-live="polite"
          >
            {notes.length.toLocaleString()} /{" "}
            {MAX_NOTES_LENGTH.toLocaleString()}
          </p>
        )}
      </div>

      <div className={cn("flex gap-3", onCancel ? "flex-col sm:flex-row" : "")}>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 h-12 text-[1.1875rem] font-medium rounded-xl"
          >
            {cancelLabel ?? "Cancel"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 gradient-gold text-primary-foreground hover:opacity-90 shadow-glow text-[1.3125rem] font-medium rounded-xl disabled:opacity-70"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
