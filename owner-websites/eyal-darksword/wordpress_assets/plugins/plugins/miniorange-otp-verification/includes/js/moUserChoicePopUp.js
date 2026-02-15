function mo_validation_goback(){
    document.getElementById("validation_goBack_form").submit();
}

jQuery(document).ready(function() {
    $mo=jQuery;
    $mo("#mo_user_email_verification").click(function(e) {
        e.preventDefault();
        $mo("#otpChoice").val("user_email_verification");
        $mo("#mo_validate_form").submit();
    });
    $mo("#mo_user_phone_verification").click(function(e) {
        e.preventDefault();
        $mo("#otpChoice").val("user_phone_verification");
        $mo("#mo_validate_form").submit();
    });
    $mo(".close").click(function(e) {
        e.preventDefault();
        mo_validation_goback();
    });
});