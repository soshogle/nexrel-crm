jQuery(document).on('gform_post_render', function (event, form_id) {
    const $mo = window.$mo || window.jQuery;

    let loaderHtml = '<div class="moloader"></div>';
    let sendOtpHtml = '<div class="mo_gravity_validate">\
                            <input type="button" name="mo_send_otp_gravity" id="mo_send_otp_gravity" style="margin-top: 15px;' + mogravity.buttonCSS + '" value="' + mogravity.buttonText + '" />\
                            <div id="mo_message" style="background-color: #f7f6f7;padding: 1em 2em 1em 3.5em; display:none;"></div>\
                        </div>';

    Object.keys(mogravity.formDetails).forEach(function (formId) {
        if (formId == form_id) {
            if (formId in mogravity.formDetails) {
                let fieldKey = mogravity.otpType === 'mo_gf_contact_email_enable' ? mogravity.formDetails[formId]['emailkey'] : mogravity.formDetails[formId]['phonekey'];

                $mo(sendOtpHtml).insertAfter($mo("#input_" + formId + "_" + fieldKey));

                $mo("#mo_send_otp_gravity").off('click').on('click', function (e) {
                    let userInput = $mo("#input_" + formId + "_" + fieldKey).val();

                    $mo("#mo_message").show().empty().append(loaderHtml);

                    $mo.ajax({
                        url: mogravity.siteURL,
                        type: "POST",
                        data: {
                            user_phone: userInput,
                            user_email: userInput,
                            action: mogravity.gaction,
                            security: mogravity.nonce
                        },
                        crossDomain: true,
                        dataType: "json",
                        success: function (response) {
                            if (response.result == "error") {
                                $mo("#mo_message").empty().append(response.message).css({
                                    "background-color": "#ffefef",
                                    "color": "#ff5b5b"
                                });
                            } else {
                                $mo("#mo_message").empty().append(response.message).css({
                                    "background-color": "#dbfff7",
                                    "color": "#008f6e"
                                });
                            }
                        },
                        error: function (xhr, status, error) {
                            console.error('AJAX Error:', error);
                            $mo("#mo_message").empty().append("An error occurred. Please try again.").css({
                                "background-color": "#ffefef",
                                "color": "#ff5b5b"
                            });
                        }
                    });
                });

                // Initialize or reinitialize intlTelInput for the phone input field
                let phoneInput = $mo("#input_" + formId + "_" + fieldKey)[0]; // Get the DOM element

                if (phoneInput && !$mo(phoneInput).data('intlTelInputInitialized') && mogravity.isDropdownEnabled && mogravity.otpType === 'mo_gf_contact_phone_enable') {
                    $mo("<input id='country_code' name='country_code' type='hidden'>").insertAfter(phoneInput);
                    var allowed = Array.isArray(modropdownvars.onlyCountries)
                                            ? modropdownvars.onlyCountries.map(function(c){ return (c.alphacode || "").toLowerCase(); })
                                            : [];
                    let moCountryCode = window.intlTelInput(phoneInput, { // Use the DOM element
                        initialCountry: modropdownvars.defaultCountry,
                        nationalMode: false,
                        onlyCountries: allowed.filter(Boolean),
                        // intl-tel-input v25+ expects a function returning names for hidden inputs.
                        // Preserve previous behavior by creating a hidden input named "full".
                        hiddenInput: function (originalName) {
                            return { phone: "full" };
                        },
                    });

                    let selectedCountryData = moCountryCode.getSelectedCountryData();
                    $mo("#country_code").val(selectedCountryData.dialCode);

                    let moCodeLength = selectedCountryData.dialCode.length + 1;
                    let restrictedPositions = Array.from({ length: moCodeLength }, (_, index) => index + 1);
                    
                    $mo(phoneInput).on('countrychange', function () {
                        let selectedCountryData = moCountryCode.getSelectedCountryData();

                        if (typeof selectedCountryData.dialCode !== "undefined") {
                            $mo("#country_code").val(selectedCountryData.dialCode);
                            let moCodeLength = selectedCountryData.dialCode.length + 1;
                            restrictedPositions = Array.from({ length: moCodeLength }, (_, index) => index + 1);
                        }
                    });

                    $mo(".intl-tel-input.allow-dropdown, .iti.iti--allow-dropdown").css({ "width": "100%" });
                    $mo(".intl-tel-input.allow-dropdown input[type='tel'], .iti.iti--allow-dropdown .iti__tel-input").css({ "width": "100%" });

                    if (!$mo("#mo-gravity-intl-tel-style").length) {
                        $mo("head").append(
                            "<style id='mo-gravity-intl-tel-style'>" +
                            ".gform_wrapper .iti .iti__selected-country," +
                            ".gform_wrapper .iti .iti__selected-country:focus," +
                            ".gform_wrapper .iti .iti__selected-country:hover{background-color:transparent !important;color:inherit;border:0;box-shadow:none;}" +
                            "</style>"
                        );
                    }

                    $mo(phoneInput).keydown(function (event) {
                        if (restrictedPositions.includes(event.target.selectionStart)) {
                            const key = event.key || event.keyCode;

                            if (key === "Backspace" || key === 8 || key === 37 || key === "ArrowLeft" || key === "a") {
                                event.preventDefault();
                            }
                        }
                    });
                }
            }
        }
    });
});
