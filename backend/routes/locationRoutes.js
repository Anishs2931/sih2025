const express = require("express");
const router = express.Router();

// You'll need to install axios if not already installed
// npm install axios
const axios = require('axios');

// Google Maps API key - replace with your actual API key
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

// Route to get municipality/locality from coordinates
router.post("/get-municipality", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates"
      });
    }

    // Check if Google Maps API key is configured
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log("Google Maps API key not configured, using fallback location");
      
      // Fallback: Basic location data without Google Maps
      const locationData = {
        municipality: 'Location Service Unavailable',
        district: 'Please configure Google Maps API',
        state: 'Unknown State',
        country: 'Unknown Country',
        pincode: null,
        fullAddress: 'Google Maps API key required for accurate location',
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        source: 'fallback'
      };

      return res.json({
        success: true,
        data: locationData,
        message: "Basic location data returned (Google Maps API not configured)"
      });
    }

    // Call Google Maps Reverse Geocoding API
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&result_type=administrative_area_level_2|administrative_area_level_3|locality|sublocality`;

    const response = await axios.get(googleMapsUrl);

    if (response.data.status !== 'OK') {
      console.error("Google Maps API error:", response.data.status);
      
      // Fallback for Google Maps API errors
      const locationData = {
        municipality: 'Location Detection Failed',
        district: 'API Error',
        state: 'Unknown State',
        country: 'Unknown Country',
        pincode: null,
        fullAddress: `Location at ${latitude}, ${longitude}`,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        source: 'error_fallback'
      };

      return res.json({
        success: true,
        data: locationData,
        message: "Fallback location data (Google Maps API error)"
      });
    }

    const results = response.data.results;
    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No location data found for these coordinates"
      });
    }

    // Extract municipality/locality information
    let municipality = null;
    let district = null;
    let state = null;
    let country = null;
    let pincode = null;

    for (const result of results) {
      for (const component of result.address_components) {
        const types = component.types;

        // Municipality/City/Town
        if (types.includes('administrative_area_level_2') || 
            types.includes('locality') || 
            types.includes('administrative_area_level_3')) {
          if (!municipality) {
            municipality = component.long_name;
          }
        }

        // District
        if (types.includes('administrative_area_level_2') && !district) {
          district = component.long_name;
        }

        // State
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }

        // Country
        if (types.includes('country')) {
          country = component.long_name;
        }

        // Postal Code
        if (types.includes('postal_code')) {
          pincode = component.long_name;
        }
      }
    }

    // Fallback: if no municipality found, try to extract from formatted address
    if (!municipality && results[0]?.formatted_address) {
      const addressParts = results[0].formatted_address.split(',');
      // Usually municipality is the second or third part in Indian addresses
      for (let i = 1; i < Math.min(addressParts.length, 4); i++) {
        const part = addressParts[i].trim();
        if (part && !part.match(/^\d+$/) && part.length > 2) {
          municipality = part;
          break;
        }
      }
    }

    const locationData = {
      municipality: municipality || 'Unknown',
      district: district || municipality || 'Unknown',
      state: state || 'Unknown',
      country: country || 'Unknown',
      pincode: pincode || null,
      fullAddress: results[0]?.formatted_address || 'Address not available',
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    };

    res.json({
      success: true,
      data: locationData,
      message: "Location data retrieved successfully"
    });

  } catch (error) {
    console.error("Location API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch location data",
      error: error.message
    });
  }
});

// Route to get current location based on IP (fallback method)
router.get("/get-location-by-ip", async (req, res) => {
  try {
    // Using ipapi.co for IP-based location (free tier available)
    const ipResponse = await axios.get('https://ipapi.co/json/');
    
    if (ipResponse.data && ipResponse.data.latitude && ipResponse.data.longitude) {
      const { latitude, longitude, city, region, country_name } = ipResponse.data;
      
      // Simple location data from IP service
      const locationData = {
        municipality: city || 'Unknown City',
        district: city || 'Unknown',
        state: region || 'Unknown State',
        country: country_name || 'Unknown Country',
        pincode: ipResponse.data.postal || null,
        fullAddress: `${city || 'Unknown'}, ${region || 'Unknown'}, ${country_name || 'Unknown'}`,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        source: 'ip_location'
      };

      res.json({
        success: true,
        data: locationData,
        message: "Location detected from IP address"
      });
    } else {
      throw new Error("Unable to detect location from IP");
    }

  } catch (error) {
    console.error("IP Location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to detect location from IP",
      error: error.message
    });
  }
});

module.exports = router;
