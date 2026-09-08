# SANTHOSH BARCODE GEN

Full-stack Barcode & QR Generator.

## Features
- User registration and login (JWT)
- SQLite database
- Barcode history
- Projects
- CSV bulk import
- Excel bulk import
- REST API
- Barcode and QR frontend
- Custom colors, sizes and labels
- Print support

## Run locally
```bash
npm install
npm start
```

Open http://localhost:3000

## API
- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/barcodes
- POST /api/barcodes
- DELETE /api/barcodes/:id
- GET /api/projects
- POST /api/projects
- POST /api/import
