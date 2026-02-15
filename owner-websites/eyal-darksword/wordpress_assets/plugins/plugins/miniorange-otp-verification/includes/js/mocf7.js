jQuery(document).ready(function () {
    let $mo = jQuery;
    let loaderHtml = "<div class='moloader'></div>";
    
    $mo(".wpcf7-form.init [id ^= miniorange_otp_token_submit]").each(function (index) {
        $mo(this).on("click", function () {
            let form = $mo(this).closest("form");
            let userInput = form.find("input[name=" + mocf7.field + "]").val();
            let otpField = form.find("input[name=phone_verify]");
            let msgBox = form.find("#mo_message");
            
            msgBox.empty();
            msgBox.append(loaderHtml);
            msgBox.show();
            
            $mo.ajax({
                url: mocf7.siteURL,
                type: "POST",
                data: { 
                    user_phone: userInput, 
                    user_email: userInput, 
                    action: mocf7.gaction, 
                    security: mocf7.nonce 
                },
                crossDomain: !0,
                dataType: "json",
                success: function (response) {
                    if ("success" == response.result) {
                        msgBox.empty();
                        msgBox.append(response.message);
                        msgBox.css({
                            "background-color": "#dbfff7",
                            "color": "#008f6e"
                        });
                        otpField.focus();
                    } else {
                        msgBox.empty();
                        msgBox.append(response.message);
                        msgBox.css({
                            "background-color": "#ffefef",
                            "color": "#ff5b5b"
                        });
                    }
                },
                error: function (xhr, status, error) {
                    console.error('AJAX Error:', error);
                    msgBox.empty();
                    msgBox.append("An error occurred. Please try again.");
                    msgBox.css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                },
            });
        });
    });
});
