const axios = require("axios");
require("dotenv").config();

async function getETA(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const duration = response.data.rows[0].elements[0].duration.value; // seconds
    return duration;
  } catch (err) {
    console.error("Google Maps API error:", err);
    return Infinity;
  }
}

module.exports = { getETA };
