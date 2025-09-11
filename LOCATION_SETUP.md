# 🗺️ Location Feature Setup Guide

## Google Maps API Configuration

### Step 1: Get Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Create a new project or select an existing one
   - Name it something like "QuadraTech-Location"

3. **Enable Required APIs**
   - Go to "APIs & Services" > "Library"
   - Enable these APIs:
     - **Geocoding API** (Required for reverse geocoding)
     - **Maps JavaScript API** (Optional, for future web features)

4. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

5. **Secure Your API Key (Important!)**
   - Click on your API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Choose only the APIs you enabled above
   - Under "Application restrictions", you can:
     - Select "IP addresses" and add your server IP
     - Or "HTTP referrers" for web apps

### Step 2: Configure Backend

1. **Create .env file**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Add your API key to .env**
   ```
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. **Never commit .env to git** (already in .gitignore)

### Step 3: Test the Setup

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Test location endpoint**
   ```bash
   # Test with coordinates (Delhi example)
   curl -X POST http://localhost:3000/api/location/get-municipality \
     -H "Content-Type: application/json" \
     -d '{"latitude": 28.6139, "longitude": 77.2090}'
   ```

3. **Expected Response**
   ```json
   {
     "success": true,
     "data": {
       "municipality": "New Delhi",
       "district": "New Delhi",
       "state": "Delhi",
       "country": "India",
       "pincode": "110001",
       "fullAddress": "New Delhi, Delhi, India",
       "coordinates": {
         "latitude": 28.6139,
         "longitude": 77.2090
       }
     },
     "message": "Location data retrieved successfully"
   }
   ```

## Mobile App Location Permissions

### Android
- Automatically handled by Expo Location
- User will be prompted for location permission

### iOS  
- Automatically handled by Expo Location
- User will be prompted for location permission

## Fallback Methods

If GPS location fails, the app will try:

1. **IP-based location** (using ipapi.co)
2. **Manual location** (future feature)
3. **Default location** (shows "Unknown")

## API Costs (Google Maps)

- **Free Tier**: 40,000 requests per month
- **Cost**: $0.005 per request after free tier
- **For this app**: Very low cost (few requests per user per day)

## Troubleshooting

### Common Issues:

1. **"API key not valid"**
   - Check if API key is correct in .env
   - Ensure Geocoding API is enabled
   - Check API key restrictions

2. **"Location permission denied"**
   - App falls back to IP-based location
   - User can manually refresh location

3. **"Unable to detect location"**
   - Check internet connection
   - Restart the app
   - Manually refresh location

## Testing Locations (Indian Municipalities)

```javascript
// Test coordinates for different Indian cities
const testLocations = [
  { lat: 28.6139, lng: 77.2090, expected: "New Delhi" },
  { lat: 19.0760, lng: 72.8777, expected: "Mumbai" },
  { lat: 13.0827, lng: 80.2707, expected: "Chennai" },
  { lat: 22.5726, lng: 88.3639, expected: "Kolkata" },
  { lat: 12.9716, lng: 77.5946, expected: "Bangalore" },
  { lat: 17.3850, lng: 78.4867, expected: "Hyderabad" }
];
```

## Security Best Practices

1. **Restrict API Key**: Only enable required APIs
2. **Environment Variables**: Never hardcode API keys
3. **Rate Limiting**: Implement on your backend (future)
4. **Caching**: Cache location data to reduce API calls

Your location feature is now ready! 🚀📍
