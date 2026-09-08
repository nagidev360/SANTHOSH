import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import multer from "multer";
import { parse } from "csv-parse/sync";
import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const db = new Database(path.join(__dirname, "santhosh.db"));

db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS barcodes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'CODE128',
  label TEXT DEFAULT '',
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`);

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname, { extensions: ["html"] }));

app.get("/api/health", (req, res) => res.json({ status: "ok", app: "SANTHOSH BARCODE GEN", time: new Date().toISOString() }));
app.get("/api/barcodes", (req, res) => {
  res.json(db.prepare("SELECT * FROM barcodes ORDER BY id DESC LIMIT 1000").all());
});
app.post("/api/barcodes", (req, res) => {
  const value = String(req.body.value || "").trim();
  if (!value) return res.status(400).json({ error: "Barcode value is required" });
  const format = String(req.body.format || "CODE128");
  const label = String(req.body.label || "").slice(0, 300);
  const settings = JSON.stringify(req.body.settings || {});
  const r = db.prepare("INSERT INTO barcodes(value,format,label,settings) VALUES(?,?,?,?)").run(value, format, label, settings);
  res.json({ success: true, id: r.lastInsertRowid });
});
app.delete("/api/barcodes/:id", (req, res) => {
  const r = db.prepare("DELETE FROM barcodes WHERE id=?").run(Number(req.params.id));
  res.json({ success: r.changes > 0 });
});
app.get("/api/projects", (req, res) => res.json(db.prepare("SELECT * FROM projects ORDER BY id DESC LIMIT 200").all()));
app.post("/api/projects", (req, res) => {
  const name = String(req.body.name || "Untitled").slice(0, 120);
  const data = JSON.stringify(req.body.data || {});
  const r = db.prepare("INSERT INTO projects(name,data) VALUES(?,?)").run(name, data);
  res.json({ success: true, id: r.lastInsertRowid });
});
app.post("/api/import", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });
    const filename = req.file.originalname.toLowerCase();
    let rows = [];
    if (filename.endsWith(".csv")) {
      rows = parse(req.file.buffer.toString("utf8"), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      if (!wb.SheetNames.length) return res.status(400).json({ error: "Excel sheet not found" });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    } else return res.status(400).json({ error: "Only CSV, XLSX or XLS files are supported" });

    const valid = rows.map(x => {
      const value = String(x.barcode ?? x.value ?? x.code ?? x.Barcode ?? x.Value ?? "").trim();
      return { value, format: String(x.format || x.Format || "CODE128"), label: String(x.name ?? x.label ?? x.Name ?? "").slice(0,300), raw: x };
    }).filter(x => x.value);

    const stmt = db.prepare("INSERT INTO barcodes(value,format,label,settings) VALUES(?,?,?,?)");
    const insert = db.transaction(list => list.forEach(x => stmt.run(x.value, x.format, x.label, JSON.stringify(x.raw))));
    insert(valid);
    res.json({ success: true, count: valid.length, skipped: rows.length - valid.length });
  } catch (e) {
    res.status(400).json({ error: e.message || "Import failed" });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: "Internal server error" });
});
app.use((req, res, next) => res.status(404).json({ error: "API route not found" }));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`SANTHOSH BARCODE GEN running on ${PORT}`));
