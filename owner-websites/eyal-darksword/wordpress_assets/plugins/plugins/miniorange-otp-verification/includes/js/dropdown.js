jQuery(document).ready(function () {
    let $mo = jQuery;

    // Safely parse JSON with error handling
    let selectors;
    try {
        selectors = JSON.parse(modropdownvars.selector);
        if (!Array.isArray(selectors)) {
            console.error('Invalid selector format: expected array');
            return;
        }
    } catch (error) {
        console.error('Error parsing selector JSON:', error);
        return;
    }

    // A time delay for forms which append fields to the page using javascript.
    // Our script needs to run after theirs
    setTimeout(function () {
        for (let i = 0; i < selectors.length; i++) {
            let selector = selectors[i];
            var allowed = Array.isArray(modropdownvars.onlyCountries)
                                                        ? modropdownvars.onlyCountries.map(function(c){ return (c.alphacode || "").toLowerCase(); })
                                                        : [];

            if ($mo(selector).length) {
                // For each field in the page
                $mo(selector).each(function () {
                    const $input = $mo(this);
                    const $cc = $mo("<input type='hidden' name='country_code'>").insertAfter($input);
                    const isCheckoutBillingPhone = selector === "#billing-phone";

                    // Track last user-entered value specifically for the checkout
                    // billing phone field so that if the Blocks re-render and reset
                    // the value, we can restore the most recent user value.
                    let lastUserValue = $input.val() || "";

                    let mocountrycode = window.intlTelInput(this, {
                        initialCountry: modropdownvars.defaultCountry,
                        nationalMode: false,
                        onlyCountries: allowed.filter(Boolean),
                        dropdownContainer: document.body,
                        // intl-tel-input v25+ expects a function returning names for hidden inputs.
                        // Preserve previous behavior by creating a hidden input named "full".
                        hiddenInput: function (originalName) {
                            return { phone: "full" };
                        },
                    });

                    let selected_country_data = mocountrycode.getSelectedCountryData();
                    $cc.val(selected_country_data.dialCode);

                    let mo_code_length = selected_country_data.dialCode.length + 1;
                    let restrictedPositions = Array.from({ length: mo_code_length }, (_, index) => index + 1);

                    $mo(selector).on('countrychange', function () {
                        let selected_country_data = mocountrycode.getSelectedCountryData();

                        if (typeof selected_country_data.dialCode !== "undefined") {
                            $cc.val(selected_country_data.dialCode);
                            let mo_code_length = selected_country_data.dialCode.length + 1;
                            restrictedPositions = Array.from({ length: mo_code_length }, (_, index) => index + 1);
                        }
                    });

                    // Track all direct input changes on the field.
                    $input.on('input', function () {
                        if (isCheckoutBillingPhone) {
                            lastUserValue = $input.val() || "";
                        }
                    });

                    $mo(selector).keydown(function (event) {
                        const key = event.key || event.keyCode;
                        if (restrictedPositions.includes(event.target.selectionStart)) {
                            if (key === "Backspace" || key === 8 || key === 37 || key === "ArrowLeft" || key === "a") {
                                event.preventDefault();
                            }
                        }
                    });

                    if (isCheckoutBillingPhone) {
                        setInterval(function () {
                            const current = $input.val() || "";
                            if (lastUserValue && current !== lastUserValue) {
                                $input.val(lastUserValue);
                            }
                        }, 300);
                    }

                    // This is to handle WC Block Checkout forms css
                    if (selector !== "#shipping-phone" && selector !== "#billing-phone") {
                        $mo(selector).css("cssText", "padding-left: 48px !important;font-size:14px;");
                    } else {
                        // Hide the label for the checkout phone field (billing phone).
                        // Classic checkout:
                        $mo('label[for="billing-phone"]').hide();
                        // WooCommerce Blocks checkout:
                        $mo('.wc-block-components-address-form__phone label').hide();
                    }
                });
            }
        }

        // This is to handle formcraft forms css
        $mo(".formcraft-css .fcb_form .form-element").css({
            "transform": "none",
            "-webkit-transform": "none",
            "transition": "none",
            "-webkit-transition": "none"
        });

        $mo(".intl-tel-input, .iti").css({ "width": "100%" });
        $mo(".intl-tel-input input[type='tel'], .iti .iti__tel-input").css({ "width": "100%" });
    }, 200);
});