const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conectar a la base de datos SQLite local
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Error al abrir la base de datos', err.message);
    else console.log('Base de datos conectada con éxito.');
});

// Crear tablas esenciales con todos los campos
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS licencia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT,
        expires_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente TEXT,
        cedula TEXT,
        telefono TEXT,
        direccion TEXT,
        examenes TEXT,
        monto REAL,
        metodo TEXT,
        fecha TEXT
    )`);
});

// RUTA NUEVA: Generar y guardar la licencia en la base de datos
app.post('/api/generar-licencia', (req, res) => {
    const { tienda, mes, anio } = req.body;
    
    const inputTienda = (tienda || 'LABO').trim().toUpperCase();
    const tiendaLimpia = inputTienda.replace(/[^A-Z0-9]/g, '').substring(0, 6) || 'LABO';
    const mesLimpio = (mes || 'OCT').substring(0, 3).toUpperCase();
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 4; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const keyGenerada = `${tiendaLimpia}-${mesLimpio}${randomStr}-${anio}`;
    const keyMinuscula = keyGenerada.toLowerCase();

    // Guardar en la base de datos para que el sistema la reconozca
    db.run(`INSERT INTO licencia (key, expires_at) VALUES (?, ?)`, [keyMinuscula, anio], function(err) {
        if (err) {
            return res.json({ success: false, message: 'Error al guardar en la base de datos' });
        }
        res.json({ success: true, key: keyGenerada });
    });
});

// Ruta para verificar clave de licencia
app.post('/api/verificar-licencia', (req, res) => {
    let { key } = req.body;
    if (!key) {
        return res.json({ success: false, message: 'Por favor ingrese una clave' });
    }

    const claveLimpia = key.trim().toLowerCase();

    // CLAVE MAESTRA DE DESARROLLADORA
    if (claveLimpia === '2709carola') {
        return res.json({ success: true, message: 'Bienvenida Desarrolladora' });
    }

    db.get(`SELECT * FROM licencia WHERE LOWER(key) = ?`, [claveLimpia], (err, row) => {
        if (row) {
            res.json({ success: true, message: 'Licencia válida' });
        } else {
            res.json({ success: false, message: 'Clave de licencia incorrecta o vencida' });
        }
    });
});

// Ruta para registrar pagos y exámenes completos
app.post('/api/pagos', (req, res) => {
    const { paciente, cedula, telefono, direccion, examenes, monto, metodo } = req.body;
    const fecha = new Date().toISOString();
    
    const examenesTexto = Array.isArray(examenes) ? examenes.join(', ') : examenes;

    db.run(`INSERT INTO pagos (paciente, cedula, telefono, direccion, examenes, monto, metodo, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [paciente, cedula, telefono, direccion, examenesTexto, monto, metodo, fecha], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
