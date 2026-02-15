jQuery(document).ready(function () {
    const $mo = (typeof window.$mo !== 'undefined') ? window.$mo : jQuery;
    let methods = mowccheckout.paymentMethods || {};
    let hideButton = mowccheckout.popupEnabled && !mowccheckout.isLoggedIn;

    // Mirror legacy behavior: show stored success message, scroll to errors.
    if ($mo(".woocommerce-message").length > 0) {
        $mo("#mo_message").addClass("woocommerce-message").show();
    }
    if ($mo(".woocommerce-error").length > 0 && $mo("div.woocommerce").length > 0) {
        $mo("html, body").animate({ scrollTop: $mo("div.woocommerce").offset().top - 50 }, 1000);
    }

    $mo("#order_verify_field").hide();
    
    // CRITICAL: Remove existing notice groups before form submission to prevent duplicates
    $mo('form[name="checkout"]').on('submit', function() {
        $mo(".woocommerce-NoticeGroup-checkout").remove();
    });
    
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
    }
    
    let moValidateButton = document.getElementById("mo_sec_otp_submit_button");
    if (moValidateButton) {
        moValidateButton.onclick = function () {
            let fieldstring = "";
            if (jQuery('.otp-catchy-box').length > 0) {
                for (let i = 1; i <= parseInt(mowccheckout.otp_length_mo); i++) {
                    let digitValue = document.querySelector("#digit-" + i).value;
                    // Validate that the value is a digit
                    if (/^\d$/.test(digitValue)) {
                        fieldstring += digitValue;
                    }
                }
            } else {
                fieldstring = $mo("#mo_otp_token").val();
            }
            jQuery("#mo_otp_token").attr('value', fieldstring);
            moValidatePopupOtp(fieldstring);
        };
    }
    
    $mo(".woocommerce-checkout-review-order").click(function () { 
        handlePaymentMethodChange(); 
    });

    // Use delegated handler so it works even when the popup markup is injected later.
    $mo(document).on("click", "#miniorange_otp_validate_submit", function () {
        let fieldstring = $mo("#mo_otp_token").val();
        moValidatePopupOtp(fieldstring);
    });
        
    function moValidatePopupOtp(fieldstring) {
        let img = "<div class='moloader'></div>";
        let userEmail = $mo("input[name=billing_email]").val();
        let userPhone = $mo("#billing_phone").val();
        jQuery("#mo_message_wc_pop_up").empty().append(img).show();
        
        $mo.ajax({
            url: mowccheckout.siteURL,
            type: "POST",
            data: {
                user_email: userEmail,
                user_phone: userPhone,
                otpType: mowccheckout.otpType,
                otp_token: fieldstring,
                security: mowccheckout.nonce,
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                jQuery("#mo_message_wc_pop_up").text(response.message);
                if (response.result === "success") {
                    // CRITICAL: Remove ALL existing notice groups before submitting form
                    $mo(".woocommerce-NoticeGroup-checkout").remove();
                    $mo("#popup_wc_mo").hide();
                    $mo('form[name="checkout"]').submit();
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
                jQuery("#mo_message_wc_pop_up").text("An error occurred. Please try again.");
            }
        });
    }

    // Inject popup HTML markup for classic checkout when enabled.
    if (mowccheckout.popupEnabled && mowccheckout.popupHtml) {
        let $form = jQuery("form[name='checkout']");
        if ($form.length) {
            $form.append(mowccheckout.popupHtml);

            let $popupForm = jQuery("#mo_validate_form");
            if ($popupForm.length) {
                $popupForm.children().appendTo($popupForm.parent());
                $popupForm.remove();
            }

            jQuery('[name="mo_otp_token"]').attr({ id: 'mo_otp_token', name: 'order_verify' });

            let $oldSubmit = jQuery('[name="miniorange_otp_token_submit"]');
            if ($oldSubmit.length) {
                let $newBtn = jQuery('<input>', {
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

            // Attach OTP input sanitizers for classic checkout popup.
            attachOtpInputSanitizersClassic();
        }
    }

    let showOtpFields = function () {
        if ($mo(".woocommerce-billing-fields").length > 0 && $mo("#mo-time-remain").length === 0) {
            $mo("#miniorange_wc_popup_send_otp_token").show();
            $mo("#miniorange_otp_token_submit").show();
            $mo("#miniorange_otp_token_submit").css({"margin-right": "0"});
            $mo("#mo_validation_wrapper").insertAfter("#billing_" + mowccheckout.otpType + "_field");
            if ($mo('#order_verify_field').length > 0) {
                $mo("#order_verify_field").show();
            } else if (hideButton) {
                $mo("#place_order").hide();
            }
        }
    };
    
    let hideOtpFields = function () {
        if ($mo(".woocommerce-billing-fields").length > 0) {
            $mo("#miniorange_otp_token_submit").hide();
            if ($mo('#order_verify_field').length > 0) {
                $mo("#order_verify_field").hide();
                $mo("#mo_message").hide();
                $mo("#order_verify").val("");
            } else {
                $mo("#place_order").show();
            }
        }
    };
    
    function sendClassicOtp(event) {
        let email = $mo("input[name=billing_email]").val();
        let phone = $mo("#billing_phone").val();
        let $container = $mo("div.woocommerce");

        if (typeof jQuery.fn.block === "function") {
            $container.addClass("processing").block({ message: null, overlayCSS: { background: "#fff", opacity: 0.6 } });
        } else {
            $container.addClass("processing");
        }

        if ($mo("#mo_message").length === 0) {
            $mo('<div id="mo_message"></div>').insertBefore("#order_verify_field");
        }

        $mo.ajax({
            url: mowccheckout.sendUrl,
            type: "POST",
            data: {
                user_email: email,
                user_phone: phone,
                security: mowccheckout.nonce
            },
            crossDomain: true,
            dataType: "json",
            success: function (response) {
                $mo(".blockUI").hide();
                $mo("#mo_message").empty().append(response.message);
                if (response.result === "success") {
                    $mo("#mo_message").addClass("woocommerce-message").removeClass("woocommerce-error").show();
                } else {
                    $mo("#mo_message").addClass("woocommerce-error").removeClass("woocommerce-message").show();
                }
            },
            error: function () {
                $mo(".blockUI").hide();
            }
        });

        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
    }

    function areAllMandatoryFieldsFilled() {
        let err =
            '<div class="woocommerce-NoticeGroup woocommerce-NoticeGroup-checkout">' +
            '<ul class="woocommerce-error" role="alert">{{errors}}</ul>' +
            "</div>";
        let errors = "";

        $mo(".validate-required").each(function () {
            let id = $mo(this).attr("id");
            if (id !== undefined) {
                let n = id.replace("_field", "");
                if (n !== "") {
                    let val = $mo("#" + n).val();
                    if ((val === "" || val === "select") && checkOptionalMandatoryFields(n)) {
                        $mo("#" + n).addClass("woocommerce-invalid woocommerce-invalid-required-field");
                        errors +=
                            "<li><strong>" +
                            $mo("#" + n + "_field")
                                .children("label")
                                .text()
                                .replace("*", "") +
                            "</strong> is a required field.</li>";
                    }
                }
            }
        });

        return errors !== "" ? err.replace("{{errors}}", errors) : "";
    }

    function checkOptionalMandatoryFields(n) {
        let optional = {
            shipping: {
                fields: [
                    "shipping_first_name",
                    "shipping_last_name",
                    "shipping_postcode",
                    "shipping_address_1",
                    "shipping_address_2",
                    "shipping_city",
                    "shipping_state"
                ],
                checkbox: "ship-to-different-address-checkbox"
            },
            account: {
                fields: ["account_password", "account_username"],
                checkbox: "createaccount"
            }
        };
        if (n.indexOf("shipping") !== -1) {
            return checkFields(n, optional.shipping);
        } else if (n.indexOf("account") !== -1) {
            return checkFields(n, optional.account);
        }
        return true;
    }

    function checkFields(n, data) {
        if (
            $mo.inArray(n, data.fields) === -1 ||
            ($mo.inArray(n, data.fields) > -1 && $mo("#" + data.checkbox + ":checked").length > 0)
        ) {
            return true;
        }
        return false;
    }

    // Restrict OTP fields to alphanumeric characters in the classic checkout popup,
    // mirroring the behavior of moDefaultPopUp.js / DefaultPopup.
    function attachOtpInputSanitizersClassic() {
        try {
            // Default pattern: strip anything that is not alphanumeric.
            let pattern = /[^a-zA-Z0-9]/g;

            // Standard OTP input (Default/Streaky) present in checkout popup.
            const otpInputs = document.querySelectorAll(
                ".mo_customer_validation-textbox.mo-new-ui-validation-textbox, #mo_otp_token, .otp-streaky-input"
            );

            otpInputs.forEach(function (input) {
                input.addEventListener("input", function () {
                    const originalValue = input.value || "";
                    const cleanedValue = originalValue.replace(pattern, "");
                    if (originalValue !== cleanedValue) {
                        input.value = cleanedValue;
                    }
                });
                input.addEventListener("paste", function (e) {
                    e.preventDefault();
                    const pasted = (e.clipboardData || window.clipboardData).getData("text") || "";
                    const clean = pasted.replace(pattern, "");
                    const start = input.selectionStart || 0;
                    const end = input.selectionEnd || 0;
                    const currentValue = input.value || "";
                    input.value = currentValue.slice(0, start) + clean + currentValue.slice(end);
                    if (input.setSelectionRange) {
                        input.setSelectionRange(start + clean.length, start + clean.length);
                    }
                });
            });

            // Catchy style individual boxes (keep single char, sanitize).
            const catchyInputs = document.querySelectorAll(".digit-group .otp-catchy");
            catchyInputs.forEach(function (box) {
                box.setAttribute("maxlength", "1");
                const enforce = function () {
                    let v = box.value || "";
                    let c = v.replace(pattern, "");
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
                    let pasted = (e.clipboardData || window.clipboardData).getData("text") || "";
                    let clean = pasted.replace(pattern, "");
                    if (clean.length > 1) {
                        clean = clean.charAt(0);
                    }
                    box.value = clean;
                });
            });
        } catch (e) {
            // Fail silently; this is a hardening layer.
        }
    }

    function sendPopupOtp(event) {
        let img = "<div class='moloader'></div>";
        jQuery("#mo_message_wc_pop_up").empty().append(img).show();

        let requiredFieldsHtml = areAllMandatoryFieldsFilled();
        let $container = $mo("div.woocommerce");
        $mo(".mo_customer_validation-login-container").show();

        let email = $mo("input[name=billing_email]").val();
        let phone = $mo("#billing_phone").val();

        if (!requiredFieldsHtml) {
            if (typeof jQuery.fn.block === "function") {
                $container.addClass("processing").block({ message: null, overlayCSS: { background: "#fff", opacity: 0.6 } });
            } else {
                $container.addClass("processing");
            }

            $mo.ajax({
                url: mowccheckout.sendUrl,
                type: "POST",
                data: {
                    user_email: email,
                    user_phone: phone,
                    security: mowccheckout.nonce
                },
                crossDomain: true,
                dataType: "json",
                success: function (response) {
                    if (response.result === "success") {
                        window.mo_wc_otp_initialized = true;
                        $mo(".blockUI").hide();
                        jQuery("#mo_message_wc_pop_up").text(response.message).removeAttr("style");
                        $mo(".digit-group input[type='text']").val("");
                        $mo("input[name='order_verify']").val("");
                        $mo("#popup_wc_mo").show();
                    } else {
                        window.mo_wc_otp_initialized = false;
                        $mo(".blockUI").hide();
                        
                        // CRITICAL: Remove ALL existing notice groups completely to prevent duplicates
                        $mo(".woocommerce-NoticeGroup-checkout").remove();
                        
                        let wcErrorDiv =
                            '<div class="woocommerce-NoticeGroup woocommerce-NoticeGroup-checkout">' +
                            '<ul class="woocommerce-error" role="alert">{{errors}}</ul>' +
                            "</div>";
                        $mo("form.woocommerce-checkout").prepend(wcErrorDiv.replace("{{errors}}", response.message));
                        $mo("html, body").animate({ scrollTop: $mo(".woocommerce-error").offset().top }, 2000);
                    }
                },
                error: function () {
                    window.mo_wc_otp_initialized = false;
                    $mo(".blockUI").hide();
                }
            });
        } else {
            window.mo_wc_otp_initialized = false;
            
            // CRITICAL: Remove ALL existing notice groups completely to prevent duplicates
            $mo(".woocommerce-NoticeGroup-checkout").remove();
            
            $mo("form.woocommerce-checkout").prepend(requiredFieldsHtml);
            $mo("html, body").animate({ scrollTop: $mo(".woocommerce-error").offset().top }, 2000);
        }

        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        $mo(".close").off("click.moPopup").on("click.moPopup", function () {
            $mo("#popup_wc_mo").hide();
        });
    }

    let handlePaymentMethodChange = function () {
        $mo("#miniorange_wc_popup_send_otp_token, #miniorange_otp_token_submit, #order_verify_field, #mo_message").hide();
        $mo("#place_order").show();
        let show = !mowccheckout.selectivePaymentEnabled;
        
        if (!mowccheckout.popupEnabled) {
            $mo("#miniorange_otp_token_submit")
                .off("click.moClassicOtp")
                .on("click.moClassicOtp", sendClassicOtp);
        } else if (mowccheckout.popupEnabled) {
            // For popup flows, handle both primary send and resend buttons (.mo-resend).
            // Remove any existing click handlers (including from moDefaultPopUp) so checkout-specific
            // AJAX behavior is used consistently.
            $mo("#miniorange_wc_popup_send_otp_token, #mo_otp_verification_resend, .mo-resend")
                .off("click")
                .on("click.moPopupOtp", sendPopupOtp);
        }
        
        $mo("input[name=payment_method]").each(function () {
            let payment = $mo(this).val();
            show = false;
            if (($mo(this).is(':checked') && methods.hasOwnProperty(payment)) || !mowccheckout.selectivePaymentEnabled) {
                show = true;
                return false;
            }
        });
        
        show ? showOtpFields() : hideOtpFields();
    };
    
    setTimeout(function () {
        handlePaymentMethodChange();
    }, 200);
    
    $mo(document).ajaxComplete(function (event, xhr, settings) {
        if (settings.url.includes("wc-ajax=update_order_review")) { 
            handlePaymentMethodChange();
        }
    });
});
