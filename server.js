import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { parse } from "csv-parse/sync";
import XLSX from "xlsx";

const app=express(), upload=multer({storage:multer.memoryStorage()});
const db=new Database("santhosh.db");
const SECRET=process.env.JWT_SECRET||"change-this-secret";

db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT UNIQUE,password TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,name TEXT,data TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS barcodes(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,value TEXT,format TEXT,label TEXT,settings TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);

app.use(cors()); app.use(express.json({limit:"10mb"})); app.use(express.static("."));
const auth=(req,res,next)=>{try{req.user=jwt.verify((req.headers.authorization||"").replace("Bearer ",""),SECRET);next()}catch{res.status(401).json({error:"Unauthorized"})}};

app.get("/api/health",(req,res)=>res.json({status:"ok",app:"SANTHOSH BARCODE GEN"}));
app.post("/api/auth/register",(req,res)=>{const {name,email,password}=req.body;if(!email||!password)return res.status(400).json({error:"Email and password required"});try{const hash=bcrypt.hashSync(password,10);const r=db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(name||"User",email,hash);res.json({token:jwt.sign({id:r.lastInsertRowid,email},SECRET,{expiresIn:"7d"})})}catch{res.status(409).json({error:"Email already exists"})}});
app.post("/api/auth/login",(req,res)=>{const u=db.prepare("SELECT * FROM users WHERE email=?").get(req.body.email);if(!u||!bcrypt.compareSync(req.body.password,u.password))return res.status(401).json({error:"Invalid login"});res.json({token:jwt.sign({id:u.id,email:u.email},SECRET,{expiresIn:"7d"}),user:{id:u.id,name:u.name,email:u.email}})});
app.get("/api/barcodes",auth,(req,res)=>res.json(db.prepare("SELECT * FROM barcodes WHERE user_id=? ORDER BY id DESC").all(req.user.id)));
app.post("/api/barcodes",auth,(req,res)=>{const {value,format,label,settings={}}=req.body;const r=db.prepare("INSERT INTO barcodes(user_id,value,format,label,settings) VALUES(?,?,?,?,?)").run(req.user.id,value,format||"CODE128",label||"",JSON.stringify(settings));res.json({id:r.lastInsertRowid})});
app.delete("/api/barcodes/:id",auth,(req,res)=>{db.prepare("DELETE FROM barcodes WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({success:true})});
app.get("/api/projects",auth,(req,res)=>res.json(db.prepare("SELECT * FROM projects WHERE user_id=? ORDER BY id DESC").all(req.user.id)));
app.post("/api/projects",auth,(req,res)=>{const r=db.prepare("INSERT INTO projects(user_id,name,data) VALUES(?,?,?)").run(req.user.id,req.body.name||"Untitled",JSON.stringify(req.body.data||{}));res.json({id:r.lastInsertRowid})});
app.post("/api/import",auth,upload.single("file"),(req,res)=>{try{let rows=[];const name=req.file.originalname.toLowerCase();if(name.endsWith(".csv"))rows=parse(req.file.buffer.toString(),{columns:true,skip_empty_lines:true});else {const wb=XLSX.read(req.file.buffer);rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])}const stmt=db.prepare("INSERT INTO barcodes(user_id,value,format,label,settings) VALUES(?,?,?,?,?)");const insert=db.transaction(rs=>rs.forEach(x=>stmt.run(req.user.id,String(x.barcode||x.value||x.code||""),x.format||"CODE128",x.name||x.label||"",JSON.stringify(x))));insert(rows.filter(x=>x.barcode||x.value||x.code));res.json({success:true,count:rows.length})}catch(e){res.status(400).json({error:e.message})}});
app.listen(process.env.PORT||3000,()=>console.log("SANTHOSH BARCODE GEN running"));
