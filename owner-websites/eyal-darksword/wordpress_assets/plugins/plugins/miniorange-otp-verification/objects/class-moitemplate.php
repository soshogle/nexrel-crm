<?php
/**Load Interface MoITemplate
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface MoITemplate {

	/**
	 * This function is used to build the template
	 *
	 * @param string $template the HTML Template.
	 * @param string $template_type the HTML Template.
	 * @param string $message the message to be show in the popup.
	 * @param string $otp_type the otp type invoked.
	 * @param string $from_both does user have the option to choose b/w email and sms verification.
	 * @return mixed|string
	 */
	public function build( $template, $template_type, $message, $otp_type, $from_both );

	/**
	 * This function is used to parse the template and replace the
	 * tags with the appropriate content. Some of the contents are
	 * not shown if the admin/user is just previewing the pop-up.
	 *
	 * @param string $template the HTML Template.
	 * @param string $message the message to be show in the popup.
	 * @param string $otp_type the otp type invoked.
	 * @param string $from_both does user have the option to choose b/w email and sms verification.
	 * @return mixed|string
	 */
	public function parse( $template, $message, $otp_type, $from_both );

	/**
	 * Get default value of templates
	 *
	 * @param string $templates template value.
	 * @return mixed
	 */
	public function get_defaults( $templates );

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function show_preview();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function save_popup();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public static function instance();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_template_key();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_template_editor_id();
}
