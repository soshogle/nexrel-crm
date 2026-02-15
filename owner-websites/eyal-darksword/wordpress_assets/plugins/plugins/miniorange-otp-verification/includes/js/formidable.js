jQuery(document).ready(function () {
    let $mo = (typeof window.$mo !== 'undefined') ? window.$mo : jQuery;
    
    let formDetails = moformidable.forms;

    // Return if the enabled form is not found
    if ($mo(".frm_forms input[name='form_id']").length <= 0) {
        return;
    }
    
    $mo("div.frm_forms").each(function () {
        let form = $mo(this);
        let formID = form.find("form input[name='form_id']").val();
        
        if (formID in formDetails) {
            let fieldID = formDetails[formID][moformidable.formkey];
            let messageBox = '<div  class="frm_top_container frm_full" '+
                                    'id="mo_message'+fieldID+'" '+
                                    'style="width:100%; display: none; font-size: 16px; padding: 10px 20px;border-radius: 10px; margin-top: 16px;'+
                                    'text-align: center;margin-top:3px;">'+
                             '</div>';
            let button = '<div class="frm_submit" >'+
                            '<input type= "button" '+
                                    'id="miniorange_otp_token_submit_'+fieldID+'" '+
                                    'class="button"  '+
                                    'value= "'+moformidable.buttontext+'">'+
                            messageBox+
                          '</div>';
            $mo(button).insertAfter('#'+fieldID);
                
            $mo('#miniorange_otp_token_submit_'+fieldID).click(function () {
                let img = '<div class= "moloader"></div>';
                const rawUserInput = $mo('#' + fieldID + ' input').val();

                $mo('#mo_message' + fieldID).empty();
                $mo('#mo_message' + fieldID).append(img);
                $mo('#mo_message' + fieldID).show();
                
                $mo.ajax({
                    url: moformidable.siteURL,
                    type: "POST",
                    data: {
                        user_email: rawUserInput,
                        user_phone: rawUserInput,
                        action: moformidable.generateURL,
                        security: moformidable.nonce,
                    },
                    crossDomain: !0,
                    dataType: "json",
                    success: function (response) {
                        if (response.result === "success") {
                            $mo('#mo_message' + fieldID).empty();
                            $mo('#mo_message' + fieldID).append(response.message);
                            $mo('#mo_message' + fieldID).css({ "background-color": "#dbfff7", "color": "#008f6e" });
                        } else {
                            $mo('#mo_message' + fieldID).empty();
                            $mo('#mo_message' + fieldID).append(response.message);
                            $mo('#mo_message' + fieldID).css({ "background-color": "#ffefef", "color": "#ff5b5b" });
                        }
                    },
                    error: function (xhr, status, error) {
                        // Handle error appropriately
                        console.error('AJAX Error:', error);
                    }
                });
            });
        }
    });
});