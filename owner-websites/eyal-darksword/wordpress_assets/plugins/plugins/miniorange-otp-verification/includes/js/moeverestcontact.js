jQuery(document).ready(function () {
    let $mo = jQuery;
    let formDetails = moeverestcontact.forms;
    let otpType = moeverestcontact.otpType;

    // return if the enabled form is not found
    if ($mo(".everest-form").length <= 0) {
        return;
    }

    $mo("form.everest-form").each(function () {
        let form = $mo(this);
        let formID = form.attr("data-formid");
        
        if (formID in formDetails) {
            let fieldID = 'evf-' + formID + '-field_' + formDetails[formID][moeverestcontact.formkey];
            let loaderHtml = '<div class="moloader"></div>';

            let messageBox = '<div style="margin-top:2%">' +
                '<div id="mo_message' + fieldID + '" ' +
                'style="width:100%; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;">' +
                '</div>' +
                '</div>';

            let button = '<div style="margin-top: 2%;">' +
                '<div class="">' +
                '<button type="button" style="width:100%;" class="btn btn-default" ' +
                'id="miniorange_otp_token_submit' + fieldID + '" ' +
                'title="Please Enter your phone details to enable this.">' +
                moeverestcontact.buttontext +
                '</button>' +
                '</div>' +
                '</div>';

            $mo(button + messageBox).insertAfter($mo('#' + fieldID).parent());

            $mo('#miniorange_otp_token_submit' + fieldID).click(function () {
                let userInput = $mo('input[id="' + fieldID + '"]').val();

                $mo('#mo_message' + fieldID).empty();
                $mo('#mo_message' + fieldID).append(loaderHtml);
                $mo('#mo_message' + fieldID).show();
                
                $mo.ajax({
                    url: moeverestcontact.siteURL,
                    type: "POST",
                    data: {
                        action: moeverestcontact.generateURL,
                        security: moeverestcontact.nonce,
                        user_phone: userInput,
                        user_email: userInput,
                    },
                    crossDomain: true,
                    dataType: "json",
                    success: function (response) {
                        if (response.result === "success") {
                            $mo('#mo_message' + fieldID).empty();
                            $mo('#mo_message' + fieldID).append(response.message);
                            $mo('#mo_message' + fieldID).css({
                                "background-color": "#dbfff7",
                                "color": "#008f6e"
                            });
                            $mo('input[name="' + fieldID + '"]').focus();
                        } else {
                            $mo('#mo_message' + fieldID).empty();
                            $mo('#mo_message' + fieldID).append(response.message);
                            $mo('#mo_message' + fieldID).css({
                                "background-color": "#ffefef",
                                "color": "#ff5b5b"
                            });
                            $mo('input[name="' + fieldID + '"]').focus();
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error('AJAX Error:', error);
                        $mo('#mo_message' + fieldID).empty();
                        $mo('#mo_message' + fieldID).append("An error occurred. Please try again.");
                        $mo('#mo_message' + fieldID).css({
                            "background-color": "#ffefef",
                            "color": "#ff5b5b"
                        });
                    }
                });
            });
        }
    });
});