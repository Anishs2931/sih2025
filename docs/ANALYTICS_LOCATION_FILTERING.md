# Analytics Dashboard - Location Filtering Setup

## Current Status
The analytics dashboard currently supports:
- ✅ **Time Period Filtering**: Last 7 Days, This Month, This Year, Overall
- ✅ **India-wide Analytics**: All issues across all municipalities and states
- ❌ **State/Municipality Filtering**: Disabled (requires Firestore indexes)

## Why State/Municipality Filtering is Disabled

When filtering analytics by municipality or state along with time periods, Firestore requires **composite indexes** because we're querying multiple fields:

```javascript
// This query requires a composite index:
query = query.where('municipality', '==', municipality)
           .where('created_at', '>=', timeFilter);
```

## Error Encountered
```
The query requires an index. You can create it here: 
https://console.firebase.google.com/v1/r/project/[PROJECT]/firestore/indexes?create_composite=...
```

## How to Enable State/Municipality Filtering

### 1. Create Required Firestore Indexes

You need to create composite indexes in the Firebase Console for:

**For Municipality Filtering:**
- Collection: `tasks`
- Fields: `municipality` (Ascending) + `created_at` (Ascending)

**For State Filtering:**
- Collection: `tasks` 
- Fields: `state` (Ascending) + `created_at` (Ascending)

### 2. Navigate to Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database
4. Click on "Indexes" tab
5. Click "Create Index"

### 3. Create the Indexes

**Municipality Index:**
```
Collection ID: tasks
Fields:
- municipality: Ascending
- created_at: Ascending
```

**State Index:**
```
Collection ID: tasks
Fields: 
- state: Ascending
- created_at: Ascending
```

### 4. Update the Dashboard Code

Once indexes are created, uncomment the location options in `Dashboard.js`:

```javascript
const locationOptions = [
  { label: 'India Wide', value: 'india' },
  { label: 'Current State', value: 'state' },        // Uncomment
  { label: 'Current Municipality', value: 'municipality' } // Uncomment
];
```

And update the `fetchAnalytics` function to use the location parameter:

```javascript
const params = {
  timePeriod,
  location,  // Use the selected location
  state: location === 'state' ? selectedState : undefined,
  municipality: location === 'municipality' ? userMunicipality : undefined
};
```

### 5. Get User's Actual Location

To make municipality filtering work properly, you'll need to:

1. Get the user's actual municipality from their location context
2. Replace `'Current Municipality'` with the real municipality name
3. Ensure the municipality names in the database match the location data

## Alternative Approaches

If you don't want to create indexes, you can:

1. **Filter on Frontend**: Fetch all data and filter in JavaScript (not recommended for large datasets)
2. **Use Cloud Functions**: Create a Cloud Function to handle complex queries
3. **Separate Collections**: Store aggregated analytics data in separate collections

## Current Implementation

For now, the dashboard shows:
- ✅ **Time Period Filter**: Works perfectly with Firestore timestamps
- ✅ **India-wide Coverage**: Shows all issues across the country
- ✅ **Department Breakdown**: Working correctly
- ✅ **Real-time Updates**: Data updates as new issues are created

This provides valuable insights while avoiding the complexity of Firestore composite indexes.
