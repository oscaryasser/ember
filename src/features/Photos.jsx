import { useEffect, useRef, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { savePhoto, listPhotos, deletePhoto } from "../lib/photos.js";
import { todayKey, shortDate } from "../lib/dates.js";

// Progress photos live only in IndexedDB on this device — never uploaded,
// never part of the JSON backup (they'd blow up the file).
export default function Photos() {
  const [photos, setPhotos] = useState(null);
  const [urls, setUrls] = useState({});
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const refresh = () => listPhotos().then(setPhotos).catch(() => setPhotos([]));
  useEffect(() => { refresh(); }, []);

  // Object URLs for thumbnails; revoke when the photo list changes.
  useEffect(() => {
    if (!photos) return;
    const map = {};
    photos.forEach((p) => { map[p.id] = URL.createObjectURL(p.blob); });
    setUrls(map);
    return () => Object.values(map).forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await savePhoto(file, todayKey());
      await refresh();
    } catch (err) {
      alert("Couldn't save the photo: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const tapPhoto = (p) => {
    if (selA === p.id) return setSelA(null);
    if (selB === p.id) return setSelB(null);
    if (selA === null) return setSelA(p.id);
    if (selB === null) return setSelB(p.id);
    setSelA(p.id); setSelB(null);
  };

  const remove = async (id) => {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    await deletePhoto(id);
    if (selA === id) setSelA(null);
    if (selB === id) setSelB(null);
    refresh();
  };

  const a = photos?.find((p) => p.id === selA);
  const b = photos?.find((p) => p.id === selB);

  return (
    <Card style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <SectionLabel>Progress photos</SectionLabel>
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 10 }}>on-device only · never uploaded</div>
      </div>

      {a && b && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[a, b].map((p, i) => (
            <div key={p.id} style={{ flex: 1 }}>
              <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${i ? "var(--ember)" : "var(--fuel)"}` }}>
                <img src={urls[p.id]} alt={`Progress ${p.date}`} style={{ width: "100%", display: "block" }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", marginTop: 4, color: i ? "var(--ember)" : "var(--fuel)" }}>
                {shortDate(p.date)}
              </div>
            </div>
          ))}
        </div>
      )}
      {!!(a || b) && !(a && b) && (
        <div className="row" style={{ marginBottom: 10, gap: 8 }}>
          <div className="grow" style={{ fontSize: 12, color: "var(--dim)" }}>Tap a second photo to compare side by side.</div>
          <button className="btn" style={{ fontSize: 12, color: "var(--bad)", padding: "6px 10px" }}
            onClick={() => remove((a || b).id)}>
            Delete selected
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
      <button className="btn primary" style={{ width: "100%", marginBottom: 10 }} disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? "Saving…" : "📷 Add photo (camera or library)"}
      </button>

      {photos === null ? (
        <div style={{ fontSize: 13, color: "var(--dim)" }}>Loading…</div>
      ) : photos.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          Same spot, same light, same pose — every week or two. The scale lies day to day; photos don't.
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <button key={p.id} className={`photo-cell ${selA === p.id ? "selA" : ""} ${selB === p.id ? "selB" : ""}`}
              onClick={() => tapPhoto(p)}
              onContextMenu={(e) => { e.preventDefault(); remove(p.id); }}>
              <img src={urls[p.id]} alt={`Progress ${p.date}`} loading="lazy" />
              {selA === p.id && <span className="photo-tag" style={{ background: "var(--fuel)" }}>A</span>}
              {selB === p.id && <span className="photo-tag" style={{ background: "var(--ember)" }}>B</span>}
              <span className="photo-date">{shortDate(p.date)}</span>
            </button>
          ))}
        </div>
      )}
      {photos && photos.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 8 }}>
          Tap two photos to compare. Select one and hit “Delete selected” to remove it.
        </div>
      )}
    </Card>
  );
}
