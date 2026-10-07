// Animated heartbeat monitor line (pure CSS animation, no JS needed).
// One heartbeat = 200 units wide; the strip repeats it 4 times.
const BEAT = (x) =>
  `L${x + 60},40 L${x + 70},34 L${x + 80},40 L${x + 100},40 L${x + 108},47 L${x + 116},6 ` +
  `L${x + 126},72 L${x + 134},40 L${x + 152},40 L${x + 164},29 L${x + 178},40 L${x + 200},40`;
const PATH = 'M0,40 ' + [0, 200, 400, 600].map(BEAT).join(' ');

export default function EcgStrip({ className = '' }) {
  return (
    <div className={`ecg-window ${className}`} aria-hidden="true">
      <div className="ecg-track">
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 800 80" preserveAspectRatio="none">
            <path d={PATH} />
          </svg>
        ))}
      </div>
    </div>
  );
}
