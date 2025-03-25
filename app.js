// Login Function
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('Login failed');

        const { token } = await response.json();
        localStorage.setItem('token', token);  // Store token
        window.location.href = 'dashboard.html';  // Redirect
    } catch (error) {
        alert('Invalid credentials');
    }
}

// Fetch Sensor Data for Dashboard
async function fetchSensorData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';  // Redirect to login if no token
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/sensor-data', {
            headers: { 'Authorization': token }
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        console.log(data);  // Handle sensor data (e.g., update graphs)
    } catch (error) {
        alert('Failed to load sensor data');
    }
}

// Call fetchSensorData on page load if on the dashboard
if (window.location.pathname.includes('dashboard.html')) {
    fetchSensorData();
}
