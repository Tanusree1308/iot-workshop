// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const winston = require('winston');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://your_mongo_uri';

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    arduinoId: String
});
const User = mongoose.model('User', userSchema);

// Sensor Data Schema
const sensorDataSchema = new mongoose.Schema({
    arduinoId: String,
    temperature: Number,
    humidity: Number,
    light: Number,
    ultrasonic: Number,
    timestamp: { type: Date, default: Date.now }
});
const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Logger setup using Winston
const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ],
});

// ========== Routes ==========

// Create New User Route
app.post('/create-user', async (req, res) => {
    try {
        const { username, password, arduinoId } = req.body;

        if (!username || !password || !arduinoId) {
            return res.status(400).send('All fields are required');
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, arduinoId });
        await newUser.save();

        res.status(201).send('New user created successfully');
    } catch (error) {
        logger.error('Error creating user', { error });
        res.status(500).send('Server Error');
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('Invalid username or password');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid username or password');
        }

        const token = jwt.sign({ userId: user._id, arduinoId: user.arduinoId }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        logger.error('Login error', { error });
        res.status(500).send('Server Error');
    }
});

// Fetch all users (optional)
app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username arduinoId');
        res.json(users);
    } catch (error) {
        logger.error('Error fetching users', { error });
        res.status(500).send('Server Error');
    }
});

// Save Sensor Data Route
app.post('/sensor-data', [
    body('arduinoId').notEmpty().withMessage('Arduino ID is required'),
    body('temperature').isNumeric().withMessage('Temperature must be a number'),
    body('humidity').isNumeric().withMessage('Humidity must be a number'),
    body('light').isNumeric().withMessage('Light intensity must be a number'),
    body('ultrasonic').isNumeric().withMessage('Ultrasonic distance must be a number')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { arduinoId, temperature, humidity, light, ultrasonic } = req.body;
        const newData = new SensorData({ arduinoId, temperature, humidity, light, ultrasonic });
        await newData.save();
        res.status(201).send('Sensor Data Saved');
    } catch (error) {
        logger.error('Error saving sensor data', { error });
        res.status(500).send('Server Error');
    }
});

// Get Sensor Data by Arduino ID
app.get('/sensor-data/:arduinoId', async (req, res) => {
    try {
        const { arduinoId } = req.params;
        const data = await SensorData.find({ arduinoId }).sort({ timestamp: -1 }).limit(10);
        res.json(data);
    } catch (error) {
        logger.error('Error fetching sensor data', { error });
        res.status(500).send('Server Error');
    }
});

// Refresh Token Route (optional)
app.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).send('Refresh token required');
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        const newToken = jwt.sign(
            { userId: decoded.userId, arduinoId: decoded.arduinoId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token: newToken });
    } catch (error) {
        logger.error('Invalid refresh token', { error });
        res.status(403).send('Invalid refresh token');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
