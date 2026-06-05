/**
 * Distance Calculation Utility
 */

/**
 * Calculates the Haversine distance between two points in kilometers.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estimates delivery time in minutes based on distance.
 * Base time: 15 mins (prep)
 * Per KM: 3 mins (travel)
 */
export const estimateDeliveryTime = (distanceKm: number): number => {
  const prepTime = 15;
  const travelTime = distanceKm * 3;
  return Math.round(prepTime + travelTime);
};

/**
 * Formats minutes into a human-readable string (mins, hrs, or days).
 */
export const formatDeliveryTime = (totalMinutes: number): string => {
  if (totalMinutes < 60) {
    return `${totalMinutes} mins`;
  }

  const hours = totalMinutes / 60;
  if (hours < 24) {
    const wholeHours = Math.floor(hours);
    const remainingMins = Math.round((hours - wholeHours) * 60);
    
    if (remainingMins === 0) {
      return `${wholeHours} ${wholeHours === 1 ? 'hr' : 'hrs'}`;
    }
    return `${wholeHours} ${wholeHours === 1 ? 'hr' : 'hrs'} ${remainingMins} mins`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);

  if (remainingHours === 0) {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return `${days} ${days === 1 ? 'day' : 'days'} ${remainingHours} hrs`;
};
