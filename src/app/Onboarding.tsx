import { useEffect, useState, useRef } from "react";
import { businessCategories } from "../data/business-categories";
import App from "./App";

type Choice = { categoryId: string; subcategoryId: string };
const storageKey = "reality-lab.business";
function readChoice(): Choice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    const valid = businessCategories.some(
      (c) =>
        c.id === saved?.categoryId &&
        c.subcategories.some((s) => s.id === saved?.subcategoryId),
    );
    return valid ? saved : null;
  } catch {
    return null;
  }
}

export default function Onboarding() {
  const [saved, setSaved] = useState(readChoice);
  const [screen, setScreen] = useState<"splash" | "select" | "app">("splash");
  const [brandReady, setBrandReady] = useState(false);
  useEffect(() => {
    if (!brandReady || screen !== "splash") return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setScreen(saved ? "app" : "select"));
    });
    return () => cancelAnimationFrame(frame);
  }, [brandReady, saved, screen]);
  if (screen === "app")
    return <App changeBusiness={() => setScreen("select")} />;
  if (screen === "splash")
    return (
      <main className="onboard splash" aria-label="Loading Reality Lab">
        <div className="splash-brand">
          <img
            src="/assets/branding/paytm-for-business.png"
            alt="Paytm for Business"
            onLoad={() => setBrandReady(true)}
            onError={() => setBrandReady(true)}
          />
          <p>Reality Lab</p>
          <small>Independent concept · Unaffiliated with Paytm</small>
        </div>
        <div className="splash-dots" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </main>
    );
  return (
    <CategoryPicker
      saved={saved}
      back={saved ? () => setScreen("app") : undefined}
      confirm={(choice) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(choice));
        } catch {
          /* Session choice still works when storage is unavailable. */
        }
        setSaved(choice);
        setScreen("app");
      }}
    />
  );
}

function CategoryPicker({
  saved,
  back,
  confirm,
}: {
  saved: Choice | null;
  back?: () => void;
  confirm: (choice: Choice) => void;
}) {
  const [categoryId, setCategory] = useState(
    saved?.categoryId ?? businessCategories[0].id,
  );
  const [choice, setChoice] = useState(saved);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const groups = businessCategories
    .map((c) => ({
      ...c,
      subcategories: c.subcategories.filter(
        (s) =>
          c.label.toLowerCase().includes(query) ||
          s.label.toLowerCase().includes(query),
      ),
    }))
    .filter((c) => c.subcategories.length);
  const active = groups.find((c) => c.id === categoryId) ?? groups[0];
  const valid =
    active &&
    choice?.categoryId === active.id &&
    active.subcategories.some((s) => s.id === choice.subcategoryId);
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    grid.current?.scrollTo(0, 0);
  }, [active?.id, query]);
  return (
    <main className="onboard picker">
      <header>
        {back && (
          <button aria-label="Back to product experiences" onClick={back}>
            ←
          </button>
        )}
        <h1>Select Business Category &amp; Sub-Category</h1>
      </header>
      <label className="business-search">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="10" cy="10" r="6" />
          <path d="m15 15 6 6" />
        </svg>
        <input
          type="search"
          aria-label="Search categories and subcategories"
          placeholder="Search category or sub-category"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <section className="business-options">
        <nav aria-label="Business categories">
          {groups.map((c) => (
            <button
              key={c.id}
              aria-pressed={c.id === active.id}
              onClick={() => {
                if (active.id !== c.id) setChoice(null);
                setCategory(c.id);
              }}
            >
              {c.label}
            </button>
          ))}
        </nav>
        <div className="business-grid-scroll" ref={grid}>
          {active ? (
            <>
              <h2>{active.label}</h2>
              <div className="business-grid">
                {active.subcategories.map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={
                      choice?.subcategoryId === s.id &&
                      choice.categoryId === active.id
                    }
                    onClick={() =>
                      setChoice({ categoryId: active.id, subcategoryId: s.id })
                    }
                  >
                    <img
                      src={s.iconSrc}
                      width="64"
                      height="64"
                      alt=""
                      decoding="async"
                    />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p role="status">No matching categories.</p>
          )}
        </div>
      </section>
      <footer>
        <button
          disabled={!valid}
          onClick={() => {
            if (valid && choice) confirm(choice);
          }}
        >
          Confirm
        </button>
      </footer>
    </main>
  );
}
