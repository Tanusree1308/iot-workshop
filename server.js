// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@cluster.mongodb.net/sensors';

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
        res.status(500).send('Server Error');
    }
});

// Fetch all users (optional)
app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username arduinoId');
        res.json(users);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// Save Sensor Data Route
app.post('/sensor-data', async (req, res) => {
    try {
        const { arduinoId, temperature, humidity, light, ultrasonic } = req.body;
        const newData = new SensorData({ arduinoId, temperature, humidity, light, ultrasonic });
        await newData.save();
        res.status(201).send('Sensor Data Saved');
    } catch (error) {
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
        res.status(500).send('Server Error');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});