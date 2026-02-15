jQuery(document).ready(function () {
    var $mo = (typeof window !== 'undefined' && window.$mo) ? window.$mo : jQuery;
    var popupInitialized = false;

    function check_form_loaded() {
        if ($mo('.wc-block-components-address-form__phone input[type="tel"]').length || jQuery(".wc-block-components-text-input input[type=tel]").length) {
            // Inject popup markup once the Block Checkout form is present.
            if (mowcnewcheckout.popupEnabled && mowcnewcheckout.popupHtml && !popupInitialized) {
                mo_add_custom_popup();
            }

            send_and_verify_otp();
            if (mowcnewcheckout.selectivePaymentEnabled) {
                check_payment_methods();
            }
        } else {
            setTimeout(check_form_loaded, 100);
        }
    }

    check_form_loaded();

    function mo_add_custom_popup() {
        if (popupInitialized || !mowcnewcheckout.popupHtml) {
            return;
        }

        var $form = jQuery(".wc-block-checkout__form");
        if (!$form.length) {
            return;
        }

        popupInitialized = true;

        var htmlContent = mowcnewcheckout.popupHtml;
        $form.append(htmlContent);

        // Normalize popup markup similar to original inline script.
        var $popupForm = jQuery("#mo_validate_form");
        if ($popupForm.length) {
            $popupForm.children().appendTo($popupForm.parent());
            $popupForm.remove();
        }

        jQuery('[name="mo_otp_token"]').attr({ id: 'mo_otp_token', name: 'order_verify' });

        var $oldSubmit = jQuery('[name="miniorange_otp_token_submit"]');
        if ($oldSubmit.length) {
            var $newBtn = jQuery('<input>', {
                type: 'button',
                id: 'miniorange_otp_validate_submit',
                class: $oldSubmit.attr('class'),
                value: $oldSubmit.attr('value')
            });
            $oldSubmit.replaceWith($newBtn);
        }

        jQuery('.close').removeAttr('onclick');
        jQuery("#validation_goBack_form, #verification_resend_otp_form, #goBack_choice_otp_form").remove();
        jQuery('a[onclick="mo_otp_verification_resend()"]').attr('id', 'mo_otp_verification_resend').removeAttr('onclick');
        jQuery('.mo_customer_validation-login-container').find('input[type="hidden"]').remove();
        jQuery("#mo_message").remove();

        attachOtpInputSanitizers();
    }

    function attachOtpInputSanitizers() {
        try {
            var pattern = /[^a-zA-Z0-9]/g;
            if (typeof mowcnewcheckout !== 'undefined' && mowcnewcheckout.popupInputPattern) {
                var sanitizedPattern = $mo('<div/>').text(mowcnewcheckout.popupInputPattern).html();
                pattern = new RegExp(sanitizedPattern.replace(/^\/|\/[^\/]*$/g, ''), 'g');
            }

            // Standard OTP input (Default/Streaky) present in checkout popup.
            var otpInputs = document.querySelectorAll(".mo_customer_validation-textbox.mo-new-ui-validation-textbox, #mo_otp_token, .otp-streaky-input");
            otpInputs.forEach(function (input) {
                input.addEventListener("input", function () {
                    var originalValue = input.value || "";
                    var cleanedValue = originalValue.replace(pattern, "");
                    if (originalValue !== cleanedValue) {
                        input.value = cleanedValue;
                    }
                });
                input.addEventListener("paste", function (e) {
                    e.preventDefault();
                    var pasted = (e.clipboardData || window.clipboardData).getData("text") || "";
                    var clean = pasted.replace(pattern, "");
                    var start = input.selectionStart || 0;
                    var end = input.selectionEnd || 0;
                    var currentValue = input.value || "";
                    input.value = currentValue.slice(0, start) + clean + currentValue.slice(end);
                    if (input.setSelectionRange) {
                        input.setSelectionRange(start + clean.length, start + clean.length);
                    }
                });
            });

            // Catchy style individual boxes (keep single char, sanitize).
            var catchyInputs = document.querySelectorAll(".digit-group .otp-catchy");
            catchyInputs.forEach(function (box) {
                box.setAttribute("maxlength", "1");
                var enforce = function () {
                    var v = box.value || "";
                    var c = v.replace(pattern, "");
                    if (c.length > 1) {
                        c = c.charAt(0);
                    }
                    if (v !== c) {
                        box.value = c;
                    }
                };
                box.addEventListener("input", enforce);
                box.addEventListener("paste", function (e) {
                    e.preventDefault();
                    var pasted = (e.clipboardData || window.clipboardData).getData("text") || "";
                    var clean = pasted.replace(pattern, "");
                    if (clean.length > 1) {
                        clean = clean.charAt(0);
                    }
                    box.value = clean;
                });
            });
        } catch (e) {
            // Fail silently; sanitizers are a hardening layer.
        }
    }
    
    function check_payment_methods() {
        let methods = mowcnewcheckout.paymentMethods;
        let payment_based_otp = mowcnewcheckout.selectivePaymentEnabled;
    
        toggleSubmitButton();
    
        $mo('input[name="radio-control-wc-payment-method-options"]').on('click', function () {
            toggleSubmitButton();
        });
    
        function toggleSubmitButton() {
            let selectedValue = $mo('input[name="radio-control-wc-payment-method-options"]:checked').val();
            
            let show_otp_button = false;
            $mo("input[name=payment_method]").each(function () {
                let payment = $mo(this).val();
                show_otp_button = false;
                if (($mo(this).is(':checked') && methods.hasOwnProperty(payment)) || !mowcnewcheckout.selectivePaymentEnabled) {
                    show_otp_button = true;
                    return false;
                }
            });
            if (methods.hasOwnProperty(selectedValue) && payment_based_otp) {
                show_otp_button = true;
            }
    
            if (show_otp_button) {
                $mo("#miniorange_otp_token_submit_wc_block_checkout").show();
                if (mowcnewcheckout.popupEnabled) {
                    $mo("#miniorange_wc_popup_send_otp_token").show();
                    $mo('.wc-block-components-checkout-place-order-button').hide();
                }
            } else {
                $mo("#miniorange_otp_token_submit_wc_block_checkout").hide();
                if (mowcnewcheckout.popupEnabled) {
                    $mo("#miniorange_wc_popup_send_otp_token").hide();
                    $mo('.wc-block-components-checkout-place-order-button').show();
                }
            }
        }
    }

    function send_and_verify_otp() {
        let send_verify_otp = "<input type='button' id='miniorange_otp_token_submit_wc_block_checkout' style='width: 100%; padding: 1em; margin: 2% 0%;' class='components-button wc-block-components-button wp-element-button contained' value='" + mowcnewcheckout.buttonText + "'/><div id='mo_message' style='background-color: #f7f6f7; display:none; padding: 1em 2em 1em 3.5em;'></div> <div style='display:none;' id='mo_verify_otp_fields'><div class='wc-block-components-text-input'><input type='text' id='mo_otp_token' aria-label='Enter OTP'/><label for='mo_otp_token'>Enter Verification Code</label></div><input type='button' id='miniorange_verify_otp_token' class='components-button wc-block-components-button wp-element-button contained' style='width: 100%; padding: 1em; margin: 2% 0%;' value='Verify OTP'/></div>";
        let img = "<div class='moloader'></div>";
        
        if (mowcnewcheckout.popupEnabled) {
            $mo('.wc-block-components-checkout-place-order-button').hide();
            $mo('.wc-block-components-checkout-place-order-button').after('<button id="miniorange_wc_popup_send_otp_token" class="wp-element-button" type="button">' + mowcnewcheckout.buttonText + '</button>');
            
            if (jQuery('.otp-catchy-box').length > 0) {
                jQuery(".digit-group input.otp-catchy").each(function () {
                    jQuery(this).attr("maxlength", "1");
                }).on("keyup", function (event) {
                    let parent = jQuery(this).parent();
                    if (event.keyCode === 8 || event.keyCode === 37) {
                        let prevId = jQuery(this).data("previous");
                        if (prevId) {
                            jQuery("#" + prevId).select();
                        }
                    } else {
                        let nextId = jQuery(this).data("next");
                        if (nextId) {
                            jQuery("#" + nextId).select();
                        }
                    }
                });
                
                let mo_validate_button = document.getElementById("mo_sec_otp_submit_button");
                if (mo_validate_button) {
                    mo_validate_button.onclick = function () {
                        let fieldstring = "";
                        for (let i = 1; i <= parseInt(mowcnewcheckout.otp_length_mo); i++) {
                            fieldstring += document.querySelector("#digit-" + i).value;
                        }
                        jQuery("#mo_otp_token").attr('value', fieldstring);
                        mo_validate_popup_otp(fieldstring);
                    };
                }
            } else {
                $mo("#miniorange_otp_validate_submit,#mo_sec_otp_submit_button").on("click", function (event) { 
                    let fieldstring = $mo("#mo_otp_token").val();
                    mo_validate_popup_otp(fieldstring);
                });
            }
            
            // Handle both initial send and resend actions within the popup.
            $mo("#miniorange_wc_popup_send_otp_token, #mo_otp_verification_resend, .mo-resend")
                // Remove any existing handlers (including from moDefaultPopUp) so that
                // block-checkout-specific AJAX behavior is used consistently.
                .off("click")
                .on("click.moPopupOtp", function (event) {
                let requiredFields = $mo('[required]');
                let allFieldsFilled = true;
                requiredFields.each(function () {
                    if (!$mo(this).val().trim()) {
                        if ($mo(this).attr("id") != "mo_otp_token") {
                            allFieldsFilled = false;
                            $mo(this).focus();
                            return false;
                        }
                    }
                });
                
                if (!allFieldsFilled) {
                    $mo('.wc-block-components-checkout-place-order-button').click();
                } else {
                    $mo('#popup_wc_mo').show();
                    let img = "<div class='moloader'></div>";
                    jQuery("#mo_message_wc_pop_up").empty().append(img).show();
                    $mo(".mo_customer_validation-login-container").show();
                    
                    let user = $mo("#" + mowcnewcheckout.field).val();
                    
                    $mo.ajax({
                        url: mowcnewcheckout.siteURL,
                        type: "POST",
                        data: {
                            user_phone: user,
                            user_email: user,
                            action: mowcnewcheckout.gaction,
                            security: mowcnewcheckout.nonce,
                            otpType: mowcnewcheckout.otpType
                        },
                        crossDomain: true,
                        dataType: "json",
                        success: function (response) {
                            if (response.result === "success") {
                                if (typeof window !== 'undefined') {
                                    window.mo_wc_otp_initialized = true;
                                }
                                $mo(".blockUI").hide();
                                jQuery("#mo_message_wc_pop_up").text(response.message);
                                jQuery("#mo_message_wc_pop_up").
                                $mo(".digit-group input[type='text']").val("");
                                $mo("input[name='order_verify']").val("");
                                $mo("#popup_wc_mo").show();
                            } else {
                                if (typeof window !== 'undefined') {
                                    window.mo_wc_otp_initialized = false;
                                }
                                jQuery("#mo_message_wc_pop_up").empty().append(response.message);
                                $mo(".blockUI").hide();
                            }
                        },
                        error: function (xhr, status, error) {
                            console.error('AJAX Error:', error);
                        }
                    });
                    
                    $mo(".close").on("click", function (event) {
                        $mo("#popup_wc_mo").hide();
                    });
                }
                if (event && typeof event.preventDefault === "function") {
                    event.preventDefault();
                }
            });
        } else {
            $mo(send_verify_otp).insertAfter($mo("#" + mowcnewcheckout.field).parent().parent());
            
            $mo(document).on('focus', '#mo_otp_token', function () {
                $mo(this).parent().addClass('is-active');
            });

            $mo(document).on('blur', '#mo_otp_token', function () {
                if (!$mo(this).val()) {
                    $mo(this).parent().removeClass('is-active');
                }
            });
            
            $mo("#miniorange_otp_token_submit_wc_block_checkout").on("click", function () {
                let user = $mo("#" + mowcnewcheckout.field).val();
                let otp = $mo("input[name=phone_verify]");
                let msg_box = $mo("#mo_message");
                
                // Sanitize user input to prevent XSS
                user = $mo('<div/>').text(user).html();
                
                msg_box.empty();
                msg_box.append(img);
                msg_box.show();
                
                // Safely set window.verifyOTPmessage
                if (typeof window !== 'undefined') {
                    window.verifyOTPmessage = img;
                }
                
                $mo.ajax({
                    url: mowcnewcheckout.siteURL,
                    type: "POST",
                    data: { 
                        user_phone: user, 
                        user_email: user, 
                        action: mowcnewcheckout.gaction, 
                        security: mowcnewcheckout.nonce, 
                        otpType: mowcnewcheckout.otpType 
                    },
                    crossDomain: true,
                    dataType: "json",
                    success: function (response) {
                        if ("success" === response.result) {
                            if (typeof window !== 'undefined') {
                                delete window.verifyOTPmessage;
                            }
                            msg_box.empty();
                            msg_box.append(response.message);
                            msg_box.css({
                                "background-color": "#dbfff7",
                                "color": "#008f6e"
                            });
                            otp.focus();
                            $mo("#mo_verify_otp_fields").show();
                            $mo("#miniorange_verify_otp_token").show();
                        } else {
                            if (typeof window !== 'undefined') {
                                window.verifyOTPmessage = response.message;
                            }
                            msg_box.empty();
                            msg_box.append(response.message);
                            msg_box.css({
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
            
            $mo("#miniorange_verify_otp_token").on("click", function () {
                let user = $mo("#" + mowcnewcheckout.field).val();
                let otp_token = $mo("#mo_otp_token").val();
                let msg_box = $mo("#mo_message");
                
                msg_box.empty();
                msg_box.append(img);
                msg_box.show();
                
                if (typeof window !== 'undefined') {
                    window.verifyOTPmessage = img;
                }
                
                $mo.ajax({
                    url: mowcnewcheckout.siteURL,
                    type: "POST",
                    data: { 
                        user_phone: user, 
                        user_email: user, 
                        action: mowcnewcheckout.vaction, 
                        security: mowcnewcheckout.nonce, 
                        otpType: mowcnewcheckout.otpType, 
                        otp_token: otp_token 
                    },
                    crossDomain: true,
                    dataType: "json",
                    success: function (response) {
                        if ("success" === response.result) {
                            if (typeof window !== 'undefined') {
                                delete window.verifyOTPmessage;
                            }
                            msg_box.empty();
                            msg_box.hide();
                            $mo("#mo_verify_otp_fields").hide();
                            $mo("#miniorange_verify_otp_token").hide();
                            $mo("#miniorange_otp_token_submit_wc_block_checkout").val("Verified ✔");
                            $mo("#miniorange_otp_token_submit_wc_block_checkout").show();
                            $mo("#miniorange_otp_token_submit_wc_block_checkout").prop("disabled", true);
                            $mo("#mo_otp_token").val('');
                            is_otp_verified(user);
                        } else {
                            if (typeof window !== 'undefined') {
                                window.verifyOTPmessage = response.message;
                            }
                            msg_box.empty();
                            msg_box.append(response.message);
                            msg_box.css({
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
    }

    function is_otp_verified(user_detail) {
        $mo("#" + mowcnewcheckout.field).on('keydown keyup', function () {
            if ($mo("#" + mowcnewcheckout.field).val() !== user_detail) {
                $mo("#miniorange_otp_token_submit_wc_block_checkout").val(mowcnewcheckout.buttonText);
                $mo("#miniorange_otp_token_submit_wc_block_checkout").removeAttr("disabled");
            } else {
                $mo("#miniorange_otp_token_submit_wc_block_checkout").val("Verified ✔");
                $mo("#miniorange_otp_token_submit_wc_block_checkout").prop("disabled", true);
            }
        });
    }
    
    function mo_validate_popup_otp(fieldstring) {
        let img = "<div class='moloader'></div>";
        jQuery("#mo_message_wc_pop_up").empty().append(img).show();
        
        let user = $mo("#" + mowcnewcheckout.field).val();
        
        $mo.ajax({
            url: mowcnewcheckout.siteURL,
            type: "POST",
            data: { 
                user_phone: user, 
                user_email: user, 
                action: mowcnewcheckout.vaction, 
                security: mowcnewcheckout.nonce, 
                otpType: mowcnewcheckout.otpType, 
                otp_token: fieldstring 
            },
            crossDomain: true,
            dataType: "json",   
            success: function (response) { 
                jQuery("#mo_message_wc_pop_up").text(response.message);
                if (response.result === "success") {
                    $mo("#popup_wc_mo").hide();
                    $mo('form[name="checkout"]').submit();
                    $mo('.wc-block-components-checkout-place-order-button').click();
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
            }
        });
    }
});
