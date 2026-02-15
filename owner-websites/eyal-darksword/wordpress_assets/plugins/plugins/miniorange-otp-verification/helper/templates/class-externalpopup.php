<?php
/**
 * Load administrator changes for ExternalPopup
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
use OTP\Helper\MoPHPSessions;

/**
 * This is the External Popup class. This class handles all the
 * functionality related to External popup functionality of the plugin. It extends the Template
 * and implements the MoITemplate class to implement some much needed functions.
 */
if ( ! class_exists( 'ExternalPopup' ) ) {
	/**
	 * ExternalPopup class
	 */
	class ExternalPopup extends Template implements MoITemplate {

		use Instance;

		/**
		 * Constructor to declare variables of the class on initialization
		 **/
		protected function __construct() {
			$this->key                = 'EXTERNAL';
			$this->template_editor_id = 'customEmailMsgEditor3';
			$this->required_tags      = array_merge(
				$this->required_tags,
				array(
					'{{PHONE_FIELD_NAME}}',
					'{{SEND_OTP_BTN_ID}}',
					'{{VERIFICATION_FIELD_NAME}}',
					'{{VALIDATE_BTN_ID}}',
					'{{SEND_OTP_BTN_ID}}',
					'{{VERIFY_CODE_BOX}}',
				)
			);
			parent::__construct();
		}

		/**
		 * Function to fetch the HTML body of the external pop-up template.
		 *
		 * @return string The HTML template for external popup.
		 */
		private function get_external_pop_up_html() {
			$template_path = trailingslashit( MOV_DIR ) . 'includes/templates/externalpopup.html';

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
		 * @param array $templates The template string to be parsed.
		 *
		 * @note: The html content has been minified Check helper/templates/templates.html
		 * @return array The updated templates array with default popup HTML added.
		 */
		public function get_defaults( $templates ) {
			if ( ! is_array( $templates ) ) {
				$templates = array();
			}

			$pop_up_templates_request = $this->get_external_pop_up_html();

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
		 * @param string $template  The HTML Template.
		 * @param string $message   The message to be shown in the popup.
		 * @param string $otp_type  The OTP type invoked.
		 * @param string $from_both Whether user has the option to choose between email and SMS verification.
		 * @return string The parsed template with all placeholders replaced.
		 */
		public function parse( $template, $message, $otp_type, $from_both ) {
			$this->getRequiredScripts();
			$extra_post_data    = $this->preview ? '' : extra_post_data();
			$required_scripts   = $this->preview ? '' : $this->getExtraFormFields();
			$extra_form_fields  = '<input type="hidden" name="mo_external_popup_option" value="mo_ajax_form_validate" />';
			$extra_form_fields .= '<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . esc_attr( wp_create_nonce( $this->nonce ) ) . '"/>';

			$template = str_replace( '{{JQUERY}}', esc_url( $this->jquery_url ), $template );
			$template = str_replace( '{{FORM_ID}}', 'mo_validate_form', $template );
			$template = str_replace( '{{GO_BACK_ACTION_CALL}}', 'mo_validation_goback();', $template );
			$template = str_replace( '{{MO_CSS_URL}}', esc_url( MOV_CSS_URL ), $template );
			$template = str_replace( '{{OTP_MESSAGE_BOX}}', 'mo_message', $template );
			$template = str_replace( '{{HEADER}}', __( 'Validate OTP (One Time Passcode)', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{GO_BACK}}', 'X', $template );
			$template = str_replace( '{{MESSAGE}}', esc_html( $message ), $template );
			$template = str_replace( '{{REQUIRED_FIELDS}}', $extra_form_fields, $template );
			$template = str_replace( '{{PHONE_FIELD_NAME}}', 'mo_phone_number', $template );
			$template = str_replace( '{{OTP_FIELD_TITLE}}', __( 'Enter Code', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{VERIFY_CODE_BOX}}', 'mo_validate_otp', $template );
			$template = str_replace( '{{VERIFICATION_FIELD_NAME}}', 'mo_otp_token', $template );
			$template = str_replace( '{{VALIDATE_BTN_ID}}', 'validate_otp', $template );
			$template = str_replace( '{{VALIDATE_BUTTON_TEXT}}', __( 'Validate', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{SEND_OTP_TEXT}}', __( 'Send OTP', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{SEND_OTP_BTN_ID}}', 'send_otp', $template );
			$template = str_replace( '{{EXTRA_POST_DATA}}', $extra_post_data, $template );
			$template = str_replace( '{{SCRIPT}}', '', $template );
			$template = str_replace( '{{REQUIRED_FORMS_SCRIPTS}}', $required_scripts, $template );

			return wp_kses( $template, MoUtility::mo_allow_popup_tags() );
		}

		/**
		 * Returns necessary form elements for the template.
		 * Includes mostly hidden forms/fields.
		 *
		 * @return string Form fields HTML.
		 */
		private function getExtraFormFields() {
			$ffields = '<form name="f" method="post" action="" id="validation_goBack_form">
							<input id="validation_goBack" name="option" value="validation_goBack" type="hidden"/>
							<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . wp_create_nonce( $this->nonce ) . '"/>
						</form>';
			return $ffields;
		}

		/**
		 * Returns required scripts for the template.
		 *
		 * @return void Scripts needed for external popup functionality.
		 */
		private function getRequiredScripts() {
			if ( ! $this->preview ) {
				do_action( 'mo_include_js' );
				wp_register_script( 'moExternalPopUps', MOV_URL . 'includes/js/moExternalPopUp.js', array( 'jquery' ), MOV_VERSION, false );
				$current_url = MoPHPSessions::get_session_var( 'current_url' );
				if ( empty( $current_url ) ) {
					$current_url = MoUtility::current_page_url();
				}

				if ( empty( $current_url ) ) {
					$current_url = function_exists( 'wp_login_url' ) ? wp_login_url() : home_url();
				}

				wp_localize_script(
					'moExternalPopUps',
					'moExternalPopUps',
					array(
						'secure_site_url' => esc_url( admin_url( 'admin-ajax.php' ) ),
						'resend_otp_text' => esc_js( __( 'Resend OTP', 'miniorange-otp-verification' ) ),
						'home_url'        => esc_url( home_url() ),
						'login_page_url'  => esc_url( $current_url ),
					)
				);
				wp_print_scripts( 'moExternalPopUps' );
			} else {
				// Register and enqueue preview script for preview mode.
				$script_handle = 'mo-popup-preview';
				if ( ! wp_script_is( $script_handle, 'registered' ) ) {
					wp_register_script(
						$script_handle,
						MOV_URL . 'includes/js/mo-popup-preview.js',
						array( 'jquery' ),
						MOV_VERSION,
						false
					);
				}

				// Localize script with preview mode flag.
				wp_localize_script(
					$script_handle,
					'moExternalPreview',
					array(
						'isPreview' => true,
					)
				);

				// Print script immediately since this is called during HTML output.
				wp_print_scripts( $script_handle );
			}
		}
	}
}
