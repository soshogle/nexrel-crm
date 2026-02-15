jQuery.fn.toggleDiv = function () {
    let str = "#";
    if($mo(this).data("show") === "false") {
        hideDiv($mo(this));
    } else {
        showDiv($mo(this));
    }
    $mo(str.concat($mo(this).data("toggle"))).slideToggle(400);
};

jQuery(document).ready(function () {

    window.$mo = window.jQuery;
    /*adding code for custom message ajax call*/
    $mo('.mo_custom_message_enable').change(function(o) {
        if(o.target.defaultValue === 'Template2') {
            $mo("#mo_custom_msg_template1").removeAttr("checked");
            $mo("#custom_sms_msg").val('Hello {#var#}');
            $mo("#mo_wc_custom_order_msg").val('Hello {#var#}');
        } else if(o.target.defaultValue === 'Template1') {
            $mo("#mo_custom_msg_template2").removeAttr("checked");
            $mo("#custom_sms_msg").val('You have received a message from {#var#}');
            $mo("#mo_wc_custom_order_msg").val('You have received a message from {#var#}');
        }
    });
    $mo("#mo_close_notice_button").click(function(){
        let modalId = jQuery("#mo_notice_modal").attr("name");
        let nonce = jQuery("#_wpnonce").attr("value");
        $mo("#mo_notice_modal").hide();
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                action: "mo_modal_action",
                security: nonce,
                shown_remaining: modalId
            },
            crossDomain: true,
            dataType: "json",
            success: function(data) {
                // Success handler
            },
            error: function(o, e, n) {
                console.error('AJAX Error:', e);
            }
        });
    });

    // Helper to hide selected country modal and notify server.
    function dismissSelectedCountryModal() {
        $mo("#mo_selected_country_modal").hide();
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                action: "mo_selected_country_modal_dismiss",
                security: moadminsettings.security
            },
            crossDomain: true,
            dataType: "json",
            success: function (data) {},
            error: function (o, e, n) {}
        });
    }

    // Selected Country modal close and cross handlers.
    $mo(document).on('click', '#mo_remind_later_selected_country_button, #mo_close_selected_country_cross', function () {
        dismissSelectedCountryModal();
    });

    // Also close modal immediately on Enable Addon click.
    $mo(document).on('click', '#mo_selected_country_modal a.mo-button.primary', function () {
        dismissSelectedCountryModal();
    });

        $mo("#test_whatsapp_otp").click(function(){
            $mo("#whatsapp_test_pop_up").show();
        });

        $mo("#mo_close_wp_pop_up_button").click(function(){
            $mo("#whatsapp_test_pop_up").hide();
        });

    if($mo("#selected_form_details").length) {
        let mo_id;
        if($mo("input[name^=mo_customer_validation_dokan_user_type]:visible").length) {
            mo_id = "input[name^=mo_customer_validation_dokan_user_type]";
        } else {      
            mo_id = ".mo_registration_help_desc .app_enable[type='radio']";
        }
        $mo(mo_id).on("click", function(){
            $mo(".mo_otp_form .app_enable[type='checkbox']:first").prop("checked", true);
        });
    }
        
    /*commented the variables since they wont be used in the functions below.*/
    let el = $mo('.mo-otp-help-button');
    //var tl = $mo('.mo_registration_support_layout');
    let rt = $mo('#restart_tour_button');
    //var eldistance  = el.length > 0 ? el.offset().top : undefined;
    // tl.css("top",eldistance + 20);
    let url = window.location.href.slice(window.location.href.indexOf('?') + 1);

    // calculate character count for text areas
    $mo('.mo_remaining_characters').each(function() {
        calculateCharacterCount($mo(this));
    });

    $mo("#login_with_pass_and_otp").click(function(){
        $mo("#otp_skip_pass_fallback_div").hide(400);
    });

    $mo("#otp_skip_pass").click(function(){
        $mo("#otp_skip_pass_fallback_div").show(400);
    });

    $mo(".mo_remaining_characters").keyup(function(e) {
        calculateCharacterCount(this);
    });

    $mo("#ov_settings_button_float").click(function(){
        $mo("#ov_settings_button").trigger('click');
    });

    $mo("input[name='check_btn']").click(function(){
        $mo("#mo_ln_form").submit();
    });

    $mo("input[name='remove_accnt']").click(function(){
        $mo("#remove_accnt_form").submit();
    });

    $mo("input[name='sync_lnc']").click(function(){
        $mo("#sync_lnc_form").submit();
    });

    //images
    $mo(".form_preview").click(function () {
       window.open($mo(this).data("formlink"), '_blank');
    });

	//FAQ
	// $mo(".registration_question").click(function () {
    // 	$mo(this).next(".mo_registration_help_desc").slideToggle(400);
    // });

    // $mo(".form_query").click(function(){
    //     var str = "#form_query_desc_";
    //     $mo(str.concat($mo(this).data("desc"))).slideToggle(400);
    // });

    $mo("form[name='f']").submit(function(){
        $mo("#moblock").show();
    });

    $mo(".toggle-div").click(function(){
        $mo(this).toggleDiv();
    });

    $mo(".mo_registration_table_layout").on("click",".app_enable",function () {
        var str = "#";
        if($mo(this).is(":checked")){
            $mo(str.concat($mo(this).data("toggle"))).slideDown(400);
        }else{
            $mo(str.concat($mo(this).data("toggle"))).slideUp(400);
        }
    });

    $mo(".mo_otp_dropdown_note").click(function () {
        var str = "#";
        $mo(str.concat($mo(this).data("toggle"))).slideToggle(400);
    });

    $mo(".mo_registration_table_layout").on("click","#searchForm", function(){
        $mo('.modropdown-content').show();
    });

    $mo(".form_options").click(function(){
        var str="_field";
        var str2 = "form";
        var form_field= $mo(this).data("form");
        if(form_field!==undefined){
            var form = form_field.substr(0, form_field.indexOf('_')+1);
            $mo(".".concat(form.concat(str2))).slideUp(400);
            $mo("#".concat(form_field.concat(str))).slideToggle(400);
        }
    });

    $mo("#country_code").empty();
    $mo("#country_code").append($mo("#mo_country_code").find(':selected').data("countrycode"));

    $mo("#mo_country_code").on("click", function() {
        var value = $mo(this).find(':selected').data("countrycode");
        $mo("#country_code").empty();
        $mo("#country_code").append(value);
    });

    //formcraft
    $mo('input[name=mo_customer_validation_formcraft_enable_type]').change(function(){
        $mo('input[name^="formcraft_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="formcraft_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="formcraft_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="formcraft_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="formcraft_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo("input[name=mo_customer_validation_forminator_enable_type]").change(function () {
        $mo('input[name^="forminator_form"]').each(function () {
            $mo(this).val("");
        });
    });
    $mo('input[name^="forminator_form[form]"]').change(function () {
        updateFormValues(this, 0);
    });
    $mo('input[name^="forminator_form[phonekey]"]').change(function () {
        updateFormValues(this, 0);
    });
    $mo('input[name^="forminator_form[verifyKey]"]').change(function () {
        updateFormValues(this, 0);
    });
    $mo('input[name^="forminator_form[emailkey]"]').change(function () {
        updateFormValues(this, 0);
    });

    //Fluent Form
    $mo('input[name=mo_customer_validation_fluentform_enable_type]').change(function(){
        $mo('input[name^="fluentform_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="fluentform_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fluentform_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fluentform_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

     //Fluent Conv Form
     $mo('input[name=mo_customer_validation_fluentform_ccv_enable_type]').change(function(){
        $mo('input[name^="fluentccvform_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="fluentccvform_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fluentccvform_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fluentccvform_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    //WS Pro  Form
    $mo('input[name=mo_customer_validation_mo_wsform_enable_type]').change(function(){
        $mo('input[name^="wsforms_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="wsforms_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="wsforms_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="wsforms_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });
    $mo('input[name^="wsforms_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //ArMember
    $mo('input[name=mo_customer_validation_armember_enable_type]').change(function(){
        $mo('input[name^="formmaker_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="armember_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="armember_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="armember_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="armember_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    //formmaker
    $mo('input[name=mo_customer_validation_fm_enable_type]').change(function(){
        $mo('input[name^="formmaker_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="formmaker_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="formmaker_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="formmaker_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="formmaker_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    // elementor pro form
    
    $mo('input[name=mo_customer_validation_elementorproform_enable]').change(function(){
        $mo('input[name^="elementorproform_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="elementorproform_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="elementorproform_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="elementorproform_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="elementorproform_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //JetformBuilder Form:
    $mo('input[name=mo_customer_validation_jetformbuilder_enable_type]').change(function(){
        $mo('input[name^="jetformbuilder_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="jetformbuilder_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="jetformbuilder_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="jetformbuilder_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });


    //fcpremium
    $mo('input[name=mo_customer_validation_fcpremium_enable_type]').change(function(){
        $mo('input[name^="fcpremium_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="fcpremium_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fcpremium_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fcpremium_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="fcpremium_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //ninja-form ajax
    $mo('input[name=mo_customer_validation_nja_enable_type]').change(function(){
        $mo('input[name^="ninja_ajax_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="ninja_ajax_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="ninja_ajax_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="ninja_ajax_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="ninja_ajax_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //gravity-form
    $mo('input[name=mo_customer_validation_gf_contact_type]').change(function(){
        $mo('input[name^="gravity_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="gravity_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="gravity_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="gravity_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="gravity_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //wp-forms
    $mo('input[name=mo_customer_validation_wpform_enable_type]').change(function(){
        $mo('input[name^="wpform_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="wpform_form[form]"]').change(function(){
        updateFormValues(this,1);
    });

    $mo('input[name^="wpform_form[phonekey]"]').change(function(){
        updateFormValues(this,1);
    });

    $mo('input[name^="wpform_form[emailkey]"]').change(function(){
        updateFormValues(this,1);
    });

    $mo('input[name^="wpform_form[verifyKey]"]').change(function(){
        updateFormValues(this,1);
    });


    //caldera forms
    $mo('input[name=mo_customer_validation_caldera_enable_type]').change(function(){
        $mo('input[name^="caldera_form  "]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="caldera_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="caldera_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="caldera_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="caldera_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //userregeverest form

    $mo('input[name=mo_customer_validation_user_reg_form_enable_type]').change(function(){
        $mo('input[name^="user_reg_form_form  "]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="user_reg_form_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="user_reg_form_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="user_reg_form_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="user_reg_form_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //everestcontact form

    $mo('input[name=mo_customer_validation_everest_contact_enable_type]').change(function(){
        $mo('input[name^="everest_contact_form  "]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="everest_contact_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="everest_contact_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="everest_contact_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="everest_contact_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //Jet engine form

    $mo('input[name=mo_customer_validation_jetengineform_enable_type]').change(function(){
        $mo('input[name^="jetengineform_form  "]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="jetengineform_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="jetengineform_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="jetengineform_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="jetengineform_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    //crf form
    $mo('input[name=mo_customer_validation_crf_default_enable]').change(function(){
        $mo('input[name^="crf_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="crf_form[form]"]').change(function(){
        updateFormValues(this,1);
    });

    $mo('input[name^="crf_form[phonekey]"]').change(function(){
        updateFormValues(this,1);
    });

    $mo('input[name^="crf_form[emailkey]"]').change(function(){
        updateFormValues(this,1);
    });

	$mo(".mo_registration_help_title").click(function(e){
        e.preventDefault();
    	$mo(this).next('.mo_registration_help_desc').slideToggle(400);
    });

    //BuddyPress
    $mo("input[name=mo_customer_validation_bbp_restrict_duplicates]").click(function(){
        if($mo(this).is(':checked')){
            $mo("input[name=mo_customer_validation_bbp_restrict_duplicates]").prop("checked", true);
        }else{
            $mo("input[name=mo_customer_validation_bbp_restrict_duplicates]").prop("checked", false);
        }
    });

    $mo('input[name="mo_customer_validation_bbp_phone_key"]').change(function(){
        updateFormValues(this,1);
    });

    //ultimate member profile form
    $mo("input[name=mo_customer_validation_um_profile_restrict_duplicates]").click(function(){
        if($mo(this).is(':checked')){
           $mo("input[name=mo_customer_validation_um_profile_restrict_duplicates]").prop("checked", true);
        }else{
           $mo("input[name=mo_customer_validation_um_profile_restrict_duplicates]").prop("checked", false);
        }
    });

    $mo("input[name=mo_customer_validation_wc_restrict_duplicates]").click(function(){
        if($mo(this).is(':checked')){
           $mo("input[name=mo_customer_validation_wc_restrict_duplicates]").prop("checked", true);
        }else{
           $mo("input[name=mo_customer_validation_wc_restrict_duplicates]").prop("checked", false);
        }
    });

    $mo("input[name=mo_customer_validation_dokan_restrict_duplicates]").click(function(){
        if($mo(this).is(':checked')){
           $mo("input[name=mo_customer_validation_dokan_restrict_duplicates]").prop("checked", true);
        }else{
           $mo("input[name=mo_customer_validation_dokan_restrict_duplicates]").prop("checked", false);
        }
    });

    $mo("#mo_dokan_options").click(function(){
        if($mo("#dokan_vendor").is(':checked') || $mo("#dokan_customer").is(':checked')){
            $mo("#dokan_otp_options").show();
            if (!$mo("input[name='mo_customer_validation_dokan_enable_type']:checked").length) {
                $mo("#dokan_phone").prop("checked", true);
            }
        } else {
            $mo("#dokan_otp_options").hide();
            $mo("#dokan_phone").prop("checked", false);
            $mo("#dokan_email").prop("checked", false);
            $mo("#dokan_both").prop("checked", false);
        }
    });

    $mo("input[name=mo_customer_validation_um_restrict_duplicates]").click(function(){
        if($mo(this).is(':checked')){
           $mo("input[name=mo_customer_validation_um_restrict_duplicates]").prop("checked", true);
        }else{
           $mo("input[name=mo_customer_validation_um_restrict_duplicates]").prop("checked", false);
        }
    });

    $mo('input[name="mo_customer_validation_um_profile_phone_key"]').change(function(){
        updateFormValues(this,1);
    });

    //Ultimate Member Registration
    $mo('input[name="mo_customer_validation_um_phone_key"]').change(function(){
        updateFormValues(this,1);
    });

    $mo('#um_both').change(function(){
        if($mo(this).is(':checked')){
            if($mo('input[name="mo_customer_validation_um_is_ajax_form"]').is(":checked")) {
                $mo('input[name="mo_customer_validation_um_is_ajax_form"]').prop("checked",false);
            }
        }
    });

    $mo("#mochoosecountry").on("change", function () {
        let sms_nonce = $mo("#mo_sms_pricing_nonce").val(),
            country = $mo("#mochoosecountry").val();
        document.getElementById("mosmspricing").innerHTML = "<option>loading....</option>";
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                target_country: country,
                security: sms_nonce,
                action: "miniorange_check_sms_pricing"
            },
            crossDomain: true,
            dataType: "json",
            success: function (e) {
                if(e === null) {
                    document.getElementById("mosmspricing").innerHTML = "<option>Select a country to check pricing</option>";
                } else {
                    $mo("#moloading").hide();
                    document.getElementById("mosmspricing").innerHTML = "";
                    let html = "";
                    for (const [key, value] of Object.entries(e.data)) {
                        html += "<option>" + key + " transactions - $" + value + "</option>";
                    }
                    document.getElementById("mosmspricing").innerHTML = html;
                }
            },
            error: function (e, t, o) {
                console.error('AJAX Error:', t);
            },
        });
    });

    $mo('input[name="mo_customer_validation_um_is_ajax_form"]').change(function(){
        if($mo(this).is(':checked')){
            if($mo('#um_both').is(":checked")) {
                $mo('#um_both').prop("checked",false);
                $mo('#um_email').prop("checked",true);
            }
        }
    });


    //visual form builder
    $mo('input[name=mo_customer_validation_visual_form_enable_type]').change(function(){
        $mo('input[name^="visual_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="visual_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="visual_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="visual_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    //formidable form
    $mo('input[name=mo_customer_validation_frm_form_enable_type]').change(function(){
        $mo('input[name^="frm_form"]').each(function() {
            $mo(this).val('');
        });
    });

    $mo('input[name^="frm_form[form]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="frm_form[phonekey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="frm_form[verifyKey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo('input[name^="frm_form[emailkey]"]').change(function(){
        updateFormValues(this,0);
    });

    $mo("#mo_agree_plugin_policy").change(function(){
        if($mo("#mo_agree_plugin_policy").is(":checked")){
            $mo("#mo_user_register").prop('disabled', false);
        } else {
            $mo("#mo_user_register").prop('disabled', true);
        }
    });

	$mo("#lk_check1").change(function(){
        if($mo("#lk_check2").is(":checked") && $mo("#lk_check1").is(":checked")){
            $mo("#activate_plugin").removeAttr('disabled');
        }
    });

    $mo("#lk_check2").change(function(){
        if($mo("#lk_check2").is(":checked") && $mo("#lk_check1").is(":checked")){
            $mo("#activate_plugin").removeAttr('disabled');
        }
    });

    // Wordpress Login Form
    $mo("#wp_login_delay_otp").change(function(){
        if($mo(this).is(':checked')){
            if($mo("#otp_skip_pass").is(":checked")) {
                $mo("#otp_skip_pass_fallback_div").slideToggle(400);
                $mo("#otp_skip_pass_fallback").prop("checked",false);
                $mo("#otp_skip_pass").prop("checked",false);
            }
        }
    });

    $mo("#otp_skip_pass").change(function(){
        if($mo(this).is(':checked')){
            if($mo("#wp_login_delay_otp").is(":checked")) {
                $mo("#otp_delay_time_interval").slideToggle(400);
                $mo("#wp_login_delay_otp").prop("checked",false);
                $mo("#otp_skip_pass").prop("checked",false);
            }
        }
    });

    /**
     * This is for WordPress Default Registration Form. If the duplicate option is updated then it
     * should update all dupliate optiond fields on the page related to WordPress Registration. This
     * is to ensure that the date is consistent no matter what option is chosen.
     */
    $mo("input[name=mo_customer_validation_wp_reg_restrict_duplicates]").click(function(){
         if($mo(this).is(':checked')){
            $mo("input[name=mo_customer_validation_wp_reg_restrict_duplicates]").prop("checked", true);
         }
         else{
            $mo("input[name=mo_customer_validation_wp_reg_restrict_duplicates]").prop("checked", false);
         }
    });

    /**
     * This is for MemberPress Registration Form. If the user chooses the both option or phone verification
     * option then update the phone field slug for all fields on the page related to MemberPerss.
     * This is to ensure that the data is consistent and value is not overriden due to other existing fields
     * with the same name.
     */
    $mo("input[name='mo_customer_validation_mrp_phone_field_key']").change(function(){
        updateFormValues(this,1);
    });

    /**
     * This is the main code that handles the search funcationality of the form search box.
     * This code checks the key pressed and checks if the entire key pressed till now is
     * present in the list of forms or not.
     */
    $mo("#searchForm").on("keyup", function () {
    var value = $mo(this).val();
    var matchFound = false;

    $mo(".modropdown-content .search_box").each(function (index) {
        var $row = $mo(this);
        var dataValue = $row.find(".mo_search").data("value") || "";

        if (dataValue.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
            $row.show();
            matchFound = true;
        } else {
            $row.hide();
            if (
                dataValue.indexOf(
                    "form is not in the list to contact us for compatibility"
                ) >= 0
            ) {
                $row.show();
                matchFound = true;
            }
        }
    });

    if (!matchFound && !$mo("#mo-no-results-message").length) {
        $mo(".modropdown-content").append(
          moadminsettings.form_is_not_found
        );
    } else if (matchFound) {
        $mo("#mo-no-results-message").remove();
    }
});
    $mo("#mo_create_new_page").click(function(){
        const nonce = $mo("#_wpnonce").val();
        $mo.ajax({
            url: 'admin-ajax.php',
            type: "POST",
            crossDomain: true,
            dataType: "json",
            data: { 
                action: 'mo_create_new_page',
                security: nonce
            },
            success: function(m) {
                alert("Page created successfully. Page URL: " + m.message);
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', error);
            }
        });
    });
    
    $mo(document).on("click", ".mo_search", function() {
        let value = $mo(this).data("form");
        let name = $mo(this).data("value");
        $mo("#moblock").show();
        $mo("#mo_forms .mo_otp_note").show();
        $mo("#mo_forms #form_details").hide();
        $mo("#mo_forms .mo_otp_note #text").hide();
        $mo("#mo_forms .mo_otp_note #loader").show();
    });

     // to get gateway configuration page
    $mo("#custom_gateway_type").change(function() {
        var gType = $mo(this).val();//$mo(this).data("value");
        var nonce = $mo("#_wpnonce").val();
        const gatewaytype = document.getElementById("custom_gateway_type").value;
        $mo("#moblock").show();
        $mo.ajax({
            url: "admin-post.php",
            type:"POST",
            data:{gateway_type:gType,action:"miniorange_get_gateway_config",_wpnonce:nonce},
            crossDomain:!0,dataType:"json",
            success:function(o){
                if(gatewaytype === 'MoTwilio') {
                    document.getElementById("mo_gateway_guide").setAttribute("href", moadminsettings.mo_twilio_setupguide);
                } else {
                    document.getElementById("mo_gateway_guide").setAttribute("href", moadminsettings.mo_gateway_setupguide);
                }

                if(o.result==="success") {
                    $mo("#gateway_configuration_fields").empty();
                    $mo("#gateway_configuration_fields").html(o.message);
                }
                $mo("#moblock").hide();
            },
            error: function(o, e, n) {
                console.error('AJAX Error:', e);
            }
        });
    });
    $mo("#gateway_submit").click(function(){
        let testno = $mo("input[name=mo_test_configuration_phone]").val();
        let nonce = $mo("#_wpnonce").val();
        $mo("#test_config_hide_response").show();
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                test_config_number: testno,
                action: "miniorange_get_test_response",
                security: nonce
            },
            crossDomain: true,
            dataType: "html",
            success: function(data) {
                $mo("#test_config_hide_response").css("display", "");
                $mo("#test_config_response").val(data);
            },
            error: function(o, e, n) {
                console.error('AJAX Error:', e);
            }
        });
    });
    $mo("#whatsapp_gateway_submit").click(function () {
        let nonce = $mo("#mo_admin_actions").val(),
            phone = $mo("#wa_test_configuration_phone").val(),
            email = $mo("#wa_test_configuration_email_address").val(),
            password = $mo("#wa_test_configuration_password").val(),
            img = "<div class='moloader'></div>";
            
        $mo("#test_config_response").empty();
        $mo("#test_config_response").append(img);
        $mo("#test_config_response").show();
           
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                test_config_number: phone,
                customer_email: email,
                customer_pass: password,
                security: nonce,
                action: "wa_miniorange_get_test_response"
            },
            crossDomain: true,
            dataType: "html",
            success: function (e) {
                $mo("#test_config_response").empty();
                $mo("#test_config_response").show();
                $mo("#test_config_response").append(e);
                $mo("#test_config_response").css({
                    "background-color": "#EFF6FF",
                    "color": "#1d2327"
                });
            },
            error: function (e) {
                console.error('AJAX Error:', e);
            },
        });
    });
    $mo("#country").on("change", function () {
        let e = $mo("#mo_whatsapp_nonce").val(),
            t = $mo("#country").val();
        $mo("#whatsapp_cost_hide_response").show();
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                target_country: t,
                security: e,
                action: "wa_miniorange_check_pricing"
            },
            crossDomain: true,
            dataType: "json",
            success: function (e) {
                if(e === null) {
                    document.getElementById("wapricing").innerHTML = "<option>Select a country to check pricing</option>";
                } else {
                    $mo("#loading").hide();
                    document.getElementById("wapricing").innerHTML = "";
                    let html = "";
                    for (const [key, value] of Object.entries(e)) {
                        html += "<option>" + key + " transaction - $" + value + "</option>";
                    }
                    document.getElementById("wapricing").innerHTML = html;
                }
            },
            error: function (e, t, o) {
                console.error('AJAX Error:', t);
            },
        });
    });
  
    $mo("#mo_generate_masterotp_for_user").click(function(){
        let currenttime = timeNow(master_otp_generation_time);
        let masterotpnonce = $mo("#momasterotp_wpnonce").val();
        $mo.ajax({
            url: moadminsettings.ajaxUrl,
            type: "POST",
            data: {
                cTime: currenttime,
                action: "miniorange_get_master_otp",
                security: masterotpnonce
            },
            crossDomain: true,
            dataType: "html",
            success: function(data) {
                $mo("#masterotp_user_textbox").val(data);
            },
            error: function(o, e, n) {
                console.error('AJAX Error:', e);
            }
        });

    });

    // to add new post parameter on addbutton click
    $mo(document).on('click',"#moAddGatewayParam",function() {
      $mo(".mo-gateway-body").append('<div class="mo-gateway-text-pair">\
                    <input class="mo-gateway-param" type="text" name="mo_post_param[]" placeholder="Parameter Name">\
                    <input class="mo-gateway-param" type="text" name="mo_post_value[]" placeholder="value">\
                    <input class="mo-button secondary mo-remove-button"\
                                type="button" id="moRemoveGatewayParam[]" name="moRemoveGatewayParam" value="x"/>\
                </div>');
    });

    // to add new header parameter on addbutton click
    $mo(document).on('click',"#moAddGatewayHeader",function() {
        $mo(".mo-gateway-header").append('<div class="mo-gateway-text-pair">\
                      <input class="mo-gateway-param" type="text" name="mo_headers_param[]" placeholder="Header Name">\
                      <input class="mo-gateway-param" type="text" name="mo_headers_value[]" placeholder="value">\
                      <input class="mo-button secondary mo-remove-button"\
                                  type="button" id="moRemoveGatewayHeader[]" name="moRemoveGatewayHeader" value="x"/>\
                  </div>');
      });
    
    // to show both body types in basic auth gateway
    $mo(document).on('change',".mo_basic_auth_body_enable",function() {
        $mo('.mo_basic_auth_raw').toggle($mo('#mo_raw').is(':checked'));
        $mo('.mo_basic_auth_form_data').toggle($mo('#mo_form_data').is(':checked'));
    });

    // Add an event listener to detect changes
    $mo(document).on('change',"#original_msg_dropdown", function() {
        var msg_dropdown = document.getElementById("original_msg_dropdown");
      // Get the selected value
      var selectedValue = msg_dropdown.value;
      // Perform actions based on the selected value
      $mo("#selected_message").val(selectedValue);
    });
    // to add new message to the common message list
    $mo(document).on('click',"#mo_add_new_message",function() {
        var key = $mo("#selected_message").val();
        nonce = $mo("#mo_add_message_nonce").val();
        $mo("#mo_add_new_message").prop('disabled', true);
        $mo("#mo_common_message_table").append("<div class='moloader my-mo-4'></div>");
        $mo.ajax({
                url: moadminsettings.ajaxUrl,
                type: "POST",
                data: { msg_key: key, action: "miniorange_get_message_value", security: nonce },
                crossDomain: !0,
                dataType: "json",
                success: function (e) {
                    $mo(".moloader").remove();
                    if($mo('#mo_common_message_table #original_msg_list'+key+'').length === 0) {
                        $mo("#mo_common_message_table").append('\
                                <div class="w-full gap-mo-4 px-mo-8 mt-mo-4 flex" id="original_msg_list'+key+'">\
                                    <div class="flex-1">\
                                        <p name="old_msg_list_'+key+'" class="mb-mo-4" >'+ e.message +'</p>\
                                    </div>\
                                    <div class="flex-1">\
                                        <div class="mo-input-wrapper">\
                                            <label class="mo-input-label">Custom Message</label>\
                                            <textarea name="new_msg_list_'+key+'" rows="3" maxlength="400" class="mo-textarea" id="new_msg_list_'+key+'" >' + e.message +'</textarea>\
                                        </div>\
                                    </div>\
                                </div>');
                    }
                    $mo("#mo_add_new_message").prop('disabled', false);
                },
                error: function (e, t, o) {
                    $mo("#mo_add_new_message").prop('disabled', false);
                },
            });
    });

    //Enable/Disable transaction report
    $mo('#mo_report_enabled').on('change', function() {
        var is_checked = $mo(this).is(':checked');
        report_nonce = $mo('#mo_toggle_report_nonce').val();
        var data = {
            action: 'mo_toggle_report',
            mo_is_report_enabled: is_checked ? 1 : 0,
            security: report_nonce
        };
        url = moadminsettings.ajaxUrl;

        $mo.post(url, data, function(response) {
        });
    });

    $mo('#mo_close_transaction_logs_cross, #mo_remind_later_transaction_logs_button').on('click', function() {
            $mo('#mo_transaction_logs_modal').hide();

            var data = {
                action: 'mo_transaction_logs_modal_dismiss',
                security: moadminsettings.security
            };

            $mo.ajax({
                url: moadminsettings.ajaxUrl,
                type: 'POST',
                data: data,
                crossDomain: true,
                dataType: 'json',
                success: function(response) {
                    // Success handler
                },
                error: function(xhr, status, error) {
                    console.error('AJAX Error:', error);
                }
            });
        });

    $mo("#mo_transaction_report").click( function() {
        var from_date = $mo('input[name=mo_from_date]').val();
        to_date = $mo('input[name=mo_to_date]').val();
        request_type = $mo('select[name=mo_request_type]').val();
        user_key = $mo('input[name=mo_user_key]').val();
        gr_nonce = $mo('#mo_generate_report_nonce').val();
        $mo("#mo_report_table").empty();

        $mo.ajax({
                url: moadminsettings.ajaxUrl,
                type: "POST",
                data: { action: "mo_generate_report", mo_from_date: from_date, mo_to_date: to_date, mo_request_type: request_type, mo_user_key: user_key, security:gr_nonce},
                crossDomain: !0,
                dataType: "json",
                success: function (e) {
                    $mo("#mo_report_table").html(e.message);
                },
                error: function (e, t, o) {
                    $mo("#mo_report_table").html('<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #ff5b5b;">Error loading report. Please try again.</td></tr>');
                },
            });
    });

    let whatsapp_settings;
    if (!moadminsettings.whatsapp_file) {
        whatsapp_settings = '<div id="mo_free_whatsapp_html" class="mo-whatsapp-links mo_whatsapp_marketing">[ <a id="mo_whatsapp_not_enabled" href="' + moadminsettings.whatsapp_tab + '" target="_blank">' + moadminsettings.whatsapp_disabled_text + ' </a>\
                                    <span class="tooltip mo_whatsapp_tooltip">\
                                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none">\
											<g id="d4a43e0162b45f718f49244b403ea8f4">\
												<g id="4ea4c3dca364b4cff4fba75ac98abb38">\
													<g id="2413972edc07f152c2356073861cb269">\
														<path id="2deabe5f8681ff270d3f37797985a977" d="M20.8007 20.5644H3.19925C2.94954 20.5644 2.73449 20.3887 2.68487 20.144L0.194867 7.94109C0.153118 7.73681 0.236091 7.52728 0.406503 7.40702C0.576651 7.28649 0.801941 7.27862 0.980492 7.38627L7.69847 11.4354L11.5297 3.72677C11.6177 3.54979 11.7978 3.43688 11.9955 3.43531C12.1817 3.43452 12.3749 3.54323 12.466 3.71889L16.4244 11.3598L23.0197 7.38654C23.1985 7.27888 23.4233 7.28702 23.5937 7.40728C23.7641 7.52754 23.8471 7.73707 23.8056 7.94136L21.3156 20.1443C21.2652 20.3887 21.0501 20.5644 20.8007 20.5644Z" fill="orange"></path>\
													</g>\
												</g>\
											</g>\
										</svg>\
                                        <span class="tooltiptext prem_form_tooltip" style="transform:translateY(-7%);">\
                                            <span class="header prem_form_header"><b>WhatsApp + Twilio Gateway Plan Feature</b></span>\
                                            <span class="body">To use OTPs over WhatsApp, upgrade to the WhatsApp + Twilio Gateway Plan.<br>Check <a class="font-semibold text-yellow-500" href=" ' + moadminsettings.pricing_plan_url + '" target="_blank">Licensing Tab</a> to learn more.</span>\
                                        </span>\&nbsp]</div>';
    } else  if( moadminsettings.iswhatsappenable ){
        whatsapp_settings = '<span  id="mo_whatsapp_enabled" class="addon-table-list-status mo-whatsapp-links">[ '+ moadminsettings.whatsapp_enabled_text +' ]</span>';
    } else {
        whatsapp_settings = '<a id="mo_whatsapp_not_enabled" class="mo-whatsapp-links" href="' + moadminsettings.whatsapp_tab + '" target="_blank">[ ' + moadminsettings.whatsapp_disabled_text + ' ]</a>';
    }

    //Exceptional forms:
    $mo(whatsapp_settings).insertBefore("#mo_login_reg_options");
    $mo(whatsapp_settings).insertAfter('strong:contains("WooCommerce Social Login ( SMS Verification Only )")');
    $mo(whatsapp_settings).insertAfter('strong:contains("miniOrange Social Login Integration (SMS Verification only)")');
    $mo(whatsapp_settings).insertAfter('i:contains("( Mobile Number Verification )")');
    $mo(whatsapp_settings).insertAfter('i:contains("( Both Email and Mobile Number Verification )")');

    $mo("strong").filter(function () {
        return $mo(this).text().trim() === "Enable Phone Verification";
    }).each(function () {
        $mo(this).after(whatsapp_settings);
        if (!moadminsettings.whatsapp_file) {
            $mo(this).closest("div").css({
                display: "flex",
                gap: "3px"
            });
        }
    });

    // to remove that post parameter on remove button click
    jQuery(document).on('click',"[name=moRemoveGatewayParam]", function() {
        jQuery(this).parent().remove();
    });

    // to remove that header parameter on remove button click
    jQuery(document).on('click',"[name=moRemoveGatewayHeader]", function() {
        jQuery(this).parent().remove();
    });

    $mo(".show_configured_forms").click(function(){
        $mo("#moblock").show();
    });

    $mo(".show_form_list").click(function(){
        $mo("#moblock").show();
    });

    /*added this for the help button text class*/
    $mo(".mo-otp-help-button-text").click(function(){
        $mo(".mo-otp-help-button-text").hide();
        toggleSupportForm('toggle');
    });

    /*Added code here for click on new features*/
    $mo(".mo_support_form_new_feature").click(function(){
        $mo(".mo-otp-help-button-text").hide();
        toggleSupportForm('toggle');
    });

    $mo('.mo_otp_box').on('change', function() {
            $mo('.mo_otp_box').not(this).prop('checked', false);  
    });
    
    /*this function is not required since support form class has been changed and does not belong to the otp-header class*/
    // $mo(window).scroll(function(){
    //     var isPositionFixed = (el.hasClass("fixed"));
    //     if(!isPositionFixed) eldistance  = el.length > 0 ? el.offset().top : undefined;
    //     if ($mo(this).scrollTop() + 50.6 > eldistance && !isPositionFixed){
    //         el.removeClass("static").addClass("fixed");
    //         // tl.removeClass("static").addClass("fixed");
    //         // tl.css("top",'calc(4.4em + 28px)' );
    //         rt.css("top",eldistance - 32 );

    //     }
    //     if ($mo(this).scrollTop() + 50.6 < eldistance && isPositionFixed){
    //         el.removeClass("fixed").addClass("static");
    //         // tl.removeClass("fixed").addClass("static");
    //         //tl.css("top", eldistance + 20 );
    //         rt.css("top", 0 );
    //     }
    // });

    //$mo(".mo-otp-feedback").click(function(e){ show_feedback_form(e,false,false); });
    $mo(".mo_customer_validation-modal-backdrop").click(function(e){ 
        mo_otp_feedback_goback(); toggleSupportForm('hide');
    });

    //$mo(".feedback_radio").click(function(e){ mo_otp_feedback_show_extra(e,$mo(this)); });
    $mo(".feedback-modal").keypress(function(e){ if(e.keyCode === 27){ mo_otp_feedback_goback(); toggleSupportForm('hide'); }});
    $mo('a[aria-label="Deactivate miniOrange OTP Login, Verification and SMS Notifications"]').click(function(e){ show_feedback_form(e,true,true);});

        //scroll to payment methods
    $mo("#pmt_btn,#pmt_btn_addon").click(function(){
        $mo('html, body').animate({
                    scrollTop: $mo("#otp_pay_method").offset().top-50
                }, 500);
     });

    // $mo("#mo_firebase_gateway_plan").click(function () {
    //    $mo("html, body").animate({ scrollTop: $mo("#mo_registration_firebase_layout").offset().top - 50 }, 500);
    // });
    $mo(".mo_support_form_new_firebase_feature").click(function () {
       var o = $mo("#LicensingPlanButton").attr("href");
       window.location.href = o + "#mo_registration_firebase_layout";
    });

    $mo("#show_prem_addons_button").click(function(){
        var href = $mo('#LicensingPlanButton').attr('href');
        window.location.href = href+'&subpage=premaddons';
    })
    $mo(".mo_contactus_popup_container").click(function(){
        mo_otp_contactus_goback();
    })

    /*added this to redirect to monthly plan on click of new offers*/
    //$mo("#mo_otp_offers").click(function(){
        //var href = $mo('#LicensingPlanButton').attr('href');
        //window.location.href = href+'&subpage=monthlyplan';
    //})

    // $mo("#show_custom_packages_button,#update_custom_packages_button").click(function(){
    //     var href = $mo('#LicensingPlanButton').attr('href');
    //     window.location.href = href+'&subpage=custpackage';
    // })
     $mo("#mo_check_transactions").click(function(){
        var href = $mo('form#mo_check_transactions_form').submit();
    })

    jQuery(document.body).on( 'click', '.mo_notice .notice-dismiss', function(e) {
        $mo.ajax({
                url:moadminsettings.ajaxUrl,
                type: "POST",
            data: {
                action: "mo_dismiss_notice",
            },
            crossDomain: !0,
            dataType: "json",
            success: function() {
                return true;
            },
            error: function() {
                return false;
            }
        });
       });
    jQuery(document.body).on( 'click', '.notice.mo_sms_notice .notice-dismiss', function(e) {
        $mo.ajax({
                url:moadminsettings.ajaxUrl,
                type: "POST",
            data: {
                action: "mo_dismiss_sms_notice",
            },
            crossDomain: !0,
            dataType: "json",
            success: function() {
                return true;
            },
            error: function() {
                return false;
            }
        });
    });
     $mo("#select_popup_option").change(selectedPopupShow);

    /*Code to Switch Between Sub Tabs*/
    $mo(".mo-subtab-item").click(function(e){
        document.querySelectorAll(".mo-subtab-item").forEach(occurance => {
            $mo(occurance).removeClass('mo-subtab-item-active');
        });
        let activeSubTab;
        if(e.target.nodeName === 'SPAN') {
            $mo(e.target).parent().addClass("mo-subtab-item-active");
            activeSubTab = $mo(e.target).attr('id');
        } else if(e.target.nodeName === 'DIV') {
            $mo(e.target).addClass("mo-subtab-item-active");
            activeSubTab = $mo(e.target).children().attr('id');
        }        
        const url = new URL(window.location);
        url.searchParams.set('subpage', activeSubTab);
        window.history.pushState({}, '', url);
        changeActiveSubtab();
    });

    /*Code for Default Active Sub-Tab*/
    let subTab = getUrlParameter("subpage");
    if(subTab) {
        let activeSubTab = subTab;
        $mo("#" + activeSubTab).parent().addClass("mo-subtab-item-active");
    } else {
        $mo($mo(".mo-subtab-item")[0]).addClass("mo-subtab-item-active");
    }

    var contactUsArray = {
        'mo-demo': {
            'query': 'Need the demo of the plugin.',
            'solution': 'Please share your availability and time zone to schedule the meeting.'
        },
        'mo-gateway': {
            'query': 'Need help with the gateway setup.',
            'solution': 'Please share the name of the gateway and the link to the API guide of your gateway.',
        },
        'mo-no-sms': {
            'query': 'Receiving Error: There was an error in sending the OTP. Please try again or contact site admin.',
            'solution': '<i><b><a class="mo_links" href="https://login.xecurify.com/moas/viewtransactions" target="_blank">Click here to check the remaining transactions in your account.</a></b></i> If you are on demo account then please share your registered email address to avail 10 Free SMS transactions*.',
        },
        'mo-form': {
            'query': 'Need help with the form setup.',
            'solution': '<i><b><a class="mo_links" href="https://plugins.miniorange.com/otp-verification-forms" target="_blank">Click here to check guides of all supported forms</a></b></i>. If your form is not listed then please share the link to your form.',
        },
        'mo-premium': {
            'query': 'Upgraded to the premium plan but unable to activate the premium plugin',
            'solution': '<i><b><a class="mo_links" href="https://faq.miniorange.com/knowledgebase/premium-plugin-installation/" target="_blank">Click here to check the guide to download the premium plugin</a></b></i>.',
        },
        'mo-no-otp': {
            'query': 'Not receiving the OTPs',
            'solution': '<i><b><a class="mo_links" href="https://login.xecurify.com/moas/viewtransactions" target="_blank">Click here to check the remaining transactions in your account.</a></b></i> If you have transactions in your account and are still facing issues with SMS delivery then please share 3-4 phone numbers to which you tried sending the OTP.',
        },
        'mo-custom': {
            'query': 'Other query',
            'solution': 'Please write your query.',
        }
    };
    Object.entries(contactUsArray).forEach(([element, properties]) => {
        $mo("#" + element).click(function () {
            $mo("#mo-reply").remove();
            let mo_solution = '<div id="mo-reply" class="flex flex-col gap-mo-2" style="padding-bottom: 1rem; border-bottom: 1px dashed;">\
                                    <div class="mo-cloud-message-reply">\
                                        <div class="mo-chatbot-text">' + properties.query + '</div>\
                                    </div>\
                                    <div class="mo-cloud-message" id="' + element + '">\
                                        <div class="mo-chatbot-text">' + properties.solution + '</div>\
                                    </div>\
                                </div>';
            let mo_textbox = '<div id="mo_queryform" class="flex flex-col gap-mo-2" >\
                                <input type="hidden" id="query_type" name="query_type" value="' + properties.query + '" />\
                                    <textarea id="contactQuery" name="query" class="mo-textarea h-[100px]" style="resize: vertical;width:100%" cols="52" rows="4" onkeyup="mo_registration_valid_query(this)" onblur="mo_registration_valid_query(this)" onkeypress="mo_registration_valid_query(this)" placeholder="Write your query here..."></textarea>\
                                    <input type="submit" name="send_query" id="send_query" value="Submit" class="mo-button inverted" />\
                                    <input type="button" style="font-size: 13px !important;" name="go_back_main_menu" id="go_back_main_menu" onclick="mo_otp_goback_main_menu()" value="Go Back To Main Menu" class="mo-button secondary" />\
                                <a href="mailto:otpsupport@xecurify.com" style="font-size: 13px !important;" class="mo-button secondary">\
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="-ml-mo-4">\
                                        <g id="2500ca1d51c4344f9af74fabf3c0a9a0">\
                                        <path id="31503c81468ad79fcb98b748e7e5efa0" fill-rule="evenodd" clip-rule="evenodd" d="M3.99132 6.93334C4.26951 6.30829 4.6229 5.80071 5.0541 5.38795C6.31992 4.17628 8.44047 3.60205 11.976 3.60205C15.5114 3.60205 17.632 4.17628 18.8978 5.38795C19.4016 5.87022 19.7992 6.48196 20.0948 7.25926C19.9264 7.3907 19.7143 7.55478 19.4676 7.74256C18.8124 8.24133 17.9165 8.9049 16.95 9.56716C15.9808 10.2313 14.9544 10.8846 14.036 11.3689C13.5767 11.6111 13.157 11.8043 12.7938 11.9354C12.4205 12.0701 12.1542 12.1217 11.987 12.1217C11.8223 12.1217 11.5662 12.0712 11.2114 11.9384C10.8655 11.809 10.4685 11.6177 10.0353 11.3769C9.16899 10.8951 8.21009 10.2444 7.30741 9.58136C6.40761 8.92048 5.57801 8.25809 4.97248 7.76007C4.67006 7.51135 4.42435 7.3043 4.25468 7.15981C4.16987 7.08758 4.1041 7.03103 4.05981 6.99277L4.00979 6.94943L3.99744 6.93868L3.99453 6.93613L3.9939 6.93559L3.99383 6.93552L3.99382 6.93552L3.99379 6.93549C3.99297 6.93477 3.99214 6.93406 3.99132 6.93334ZM3.50334 8.48906C3.30109 9.44768 3.20215 10.595 3.20215 11.9688C3.20215 15.3397 3.79796 17.3469 5.05412 18.5494C6.31996 19.7612 8.44053 20.3356 11.976 20.3356C15.5114 20.3356 17.632 19.7612 18.8978 18.5494C20.154 17.3469 20.7498 15.3397 20.7498 11.9688C20.7498 10.7543 20.6724 9.71687 20.5148 8.8303C20.4699 8.86467 20.4236 8.89995 20.3762 8.93609C19.7083 9.44451 18.7912 10.1239 17.7979 10.8045C16.8074 11.4833 15.7272 12.1729 14.7356 12.6958C14.2399 12.9572 13.7537 13.1837 13.303 13.3463C12.8624 13.5053 12.4068 13.6217 11.987 13.6217C11.5651 13.6217 11.1159 13.5043 10.6857 13.3433C10.2466 13.179 9.7789 12.9506 9.30636 12.6878C8.36136 12.1624 7.34518 11.4702 6.41947 10.7903C5.49086 10.1083 4.63875 9.42774 4.01966 8.91858C3.82261 8.75651 3.64883 8.61153 3.50334 8.48906ZM21.75 7.49863C22.1045 8.76599 22.2498 10.2556 22.2498 11.9688C22.2498 15.4351 21.6551 17.9863 19.9351 19.6329C18.2247 21.2702 15.5834 21.8356 11.976 21.8356C8.36853 21.8356 5.72719 21.2702 4.01684 19.6329C2.29681 17.9863 1.70215 15.4351 1.70215 11.9688C1.70215 8.50214 2.2968 5.95086 4.01687 4.30437C5.72724 2.66717 8.36859 2.10205 11.976 2.10205C15.5833 2.10205 18.2247 2.66717 19.935 4.30437C20.7104 5.04653 21.257 5.97252 21.6237 7.08332C21.7084 7.20986 21.7499 7.35463 21.75 7.49863Z" fill="black"></path>\
                                        </g>\
                                    </svg>\
                                    <span>Email us at otpsupport@xecurify.com</span>\
                                </a>\
                            </div>';
            $mo("#mo_email_form_link").show();
            $mo("#mo-chatbox").hide();
            $mo(mo_textbox).insertAfter("#mo_email_form_link");
            $mo(mo_solution).insertBefore("#mo_email_form_link");
        });
    });
});

//get URL Parameter values
function getUrlParameter(moParam) {
    let moPageURL = window.location.search.substring(1),
        moURLVariables = moPageURL.split('&'),
        moParameterName,
        i;

    for (i = 0; i < moURLVariables.length; i++) {
        moParameterName = moURLVariables[i].split('=');

        if (moParameterName[0] === moParam) {
            return moParameterName[1] === undefined ? true : decodeURIComponent(moParameterName[1]);
        }
    }
    return false;
}

function changeActiveSubtab()
{
    $mo(".mo-subpage-container").addClass("hidden");
    var subTab = getUrlParameter("subpage");
    $mo("#"+subTab+"Container").removeClass("hidden");
}

//Close pop-up button on contact us form
function mo_otp_contactus_goback() {
    
    $mo('.mo-scrollable-div').removeAttr('style');
    $mo(".mo_contactus_popup_container").hide();
    $mo(".mo_contactus_popup_wrapper").hide();
    $mo("#mo-reply").remove();
    $mo("#mo_queryform").remove();
    $mo("#mo_email_form_link").hide();
    $mo("#mo-contact-form").hide();
}

//go back to main menu button on contact us form
function mo_otp_goback_main_menu() {
    $mo("#mo-reply").remove();
    $mo("#mo_queryform").remove();
    $mo("#mo_email_form_link").hide();
    $mo("#mo-chatbox").show();
}

//hide show popup
function selectedPopupShow(){
         $mo("#mo_show_saved_message").hide();
         $mo("#if_mo_show_message").show();
         var id = $mo(this).children(":selected").attr("id");
        if(id=="mo_template_option_default")
           {
              $mo("#mo_template_show_default").toggle();
              $mo("#mo_template_show_streaky").hide();
              $mo("#mo_template_show_catchy").hide();
           }

        else if(id=="mo_template_option_streaky")
            {
        	   $mo("#mo_template_show_streaky").toggle();
               $mo("#mo_template_show_default").hide();
               $mo("#mo_template_show_catchy").hide();
        	}

        else if(id=="mo_template_option_catchy")
        	{
        		$mo("#mo_template_show_catchy").toggle();
                $mo("#mo_template_show_default").hide();
                $mo("#mo_template_show_streaky").hide();
        	}
    }

// show plugin url
function extraSettings(host,url){
    document.getElementById('extraSettingsRedirectURL').value = host.concat(url);
    document.getElementById('showExtraSettings').submit();
}

// check if the user who is sending a support query is sending a valid query
function mo_registration_valid_query(f) {
    !(/^[a-zA-Z?,.\(\)\/@ 0-9]*$mo/).test(f.value) ? f.value = f.value.replace(
            /[^a-zA-Z?,.\(\)\/@ 0-9]/, '') : null;
}

function edit_button(elem){
    var str= elem.id;
    var str2 =  str.replace('btn-','');
    var id = "#sms-body-" + str2;


    $mo(id).toggle(500);
}

// calculate character count of text areas and show the limit etc on the dashboard
function calculateCharacterCount($this) {
    let $mo = jQuery;
	let maxlen = 160;
    let len = $mo($this).val().length;
    let field_id = $mo($this).attr('id');
    let elem = $mo('span[id^="remaining_' + field_id + '"]');
    elem.html(maxlen - len);
    if(len > maxlen) {
        elem.parent("span").addClass("limit");
    } else {
        elem.parent("span").removeClass("limit");
    }
}

//toggle support form
function toggleSupportForm($hide) {
    var t = $mo("#mo-contact-form").prev(".mo_customer_validation-modal-backdrop");
    if($hide==="toggle" || !t.is(":hidden")) {
        $mo("#mo-contact-form").slideToggle(400,function(){
            t.is(":hidden") ? t.show() : t.hide();
            //added this to show the hidden support text box when form is hidden
            if(t.is(":hidden")) $mo(".mo-otp-help-button-text").show();

        });
    }
}

// update form values (formID, label etc ) based on the changes that the user makes
function updateFormValues($field, $both) {
    let t = $mo($field).val();
    let id = $mo($field).attr('id');
    let name = $mo($field).attr('name');
    let id1 = "#" + (id.indexOf("_1_") >= 0 ? id.replace('_1_','_2_')
        : id.indexOf("_3_") >= 0 ? id.replace('_3_','_1_') : id.replace('_2_','_1_'));
    $mo(id1).val(t);
    if($both) {
        let id2 = "#" + (id.indexOf("_1_") >= 0 ? id.replace('_1_','_3_')
        : id.indexOf("_3_") >= 0 ? id.replace('_3_','_2_') : id.replace('_2_','_3_'));
        $mo(id2).val(t);
    }
}

// scroll to the form in question while hiding and showing other stuff
function scrollToForm(name) {
    $mo("#moblock").hide();
    $mo("#mo_forms .mo_otp_note #text").show();
    $mo("#mo_forms .mo_otp_note #loader").hide();
    $mo(".mo_otp_form").each(function(index){
        let $row = $mo(this);
        let input = $row.find("strong:first").text();
        if (input.toLowerCase() === name.toLowerCase()) {
            moScrollTo($row.parent());
            return false;
        }
    });
}

// scroll to function
function moScrollTo($to) {
    $mo('html, body').animate({
        scrollTop: $mo($to).offset().top - 100
    }, 900);
}

function hideDiv($this) {
    $this.removeClass("dashicons-arrow-down");
    $this.addClass("dashicons-arrow-up");
    $this.data("show","true");
}

function showDiv($this) {
    $this.removeClass("dashicons-arrow-up");
    $this.addClass("dashicons-arrow-down");
    $this.data("show","false");
}



//feedback forms stuff
function mo_otp_feedback_goback() {
    $mo("#mo_otp_feedback_modal").hide();
}

function show_feedback_form(e,showMessage, deactivatingPlugin) {
    $mo(".mo_deactivation_popup_container").show();
    showMessage ? $mo(".mo_feedback_note").show() : $mo(".mo_feedback_note").hide() ;
    $mo("#feedback_type").val(deactivatingPlugin);
    var t = $mo("input[name='miniorange_feedback_submit']:first");
    if(!deactivatingPlugin) {
        $mo("input[name='feedback_reason']").first().parent().hide();
        t.val(t.data("sm2"));
        $mo("#mo_skip_and_deactivate").remove();
    }else{
        t.val(t.data("sm"));
        e.preventDefault();
    }
}

function mo_otp_feedback_show_extra(e, t) {
    let m = $mo("#feedback_message");
    let l = $mo("#feedback_query");
    t.data("message") !== "" ? (m.empty(), m.append(t.data("message")), m.show()) : (m.hide());
    t.data("textbox") ? l.show() : l.hide();
}


function otpSupportOnClick(query){
    let querytextbox = document.getElementById('contactQuery');
    $mo("#mo_email_form_link").hide();
    if(querytextbox === null && typeof query !== 'undefined' && query.length > 0 && query !== '') {
        $mo("#mo_email_form_link").show();
        let queryhtml = '<div id="mo-reply" class="flex flex-col gap-mo-2">\
                            <textarea id="contactQuery" name="query" class="mo-textarea h-[100px]" style="resize: vertical;width:100%" cols="52" rows="7" onkeyup="mo_registration_valid_query(this)" onblur="mo_registration_valid_query(this)" onkeypress="mo_registration_valid_query(this)" placeholder="Write your query here..."></textarea>\
                            <input type="submit" name="send_query" id="send_query" value="Submit" class="mo-button inverted" />\
                            <a href="mailto:otpsupport@xecurify.com" class="mo-button secondary">\
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="-ml-mo-4">\
                                    <g id="2500ca1d51c4344f9af74fabf3c0a9a0">\
                                    <path id="31503c81468ad79fcb98b748e7e5efa0" fill-rule="evenodd" clip-rule="evenodd" d="M3.99132 6.93334C4.26951 6.30829 4.6229 5.80071 5.0541 5.38795C6.31992 4.17628 8.44047 3.60205 11.976 3.60205C15.5114 3.60205 17.632 4.17628 18.8978 5.38795C19.4016 5.87022 19.7992 6.48196 20.0948 7.25926C19.9264 7.3907 19.7143 7.55478 19.4676 7.74256C18.8124 8.24133 17.9165 8.9049 16.95 9.56716C15.9808 10.2313 14.9544 10.8846 14.036 11.3689C13.5767 11.6111 13.157 11.8043 12.7938 11.9354C12.4205 12.0701 12.1542 12.1217 11.987 12.1217C11.8223 12.1217 11.5662 12.0712 11.2114 11.9384C10.8655 11.809 10.4685 11.6177 10.0353 11.3769C9.16899 10.8951 8.21009 10.2444 7.30741 9.58136C6.40761 8.92048 5.57801 8.25809 4.97248 7.76007C4.67006 7.51135 4.42435 7.3043 4.25468 7.15981C4.16987 7.08758 4.1041 7.03103 4.05981 6.99277L4.00979 6.94943L3.99744 6.93868L3.99453 6.93613L3.9939 6.93559L3.99383 6.93552L3.99382 6.93552L3.99379 6.93549C3.99297 6.93477 3.99214 6.93406 3.99132 6.93334ZM3.50334 8.48906C3.30109 9.44768 3.20215 10.595 3.20215 11.9688C3.20215 15.3397 3.79796 17.3469 5.05412 18.5494C6.31996 19.7612 8.44053 20.3356 11.976 20.3356C15.5114 20.3356 17.632 19.7612 18.8978 18.5494C20.154 17.3469 20.7498 15.3397 20.7498 11.9688C20.7498 10.7543 20.6724 9.71687 20.5148 8.8303C20.4699 8.86467 20.4236 8.89995 20.3762 8.93609C19.7083 9.44451 18.7912 10.1239 17.7979 10.8045C16.8074 11.4833 15.7272 12.1729 14.7356 12.6958C14.2399 12.9572 13.7537 13.1837 13.303 13.3463C12.8624 13.5053 12.4068 13.6217 11.987 13.6217C11.5651 13.6217 11.1159 13.5043 10.6857 13.3433C10.2466 13.179 9.7789 12.9506 9.30636 12.6878C8.36136 12.1624 7.34518 11.4702 6.41947 10.7903C5.49086 10.1083 4.63875 9.42774 4.01966 8.91858C3.82261 8.75651 3.64883 8.61153 3.50334 8.48906ZM21.75 7.49863C22.1045 8.76599 22.2498 10.2556 22.2498 11.9688C22.2498 15.4351 21.6551 17.9863 19.9351 19.6329C18.2247 21.2702 15.5834 21.8356 11.976 21.8356C8.36853 21.8356 5.72719 21.2702 4.01684 19.6329C2.29681 17.9863 1.70215 15.4351 1.70215 11.9688C1.70215 8.50214 2.2968 5.95086 4.01687 4.30437C5.72724 2.66717 8.36859 2.10205 11.976 2.10205C15.5833 2.10205 18.2247 2.66717 19.935 4.30437C20.7104 5.04653 21.257 5.97252 21.6237 7.08332C21.7084 7.20986 21.7499 7.35463 21.75 7.49863Z" fill="black"></path>\
                                    </g>\
                                </svg>\
                                <span>Email us at otpsupport@xecurify.com<span>\
                            </a>\
                        </div>';
        $mo(".mo-scrollable-div").css({"height":"29rem"});
        $mo(queryhtml).insertAfter("#mo_email_form_link");
        document.getElementById('contactQuery').value = query;
        $mo("#mo-chatbox").hide();
    } else {
        $mo("#mo-chatbox").show();
    }
    $mo("#contact-us-toggle").prop('checked', true);
    $mo(".mo_contactus_popup_container").show();
    $mo("#mo-contact-form").show();
    $mo(".mo_contactus_popup_wrapper").show();
}

function otpPackDetailsOnClick(packId)
{
    $mo("div."+packId).closest("div.details-front").toggleClass("flip");
    if($mo("div."+packId).closest("div.details-front").hasClass("flip"))
    {  
        $mo("div."+packId).closest("div.details-front").addClass("hidden");
        $mo("div.details-back"+packId).addClass("flipped");
    }
    else
    {
        $mo("div."+packId).closest("div.details-front").removeClass("hidden");
        $mo("div.details-back"+packId).removeClass("flipped");
     }
}
function otpAddonDetailsOnClick(AddonId)
{
    $mo("div."+AddonId).closest("div.details-front").toggleClass("flip");
    if($mo("div."+AddonId).closest("div.details-front").hasClass("flip"))
    {  
        $mo("div."+AddonId).closest("div.details-front").addClass("hidden");
        $mo("div.details-back"+AddonId).addClass("flipped");
    }
    else
    {
        $mo("div."+AddonId).closest("div.details-front").removeClass("hidden");
        $mo("div.details-back"+AddonId).removeClass("flipped");
     }   
}

function generateWhatsAppQR() {
    let mo_whatsapp_clientID = $mo("#mo_whatsapp_clientID").val();
    let nonce = $mo("#_wpnonce").val();
    $mo.ajax({
        url: moadminsettings.ajaxUrl,
        type: "POST",
        data: {
            action: "miniorange_generate_QR",
            security:nonce,
        },
        crossDomain: true,
        dataType: "json",
        success: function(data) {
            if(data.result === "success") {
                 let url = script_data.whatsapphost
                  + '/api/getqrcode.php?client_id=' + encodeURIComponent(mo_whatsapp_clientID)
                  + '&instance=' + encodeURIComponent(data.message);
                let result = '<br><iframe class="mo_whatsapp_QR" scrolling="no" width="400" height="400" src="' + url + '"></iframe>';
                $mo(".mo_whatsapp_QR").remove();
                $mo(result).insertAfter("#mo_whatsapp_QR_generate");
            }
        },
        error: function(o, e, n) {
            console.error('AJAX Error:', e);
        }
    });
}
function timeNow(i) {
    let d = new Date(),
        h = (d.getHours() < 10 ? '0' : '') + d.getHours(),
        m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    i.value = h + ':' + m;
    return i.value;
}

function fetch_form_fields(formId, formValue) {
    let phonefield = formId.replace("_form_", "_form_phone_");
    let emailfield = formId.replace("_form_", "_form_email_");
    let verifyfield = formId.replace("_form_", "_form_verify_");
    let nonce = jQuery("#_wpnonce").attr("value");
    $mo.ajax({
        url: moadminsettings.ajaxUrl,
        type: "POST",
        data: {
            action: "mo_get_form_fields_ajax",
            security: nonce,
            form_key: formValue
        },
        crossDomain: true,
        dataType: "json",
        success: function (data) {
            let options = "";
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    options += '<option>' + data[key] + '</option>';
                }
            }
            $mo("#" + phonefield).empty().append(options);
            $mo("#" + emailfield).empty().append(options);
            $mo("#" + verifyfield).empty().append(options);
        },
        error: function (data) {
            console.error('AJAX Error:', data);
        },
    });
}

function moDisablePremiumFormElements() {
    document.addEventListener("DOMContentLoaded", function() {
        var selectors = [
            "mo_default_user_role",
            "select[name=\"mo_login_reg_page_id\"]",
            "input[name=\"mo_customer_validation_mo_login_sendotp_button_text\"]",
            "input[name=\"mo_customer_validation_mo_login_enterotp_field_text\"]",
            "input[name=\"mo_customer_validation_mo_login_verify_button_text\"]",
            "input[name=\"mo_customer_validation_mo_login_button_css\"]",
            "input[name=\"mo_customer_validation_mo_verify_button_css\"]"
        ];

        selectors.forEach(function(selector) {
            var el = document.querySelector(selector) || document.getElementById(selector);
            if (el) {
                el.disabled = true;
            }
        });

        var link = document.getElementById("click_here");
        if (link) {
            link.style.pointerEvents = "none";
            link.style.opacity = "0.5";
            link.style.cursor = "not-allowed";
        }

        setTimeout(function() {
            var whatsappLinks = document.querySelectorAll("#mo_whatsapp_not_enabled, .mo-whatsapp-links a");
            whatsappLinks.forEach(function(whatsappLink) {
                whatsappLink.style.pointerEvents = "none";
                whatsappLink.style.opacity = "0.5";
                whatsappLink.style.cursor = "not-allowed";
            });
        }, 100);
    });
}