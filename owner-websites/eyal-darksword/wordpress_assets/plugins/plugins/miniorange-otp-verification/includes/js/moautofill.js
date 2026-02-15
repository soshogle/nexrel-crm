if ('OTPCredential' in window) {
    window.addEventListener('DOMContentLoaded', (event) => {
        setTimeout(function () {
            const inputSelector = document.querySelector('input[autocomplete="one-time-code"]');
            if (!inputSelector) {
                return;
            }
            
            const abortController = new AbortController();
            const formContainingInputField = inputSelector.closest('form');
            
            if (formContainingInputField) {
                formContainingInputField.addEventListener('submit', (submitEvent) => {
                    abortController.abort();
                });
            }
            
            navigator.credentials.get({
                otp: {
                    transport: ['sms']
                },
                signal: abortController.signal
            }).then((otp) => {
                // Sanitize OTP code to prevent XSS
                if (otp && otp.code && typeof otp.code === 'string') {
                    // Use textContent to safely sanitize the OTP code
                    const tempDiv = document.createElement('div');
                    tempDiv.textContent = otp.code;
                    const sanitizedCode = tempDiv.textContent;
                    
                    // Validate OTP code format (numeric only)
                    if (/^\d+$/.test(sanitizedCode)) {
                        inputSelector.value = sanitizedCode;
                        
                        // Auto-submit if submit button exists
                        if (formContainingInputField && typeof formContainingInputField.requestSubmit === 'function') {
                            formContainingInputField.requestSubmit();
                        } else if (window.jQuery && jQuery('input[name="miniorange_otp_token_submit"]').length) {
                            jQuery('input[name="miniorange_otp_token_submit"]').click();
                        }
                    } 
                } 
            }).catch((error) => {
            });
        }, 3000);
    });
}