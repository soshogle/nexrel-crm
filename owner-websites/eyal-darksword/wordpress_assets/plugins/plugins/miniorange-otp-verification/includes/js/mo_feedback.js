
$mo = jQuery;

function show_feedback_form(event, showNote, isDeactivation) {
    $mo(".mo_deactivation_popup_container").show();
    
    if (showNote) {
        $mo(".mo_feedback_note").show();
    } else {
        $mo(".mo_feedback_note").hide();
    }
    
    $mo("#feedback_type").val(isDeactivation);
    
    var submitButton = $mo("input[name='miniorange_feedback_submit']:first");
    
    if (isDeactivation) {
        submitButton.val(submitButton.data("sm"));
        event.preventDefault();
    } else {
        $mo("input[name='feedback_reason']").first().parent().hide();
        submitButton.val(submitButton.data("sm2"));
        $mo("#mo_skip_and_deactivate").remove();
    }
}

function mo_otp_feedback_goback() {
    $mo("#mo_otp_feedback_modal").hide();
}

function mo_otp_feedback_show_extra(event, element) {
    var messageDiv = $mo("#feedback_message");
    var textarea = $mo("#query_feedback");
    
    if (element.data("message") !== "") {
        messageDiv.empty();
        messageDiv.append(element.data("message"));
        messageDiv.show();
    } else {
        messageDiv.hide();
    }
    
    if (element.data("textbox")) {
        textarea.show();
    } else {
        textarea.hide();
    }
}

$mo(document).ready(function() {
    
    $mo('a[aria-label="Deactivate miniOrange OTP Login, Verification and SMS Notifications"]').click(function (event) {
        show_feedback_form(event, true, true);
    });
    
    $mo(".mo_customer_validation-modal-backdrop").click(function (event) {
        mo_otp_feedback_goback();
    });
    
    $mo(".feedback-modal").keypress(function (event) {
        if (event.keyCode === 27) {
            mo_otp_feedback_goback();
        }
    });
   
    $mo("input[name='reason[]']").change(function() {
        var selectedReason = $mo(this).val();
        var reasonElement = $mo(this);
        
        if ($mo(this).is(':checked')) {
            $mo("#query_feedback").show();
        }
    });
    
    $mo("#mo_otp_feedback_form").submit(function(event) {
    });
});

window.show_feedback_form = show_feedback_form;
window.mo_otp_feedback_goback = mo_otp_feedback_goback;
window.mo_otp_feedback_show_extra = mo_otp_feedback_show_extra;
