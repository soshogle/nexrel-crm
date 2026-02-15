
jQuery(document).ready(function () {
    let $mo = jQuery;
    let button = '<input class="um-button um-col-alt" id="mo_um_getotp_button" type="button" value="' + moumvar.buttontext + '"></input>';
    let img = "<div class='moloader'></div>";
    let html = button + "<div id='mo_message' style='display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;'>" + img + "</div>";

    $mo(html).insertAfter($mo('.um-register input[id^=' + moumvar.field + '-]'));

    $mo('#mo_um_getotp_button').click(function () {
        let userInput = $mo('.um-register input[id^=' + moumvar.field + ']').val();

        $mo("#mo_message").empty();
        $mo("#mo_message").append(img);
        $mo("#mo_message").show();
        
        $mo.ajax({
            url: moumvar.siteURL + "/?mo_umreg_option=miniorange-um-ajax-verify",
            type: "POST",
            data: {
                user_email: userInput,
                user_phone: userInput,
                security: moumvar.nonce
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
    });
});