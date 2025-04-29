//Calculate password strength on a scale of 0-100
export function calculatePasswordStrength(password: string) {
  if (!password) return 0
  
  let score = 0
  
  // Length criteria
  if (password.length >= 8) score += 25
  else if (password.length >= 6) score += 10
  
  // Number criteria
  if (/\d/.test(password)) score += 25
  
  // Mixed case criteria
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25
  
  // Special character criteria
  if (/[^a-zA-Z0-9]/.test(password)) score += 25
  
  return Math.min(score, 100)
}

// Get password strength category based on score
export function getStrengthCategory(strength: number) {
  if (strength < 33) return 'weak'
  if (strength < 66) return 'medium'
  return 'strong'
}

// Set CSS classes based on password strength
export function getStrengthClasses(strength: number) {
  const category = getStrengthCategory(strength)
  
  const classes = {
    bar: category === 'weak' ? 'bg-error' : 
         category === 'medium' ? 'bg-warning' : 'bg-success',
    
    text: category === 'weak' ? 'text-error' : 
          category === 'medium' ? 'text-warning' : 'text-success',
    
    icon: category === 'weak' ? ['fas', 'exclamation-triangle'] :
          category === 'medium' ? ['fas', 'info-circle'] : ['fas', 'check-circle']
  }
  
  return classes
}

// Set text based on password strength
export function getStrengthText(strength: number) {
  const category = getStrengthCategory(strength)
  
  switch (category) {
    case 'weak': return 'Weak password'
    case 'medium': return 'Medium strength'
    case 'strong': return 'Strong password'
    default: return ''
  }
}

/**
 * Validates a password against security requirements
 * @param password The password to validate
 * @param options Optional configuration for validation requirements
 * @returns Object with valid flag and error message if invalid
 */
export function validatePassword(
  password: string, 
  options = { 
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSpecial: false
  }
): { valid: boolean, message: string } {
  if (!password) {
    return { valid: false, message: 'Please enter a password' };
  }
  
  if (password.length < options.minLength) {
    return { valid: false, message: `Password must be at least ${options.minLength} characters` };
  }
  
  if (options.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (options.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (options.requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (options.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true, message: '' };
}

/**
 * Checks if passwords match
 * @param password The password
 * @param confirmPassword The confirmation password
 * @returns Object with valid flag and error message if invalid
 */
export function validatePasswordsMatch(password: string, confirmPassword: string): { valid: boolean, message: string } {
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match' };
  }
  return { valid: true, message: '' };
}