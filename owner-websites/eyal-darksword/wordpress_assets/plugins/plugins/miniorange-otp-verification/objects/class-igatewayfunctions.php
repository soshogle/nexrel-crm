<?php
/**Load Interface IGatewayFunctions
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface IGatewayFunctions {

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function register_addons();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function show_addon_list();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function flush_cache();

	/**
	 * MoInternal Function
	 *
	 * @param mixed $post post values.
	 * @return mixed
	 */
	public function vlk( $post );

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function hourly_sync();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function mclv();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function is_gateway_config();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function is_mg();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_application_name();

	/**
	 * MoInternal Function
	 *
	 * @param mixed $original_email_from email values.
	 * @return mixed
	 */
	public function custom_wp_mail_from_name( $original_email_from );

	/**
	 * MoInternal Function
	 *
	 * @param mixed $posted post values.
	 * @return mixed
	 */
	public function mo_configure_sms_template( $posted );

	/**
	 * MoInternal Function
	 *
	 * @param mixed $posted post values.
	 * @return mixed
	 */
	public function mo_configure_gateway( $posted );

	/**
	 * MoInternal Function
	 *
	 * @param mixed $posted post values.
	 * @return mixed
	 */
	public function mo_configure_email_template( $posted );

	/**
	 * MoInternal Function
	 *
	 * @param mixed $disabled check if configuration is to be shown.
	 * @return mixed
	 */
	public function show_configuration_page( $disabled );

	/**
	 * MoInternal Function
	 *
	 * @param mixed $disabled check if configuration is to be shown.
	 * @return mixed
	 */
	public function template_configuration_page( $disabled );

	/**
	 * Calls the Gateway specific mo_send_otp_token function
	 *
	 * @param string $auth_type  OTP Type - EMAIL or SMS.
	 * @param string $email     Email Address of the user.
	 * @param string $phone     Phone Number of the user.
	 * @param array  $data     Data submitted by the user.
	 * @return array
	 */
	public function mo_send_otp_token( $auth_type, $email, $phone, $data );

	/**
	 * Calls the Gateway specific mo_send_notif
	 *
	 * @param NotificationSettings $settings object.
	 * @return string
	 */
	public function mo_send_notif( NotificationSettings $settings );

	/**
	 * Calls the Gateway specific mo_validate_otp_token
	 *
	 * @param string $tx_id Transaction ID from session.
	 * @param string $otp_token OTP Token to validate.
	 * @param string $otp_type Type of OTP Verification.
	 * @return array
	 */
	public function mo_validate_otp_token( $tx_id, $otp_token, $otp_type );

	/**
	 * Config Page
	 *
	 * @return mixed
	 */
	public function get_config_page_pointers();
}
