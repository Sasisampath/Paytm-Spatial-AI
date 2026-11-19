import { useEffect, useRef } from "react";
import { toCanvas } from "qrcode";
export default function PhoneHandoff() {
  const ref = useRef<HTMLCanvasElement>(null);
  const url = new URL(location.pathname, location.origin).href;
  useEffect(() => {
    if (ref.current)
      void toCanvas(ref.current, url, { width: 132, margin: 4 }).catch(
        () => {},
      );
  }, [url]);
  return (
    <section className="handoff" aria-label="Open on phone">
      <canvas ref={ref} aria-label="QR code linking to this website" />
      <div>
        <h2>Open on your phone</h2>
        <p>
          Scan this link with an iPhone or Android camera to try AR on a
          compatible device.
        </p>
        <a href={url}>{url}</a>
      </div>
    </section>
  );
}
