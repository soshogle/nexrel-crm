jQuery(document).ready(function () {
    const $mo = window.$mo || window.jQuery;
    
    jQuery.each(mofluent.formdetails, function (key, value) {
        const $form = $mo("form#fluentform_" + key);
        const formId = $form.data('form_id');
        if ($form.length && formId) {
            let keyValue = value[mofluent.formkey];
            addButtonAndFieldsFluentForm(formId, keyValue);
            sendOTPFluentForm(formId, keyValue);
        }
    });
});

function addButtonAndFieldsFluentForm(formId, keyValue) {
    let sendOTPButton = '<div style="margin-top:2%" class="ff-el-group ff-text-left"><button type="button" id="mo_send_otp_' + formId + '" class="ff-btn ff-btn-md ff_btn_style">Send OTP</button></div>';
    let messageBox = '<div id="mo_message' + formId + '" style="display:none;width:auto;margin-top:3px; font-size: 16px; padding: 10px 20px; border-radius: 10px"></div>';
    let verifField = '<div id="verifContainer' + formId + '" style="display:none;margin-top:2%;"><div class="ff-el-input--content"><input type="text" name="enter_otp" id="ff_' + formId + '_enter_otp' + formId + '" class="ff-el-form-control" placeholder="Enter OTP" data-name="enter_otp"></div></div>';
    let html = sendOTPButton + messageBox + verifField;
    
    $mo(html).insertAfter("#ff_" + formId + "_" + keyValue);
}

function sendOTPFluentForm(formId, keyValue) {
    $mo("#mo_send_otp_" + formId).click(function (e) {
        let loaderHtml = "<img alt='' src='" + mofluent.imgURL + "'>";
        const rawUserInput = $mo("#ff_" + formId + "_" + keyValue).val();
        const userInput = $mo('<div/>').text(rawUserInput).html();
        
        
        let otpType = mofluent.otpType;
        
        $mo("#mo_message" + formId).empty();
        $mo("#mo_message" + formId).append(loaderHtml);
        $mo("#mo_message" + formId).show();
        
        $mo.ajax({
            url: mofluent.siteURL,
            type: "POST",
            data: { 
                user_value: userInput, 
                otpType: otpType, 
                security: mofluent.gnonce, 
                action: mofluent.gaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                if (response.result === "success") {
                    // Sanitize server response to prevent XSS
                    let sanitizedMessage = $mo('<div/>').text(response.message).html();
                    
                    $mo("#mo_message" + formId).empty();
                    $mo("#mo_message" + formId).append(sanitizedMessage);
                    $mo("#mo_message" + formId).css({
                        "background-color": "#dbfff7",
                        "color": "#008f6e"
                    });
                    $mo("#verifContainer" + formId).show();
                } else {
                    // Sanitize server response to prevent XSS
                    let sanitizedMessage = $mo('<div/>').text(response.message).html();
                    
                    $mo("#mo_message" + formId).empty();
                    $mo("#mo_message" + formId).append(sanitizedMessage);
                    $mo("#mo_message" + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
                $mo("#mo_message" + formId).empty();
                $mo("#mo_message" + formId).append("An error occurred. Please try again.");
                $mo("#mo_message" + formId).css({
                    "background-color": "#ffefef",
                    "color": "#ff5b5b"
                });
            },
        });
    });
}