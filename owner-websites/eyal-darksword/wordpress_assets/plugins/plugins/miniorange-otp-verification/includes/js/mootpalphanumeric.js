const otpfieldSelectors = [
  'input[id*="mo_verify_otp"]',
  'input[id*="mo_verify"]',
  'input[id*="reg_vp_verification_phone"]',
  'input[id*="mo_verify_code"]',
  'input[id*="verify_field"]',
  'input[name*=phone_verify]',
  'input[name*=emai_verify]',
  'input[id*=reg_verification_field]',
  'input[id*=enter_otp-]',
];

var $mo = (typeof window !== 'undefined' && window.$mo) ? window.$mo : jQuery;

$mo(document).ready(function () {
  const $otpFields = $mo(otpfieldSelectors.join(','));
  
  // Create safe regex pattern with proper validation
  let inputPattern;
  try {
    if (typeof mootpalphanumeric !== 'undefined' && mootpalphanumeric.input_pattern) {
      // Sanitize the regex pattern to prevent injection
      const sanitizedPattern = $mo('<div/>').text(mootpalphanumeric.input_pattern).html();
      inputPattern = new RegExp(sanitizedPattern.replace(/^\/|\/[^\/]*$/g, ''), 'g');
    } else {
      inputPattern = /[^a-zA-Z0-9]/g;
    }
  } catch (error) {
    console.error('Invalid regex pattern:', error);
    inputPattern = /[^a-zA-Z0-9]/g; // Fallback to safe default
  }

  $otpFields.on('input', function () {
    const originalValue = this.value;
    
    // Sanitize user input to prevent XSS
    const sanitizedValue = $mo('<div/>').text(originalValue).html();
    const cleanedValue = sanitizedValue.replace(inputPattern, '');
    
    if (originalValue !== cleanedValue) {
      // Safely update the input value
      this.value = cleanedValue;
    }
  });

  $otpFields.on('paste', function (event) {
    event.preventDefault();
    
    try {
      const pastedData = event.originalEvent.clipboardData.getData('text');
      
      // Sanitize pasted data to prevent XSS
      const sanitizedPastedData = $mo('<div/>').text(pastedData).html();
      const cleanedData = sanitizedPastedData.replace(inputPattern, '');
      
      const inputField = this;
      const start = inputField.selectionStart;
      const end = inputField.selectionEnd;
      const currentValue = inputField.value;
      
      // Safely construct new value
      const newValue = currentValue.slice(0, start) + cleanedData + currentValue.slice(end);
      
      // Update input value safely
      inputField.value = newValue;
      inputField.setSelectionRange(start + cleanedData.length, start + cleanedData.length);
    } catch (error) {
      console.error('Error handling paste event:', error);
      // Fallback: prevent paste operation on error
      event.preventDefault();
    }
  });
});