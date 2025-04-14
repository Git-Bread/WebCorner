/**
 * Returns a random profile image path from the available default set
 */
export function getRandomProfileImage(): string {
  // Array of available profile images (excluding default)
  const profileImages = [
    '/images/Profile_Pictures/fox_profile.webp',
    '/images/Profile_Pictures/coldfox_profile.webp',
    '/images/Profile_Pictures/eagle_profile.webp',
    '/images/Profile_Pictures/bear_profile.webp',
    '/images/Profile_Pictures/hare_profile.webp',
    '/images/Profile_Pictures/deer_profile.webp',
    '/images/Profile_Pictures/owl_profile.webp',
    '/images/Profile_Pictures/hippo_profile.webp',
    '/images/Profile_Pictures/bluebird_profile.webp',
    '/images/Profile_Pictures/orangebird_profile.webp',
    '/images/Profile_Pictures/parrot_profile.webp',
  ];
  
  // Get a random index
  const randomIndex = Math.floor(Math.random() * profileImages.length);
  
  // Return the random image path
  return profileImages[randomIndex];
}