/** CSS-only “something is playing” motion — no libraries. */
export function EqualizerDots() {
  return (
    <div
      className="flex h-4 items-end gap-0.5"
      aria-hidden
    >
      <span className="eq-bar h-2 w-1 rounded-sm bg-amber-500" />
      <span className="eq-bar h-4 w-1 rounded-sm bg-sage-forest [animation-delay:120ms]" />
      <span className="eq-bar h-3 w-1 rounded-sm bg-stone-400 [animation-delay:240ms]" />
      <span className="eq-bar h-2 w-1 rounded-sm bg-sage-olive [animation-delay:160ms]" />
    </div>
  );
}
