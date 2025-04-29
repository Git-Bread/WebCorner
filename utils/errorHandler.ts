/**
 * Handles Firebase authentication errors with user-friendly messages
 * Provides sanitized error messages for improved security and UX
 */
export function handleAuthError(error: any): string {
  // Log detailed errors only in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Auth error:', error)
  }
  
  // Extract the error code
  const errorCode = typeof error === 'object' && error?.code 
    ? error.code
    : typeof error === 'string' && error.includes('auth/') 
      ? error
      : 'unknown-error';

  switch (true) {
    // Login failures
    case errorCode.includes('auth/wrong-password'):
    case errorCode.includes('auth/user-not-found'):
    case errorCode.includes('auth/invalid-credential'):
    case errorCode.includes('auth/invalid-login-credentials'):
      return 'Invalid email or password';

    // Registration/Email issues
    case errorCode.includes('auth/email-already-in-use'):
      return 'This email is already registered. Please use a different email or sign in';
    
    case errorCode.includes('auth/invalid-email'):
      return 'Please enter a valid email address';
    
    // Password issues
    case errorCode.includes('auth/weak-password'):
      return 'Password is too weak. Please use a stronger password';
    
    // Rate limiting/Security
    case errorCode.includes('auth/too-many-requests'):
      return 'Too many login attempts. Please try again later or reset your password';
    
    // Account status
    case errorCode.includes('auth/user-disabled'):
      return 'This account has been disabled';
    
    // Operation errors
    case errorCode.includes('auth/operation-not-allowed'):
      return 'Operation not allowed. Please contact support';
    
    case errorCode.includes('auth/requires-recent-login'):
      return 'This action requires a recent login. Please sign in again';
    
    // UI interaction errors
    case errorCode.includes('auth/popup-closed-by-user'):
    case errorCode.includes('auth/cancelled-popup-request'):
      return 'Authentication was cancelled. Please try again';
    
    // Network issues
    case errorCode.includes('auth/network-request-failed'):
      return 'Network connection problem. Please check your internet connection';
    
    // Other auth errors
    case errorCode.includes('auth/'):
      return 'Authentication error. Please try again';
    
    // Default fallback
    default:
      return 'An error occurred. Please try again';
  }
}

/**
 * Handles Firestore database errors for user operations
 */
export function handleDatabaseError(error: any): string {
  if (process.env.NODE_ENV === 'development') {
    console.error('Database error:', error)
  }

  const errorMessage = error?.message || '';
  
  switch (true) {
    case errorMessage.includes('permission-denied'):
    case errorMessage.includes('PERMISSION_DENIED'):
      return 'You do not have permission to perform this action';
      
    case errorMessage.includes('not-found'):
    case errorMessage.includes('NOT_FOUND'):
      return 'The requested resource was not found';
      
    case errorMessage.includes('already-exists'):
    case errorMessage.includes('ALREADY_EXISTS'):
      return 'This information already exists in the database';
      
    case errorMessage.includes('resource-exhausted'):
    case errorMessage.includes('RESOURCE_EXHAUSTED'):
      return 'Service temporarily unavailable. Please try again later';
      
    case errorMessage.includes('deadline-exceeded'):
    case errorMessage.includes('DEADLINE_EXCEEDED'):
    case errorMessage.includes('unavailable'):
    case errorMessage.includes('UNAVAILABLE'):
      return 'Service temporarily unavailable. Please try again later';
      
    default:
      return 'An error occurred while saving your information. Please try again';
  }
}

/**
 * Handles Firebase Storage errors for image upload operations
 */
export function handleStorageError(error: any): string {
  if (process.env.NODE_ENV === 'development') {
    console.error('Storage error:', error)
  }

  const errorCode = typeof error === 'object' && error?.code 
    ? error.code
    : 'unknown-error';
  
  const errorMessage = error?.message || '';
  
  switch (true) {
    // Permission errors
    case errorCode.includes('storage/unauthorized'):
    case errorMessage.includes('permission-denied'):
    case errorMessage.includes('PERMISSION_DENIED'):
      return 'You do not have permission to upload this file';
      
    // User quota exceeded
    case errorCode.includes('storage/quota-exceeded'):
      return 'Storage quota exceeded. Please contact support';
    
    // Invalid file issues
    case errorCode.includes('storage/invalid-format'):
      return 'The specified file format is not supported';
      
    // Network issues
    case errorCode.includes('storage/network-error'):
    case errorCode.includes('storage/server-error'):
      return 'Network connection problem. Please check your internet connection';
      
    // Canceled uploads
    case errorCode.includes('storage/canceled'):
      return 'Upload was canceled';
      
    // Retry limit exceeded
    case errorCode.includes('storage/retry-limit-exceeded'):
      return 'Upload failed repeatedly. Please try again later';
      
    // Invalid file name or path
    case errorCode.includes('storage/invalid-path'):
      return 'Invalid file path specified';
      
    // File size issues
    case errorCode.includes('storage/blob-too-large'):
      return 'File size exceeds the allowed limit';
      
    // Default fallback
    default:
      return 'An error occurred during file upload. Please try again';
  }
}