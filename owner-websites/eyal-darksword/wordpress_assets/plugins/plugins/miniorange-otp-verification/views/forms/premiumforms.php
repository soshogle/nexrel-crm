<?php
/**
 * Load admin view for Premium forms.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoMessages;
use OTP\Objects\BaseMessages;
use OTP\Helper\MoConstants;
use OTP\Helper\FormSessionVars;
use OTP\Helper\MoUtility;

$allowed_html = array(
	'a' => array(
		'style'   => array(),
		'onclick' => array(),
	),
	'u' => array(),
);

echo '<div class="mo_otp_form" id="premium_forms">
		<strong>' . wp_kses(
	$form_name,
	array(
		'b'    => array(),
		'span' => array(
			'style' => array(),
		),
	)
) . '
		</strong>
		<b><span style="color:red"> [ ' . esc_html( $plan_name ) . ']</span></b><br>';
if ( FormSessionVars::MO_LOGIN_REG_USING_PHONE_FORM === $form_name ) {
	echo '<div class="mo_otp_note mt-mo-6">
	' . esc_html( $form_name ) . ' ' . wp_kses(
		str_replace(
			array( '{{license_url}}', '{{plan_name}}', '{{support_email}}' ),
			array( esc_url( $license_url ), esc_html( $plan_name ), MoConstants::FEEDBACK_EMAIL ),
			MoMessages::showMessage( BaseMessages::PREMIUM_FORM_MESSAGE )
		),
		MoUtility::mo_allow_html_array()
	) . '</div>';
				$disabled                          = 'disabled';
				$mo_login_registration           ??= '';
				$redirect_page_id                ??= '';
				$button_text                     ??= '';
				$enter_otp_text                  ??= '';
				$verify_button_text              ??= '';
				$login_button_css                ??= '';
				$verify_button_css               ??= '';
				$login_reg_send_note             ??= '';
				$login_reg_send_note_hidden      ??= '';
				$login_reg_new_account_sms_notif ??= '';
				$mo_default_user_role            ??= 'subscriber';

				$premium_form_path = plugin_dir_path( __FILE__ ) . 'mologinregisterwithphone.php';
	if ( MoUtility::mo_require_file( $premium_form_path, MOV_DIR ) ) {
		require $premium_form_path;
	}
	wp_enqueue_script(
		'mo_customer_validation_premium_forms',
		MOV_URL . 'includes/js/mo-premium-forms.js',
		array( 'jquery', 'mo_customer_validation_admin_settings_script' ),
		MOV_VERSION,
		true
	);
} else {
	echo '
				<div class="mo_otp_note mt-mo-6">
								' . esc_html__( 'The OTP verification on ', 'miniorange-otp-verification' ) . '<b>' . esc_html( $form_name ) . '</b>' . esc_html__( ' plugin has been separately integrated in our premium plugins to provide users with Phone verification or Email Verification. ', 'miniorange-otp-verification' ) . '<br>' . esc_html__( 'To get access to this', 'miniorange-otp-verification' ) . '<b>' . esc_html__( ' Premium Feature ', 'miniorange-otp-verification' ) . '</b>' . esc_html__( ' please upgrade to the ', 'miniorange-otp-verification' ) . '<b><a class="mo_links" href="' . esc_url( $license_url ) . '" target="_blank" rel="noopener noreferrer">' . esc_attr( $plan_name ) . '</a></b><br/><br/>' . esc_html__( 'If you have any questions or concerns kindly contact us at ', 'miniorange-otp-verification' ) . wp_kses(
		'		<a style="cursor:pointer;" onClick="otpSupportOnClick();"><u> otpsupport@xecurify.com</u></a></div>',
		$allowed_html
	) . '</div>';
}
				echo '	</div>';
