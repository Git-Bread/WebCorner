/**
 * Returns a random profile image path from the available default set
 */
export function getRandomProfileImage(): string {
  // Array of available profile images (excluding default)
  const profileImages = [
    '/images/Profile_Pictures/fox_profile.webp',
    '/images/Profile_Pictures/coldfox_profile.webp',
    // Todo add more images
  ];
  
  // Get a random index
  const randomIndex = Math.floor(Math.random() * profileImages.length);
  
  // Return the random image path
  return profileImages[randomIndex];
}