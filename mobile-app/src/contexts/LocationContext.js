import React, { createContext, useContext, useState } from 'react';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [locationData, setLocationData] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const updateLocation = (newLocationData) => {
    setLocationData(newLocationData);
  };

  const setLocationLoading = (loading) => {
    setIsLocationLoading(loading);
  };

  const value = {
    locationData,
    isLocationLoading,
    updateLocation,
    setLocationLoading,
    municipality: locationData?.municipality || null,
    state: locationData?.state || null,
    coordinates: locationData?.coordinates || null,
    fullAddress: locationData?.fullAddress || null,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
