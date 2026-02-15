jQuery(document).ready(function () {
    let $mo = jQuery;
    
    // Safely set window property
    if (typeof window !== 'undefined' && typeof mowcac !== 'undefined' && mowcac) {
        window.mowc_otp_type = mowcac.otpType;
    }
    
    $mo("#enter_otp_field").hide();
    focusChecks();
    
    // Add click handler for send OTP button
    $mo(document).on('click', '#miniorange_otp_token_submit', function () {
        sendOTP();
    });
});

let button = '<button type="button" class="button miniorange_otp_token_submit" id="miniorange_otp_token_submit">' + mowcac.buttontext + '</button>';
let moLoaderImg = "<div class='moloader'></div>";
let moOTPFieldHtml = button +
    "<div id='mo_message' " +
    "style='width:100%; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px'>" +
    moLoaderImg +
    "</div>";

function focusChecks() {
    let $mo = jQuery;
    
    if (mowcac.otpType === "phone") {
        $mo('form.edit-account #billing_phone').on("change paste keyup", function () {
            if ($mo(this).val() === mowcac.fieldValue) {
                removeOTPField();
            } else {
                insertOTPField();
                $mo("#enter_otp_field").insertAfter("#mo_message").show();
            }
        });
    } else {
        $mo('form.edit-account #account_email').on("change paste keyup", function () {
            if ($mo(this).val() === mowcac.fieldValue) {
                removeOTPField();
            } else {
                insertOTPField();
                $mo("#enter_otp_field").insertAfter("#mo_message").show();
            }
        });
    }
}

function sendOTP() {
    let $mo = jQuery;
    let userInput;
    
    if (mowcac.otpType === "phone") {
        userInput = $mo('#billing_phone').val();
    } else {
        userInput = $mo('#account_email').val();
    }
    $mo("#mo_message").empty();
    $mo("#mo_message").append(moLoaderImg);
    $mo("#mo_message").show();

    $mo.ajax({
        url: mowcac.siteURL,
        type: "POST",
        data: {
            action: mowcac.generateURL,
            user_input: userInput,
            security: mowcac.nonce
        },
        crossDomain: true,
        dataType: "json",
        success: function (response) {
            if (response.result === "success") {
                $mo("#mo_message").empty();
                $mo("#mo_message").append(response.message);
                $mo("#mo_message").css({
                    "background-color": "#dbfff7",
                    "color": "#008f6e"
                });
            } else {
                $mo("#mo_message").empty();
                $mo("#mo_message").append(response.message);
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

function removeOTPField() {
    let $mo = jQuery;
    $mo("#miniorange_otp_token_submit").remove();
    $mo("#enter_otp_field").hide();
    $mo("#mo_message").remove();
}

function insertOTPField() {
    let $mo = jQuery;
    
    if ($mo("#miniorange_otp_token_submit").length === 0) {
        if (mowcac.otpType === "phone") {
            $mo(moOTPFieldHtml).insertAfter("#billing_phone_field");
        } else {
            $mo(moOTPFieldHtml).insertAfter("#account_email");
        }
    }
}
