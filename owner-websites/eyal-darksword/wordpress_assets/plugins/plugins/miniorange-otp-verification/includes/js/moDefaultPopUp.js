function mo_validation_goback(){
    if(document.querySelector("#validation_goBack_form") !== null){
        document.getElementById("validation_goBack_form").submit();
    }
}
function mo_otp_verification_resend(){
    document.getElementById("verification_resend_otp_form").submit()
}
function mo_select_goback(){
    document.getElementById("goBack_choice_otp_form").submit()
}
document.addEventListener("DOMContentLoaded", function() {
    var form = document.querySelector("#mo_validate_form");

    // If the default popup form is not present (e.g. some flows inject custom popups via JS),
    // safely exit without binding any handlers to avoid runtime errors.
    if (!form) {
        return;
    }

    form.addEventListener("submit", function() {
        this.style.display = "none";
        var msgEl = document.querySelector("#mo_message");
        if (msgEl) {
            msgEl.style.display = "block";
        }
    });
    var $mo = jQuery;
    $mo('.close').on('click', function() {
        mo_validation_goback();
    });
    $mo('.mo-resend').on('click', function() {
        mo_otp_verification_resend();
    });
    $mo('#mo_sec_otp_submit_button').on('click', function() {
        mo_select_goback();
    });
    const otpInputs = document.querySelectorAll(".mo_customer_validation-textbox.mo-new-ui-validation-textbox");
    // Create regex pattern to remove anything other than alphanumeric characters
    let inputPattern;
    if (typeof moPopUps !== 'undefined' && moPopUps.pattern) {
        try {
            // Convert string pattern to RegExp (remove leading/trailing slashes and flags)
            const patternStr = moPopUps.pattern.replace(/^\/|\/[gimuy]*$/g, '');
            inputPattern = new RegExp(patternStr, 'g');
        } catch (error) {
            // Fallback to default alphanumeric pattern if conversion fails
            inputPattern = /[^a-zA-Z0-9]/g;
        }
    } else {
        // Default pattern: remove anything other than alphanumeric
        inputPattern = /[^a-zA-Z0-9]/g;
    }
    
    otpInputs.forEach(function (input) {
        input.addEventListener("input", function () {
            const originalValue = input.value;
            const cleanedValue = originalValue.replace(inputPattern, "");
            if (originalValue !== cleanedValue) {
                input.value = cleanedValue;
            }
        });
        input.addEventListener("paste", function (e) {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData("text");
            const clean = pasted.replace(inputPattern, "");
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = input.value;
            input.value = currentValue.slice(0, start) + clean + currentValue.slice(end);
            input.setSelectionRange(start + clean.length, start + clean.length);
        });
    });
});
