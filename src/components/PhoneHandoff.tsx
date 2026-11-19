import { useEffect, useRef } from "react";
import { toCanvas } from "qrcode";
export default function PhoneHandoff() {
  const ref = useRef<HTMLCanvasElement>(null);
  const url = new URL(location.pathname, location.origin).href;
  const shareable =
    location.protocol === "https:" &&
    !/^(localhost|.*\.localhost|127\.[\d.]+|\[::1\])$/.test(location.hostname);
  useEffect(() => {
    if (ref.current)
      void toCanvas(ref.current, url, { width: 132, margin: 4 }).catch(
        () => {},
      );
  }, [url, shareable]);
  return (
    <section className="handoff" aria-label="Open on phone">
      {shareable && (
        <canvas ref={ref} aria-label="QR code linking to this website" />
      )}
      <div>
        <h2>Open on your phone</h2>
        <p>
          {shareable
            ? "Scan this website link with your iPhone or Android camera to try AR."
            : "Open the app’s shared HTTPS address in Safari on iPhone or Chrome on Android. This local preview supports camera-free practice."}
        </p>
        {shareable && <a href={url}>{url}</a>}
      </div>
    </section>
  );
}
