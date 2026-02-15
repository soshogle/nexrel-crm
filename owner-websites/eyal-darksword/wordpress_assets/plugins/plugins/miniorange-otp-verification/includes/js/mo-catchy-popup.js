/**
 * Catchy Popup Script
 * Handles OTP input field navigation and form submission for the Catchy popup template
 */
(function() {
    'use strict';

    /**
     * Initialize catchy popup functionality
     */
    function initCatchyPopup() {
        if (typeof moCatchyPopup === 'undefined') {
            return;
        }

        var otpLength = moCatchyPopup.otpLength || 5;

        // Set up digit group input handlers
        document.querySelectorAll(".digit-group input").forEach(function(input) {
            input.setAttribute("maxlength", "1");
            input.addEventListener("keyup", function(e) {
                var parent = this.parentElement;
                if (e.keyCode === 8 || e.keyCode === 37) {
                    // Backspace or Left Arrow - go to previous field
                    var prev = parent.querySelector("input#" + this.getAttribute("data-previous"));
                    if (prev) {
                        prev.select();
                    }
                } else {
                    // Other keys - go to next field
                    var next = parent.querySelector("input#" + this.getAttribute("data-next"));
                    if (next) {
                        next.select();
                    }
                }
            });
        });

        // Set up submit button handler
        var mo_submit_button = document.getElementById("mo_sec_otp_submit_button");
        if (mo_submit_button) {
            mo_submit_button.onclick = function() {
                var fieldstring = "";
                for (var i = 1; i <= otpLength; i++) {
                    var digitInput = document.querySelector("#digit-" + i);
                    if (digitInput) {
                        fieldstring += digitInput.value;
                    }
                }
                var hiddenField = document.querySelector("#hidden_input_field");
                if (hiddenField) {
                    hiddenField.value = fieldstring;
                }
                var validateForm = document.querySelector("#mo_validate_form");
                if (validateForm) {
                    validateForm.submit();
                }
            };
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatchyPopup);
    } else {
        // DOM is already ready
        initCatchyPopup();
    }

})();

