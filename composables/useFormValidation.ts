import { reactive, computed } from 'vue';

interface ValidationSchema {
  [key: string]: {
    safeParse: (value: string) => ValidationResult;
  };
}

interface ValidationResult {
  success: boolean;
  error?: {
    errors: Array<{ message: string }>;
  };
}

export default function useFormValidation(schema: ValidationSchema, initialValues: Record<string, string> = {}) {
    const formData = reactive<Record<string, string>>({...initialValues});
  const errors = reactive<Record<string, string>>({});
  
  const validateField = (field: string) => {
    const value = formData[field];
    if (!value) return; // Skip empty fields during typing
    
    const fieldSchema = schema[field];
    if (!fieldSchema) return;
    
    const result = fieldSchema.safeParse(value);
    errors[field] = result.success ? '' : result.error!.errors[0].message;
  };
  
  const validateAllFields = () => {
    Object.keys(schema).forEach(validateField);
  };
  
  const isFormValid = computed(() => {
    // Check if all fields in schema have values
    const hasAllRequiredFields = Object.keys(schema).every(field => !!formData[field]);
    // Check if no errors exist
    const hasNoErrors = Object.values(errors).every(error => !error);
    
    return hasAllRequiredFields && hasNoErrors;
  });
  
  return {
    formData,
    errors,
    validateField,
    validateAllFields,
    isFormValid
  };
}