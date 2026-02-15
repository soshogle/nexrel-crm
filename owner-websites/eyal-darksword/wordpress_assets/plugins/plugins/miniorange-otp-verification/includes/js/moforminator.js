if (typeof window.$mo === 'undefined') {
    window.$mo = window.jQuery;
}

$mo(document).ready(function () {
    $mo("form.forminator-custom-form").each(function () {
        let form = $mo(this);
        let formId = form.find("input[name='form_id']").val();

        if (formId in moforminator.formDetails) {
            moforminator.otpType.forEach(function (otpType) {
                addButtonAndFieldsForminator(formId, otpType);
                bindSendOTPButtonForminator(formId, otpType);
                bindVerifyButtonForminator(formId, otpType);
            });
        }
    });
});

function is_already_verified(formId, otpType) {
    if (moforminator.validated[otpType]) {
        $mo("#mo_send_otp_" + otpType + formId)
            .val("✔")
            .attr("disabled", true);
        $mo("#mo_send_otp_" + otpType + formId).attr("style", "background:green !important;width:auto;padding: 12px 5px;color: #ffffff;");
    }
}

function addButtonAndFieldsForminator(formId, otpType) {
    let containerCSS = 'style="margin-top:10px;"';
    let buttonCSS = 'style="margin:0px;"';
    let messageBox = '<div id="mo_message' + otpType + formId + '" style="width:100%; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;"></div>';
    let verifyField = '<div id="mo_verify-container' + otpType + formId + '" class="forminator-field" style="display:none;"><label class="forminator-label" for="mo_verify_otp">' + moforminator.fieldText + '</label><input type="text" id="mo_verify_otp_' + otpType + formId + '" class="forminator-input" name="mo_verify_otp" /></div><br>';
    let verifyOTPButton = '<div id="forminator-field' + otpType + formId + '" style="display:none;" class="forminator-field" ' + containerCSS +
        '><input type="button" name="mo_verify_button_' + otpType + formId + '" class="forminator-button" id="mo_verify_button_' + otpType + formId +
         '" ' + buttonCSS + ' value="Verify OTP"/></div>';
    
    let sendOTPButton = '<div class="forminator-field" ' + containerCSS +
        '><input type="button" name="mo_send_otp_' +
        otpType + formId + '" class="forminator-button" id="mo_send_otp_' + otpType + formId + '" ' +
        buttonCSS + ' value="' + moforminator.buttontext + '"/></div>';
    let html = sendOTPButton + messageBox + verifyField + verifyOTPButton;
    let insertAfterSelector = $mo("#forminator-module-" + formId + " input[name='" + moforminator.formDetails[formId][otpType + "key"] + "']").parent();
    
    $mo(html).insertAfter(insertAfterSelector);
}

function bindSendOTPButtonForminator(formId, otpType) {
    let loaderHtml = "<div class='moloader'></div>";
    
    $mo("#mo_send_otp_" + otpType + formId).click(function () {
        let userInput = $mo("#forminator-module-" + formId + " input[name='" + moforminator.formDetails[formId][otpType + "key"] + "']").val();
        
        $mo("#mo_message" + otpType + formId).empty();
        $mo("#mo_message" + otpType + formId).append(loaderHtml);
        $mo("#mo_message" + otpType + formId).show();
        
        $mo.ajax({
            url: moforminator.siteURL,
            type: "POST",
            data: { 
                user_email: userInput, 
                user_phone: userInput, 
                otpType: otpType, 
                security: moforminator.gnonce, 
                action: moforminator.gaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                if (response.result === "success") {
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(response.message);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#dbfff7",
                        "color": "#008f6e"
                    });
                    $mo("#mo_verify-container" + otpType + formId + ",#forminator-field" + otpType + formId).show();
                } else {
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(response.message);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
            },
        });
    });
}

function bindVerifyButtonForminator(formId, otpType) {
    let loaderHtml = "<div class='moloader'></div>";
    
    $mo("#mo_verify_button_" + otpType + formId).click(function () {
        let otpInput = $mo("#mo_verify_otp_" + otpType + formId).val();
        let userInput = $mo("#forminator-module-" + formId + " input[name='" + moforminator.formDetails[formId][otpType + "key"] + "']").val();
        window.verifyOTPmessage = loaderHtml;
        $mo("#mo_message" + otpType + formId).empty();
        $mo("#mo_message" + otpType + formId).append(loaderHtml);
        $mo("#mo_message" + otpType + formId).show();
        
        $mo.ajax({
            url: moforminator.siteURL,
            type: "POST",
            data: { 
                user_email: userInput, 
                user_phone: userInput, 
                otp_token: otpInput, 
                otpType: otpType, 
                security: moforminator.vnonce, 
                action: moforminator.vaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                if (response.result === "success") {
                    if (typeof window !== 'undefined') {
                        delete window.verifyOTPmessage;
                    }
                    $mo("#mo_message" + otpType + formId).hide();
                    $mo("#mo_verify-container" + otpType + formId + ",#forminator-field" + otpType + formId).hide();
                    $mo("#mo_send_otp_" + otpType + formId).val("✔").attr("disabled", true);
                    $mo("#mo_send_otp_" + otpType + formId).attr("style", "background:green !important;width:auto;margin:0;padding: 7px 5px;margin-top: 1px;color: #ffffff;");
                } else {
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(response.message);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                    window.verifyOTPmessage = response.message;
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
