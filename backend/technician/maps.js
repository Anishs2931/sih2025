const axios = require("axios");
require("dotenv").config();

async function getETA(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;

  try {
    const response = await axios.get(url);

    // Check if response has valid data
    if (response.data && response.data.rows && response.data.rows[0] &&
        response.data.rows[0].elements && response.data.rows[0].elements[0] &&
        response.data.rows[0].elements[0].duration) {
      const duration = response.data.rows[0].elements[0].duration.value; // seconds
      return duration;
    } else {
      return 1800; // Default 30 minutes
    }
  } catch (err) {
    console.error("Google Maps API error:", err);
    return 1800; // Default 30 minutes instead of Infinity
  }
}

module.exports = { getETA };
