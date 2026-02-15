
jQuery(document).ready(function () {
    var $mo = jQuery;

    // Initialize intl-tel-input for the billing phone field (admin order custom SMS box).
    if (typeof window.intlTelInput === "function" && typeof mocustommsg !== "undefined" && mocustommsg.telUtilsUrl) {
        var phoneInput = document.querySelector("#billing_phone");
        if (phoneInput && !$mo(phoneInput).data("intlTelInputInitialized")) {
            window.intlTelInput(phoneInput, {
                separateDialCode: true,
                preferredCountries: ["us", "gb", "in"],
                utilsScript: mocustommsg.telUtilsUrl
            });
            $mo(phoneInput).data("intlTelInputInitialized", true);
        }
    }

    $mo("#mo_custom_order_send_message").on("click", function () {
        $mo("#custom_order_sms_meta_box").block({
            message: null,
            overlayCSS: { background: "#fff", opacity: 0.6 }
        });

        // Ensure global config is available before making the AJAX call.
        if (typeof mocustommsg === "undefined" || !mocustommsg.siteURL || !mocustommsg.nonce) {
            $mo("#custom_order_sms_meta_box").unblock();
            return;
        }

        $mo.ajax({
            // Use the standard WordPress admin-ajax endpoint.
            url: mocustommsg.siteURL + "?mo_send_custome_msg_option=mo_send_order_custom_msg",
            type: "POST",
            data: {
                // Mirror the GET parameter in POST so the PHP handler can both
                // locate the request and perform nonce verification.
                mo_send_custome_msg_option: "mo_send_order_custom_msg",
                // Send the nonce generated in PHP for CSRF protection.
                security: mocustommsg.nonce,
                numbers: $mo("#custom_order_sms_meta_box #billing_phone").val(),
                msg: $mo("#custom_order_sms_meta_box #mo_wc_custom_order_msg").val()
            },
            crossDomain: !0,
            dataType: "json",
            success: function (a) {
                $mo("#custom_order_sms_meta_box").unblock();
                $mo("#jsonMsg").empty();
                if (a.result == "success") {
                    $mo("#jsonMsg").removeClass("red").addClass("green");
                } else {
                    $mo("#jsonMsg").removeClass("green").addClass("red");
                }
                $mo("#jsonMsg").prepend(a.message).show();
            },
            error: function () {
                $mo("#custom_order_sms_meta_box").unblock();
            }
        });
    });
});