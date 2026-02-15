if (typeof $mo === 'undefined') {
    let $mo = jQuery;
}

$mo(document).ready(function () {
    $mo("div.wpforms-container").each(function () {
        //fetch the form id for the form
        let formId = $mo(this).attr('id').replace('wpforms-', '');
        if (formId in mowpforms.formDetails) {
            mowpforms.otpType.forEach(function (otpType) {
                addButtonAndFieldsWpForms(formId, otpType);
                bindSendOTPButtonWpForms(formId, otpType);
                bindVerifyButtonWpForms(formId, otpType);
                is_already_verified_wpforms(formId, otpType);
            });
        }
    });
});

//already validated and page refreshes, keep the tick mark
function is_already_verified_wpforms(formId, otpType) {
    if (mowpforms.validated[otpType]) {
        $mo("#mo_send_otp_" + otpType + formId).val('✔').attr('disabled', true);
        $mo("#mo_send_otp_" + otpType + formId).attr('style', 'background:green !important;width:100%;padding: 12px 5px;color: #ffffff;');
    }
}

function addButtonAndFieldsWpForms(formid, otpType) {
    // CSS to align button and fields
    let containerCSS = 'style="margin:0px;"';
    let buttonCSS = 'style="margin:0px;"';

    // messagebox template
    let messageBox = '<div ' +
        'id="mo_message' + otpType + formid + '" ' +
        'style="width:auto; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;">' +
        '</div>';

    //Verification field
    let verifyField = '<div id="mo_verify-container' + otpType + formid + '" ' +
        'class="wpforms-field wpforms-field-text" style="display:none;" >' +
        '<label class="wpforms-field-label" for="mo_verify_otp">' +
        mowpforms.fieldText +
        '</label>' +
        '<input type="text" ' +
        'id="mo_verify_otp_' + otpType + formid + '" ' +
        'class="wpforms-field-medium wpforms-field-required"' +
        'name="mo_verify_otp" />' +
        '</div>';

    //Verify Button
    let verifyOTPButton = '<div id="wpforms-submit-container' + otpType + formid + '" ' +
        'class="wpforms-submit-container" style="margin:0px; display:none;">' +
        '<input type="button" ' +
        'name="mo_verify_button_' + otpType + formid + '" ' +
        'class="wpforms-submit wpforms-page-button" ' +
        'id="mo_verify_button_' + otpType + formid + '" ' +
        buttonCSS +
        ' value="' + mowpforms.verifyButtonText + '" />' +
        '<input type="hidden" ' +
        'id="mo_wpforms_nonce_' + otpType + formid + '" ' +
        'name="mo_wpforms_nonce" ' +
        'value="' + mowpforms.formNonce + '" />' +
        '</div>';

    //Send OTP button
    let sendOTPButton = '<div class="wpforms-submit-container" ' + containerCSS + '>' +
        '<input type="button" ' +
        'name="mo_send_otp_' + otpType + formid + '" ' +
        'class="wpforms-submit wpforms-page-button" ' +
        'id="mo_send_otp_' + otpType + formid + '"' +
        buttonCSS +
        ' value="' + mowpforms.buttontext + '"/>' +
        '</div>';

    let html = sendOTPButton + messageBox + verifyField + verifyOTPButton;
    let fieldID = mowpforms.otpType;

    $mo(html).insertAfter('#wpforms-' + formid + '-field_' + mowpforms.formDetails[formid][otpType + 'key']);
    $mo(fieldID).css('width', '60%');
}

function bindSendOTPButtonWpForms(formId, otpType) {
    let img = "<div class='moloader'></div>"; // image HTML templates

    $mo('#mo_send_otp_' + otpType + formId).click(function () {
        let userInput = $mo('#wpforms-' + formId + '-field_' + mowpforms.formDetails[formId][otpType + 'key']).val();
        
        $mo("#mo_message" + otpType + formId).empty();
        $mo("#mo_message" + otpType + formId).append(img);
        $mo("#mo_message" + otpType + formId).show();
        
        $mo.ajax({
            url: mowpforms.siteURL,
            type: "POST",
            data: {
                user_email: userInput,
                user_phone: userInput,
                otpType: otpType,
                security: mowpforms.gnonce,
                action: mowpforms.gaction,
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                if (response.result === "success") {
                    //if otp was sent successfully
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(response.message);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#dbfff7",
                        "color": "#008f6e"
                    });
                    $mo("#mo_verify-container" + otpType + formId + ",#wpforms-submit-container" + otpType + formId).show();
                } else {
                    // if otp wasn't sent successfully
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
            }
        });
    });
}

function bindVerifyButtonWpForms(formId, otpType) {
    // image HTML templates
    let img = "<div class='moloader'></div>";

    $mo('#mo_verify_button_' + otpType + formId).click(function () {
        // Safely set window.verifyOTPmessage
        if (typeof window !== 'undefined') {
            window.verifyOTPmessage = img;
        }
        
        let otpToken = $mo('#mo_verify_otp_' + otpType + formId).val();
        let userInput = $mo('#wpforms-' + formId + '-field_' + mowpforms.formDetails[formId][otpType + 'key']).val();
        
        $mo("#mo_message" + otpType + formId).empty();
        $mo("#mo_message" + otpType + formId).append(img);
        $mo("#mo_message" + otpType + formId).show();
        
        $mo.ajax({
            url: mowpforms.siteURL,
            type: "POST",
            data: {
                user_email: userInput,
                user_phone: userInput,
                otp_token: otpToken,
                otpType: otpType,
                security: mowpforms.vnonce,
                action: mowpforms.vaction,
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                $mo("#mo_message" + otpType + formId).empty();
                if (response.result === "success") {
                    //if otp was sent successfully
                    if (typeof window !== 'undefined') {
                        delete window.verifyOTPmessage;
                    }
                    $mo("#mo_message" + otpType + formId).hide();
                    $mo("#mo_verify-container" + otpType + formId + ",#wpforms-submit-container" + otpType + formId).hide();
                    $mo("#mo_send_otp_" + otpType + formId).val('✔').attr('disabled', true);
                    $mo("#mo_send_otp_" + otpType + formId).attr('style', 'background:green !important;width:auto;margin:0;padding: 7px 5px;margin-top: 1px;color: #ffffff;');
                } else {
                    // if otp wasn't sent successfully
                    $mo("#mo_message" + otpType + formId).empty();
                    $mo("#mo_message" + otpType + formId).append(response.message);
                    $mo("#mo_message" + otpType + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                    if (typeof window !== 'undefined') {
                        window.verifyOTPmessage = response.message;
                    }
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
            }
        });
    });
}


