const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'basant_leads_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Check your .env file and MySQL password!');
        process.exit(1);
    }
}

initializeDatabase();

// CREATE - Add new lead
app.post('/api/leads', async (req, res) => {
    const { name, email, phone, company, status, notes } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO leads (name, email, phone, company, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, phone, company, status || 'New', notes]
        );
        
        res.json({
            message: 'Lead created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// READ - Get all leads
app.get('/api/leads', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        res.json({ leads: rows });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: error.message });
    }
});

// READ - Get single lead
app.get('/api/leads/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json({ lead: rows[0] });
    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE - Update lead
app.put('/api/leads/:id', async (req, res) => {
    const { name, email, phone, company, status, notes } = req.body;
    
    try {
        const [result] = await pool.query(
            'UPDATE leads SET name = ?, email = ?, phone = ?, company = ?, status = ?, notes = ? WHERE id = ?',
            [name, email, phone, company, status, notes, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json({
            message: 'Lead updated successfully',
            changes: result.affectedRows
        });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Delete lead
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json({
            message: 'Lead deleted successfully',
            changes: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Basant Lead Management System running on port ${PORT}`);
    console.log(`📊 Visit http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏳ Shutting down...');
    await pool.end();
    console.log('✅ Database connections closed');
    process.exit(0);
});