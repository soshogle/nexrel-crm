jQuery(document).ready(function () {
    let $mo = jQuery;
    let formDetails = moninjavars.forms;
    let html = "<div class='moloader'></div>";

    $mo.each(formDetails, function (index, val) {
        let fieldID = "nf-field-" + val[moninjavars.otpType + 'key'];
        
        if (typeof window !== 'undefined') {
            window.mo_ninja_field = "#" + fieldID;
        }
        
        let verifyID = "nf-field-" + val['verifyKey'];
        let message_box = '<div style="margin-top:2%"><div id="mo_message_' + index + '" style="display:none; background-color: #f7f6f7;padding: 1em 2em 1em 3.5em;"></div></div>';
        let otp_button = (function () {
            const $wrap = $mo('<div/>', { style: 'margin-top: 2%;' });
            const $btn  = $mo('<button/>', {
                type: 'button',
                style: 'width:100%; padding:1%;',
                class: 'btn btn-default',
                id: 'miniorange_otp_token_submit_' + index,
                title: 'Please Enter your phone details to enable this.'
            }).text(moninjavars.buttontext);
            $wrap.append($btn);
            return $wrap[0].outerHTML;
        })();

        let isButtonAppended = false;
        
        $mo(document).on("keyup input", function() {
            if(!isButtonAppended)
            {
                var inputField = $mo("#" + fieldID);
                var targetElement;
                
                // Check if the input is inside an ITI (International Telephone Input) container
                var itiContainer = inputField.closest('.iti');
                if (itiContainer.length > 0) {
                    // If ITI container exists, insert after the entire ITI container
                    // This prevents breaking the flag layout
                    targetElement = itiContainer;
                } else {
                    // Fallback: check for old flag-container structure
                    var flagContainer = $mo(".flag-container #country-listbox").length > 0;
                    if (flagContainer) {
                        targetElement = inputField.parent();
                    } else {
                        targetElement = inputField;
                    }
                }
                
                $mo(otp_button + message_box).insertAfter(targetElement);
                isButtonAppended = true;
            }
            }),
        
        $mo(document).on("click", "#miniorange_otp_token_submit_" + index, function () {
            let userInput = $mo("#" + fieldID).val();
            
            $mo("#mo_message_" + index).empty();
            $mo("#mo_message_" + index).append(html);
            $mo("#mo_message_" + index).show();
            
            $mo.ajax({
                url: moninjavars.siteURL,
                type: "POST",
                data: {
                    action: moninjavars.action,
                    user_email: userInput,
                    user_phone: userInput,
                    security: moninjavars.nonce,
                },
                crossDomain: true,
                dataType: "json",
                success: function (response) {
                    if (response.result === "success") {
                        $mo("#mo_message_" + index).empty();
                        $mo("#mo_message_" + index).append(response.message);
                        $mo("#mo_message_" + index).css({
                            "background-color": "#dbfff7",
                            "color": "#008f6e"
                        });
                        $mo("input[name='" + verifyID + "']").focus();
                    } else {
                        $mo("#mo_message_" + index).empty();
                        $mo("#mo_message_" + index).append(response.message);
                        $mo("#mo_message_" + index).css({
                            "background-color": "#ffefef",
                            "color": "#ff5b5b"
                        });
                        $mo("input[name='" + verifyID + "']").focus();
                    }
                },
                error: function (xhr, status, error) {
                    console.error('AJAX Error:', error);
                    $mo("#mo_message_" + index).empty();
                    $mo("#mo_message_" + index).append('An error occurred. Please try again.');
                    $mo("#mo_message_" + index).css({
                        "background-color": "#ffefef",
                        "color": "#ff5b5b"
                    });
                }
            });
        });
    });
});