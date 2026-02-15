jQuery(document).ready(function () {
    let $mo = jQuery;
    window.$mo = $mo;
    //html button for default form
    let htmlButtonWp = '<p>' +
        '<input type="submit"' +
        'name="wp-submit"' +
        'id="wp-submit"' +
        'class="button button-primary button-large"' +
        'style="width:48%;float:right;' + movarlogin.loginPassButtonCSS + '"' +
        'value="' + movarlogin.loginOTPButtonText + '">' +
        '</p>';
    
    // html button for woocommerce form
    let htmlButtonWc = '<button type="submit" ' +
        'class="woocommerce-Button button" ' +
        'style="width:50%;float:right;padding: 1.4em 2em; margin-top: 1.1em;' + movarlogin.loginPassButtonCSS + '"' +
        'name="login" ' +
        'value="' + movarlogin.loginOTPButtonText + '"> </button>';

    // html button for ultimate member form
    let htmlButtonUm = '<div class="um-right um-half">' +
        '<input type="submit" name="logintype" value="' + movarlogin.loginOTPButtonText + '" class="um-button um-alt" style="' + movarlogin.loginPassButtonCSS + '">' +
        '</div>' +
        '<div class="um-clear"></div>';

    // if userLabel option has been set then change the label of the username field
    if (movarlogin.userLabel) {
        // for ultimate member
        if ($mo('.um-login').length > 0) {
            $mo('.um-login label[for^=username-]').text(movarlogin.userLabel);
        }
        // for default login form
        if ($mo('#loginform label[for="user_login"]').length > 0) {
            let html = $mo('label[for="user_login"]').html().replace("Username or Email Address", movarlogin.userLabel);
            $mo('label[for="user_login"]').html(html);
        }
        // for woocommerce login form
        if ($mo('.woocommerce-form-login').length > 0) {
            $mo('label[for^=username]').text(movarlogin.userLabel);
        }
    }
    
    // if password skip has been set in the setting and the fall back option is not enabled
    // hide the password field and then just show the username field
    if (movarlogin.skipPwdCheck && !movarlogin.skipPwdFallback) {
        let passSelector;
        let btnSelector;
        let userSelector;
        let loginBtnText;

        // for ultimate member login form
        if ($mo('.um-login').length > 0) {
            passSelector = '.um-login .um-field-password';
            btnSelector = '.um-login #um-submit-btn';
            userSelector = 'input[name^="username"]';
            loginBtnText = movarlogin.loginOTPButtonText;
            $mo('.um-login .um-field-password').hide();
            $mo('.um-login #um-submit-btn').val(movarlogin.loginOTPButtonText)
                .append('<input hidden name="logintype" value="' + movarlogin.loginOTPButtonText + '"/>');
        }
        // for default login form
        if ($mo('#loginform label[for="user_pass"]').length > 0) {
            passSelector = '#loginform label[for="user_pass"]';
            btnSelector = "#loginform #wp-submit";
            userSelector = 'input#user_login';
            loginBtnText = $mo(btnSelector).val();
            $mo(passSelector).parent().hide();
            $mo('#user_pass').removeAttr("required");
            $mo(btnSelector).val(movarlogin.loginOTPButtonText);
        }
        // for woocommerce login form
        if ($mo('.woocommerce-form-login label[for="password"]').length > 0) {
            passSelector = 'label[for="password"]';
            btnSelector = $mo(".woocommerce-form-login .woocommerce-Button[type='submit']").length ? ".woocommerce-form-login .woocommerce-Button[type='submit']" : ".woocommerce-button[name=login]";
            userSelector = 'input#username';
            loginBtnText = $mo(btnSelector).val();
            $mo('#password').removeAttr("required");
            $mo('input[name=password]').removeAttr("required");
            $mo(passSelector).parent().hide();
            $mo(btnSelector).val(movarlogin.loginOTPButtonText);
        }
        if (movarlogin.byPassAdmin) {
            moIsAdminCheck(userSelector, passSelector, btnSelector, loginBtnText);
            $mo(userSelector).on("keyup", function () {
                moIsAdminCheck(userSelector, passSelector, btnSelector, loginBtnText);
            });
        }
    }
    // if password skip is set in the settings and fallback option is set as well.
    // need to show both username+password+login with OTP option
    else if (movarlogin.skipPwdCheck) {
        let passSelector;
        let btnSelector;
        let userSelector;
        let loginBtnText;
        
        // for ultimate member login form
        if ($mo('.um-login').length > 0) {
            passSelector = '.um-login .um-field-password';
            btnSelector = '.um-login #um-submit-btn';
            userSelector = 'input[name^="username"]';
            loginBtnText = movarlogin.loginOTPButtonText;
            $mo('<input type="hidden" id="hidden_current_tab" value="OTP">').insertBefore(btnSelector);
            $mo('.um-login .um-field-password').hide();
            $mo('.um-login #um-submit-btn').val(movarlogin.loginOTPButtonText)
                .append('<input hidden name="logintype" value="' + movarlogin.loginOTPButtonText + '"/>');
            $mo("#um-login #um-submit-btn").css({ "width": "50%", "float": "left" });
            $mo(".um-login #um-submit-btn").parent().next().removeClass("um-right").removeClass("um-half").children().css({ "margin-top": "2%" });
            $mo(htmlButtonUm).insertAfter($mo('.um-login #um-submit-btn').parent());
            $mo(".um-login #um-submit-btn").parent().next().children().attr("type", "button").val(movarlogin.loginPassButtonText).attr("onclick", "toSendOtpBttn()");
        }

        // for default login form
        if ($mo('#loginform label[for="user_pass"]').length > 0) {
            passSelector = '#loginform label[for="user_pass"]';
            btnSelector = "#loginform #wp-submit";
            userSelector = 'input#user_login';
            loginBtnText = $mo(btnSelector).val();
            $mo('<input type="hidden" id="hidden_current_tab" value="OTP">').insertBefore(btnSelector);
            $mo(passSelector).parent().hide(200);
            $mo('#user_pass').removeAttr("required");
            $mo(btnSelector).css({ "width": "48%", "float": "left" });
            $mo("#loginform .forgetmenot").css({ "width": "100%", "margin-bottom": "2%" });
            $mo("#loginform #wp-submit").val(movarlogin.loginOTPButtonText);
            $mo('#loginform').append(htmlButtonWp);
            $mo('input[name="wp-submit"]:eq(1)').val(movarlogin.loginPassButtonText).css({ "padding": "0px 2px" }).attr("type", "button").attr("onclick", "toSendOtpBttn()");
        }

        if ($mo('.woocommerce-form-login label[for="password"]').length > 0) {
            passSelector = 'label[for="password"]';
            btnSelector = $mo(".woocommerce-form-login .woocommerce-Button[type='submit']").length ? ".woocommerce-form-login .woocommerce-Button[type='submit']" : ".woocommerce-button[name=login]";
            userSelector = 'input#username';
            loginBtnText = $mo(btnSelector).val();
            $mo('<input type="hidden" id="hidden_current_tab" value="OTP">').insertBefore(btnSelector);
            $mo(passSelector).parent().hide();
            $mo(btnSelector).wrap('<div class="mo-flex-space-between"></div>');
            $mo(htmlButtonWc).insertAfter(btnSelector);
            $mo(btnSelector).val(movarlogin.loginOTPButtonText);
            $mo('#password').removeAttr("required");
            $mo('input[name=password]').removeAttr("required");
            $mo('button[name="login"]:eq(0)').html(movarlogin.loginOTPButtonText);
            $mo('button[name="login"]:eq(1)').attr("type", "button").html(movarlogin.loginPassButtonText).attr("onclick", "toSendOtpBttn()");
        }
        if (movarlogin.byPassAdmin) {
            moIsAdminCheck(userSelector, passSelector, btnSelector, loginBtnText);
            $mo(userSelector).on("keyup", function () {
                if ($mo("#hidden_current_tab").val() == "OTP") {
                    moIsAdminCheck(userSelector, passSelector, btnSelector, loginBtnText);
                }
            });
        }
    }
});

function toSendOtpBttn() {
    // for ultimate member login form
    if ($mo('.um-login').length > 0) {
        $mo('.um-login .um-field-password').show();
        $mo("#hidden_current_tab").val("Login");
        $mo(".um-login #um-submit-btn").parent().next().children().val(movarlogin.loginOTPButtonText).attr("onclick", "hidePassBttn()");
        $mo(".um-login #um-submit-btn").val('Login with Password').children().remove();
    }

    // for default login form
    if ($mo('#loginform label[for="user_pass"]').length > 0) {
        $mo("#loginform label[for='user_pass']").parent().show(200);
        $mo('#user_pass').attr("required", "required");
        $mo("#hidden_current_tab").val("Login");
        $mo('input[name="wp-submit"]:eq(0)').css({ "padding": "0px 2px" }).val(movarlogin.loginPassButtonText);
        $mo('input[name="wp-submit"]:eq(1)').val("Back").attr("onclick", "hidePassBttn()");
    }
    
    // for woocommerce login form
    if ($mo('.woocommerce-form-login label[for="password"]').length > 0) {
        $mo("#hidden_current_tab").val("Login");
        $mo('label[for="password"]').parent().show(200);
        $mo('button[name="login"]:eq(1)').html(movarlogin.loginOTPButtonText).attr("onclick", "hidePassBttn()");
        $mo('button[name="login"]:eq(0)').html(movarlogin.loginPassButtonText).prop("value", movarlogin.loginPassButtonText);
    }
}

function hidePassBttn() {
    // for ultimate member login form
    if ($mo('.um-login').length > 0) {
        $mo('.um-login .um-field-password').hide();
        $mo("#hidden_current_tab").val("OTP");
        $mo(".um-login #um-submit-btn").parent().next().children().val(movarlogin.loginPassButtonText).attr("onclick", "toSendOtpBttn()");
        $mo(".um-login #um-submit-btn").val(movarlogin.loginOTPButtonText).append('<input hidden name="logintype" value="' + movarlogin.loginOTPButtonText + '"/>');
    }

    // for default login form
    if ($mo('#loginform label[for="user_pass"]').length > 0) {
        $mo("#hidden_current_tab").val("OTP");
        $mo("#loginform label[for='user_pass']").parent().hide(200);
        $mo('#user_pass').removeAttr("required");
        $mo('input[name="wp-submit"]:eq(1)').attr("onclick", "toSendOtpBttn()").val(movarlogin.loginPassButtonText);
        $mo('input[name="wp-submit"]:eq(0)').val(movarlogin.loginOTPButtonText);
    }

    // for woocommerce login form
    if ($mo('.woocommerce-form-login label[for="password"]').length > 0) {
        $mo('label[for="password"]').parent().hide(200);
        $mo("#hidden_current_tab").val("OTP");
        $mo('button[name="login"]:eq(1)').html(movarlogin.loginPassButtonText).attr("onclick", "toSendOtpBttn()");
        $mo('button[name="login"]:eq(0)').html(movarlogin.loginOTPButtonText).prop("value", movarlogin.loginOTPButtonText);
    }
}

function moIsAdminCheck(userSelector, passSelector, btnSelector, loginBtnText) {
    const username = ($mo(userSelector).val() || '');
    
    $mo.ajax({
        url: movarlogin.siteURL,
        type: "POST",
        data: {
            username: username,
            action: movarlogin.isAdminAction,
            security: movarlogin.nonce,
        },
        crossDomain: !0, 
        dataType: "json",
        success: function (response) {
            if (response.result === "success") {
                if ($mo('.um-login').length > 0) {
                    $mo(passSelector).show();
                    $mo(btnSelector).val(movarlogin.loginPassButtonText);
                    $mo(".um-login #um-submit-btn").parent().next().hide();
                    $mo(".um-login #um-submit-btn").parent().next().next().hide();
                    $mo(".um-login #um-submit-btn").parent().next().next().next().addClass("um-right").addClass("um-half").children().css({ "margin": "0%" });
                }

                if ($mo('#loginform label[for="user_pass"]').length > 0) {
                    $mo(passSelector).parent().show();
                    $mo('#user_pass').attr("required", "required");
                    $mo("#user_pass").prop("disabled", false);
                    $mo('input[name="wp-submit"]:eq(1)').hide();
                    $mo('input[name="wp-submit"]:eq(0)').val("Login");
                }

                if ($mo('.woocommerce-form-login label[for="password"]').length > 0) {
                    $mo(passSelector).parent().show();
                    $mo('button[name="login"]:eq(1)').hide();
                    $mo('button[name="login"]:eq(0)').html("Login");
                }
            } else {
                if ($mo('.um-login').length > 0) {
                    $mo(passSelector).hide();
                    $mo(".um-login #um-submit-btn").parent().next().show();
                    $mo(".um-login #um-submit-btn").parent().next().next().show();
                    $mo(".um-login #um-submit-btn").parent().next().next().show();
                    $mo(".um-login #um-submit-btn").parent().next().next().next().removeClass("um-right").removeClass("um-half").children().css({ "margin-top": "2%" });
                }

                if ($mo('#loginform label[for="user_pass"]').length > 0) {
                    $mo(passSelector).parent().hide();
                    $mo('#user_pass').removeAttr("required");
                    $mo('input[name="wp-submit"]:eq(1)').show().val(movarlogin.loginPassButtonText);
                    $mo('input[name="wp-submit"]:eq(0)').show().val(movarlogin.loginOTPButtonText);
                }
                
                if ($mo('.woocommerce-form-login label[for="password"]').length > 0) {
                    $mo(passSelector).parent().hide();
                    $mo('button[name="login"]:eq(1)').show();
                    $mo('button[name="login"]:eq(0)').html(movarlogin.loginOTPButtonText);
                }
            }
        },
        error: function (xhr, status, error) {
            console.error('AJAX Error:', error);
        }
    });
}
