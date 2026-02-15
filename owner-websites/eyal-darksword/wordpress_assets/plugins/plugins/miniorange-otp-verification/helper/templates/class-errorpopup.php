<?php
/**
 * Load administrator changes for ErrorPopup
 *
 * @package miniorange-otp-verification/helper/templates
 */

namespace OTP\Helper\Templates;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\MoITemplate;
use OTP\Objects\Template;
use OTP\Traits\Instance;
use OTP\Helper\MoUtility;

/**
 * This is the Error Popup class. This class handles all the
 * functionality related to Error popup functionality of the plugin. It extends the Template
 * and implements the MoITemplate class to implement some much needed functions.
 */
if ( ! class_exists( 'ErrorPopup' ) ) {
	/**
	 * ErrorPopup class
	 */
	class ErrorPopup extends Template implements MoITemplate {

		use Instance;

		/**
		 * Constructor to declare variables of the class on initialization
		 **/
		protected function __construct() {
			$this->key                = 'ERROR';
			$this->template_editor_id = 'customEmailMsgEditor4';
			$this->required_tags      = array_diff( $this->required_tags, array( '{{FORM_ID}}', '{{REQUIRED_FIELDS}}' ) );
			parent::__construct();
		}

		/**
		 * Function to fetch the HTML body of the error pop-up template.
		 *
		 * @return string
		 */
		private function get_error_pop_up_html() {
			$template_path = trailingslashit( MOV_DIR ) . 'includes/templates/errorpopup.html';

			// Use WordPress Filesystem API for better compatibility.
			global $wp_filesystem;
			if ( empty( $wp_filesystem ) ) {
				require_once ABSPATH . 'wp-admin/includes/file.php';
				WP_Filesystem();
			}

			// Use WordPress Filesystem API to read the file.
			if ( $wp_filesystem && $wp_filesystem->exists( $template_path ) ) {
				return $wp_filesystem->get_contents( $template_path );
			}

			// Return empty string if file cannot be read via Filesystem API.
			return '';
		}

		/**
		 * This function initializes the default HTML of the PopUp Template
		 * to be used by the plugin. This function is called only during
		 * plugin activation or when user resets the templates. In Both
		 * cases the plugin initializes the template to the default value
		 * that the plugin ships with.
		 *
		 * @param string $templates - the template string to be parsed.
		 *
		 * @note: The html content has been minified for public release
		 * @return array
		 */
		public function get_defaults( $templates ) {
			if ( ! is_array( $templates ) ) {
				$templates = array();
			}
			$pop_up_templates_request = $this->get_error_pop_up_html();

			if ( is_wp_error( $pop_up_templates_request ) ) {
				return $templates;
			}
			$templates[ $this->get_template_key() ] = $pop_up_templates_request;
			return $templates;
		}

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
		public function parse( $template, $message, $otp_type, $from_both ) {
			$from_both        = $from_both ? 'true' : 'false';
			$required_scripts = $this->getRequiredFormsSkeleton( $otp_type, $from_both );
			$this->getRequiredScripts();

			$template = str_replace( '{{JQUERY}}', esc_url( $this->jquery_url ), $template );
			$template = str_replace( '{{GO_BACK_ACTION_CALL}}', 'mo_validation_goback();', $template );
			$template = str_replace( '{{MO_CSS_URL}}', esc_url( MOV_CSS_URL ), $template );
			$template = str_replace( '{{REQUIRED_FORMS_SCRIPTS}}', $required_scripts, $template );
			$template = str_replace( '{{HEADER}}', __( 'Validate OTP (One Time Passcode)', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{GO_BACK}}', 'X', $template );
			$template = str_replace( '{{MESSAGE}}', esc_html( $message ), $template );
			$template = str_replace( '{{SCRIPT}}', '', $template );
			return wp_kses( $template, MoUtility::mo_allow_popup_tags() );
		}

		/**
		 * This function is used to replace the {{REQUIRED_FORMS_SCRIPTS}} in the template
		 * with the appropriate scripts and forms. These forms and scripts are required
		 * for the popup to work.
		 *
		 * @param string $otp_type the otp type invoked.
		 * @param string $from_both does user have the option to choose b/w email and sms verification.
		 * @return mixed|string
		 */
		private function getRequiredFormsSkeleton( $otp_type, $from_both ) {
			$required_fields = '<form name="f" method="post" action="" id="validation_goBack_form">
									<input id="validation_goBack" name="option" value="validation_goBack" type="hidden"/>
									<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . wp_create_nonce( $this->nonce ) . '"/>
								</form>';
			return $required_fields;
		}

		/**
		 * This function is used to replace the {{SCRIPTS}} in the template
		 * with the appropriate scripts. These scripts are required
		 * for the popup to work. Scripts are not added if the form is in
		 * preview mode.
		 *
		 * @return void
		 */
		private function getRequiredScripts() {
			/*
			 * Load a small, dedicated script for the Error popup.
			 * This script only defines the global `mo_validation_goback()`
			 * function used by the template, without touching the default
			 * OTP popup behaviour.
			 */
			$script_handle = 'mo-error-popup';

			if ( ! wp_script_is( $script_handle, 'registered' ) ) {
				wp_register_script(
					$script_handle,
					MOV_URL . 'includes/js/mo-error-popup.js',
					array(),
					MOV_VERSION,
					false
				);
			}

			wp_print_scripts( $script_handle );
		}
	}
}
