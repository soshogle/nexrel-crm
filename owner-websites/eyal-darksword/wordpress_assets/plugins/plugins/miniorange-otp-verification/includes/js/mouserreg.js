jQuery(document).ready(function () {
    if (typeof window.$mo === 'undefined') {
        window.$mo = jQuery;
    }
    const $mo = window.$mo;
    
    $mo("div.user-registration").each(function () {
        let formId = $mo(this).attr("id").replace("user-registration-form-", "");
        if (formId in userreg.formDetails) {
            userreg.otpType.forEach(function (otpType) {
                addButtonAndFieldsUserRegFrom(formId, otpType);
                bindSendOTPButtonUserRegFrom(formId, otpType);
                bindVerifyButtonUserRegFrom(formId, otpType);
                // is_already_verified(formId, otpType);
            });
        }
    });
});

function is_already_verified(formId, otpType) {
    var isValidated = userreg.validated && userreg.validated[formId] && userreg.validated[formId][otpType];
    if (isValidated) {
        $mo("#mo_send_otp_" + otpType + formId)
            .val("✔")
            .attr("disabled", true);
        $mo("#mo_send_otp_" + otpType + formId).attr("style", "background:green !important;width:auto;padding: 12px 5px;color: #ffffff;");
    }
}

function addButtonAndFieldsUserRegFrom(formId, otpType) {
    let containerCSS = 'style="margin-top:10px;"';
    let buttonCSS = 'style="margin:0px;"';
    let messageBox = '<div id="mo_message' + otpType + formId + '" style="width:100%; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;"></div>';
    let verifyField =
        '<div id="mo_verify-container' +
        otpType +
        formId +
        '" hidden="" class="ur-field-item field-text" ><label class="wpforms-field-label" for="mo_verify_otp">' +
        userreg.fieldText +
        '</label><input type="text" id="mo_verify_otp_' +
        otpType +
        formId +
        '" class="input-text input-email ur-frontend-field" name="mo_verify_otp" /></div>';
    let verifyOTPButton =
        '<div id="wpforms-submit-container' +
        otpType +
        formId +
        '" style="display:none;">' +
        '<input type="button" name="mo_verify_button_' +
        otpType +
        formId +
        '" class="btn button" id="mo_verify_button_' +
        otpType +
        formId +
        '" ' +
        buttonCSS +
        ' value="Verify OTP"/></div>';
    let sendOTPButton =
        '<div ' +
        containerCSS +
        '><input type="button" name="mo_send_otp_' +
        otpType +
        formId +
        '" class="btn button" id="mo_send_otp_' +
        otpType +
        formId +
        '"' +
        buttonCSS +
        ' value="' +
        userreg.buttontext +
        '"/></div>';
    let html = sendOTPButton + messageBox + verifyField + verifyOTPButton;
    $mo(html).insertAfter("#" + userreg.formDetails[formId][otpType + "key"]);
}

function bindSendOTPButtonUserRegFrom(formId, otpType) {
    let img = "<div class='moloader'></div>";
    $mo("#mo_send_otp_" + otpType + formId).click(function () {
        let userInput = $mo("input[name=" + userreg.formDetails[formId][otpType + "key"] + "]").val();
        
        // Sanitize user input to prevent XSS
        userInput = $mo('<div/>').text(userInput).html();
        
        $mo("#mo_message" + otpType + formId).empty();
        $mo("#mo_message" + otpType + formId).append(img);
        $mo("#mo_message" + otpType + formId).show();
        
        $mo.ajax({
            url: userreg.siteURL,
            type: "POST",
            data: { 
                user_email: userInput, 
                user_phone: userInput, 
                otpType: otpType, 
                security: userreg.gnonce, 
                action: userreg.gaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                // Sanitize server response to prevent XSS
                let sanitizedMessage = $mo('<div/>').text(response.message).html();
                
                if (response.result === "success") {
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(sanitizedMessage);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#dbfff7",
                        "color": "#008f6e"
                    });
                    $mo("#mo_verify-container" + otpType + formId + ",#wpforms-submit-container" + otpType + formId).show();
                } else {
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(sanitizedMessage);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
                $mo("#mo_message" + otpType + formId).empty();
                $mo("#mo_message" + otpType + formId).append("An error occurred. Please try again.");
                $mo("#mo_message" + otpType + formId).css({
                    "background-color": "#ffefef",
                    "color": "#ff5b5b"
                });
            },
        });
    });
}

function bindVerifyButtonUserRegFrom(formId, otpType) {
    let img = "<div class='moloader'></div>";
    $mo("#mo_verify_button_" + otpType + formId).click(function () {
        let otpToken = $mo("#mo_verify_otp_" + otpType + formId).val();
        let userInput = $mo("input[name=" + userreg.formDetails[formId][otpType + "key"] + "]").val();
        
        // Sanitize user input to prevent XSS
        otpToken = $mo('<div/>').text(otpToken).html();
        userInput = $mo('<div/>').text(userInput).html();
        
        // Safely set window.verifyOTPmessage
        if (typeof window !== 'undefined') {
            window.verifyOTPmessage = img;
        }
        
        $mo("#mo_message" + otpType + formId).empty();
        $mo("#mo_message" + otpType + formId).append(img);
        $mo("#mo_message" + otpType + formId).show();
        
        $mo.ajax({
            url: userreg.siteURL,
            type: "POST",
            data: { 
                user_email: userInput, 
                user_phone: userInput, 
                otp_token: otpToken, 
                otpType: otpType, 
                security: userreg.vnonce, 
                action: userreg.vaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                // Sanitize server response to prevent XSS
                let sanitizedMessage = $mo('<div/>').text(response.message).html();
                
                if (response.result === "success") {
                    if (typeof window !== 'undefined') {
                        delete window.verifyOTPmessage;
                    }
                    $mo("#mo_message" + otpType + formId).hide();
                    $mo("#mo_verify-container" + otpType + formId + ",#wpforms-submit-container" + otpType + formId).hide();
                    $mo("#mo_send_otp_" + otpType + formId)
                        .val("✔")
                        .attr("disabled", true);
                    $mo("#mo_send_otp_" + otpType + formId).attr("style", "background:green !important;width:auto;margin:0;padding: 7px 5px;margin-top: 1px;color: #ffffff;");
                } else {
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(sanitizedMessage);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                    if (typeof window !== 'undefined') {
                        window.verifyOTPmessage = sanitizedMessage;
                    }
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
                $mo("#mo_message" + otpType + formId).empty();
                $mo("#mo_message" + otpType + formId).append("An error occurred. Please try again.");
                $mo("#mo_message" + otpType + formId).css({
                    "background-color": "#ffefef",
                    "color": "#ff5b5b"
                });
            },
        });
    });
}
