export function ago(d: Date | null | undefined) {
  if (!d) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export function stamp(d: Date) {
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}
