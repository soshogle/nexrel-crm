function mo_validation_goback(){
    var redirectUrl = (typeof moExternalPopUps !== 'undefined' && moExternalPopUps.login_page_url) 
        ? moExternalPopUps.login_page_url 
        : (typeof moExternalPopUps !== 'undefined' && moExternalPopUps.home_url) 
        ? moExternalPopUps.home_url 
        : window.location.origin;
    window.location.href = redirectUrl;
}
jQuery(document).ready(function(){
    $mo=jQuery;
    
    // Ensure send_otp button is visible when popup loads
    setTimeout(function() {
        var $sendOtpBtn = $mo("#send_otp");
        if ($sendOtpBtn.length > 0 && ($sendOtpBtn.css('display') === 'none' || $sendOtpBtn.is(':hidden'))) {
            $sendOtpBtn.show().css("display", "");
        }
    }, 100);
    
    $mo(".close").click(function(){
        mo_validation_goback();
    });
    $mo("#send_otp").click(function(o){
        var e=$mo("input[name=mo_phone_number]").val();
        var n = $mo("input[name=mopopup_wpnonce]").val();
        
        // Validate phone number is not empty
        if (!e || e.trim() === '') {
            $mo("#mo_message").empty();
            $mo("#mo_message").text('Please enter a valid phone number.');
            $mo("#mo_message").css("background-color","#eda58e");
            $mo("#mo_message").show();
            $mo("input[name=mo_phone_number]").focus();
            return false; // Prevent AJAX call
        }
        
        // Validate phone number format (basic check - should start with +)
        var phonePattern = /^\+/;
        if (!phonePattern.test(e.trim())) {
            $mo("#mo_message").empty();
            $mo("#mo_message").text('Please enter a valid phone number starting with + (e.g., +1XXXXXXXXXX).');
            $mo("#mo_message").css("background-color","#eda58e");
            $mo("#mo_message").show();
            $mo("input[name=mo_phone_number]").focus();
            return false; // Prevent AJAX call
        }
        
        $mo("#mo_message").empty();
        $mo("#mo_message").append('<div class="moloader"></div>');
        $mo("#mo_message").show();
        
        // Store original request data for retry after puzzle completion
        var originalRequestData = {
            url: moExternalPopUps.secure_site_url,
            type: "POST",
            data: {
                action: "mo_external_popup_option",
                mo_external_popup_option: "miniorange-ajax-otp-generate",
                user_phone: e,
                mopopup_wpnonce: n
            },
            crossDomain: true,
            dataType: "json"
        };
        
        // Function to send OTP request
        function sendOTPRequest() {
            $mo.ajax({
                url: originalRequestData.url,
                type: originalRequestData.type,
                data: originalRequestData.data,
                crossDomain: originalRequestData.crossDomain,
                dataType: originalRequestData.dataType,
                success: function(response) {
                    // Check if puzzle is required
                    if (response && (response.result === 'puzzle_required' || response.puzzle_required === true || response.authType === 'PUZZLE_REQUIRED')) {
                        // CRITICAL: Hide the ENTIRE external popup modal, not just the message
                        // Hide all possible external popup elements
                        $mo("#mo_site_otp_form").hide().css('z-index', '1');
                        $mo(".mo_customer_validation-modal").hide().css('z-index', '1');
                        $mo(".mo-modal-backdrop").hide().css('z-index', '1');
                        $mo("#mo_message").empty().hide();
                        
                        // Also try hiding by class combinations
                        $mo("body .mo_customer_validation-modal").hide().css('z-index', '1');
                        $mo("body .mo-modal-backdrop").hide().css('z-index', '1');
                        
                        // Store the original request for retry after puzzle completion
                        window.mo_external_popup_pending_request = originalRequestData;
                        
                        // Set up callback to retry request after puzzle is solved
                        window.MO_OSP_Puzzle_onExternalPopupSuccess = function(verificationData) {
                            // Add puzzle verification data to request
                            if (verificationData && verificationData.puzzle_nonce) {
                                originalRequestData.data.mo_osp_puzzle_nonce = verificationData.puzzle_nonce;
                            }
                            if (verificationData && verificationData.verification_token) {
                                originalRequestData.data.verification_token = verificationData.verification_token;
                            }
                            originalRequestData.data.puzzle_verified = 'true';
                            
                            // Show external popup again before retrying
                            $mo("#mo_site_otp_form").show();
                            $mo(".mo_customer_validation-modal").show();
                            $mo(".mo-modal-backdrop").show();
                            
                            // Retry the original request
                            sendOTPRequest();
                            
                            // Clear callback
                            delete window.MO_OSP_Puzzle_onExternalPopupSuccess;
                            delete window.mo_external_popup_pending_request;
                        };
                        
                        // Check if puzzle popup HTML exists
                        var $puzzlePopup = $mo('#mo-osp-puzzle-popup-outer-div');
                        
                        // Show puzzle if available
                        if (typeof MO_OSP_Puzzle !== 'undefined') {
                            // Ensure puzzle popup HTML exists, if not, wait a bit for it to load
                            if ($puzzlePopup.length === 0) {
                                setTimeout(function() {
                                    $puzzlePopup = $mo('#mo-osp-puzzle-popup-outer-div');
                                    if ($puzzlePopup.length > 0) {
                                        showPuzzleNow();
                                    } else {
                                        console.error('[External Popup] Puzzle popup HTML still not found after wait');
                                        showErrorFallback();
                                    }
                                }, 500);
                            } else {
                                showPuzzleNow();
                            }
                        } else {
                            console.error('[External Popup] MO_OSP_Puzzle not available - puzzle system not loaded');
                            console.error('[External Popup] Available globals:', Object.keys(window).filter(function(k) { return k.indexOf('MO_OSP') !== -1 || k.indexOf('mo_osp') !== -1; }));
                            showErrorFallback();
                        }
                        
                        function showPuzzleNow() {
                            if (typeof MO_OSP_Puzzle.init === 'function' && !MO_OSP_Puzzle.initialized) {
                                MO_OSP_Puzzle.init();
                                MO_OSP_Puzzle.initialized = true;
                            }
                            MO_OSP_Puzzle.showPuzzle({});
                        }
                        
                        function showErrorFallback() {
                            // Fallback: show error message
                            $mo("#mo_site_otp_form").show();
                            $mo(".mo_customer_validation-modal").show();
                            $mo(".mo-modal-backdrop").show();
                            $mo("#mo_message").empty();
                            $mo("#mo_message").text('Puzzle system not available. Please refresh the page.');
                            $mo("#mo_message").css("background-color","#eda58e");
                            $mo("#mo_message").show();
                        }
                        
                        return;
                    }
                    
                    // Handle normal success/error responses
                    if("success"===response.result){
                        $mo("#mo_message").empty();
                        $mo("#mo_message").text(response.message);
                        $mo("#mo_message").css("background-color","#8eed8e");
                        $mo("#validate_otp").show();
                        $mo("#send_otp").val(moExternalPopUps.resend_otp_text);
                        $mo("#mo_validate_otp").show();
                        $mo("input[name=mo_otp_token]").focus();
                    } else {
                        // Error response - show error message and ensure send_otp button is visible
                        $mo("#mo_message").empty();
                        $mo("#mo_message").text(response.message);
                        $mo("#mo_message").css("background-color","#eda58e");
                        
                        // CRITICAL: Ensure send_otp button is visible when error occurs
                        $mo("#send_otp").show().css("display", "");
                        $mo("#validate_otp").hide();
                        $mo("#mo_validate_otp").hide();
                        
                        $mo("input[name=mo_phone_number]").focus();
                    }
                },
                error: function(o,e,m) {
                    console.error('[External Popup] AJAX error:', e, m);
                }
            });
        }
        
        // Send the initial request
        sendOTPRequest();
    }),
    $mo("#validate_otp").click(function(o){
        var e=$mo("input[name=mo_otp_token]").val(),
        m=$mo("input[name=mo_phone_number]").val(),
        n=$mo("input[name=mopopup_wpnonce]").val();
        $mo("#mo_message").empty(),
        $mo("#mo_message").append('<div class="moloader"></div>'),
        $mo("#mo_message").show(),
        $mo.ajax({
            url: moExternalPopUps.secure_site_url,
            type:"POST",
            data:{
                action:"mo_external_popup_option",
                mo_external_popup_option:"miniorange-ajax-otp-validate",
                mo_otp_token:e,
                user_phone:m,
                mopopup_wpnonce:n
            },
            crossDomain:!0,
            dataType:"json",
            success:function(o){
                $mo("#mo_message").append('<div class="moloader"></div>');
                if("success"===o.result){
                    $mo("#mo_message").hide(),
                    $mo("#mo_validate_form").submit()
                } else {
                    $mo("#mo_message").empty(),
                    $mo("#mo_message").text(o.message),
                    $mo("#mo_message").css("background-color","#eda58e"),
                    $mo("input[name=validate_otp]").focus()
                }
            },
            error:function(o,e,m){}
        })
    });
    
    // Add event listener to phone input field to show send_otp button when user types
    // Use event delegation to handle dynamically added elements
    $mo(document).on('input change keyup paste', 'input[name=mo_phone_number]', function() {
        // When user modifies phone number, ensure send_otp button is visible
        // and hide validate_otp button if it was shown
        var $sendOtpBtn = $mo("#send_otp");
        var $validateOtpBtn = $mo("#validate_otp");
        var $validateOtpBox = $mo("#mo_validate_otp");
        
        // Show send_otp button if it's hidden
        if ($sendOtpBtn.length > 0) {
            var isHidden = $sendOtpBtn.css('display') === 'none' || $sendOtpBtn.is(':hidden');
            if (isHidden) {
                // Force show the button by removing inline style and using show()
                $sendOtpBtn.removeAttr('style').show().css("display", "");
            }
        }
        
        // Hide validate_otp button and OTP input box when phone number changes
        if ($validateOtpBtn.length > 0 && $validateOtpBtn.is(':visible')) {
            $validateOtpBtn.hide();
        }
        if ($validateOtpBox.length > 0 && $validateOtpBox.is(':visible')) {
            $validateOtpBox.hide();
        }
        
        // Clear any error messages when user starts typing (optional - can be commented out if you want to keep error visible)
        // var phoneValue = $mo(this).val();
        // if (phoneValue && phoneValue.length > 0) {
        //     var $message = $mo("#mo_message");
        //     if ($message.length > 0) {
        //         var bgColor = $message.css("background-color");
        //         if (bgColor === "rgb(237, 165, 142)" || bgColor === "#eda58e") {
        //             // Error message is showing, clear it when user starts typing
        //             $message.empty().hide();
        //         }
        //     }
        // }
    });
})
document.addEventListener("DOMContentLoaded", function() {
    var form = document.querySelector("#mo_validate_form");
    const otpInputs = document.querySelectorAll(".mo_customer_validation-textbox.mo-new-ui-validation-textbox");
    // Create regex pattern to remove anything other than alphanumeric characters and + sign
    let inputPattern;
    if (typeof moPopUps !== 'undefined' && moPopUps.pattern) {
        try {
            // Convert string pattern to RegExp (remove leading/trailing slashes and flags)
            const patternStr = moPopUps.pattern.replace(/^\/|\/[gimuy]*$/g, '');
            inputPattern = new RegExp(patternStr, 'g');
        } catch (error) {
            // Fallback to default pattern: allow alphanumeric and + sign
            inputPattern = /[^a-zA-Z0-9+]/g;
        }
    } else {
        // Default pattern: remove anything other than alphanumeric and + sign
        inputPattern = /[^a-zA-Z0-9+]/g;
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