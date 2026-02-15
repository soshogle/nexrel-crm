jQuery(document).ready(function () {
    let $mo = jQuery;
    let safeButtonText = $mo('<div/>').text(mowcreg.buttontext || '').html();
    let button = '<p class="woocommerce-form-row form-row"><input type="button" class="woocommerce-Button button" id="mo_wc_send_otp" name="mosendotp" value="' + safeButtonText + '"></p>';
    let img = "<div class='moloader'></div>";
    let html = button + "<div id='mo_message' role='status' aria-live='polite' style='display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;'>" + img + "</div>";

    const fieldKey = String(mowcreg.field || "");
    const fieldSel = (typeof $mo.escapeSelector === "function")
      ? $mo.escapeSelector(fieldKey)
      : fieldKey.replace(/(['"\\])/g, "\\$1");
    $mo(html).insertAfter($mo("label[for='" + fieldSel + "']").parent());

    $mo('#mo_wc_send_otp').click(function () {
        let userInput = $mo("input[id^='" + fieldSel + "']").val() || "";
        // Sanitize user input to prevent XSS
        userInput = $mo('<div/>').text(userInput).html();
        
        $mo("#mo_message").empty();
        $mo("#mo_message").append(img);
        $mo("#mo_message").show();
        
        $mo.ajax({
            url: mowcreg.siteURL + "/?mo_wcreg_option=miniorange-wc-reg-verify",
            type: "POST",
            data: {
                user_email: userInput,
                user_phone: userInput,
                security: mowcreg.nonce
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
    });
});