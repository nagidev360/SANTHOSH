import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import multer from "multer";
import { parse } from "csv-parse/sync";
import XLSX from "xlsx";

const app=express(), upload=multer({storage:multer.memoryStorage()});
const db=new Database("santhosh.db");

db.exec(`CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,data TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS barcodes(id INTEGER PRIMARY KEY AUTOINCREMENT,value TEXT,format TEXT,label TEXT,settings TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);

app.use(cors()); app.use(express.json({limit:"10mb"})); app.use(express.static("."));

app.get("/api/health",(req,res)=>res.json({status:"ok",app:"SANTHOSH BARCODE GEN"}));
app.get("/api/barcodes",(req,res)=>res.json(db.prepare("SELECT * FROM barcodes ORDER BY id DESC").all()));
app.post("/api/barcodes",(req,res)=>{const {value,format,label,settings={}}=req.body;const r=db.prepare("INSERT INTO barcodes(value,format,label,settings) VALUES(?,?,?,?)").run(value,format||"CODE128",label||"",JSON.stringify(settings));res.json({id:r.lastInsertRowid,success:true})});
app.delete("/api/barcodes/:id",(req,res)=>{db.prepare("DELETE FROM barcodes WHERE id=?").run(req.params.id);res.json({success:true})});
app.get("/api/projects",(req,res)=>res.json(db.prepare("SELECT * FROM projects ORDER BY id DESC").all()));
app.post("/api/projects",(req,res)=>{const r=db.prepare("INSERT INTO projects(name,data) VALUES(?,?)").run(req.body.name||"Untitled",JSON.stringify(req.body.data||{}));res.json({id:r.lastInsertRowid,success:true})});
app.post("/api/import",upload.single("file"),(req,res)=>{try{let rows=[];const name=req.file.originalname.toLowerCase();if(name.endsWith(".csv"))rows=parse(req.file.buffer.toString(),{columns:true,skip_empty_lines:true});else{const wb=XLSX.read(req.file.buffer);rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])}const stmt=db.prepare("INSERT INTO barcodes(value,format,label,settings) VALUES(?,?,?,?)");const insert=db.transaction(rs=>rs.forEach(x=>stmt.run(String(x.barcode||x.value||x.code||""),x.format||"CODE128",x.name||x.label||"",JSON.stringify(x))));const valid=rows.filter(x=>x.barcode||x.value||x.code);insert(valid);res.json({success:true,count:valid.length})}catch(e){res.status(400).json({error:e.message})}});
app.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("SANTHOSH BARCODE GEN running"));