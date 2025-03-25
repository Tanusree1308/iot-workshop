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
        window.location.href = 'dashboard.html';  // Redirect to dashboard
    } catch (error) {
        alert('Invalid credentials or network error. Please try again.');
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
            headers: { 'Authorization': `Bearer ${token}` }  // Add Bearer prefix
        });

        if (!response.ok) {
            // If the response is unauthorized, redirect to login
            if (response.status === 401) {
                localStorage.removeItem('token'); // Remove expired or invalid token
                window.location.href = 'index.html'; // Redirect to login
                return;
            }
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        console.log(data);  // Handle sensor data (e.g., update graphs)
        updateDashboard(data);  // Call function to update the dashboard
    } catch (error) {
        alert('Failed to load sensor data. Please check your connection.');
    }
}

// Update Dashboard with fetched data
function updateDashboard(data) {
    // Assuming your data contains values like temperature, humidity, etc.
    document.getElementById('temperature').textContent = `Temperature: ${data.temperature}°C`;
    document.getElementById('humidity').textContent = `Humidity: ${data.humidity}%`;
    // You can add code to update graphs or other elements based on `data`
}

// Call fetchSensorData on page load if on the dashboard
if (window.location.pathname.includes('dashboard.html')) {
    fetchSensorData();
}
