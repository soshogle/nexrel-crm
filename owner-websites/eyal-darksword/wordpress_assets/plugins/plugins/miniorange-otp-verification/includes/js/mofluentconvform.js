jQuery(document).ready(function () {
    var $mo = window.$mo || jQuery;
    jQuery.each(mofluentconv.formdetails, function (key, value) {
        let formId = $mo(".ff_conv_app_frame").data("form_id");

        if (formId in mofluentconv.formdetails) {
            let keyValue = value[mofluentconv.formkey];
            addButtonAndFieldsFluentConvForm(formId, keyValue);
            sendOTPFluentConvForm(formId, keyValue);
            validateOTPFluentConvForm(formId, keyValue);
        }
    });
});

function addButtonAndFieldsFluentConvForm(formId, keyValue) {
    let sendOTPButton = '<div style="margin-top:2%" class="ff-el-group ff-text-left"><button type="button" id="mo_send_otp_' + formId + '" class="ff-btn o-btn-action ff-btn-md default">Send Verification Code</button></div>';
    let messageBox = '<div id="mo_message' + formId + '" style="width:auto;margin-top:3px; font-size: 16px; padding: 10px 20px; border-radius: 10px; display:none;"></div>';
    let verifField = '<div id="verifContainer' + formId + '" style="display:none;margin-top:2%;"><div class="ff-el-input--content f-answer f-full-width"><input type="text" name="enter_otp" id="ff_' + formId + '_enter_otp' + formId + '" class="ff-el-form-control" placeholder="Enter OTP Here" data-name="enter_otp"></div></div>';
    let verifyOTPButton = '<div id="fluent-submit-container' + formId + '" class="ff-el-group ff-text-left" style="margin-top:5px;display:none;">' +
        '<button type="button" class="ff-btn o-btn-action ff-btn-md default" name="mo_verify_button_' + formId + '" id="mo_verify_button_' + formId + '">Submit</button></div>';

    let html = sendOTPButton + messageBox + verifField + verifyOTPButton;
    $mo(".ff-btn-submit-left").hide();

    if ($mo("#fluentform_" + formId).length === 0) {
        let element = $mo("input[name=" + keyValue + "]").parent().parent().parent();
        $mo(html).insertAfter(element);
        
        let intervalId = setInterval(checkForElement, 200); // Check every 200 milliseconds
        
        function checkForElement() {
            let targetElement = $mo(".ff-btn-submit-left");
            if (targetElement.length > 0) {
                $mo(".ff-btn-submit-left").hide();
            }
        }
    }
}

function sendOTPFluentConvForm(formId, keyValue) {
    $mo("#mo_send_otp_" + formId).click(function (e) {
        let loaderHtml = "<div class='moloader'></div>";
        let userInput = $mo("input[name=" + keyValue + "]").val();
        
        let otpType = mofluentconv.otpType;

        $mo("#mo_message" + formId).empty();
        $mo("#mo_message" + formId).append(loaderHtml);
        $mo("#mo_message" + formId).show();

        $mo.ajax({
            url: mofluentconv.siteURL,
            type: "POST",
            data: { 
                user_value: userInput, 
                otpType: otpType, 
                security: mofluentconv.nonce, 
                action: mofluentconv.gaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                if (response.result === "success") {
                    $mo("#mo_message" + formId).empty();
                    $mo("#mo_message" + formId).append(response.message);
                    $mo("#mo_message" + formId).css({
                        "background-color": "#dbfff7",
                        "color": "#008f6e"
                    });
                    $mo("#verifContainer" + formId).show();
                    $mo("#fluent-submit-container" + formId).show();
                } else {
                    $mo("#mo_message" + formId).empty();
                    $mo("#mo_message" + formId).append(response.message);
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

function validateOTPFluentConvForm(formId, keyValue) {
    $mo("#mo_verify_button_" + formId).click(function (e) {
        let targetElement = $mo(".o-btn-action");
        let loaderHtml = "<div class='moloader'></div>";
        let otpInput = $mo("input[name=enter_otp]").val();
        let otpType = mofluentconv.otpType;
        let userInput = $mo("input[name=" + keyValue + "]").val();
        window.verifyOTPmessage = loaderHtml;

        $mo("#mo_message" + formId).empty();
        $mo("#mo_message" + formId).append(loaderHtml);
        $mo("#mo_message" + formId).show();
        
        $mo.ajax({
            url: mofluentconv.siteURL,
            type: "POST",
            data: { 
                user_value: userInput, 
                otp_token: otpInput, 
                otpType: otpType, 
                security: mofluentconv.nonce, 
                action: mofluentconv.vaction 
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                if (response.result === "success") {
                    delete window.verifyOTPmessage;
                    targetElement.click();
                } else {
                    $mo("#mo_message" + formId).empty();
                    $mo("#mo_message" + formId).append(response.message);
                    $mo("#mo_message" + formId).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                    window.verifyOTPmessage = response.message;
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