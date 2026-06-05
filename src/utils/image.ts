/**
 * Cloudinary image optimization utility
 * Injects transformation parameters into Cloudinary URLs to reduce bandwidth
 */
export const getOptimizedImageUrl = (url: string | null | undefined, width: number = 400): string => {
  if (!url) return '';
  
  // If not a Cloudinary URL, return as is
  if (!url.includes('res.cloudinary.com')) return url;

  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{version}/{public_id}.{format}
  // We want to insert 'w_{width},c_fill,q_auto,f_auto' into the transformations part
  
  const uploadPart = '/upload/';
  const index = url.indexOf(uploadPart);
  
  if (index === -1) return url;

  const insertionPoint = index + uploadPart.length;
  const transformation = `w_${width},c_fill,q_auto,f_auto/`;
  
  return url.slice(0, insertionPoint) + transformation + url.slice(insertionPoint);
};
