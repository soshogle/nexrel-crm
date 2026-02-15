// button html template
let moUmProfSendOtpButton = '<input class="um-button um-alt um-col-alt" ' +
                    'id="mo_um_accup_button" ' +
                    'type="button" ' +
                    'value="' + moumacvar.buttonText + '" ></input>';

// image field
let img = "<div class='moloader'></div>";

// html button + message div field
let html = moUmProfSendOtpButton +
            "<div id='mo_message' " +
                "style='width:100%; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;'>" +
                img +
            "</div>";

// otp field
let otpField = html + '<div class="um-field um-field-text um-field-type_text um-acc-otp" ' +
                            'data-key="' + moumacvar.formKey + '">' +
                        '<div class="um-field-label">' +
                            '<label for="verify_field">Enter OTP here</label>' +
                            '<div class="um-clear"></div>' +
                        '</div>' +
                        '<div class="um-field-area">' +
                            '<input autocomplete="off" ' +
                                    'class="um-form-field valid " ' +
                                    'type="text" ' +
                                    'name="' + moumacvar.formKey + '" ' +
                                    'id="verify_field" ' +
                                    'placeholder="" ' +
                                    'data-validate="" ' +
                                    'data-key="' + moumacvar.formKey + '">' +
                            '<input type="hidden" ' +
                                    'name="mo_um_account_profile_nonce" ' +
                                    'id="mo_um_profile_nonce" ' +
                                    'value="' + moumacvar.accountProfileNonce + '">' +
                        '</div>' +
                    '</div>';

function sendOTP() {
    let userEmail = $mo('.um-account [id^=user_email]').val();
    let userPhone = $mo('.um-profile [id^=' + moumacvar.phoneKey + ']').val();
    
    // Sanitize user input to prevent XSS
    userEmail = $mo('<div/>').text(userEmail).html();
    userPhone = $mo('<div/>').text(userPhone).html();

    $mo("#mo_message").empty();
    $mo("#mo_message").append(img);
    $mo("#mo_message").show();

    let type = $mo('.um-account').length ? moumacvar.emailOtpType : ($mo('.um-profile').length ? moumacvar.phoneOtpType : 'none');

    $mo.ajax({
        url: moumacvar.siteURL + "/?option=miniorange-um-acc-ajax-verify",
        type: "POST",
        data: {
            user_email: userEmail,
            user_phone: userPhone,
            security: moumacvar.nonce,
            otp_request_type: type
        },
        crossDomain: true,
        dataType: "json",
        success: function (response) {
            // Sanitize server response to prevent XSS
            let sanitizedMessage = $mo('<div/>').text(response.message).html();
            
            if (response.result === "success") {
                $mo("#mo_message").empty();
                $mo("#mo_message").append(sanitizedMessage);
                $mo("#mo_message").css({
                    "background-color": "#dbfff7",
                    "color": "#008f6e"
                });
            } else {
                $mo("#mo_message").empty();
                $mo("#mo_message").append(sanitizedMessage);
                $mo("#mo_message").css({
                    "background-color": "#ffefef",
                    "color": "#ff5b5b"
                });
            }
        },
        error: function (xhr, status, error) {
            console.error('AJAX Error:', error);
            $mo("#mo_message").empty();
            $mo("#mo_message").append("An error occurred. Please try again.");
            $mo("#mo_message").css({
                "background-color": "#ffefef",
                "color": "#ff5b5b"
            });
        }
    });
}

function insertOTPField() {
    // Check if we're on account page or profile edit page
    const isAccountPage = $mo('.um-account').length > 0 || window.location.href.includes('/account/');
    const isProfilePage = $mo('.um-profile').length > 0;
    const urlParams = new URLSearchParams(window.location.search);
    const isProfileEditPage = isProfilePage && (urlParams.get('um_action') === 'edit' || window.location.href.includes('um_action=edit'));
    
    // Only show OTP field on account page or profile edit page
    if (!isAccountPage && !isProfileEditPage) {
        return;
    }
    
    // Prevent duplicate UI blocks
    if ($mo(".um-acc-otp").length > 0 || $mo("#mo_um_accup_button").length > 0 || $mo("#mo_message").length > 0) return;

    const emailChanged = (moumacvar.otpType === moumacvar.emailOtpType || moumacvar.otpType === moumacvar.bothOTPType) &&
        $mo('.um-account [id^="user_email"]').val() !== moumacvar.emailValue;
    const phoneChanged = (moumacvar.otpType === moumacvar.phoneOtpType || moumacvar.otpType === moumacvar.bothOTPType) &&
        $mo('.um-profile [id^="' + jQuery.escapeSelector(moumacvar.phoneKey) + '"]').val() !== moumacvar.phoneValue;

    let $anchor = null;
    if (isAccountPage && emailChanged) {
        $anchor = $mo('.um-account [id^="user_email"]');
    } else if (isProfilePage && phoneChanged) {
        $anchor = $mo('.um-profile [id^="' + jQuery.escapeSelector(moumacvar.phoneKey) + '"]');
    } else if (emailChanged) {
        $anchor = $mo('.um-account [id^="user_email"]');
    } else if (phoneChanged) {
        $anchor = $mo('.um-profile [id^="' + jQuery.escapeSelector(moumacvar.phoneKey) + '"]');
    }
    if ($anchor && $anchor.length) {
        $mo(otpField).insertAfter($anchor.parent().parent());
    }
}

function removeOTPField() {
    $mo("#mo_um_accup_button").remove();
    $mo(".um-acc-otp").remove();
    $mo("#mo_message").remove();
    $mo("#mo_um_profile_nonce").remove();
}

function focusChecks() {
    $mo('.um-account [id^=user_email],.um-profile [id^=' + moumacvar.phoneKey + ']').on("change paste keyup", function () {
        if ($mo(this).val() === moumacvar.phoneValue || $mo(this).val() === moumacvar.emailValue) {
            removeOTPField();
        } else if ($mo(".um-acc-otp").length === 0) {
            insertOTPField();
        }
    });
}

jQuery(document).ready(function () {
    const $mo = window.$mo || window.jQuery; 
    if (!window.$mo) {
        window.$mo = $mo;
    }
    
    // Add click handler for send OTP button instead of inline onclick
    $mo(document).on('click', '#mo_um_accup_button', function () {
        sendOTP();
    });
    
    focusChecks();
    
    const emailEq = $mo('.um-account [id^="user_email"]').val() === moumacvar.emailValue;
    const phoneEq = $mo('.um-profile [id^="' + jQuery.escapeSelector(moumacvar.phoneKey) + '"]').val() === moumacvar.phoneValue;
    if (emailEq || phoneEq) {
        removeOTPField();
    } else if ($mo(".um-acc-otp").length === 0 && ($mo('.um-profile [id^="' + jQuery.escapeSelector(moumacvar.phoneKey) + '"]').length > 0 || $mo('.um-account [id^="user_email"]').length > 0)) {
        insertOTPField();
    }
});