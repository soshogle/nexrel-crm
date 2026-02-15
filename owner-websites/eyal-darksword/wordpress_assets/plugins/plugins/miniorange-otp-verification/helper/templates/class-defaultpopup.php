<?php
/**
 * Load administrator changes for DefaultPopup
 *
 * @package miniorange-otp-verification/helper/templates
 */

namespace OTP\Helper\Templates;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoConstants;
use OTP\Objects\MoITemplate;
use OTP\Objects\Template;
use OTP\Traits\Instance;
use OTP\Helper\MoUtility;

/**
 * This is the Default Popup class. This class handles all the
 * functionality related to Default popup functionality of the plugin. It extends the Template
 * and implements the MoITemplate class to implement some much needed functions.
 */
if ( ! class_exists( 'DefaultPopup' ) ) {
	/**
	 * DefaultPopup class
	 */
	class DefaultPopup extends Template implements MoITemplate {

		use Instance;

		/**
		 * Default length of OTP.
		 *
		 * @var int
		 */
		private $mo_otp_length;

		/**
		 * Constructor to declare variables of the class on initialization
		 **/
		protected function __construct() {
			$this->key                = 'DEFAULT';
			$this->template_editor_id = 'customEmailMsgEditor';
			$this->mo_otp_length      = get_mo_option( 'otp_length' ) ? get_mo_option( 'otp_length' ) : 5;
			parent::__construct();
		}

		/**
		 * Function to fetch the HTML body of the default pop-up template.
		 *
		 * @return string
		 */
		private function get_default_pop_up_html() {
			$template_path = trailingslashit( MOV_DIR ) . 'includes/templates/defaultpopup.html';

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
			$pop_up_templates_request = $this->get_default_pop_up_html();

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
			$from_both              = $from_both ? 'true' : 'false';
			$required_scripts       = $this->getRequiredFormsSkeleton( $otp_type, $from_both );
			$extra_post_data        = $this->preview ? '' : extra_post_data();
			$extra_form_fields      = $this->getExtraFormFields( $otp_type, $from_both );
			$extra_form_fields     .= '<input type="hidden" name="option" value="miniorange-validate-otp-form" />';
			$extra_form_fields     .= '<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . wp_create_nonce( $this->nonce ) . '"/>';
			$append_input_field     = $this->giveInputField();
			$append_input_field_css = $this->giveInputFieldCSS();
			$selected_popup         = get_mo_option( 'selected_popup' );
			$button_html            = $this->addButtonFieldOtp();
			$this->getRequiredScripts();

			$template = str_replace( '{{JQUERY}}', esc_url( $this->jquery_url ), $template );
			$template = str_replace( '{{FORM_ID}}', 'mo_validate_form', $template );
			$template = str_replace( '{{GO_BACK_ACTION_CALL}}', 'mo_validation_goback();', $template );
			$template = str_replace( '{{OTP_MESSAGE_BOX}}', 'mo_message', $template );
			$template = str_replace( '{{MO_CSS_URL}}', esc_url( MOV_CSS_URL ), $template );
			$template = str_replace( '{{REQUIRED_FORMS_SCRIPTS}}', $required_scripts, $template );
			$template = str_replace( '{{HEADER}}', __( 'Validate OTP (One Time Passcode)', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{GO_BACK}}', 'X', $template );
			$template = str_replace( '{{MESSAGE}}', esc_html( $message ), $template );
			$template = str_replace( '{{OTP_STYLE}}', $append_input_field, $template );
			$template = str_replace( '{{OTP_FIELD_CSS}}', $append_input_field_css, $template );
			$template = str_replace( '{{OTP_FIELD_NAME}}', 'mo_otp_token', $template );
			$template = str_replace( '{{OTP_FIELD_TITLE}}', __( 'Enter Code', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{OTP_FIELD_HIDDEN}}', 'Catchy' === $selected_popup ? 'hidden' : '', $template );
			$template = str_replace( '{{OTP_FIELD_ID}}', 'Catchy' === $selected_popup ? 'hidden_input_field' : '', $template );
			$template = str_replace( '{{OTP_FIELD_CLASS}}', 'Streaky' === $selected_popup ? 'otp-streaky-input' : 'mo_customer_validation-textbox mo-new-ui-validation-textbox', $template );
			$template = str_replace( '{{VALIDATE_BUTTON_OTP}}', $button_html, $template );
			$template = str_replace( '{{BUTTON_TYPE}}', 'Catchy' === $selected_popup ? 'button' : 'submit', $template );
			$template = str_replace( '{{BUTTON_ID}}', 'Catchy' === $selected_popup ? 'mo_sec_otp_submit_button' : 'miniorange_otp_token_submit', $template );
			$template = str_replace( '{{BUTTON_NAME}}', 'Catchy' === $selected_popup ? '' : 'miniorange_otp_token_submit', $template );
			$template = str_replace( '{{BUTTON_TEXT}}', __( 'Validate OTP', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{REQUIRED_FIELDS}}', $extra_form_fields, $template );
			$template = str_replace( '{{LOADER_IMG}}', $this->img, $template );
			$template = str_replace( '{{EXTRA_POST_DATA}}', $extra_post_data, $template );
			$template = str_replace( '{{RESEND_OTP}}', __( 'Resend OTP', 'miniorange-otp-verification' ), $template );
			$template = str_replace( '{{SCRIPT}}', '', $template );
			$template = apply_filters( 'mo_add_script', $template );
			return wp_kses( $template, MoUtility::mo_allow_popup_tags() );
		}

		/**
		 * This function is used to add button in the popup according the selected popup template.
		 *
		 * @return mixed|string
		 */
		public function addButtonFieldOtp() {
			$selected_popup = get_mo_option( 'selected_popup' );
			if ( 'Catchy' === $selected_popup ) {
				$button = ' <input type="button" id="mo_sec_otp_submit_button" class="miniorange_otp_token_submit mo-new-ui-submit" value="{{BUTTON_TEXT}}" />';
			} else {
				$button = ' <input type="submit" name="miniorange_otp_token_submit" id="miniorange_otp_token_submit" class="miniorange_otp_token_submit mo-new-ui-submit" value="{{BUTTON_TEXT}}" />';
			}
			return $button;
		}

		/**
		 * This function is used to add OTP input field in the popup according the selected popup template.
		 *
		 * @return mixed|string
		 */
		public function giveInputField() {
			$selected_popup = get_mo_option( 'selected_popup' );
			$generate_input = $this->manyInputField( true );
			if ( 'Default' === $selected_popup ) {
				$input = '<input type="text" autocomplete="one-time-code" name="{{OTP_FIELD_NAME}}" autofocus placeholder="" autofocus required class="mo_customer_validation-textbox mo-new-ui-validation-textbox" title="{{OTP_FIELD_TITLE}}" /><br />';
			} elseif ( 'Streaky' === $selected_popup ) {
				$input = '<style>.otp-streaky-input{display:block;margin:.08em auto;border:none;padding:0;font:4ch droid sans mono,consolas,monospace;letter-spacing:.5ch; width: ' . esc_attr( $this->mo_otp_length * 1.5 ) . 'ch ;   background: repeating-linear-gradient(90deg, dimgrey 0 , dimgrey 1.2ch, transparent 0, transparent 1.5ch) 0 100%/ ' . esc_attr( $this->mo_otp_length * 1.5 ) . 'ch 2px no-repeat;}input:focus{outline:0;color:#696969} </style>';
				$input = $input . "<input class='otp-streaky-input' autocomplete='one-time-code' maxlength=" . esc_attr( $this->mo_otp_length ) . "  type='text' name='{{OTP_FIELD_NAME}}'    title='{{OTP_FIELD_TITLE}}' value=''/><br />";
			} elseif ( 'Catchy' === $selected_popup ) {
				$input = '<style>.otp-catchy{display:flex;float:none;width:30px;height:30px;margin:2px;text-align:center} .otp-catchy-box{display:flex}</style>
							<div style= "width:100%; margin: 0 auto;">
								<div  class="otp-catchy-box" style= "align-items: center; justify-content: center;">
									<div class="digit-group otp-catchy-box" data-group-name="digits" data-autosubmit="false" autocomplete="off">
									' . $generate_input . '
									</div>
								</div>
							</div>
                    	<br>';
			}
			return $input;
		}

		/**
		 * This function is used to add OTP input field in the popup according the selected popup template.
		 *
		 * @return mixed|string
		 */
		public function giveInputFieldCSS() {
			$selected_popup = get_mo_option( 'selected_popup' );
			$generate_input = $this->manyInputField( false );
			if ( 'Streaky' === $selected_popup ) {
				$input = '<style>.otp-streaky-input{display:block;margin:.08em auto;border:none;padding:0;font:4ch droid sans mono,consolas,monospace;letter-spacing:.5ch; width: ' . esc_attr( $this->mo_otp_length * 1.5 ) . 'ch ;   background: repeating-linear-gradient(90deg, dimgrey 0 , dimgrey 1.2ch, transparent 0, transparent 1.5ch) 0 100%/ ' . esc_attr( $this->mo_otp_length * 1.5 ) . 'ch 2px no-repeat;}input:focus{outline:0;color:#696969} </style>';
			} elseif ( 'Catchy' === $selected_popup ) {
				$input = '<style>.otp-catchy{display:flex;float:none;width:30px;height:30px;margin:2px;text-align:center} .otp-catchy-box{display:flex}</style>
							<div style= "width:100%; margin: 0 auto;">
								<div  class="otp-catchy-box" style= "align-items: center; justify-content: center;">
									<div class="digit-group otp-catchy-box" data-group-name="digits" data-autosubmit="false" autocomplete="off">
									' . $generate_input . '
									</div>
								</div>
							</div>
                    	<br>';
			} else {
				$input = '';
			}
			return $input;
		}

		/**
		 * This function is used to generate input field in catchy popup template.
		 *
		 * @param bool $add_field - do we have to add field in the template.
		 * @return mixed|string
		 */
		public function manyInputField( $add_field ) {
			$input      = '<input type="text" id="digit-1" class="otp-catchy"  data-next="digit-2" />';
			$prev_field = $this->mo_otp_length - 1;
			for ( $i = 2;$i <= $this->mo_otp_length - 1;$i++ ) {
				$next  = $i + 1;
				$prev  = $i - 1;
				$input = $input . '<input type="text" id="digit-' . esc_attr( $i ) . '" class="otp-catchy"  data-next="digit-' . esc_attr( $next ) . '"  data-previous="digit-' . esc_attr( $prev ) . '" />';

			}
			$input = $input . '<input type="text" id="digit-' . esc_attr( $this->mo_otp_length ) . '" class="otp-catchy"  data-previous="digit-' . esc_attr( $prev_field ) . '" />';
			if ( $add_field ) {
				$input = $input . '<input type="text" autocomplete="one-time-code" hidden id="hidden_input_field" name="{{OTP_FIELD_NAME}}" autofocus placeholder="" autofocus required class="mo_customer_validation-textbox mo-new-ui-validation-textbox" title="{{OTP_FIELD_TITLE}}" /><br />';
			}
			return $input;
		}

		/**
		 * This function is used to replace the {{REQUIRED_FORMS_SCRIPTS}} in the template
		 * with the appropriate scripts and forms. These forms and scripts are required
		 * for the popup to work.
		 *
		 * @param string $otp_type - the otp type invoked.
		 * @param string $from_both - does user have the option to choose b/w email and sms verification.
		 * @return mixed|string
		 */
		private function getRequiredFormsSkeleton( $otp_type, $from_both ) {
			$required_fields = '<form name="f" method="post" action="" id="validation_goBack_form">
									<input id="validation_goBack" name="option" value="validation_goBack" type="hidden"/>
									<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . wp_create_nonce( $this->nonce ) . '"/>
								</form>
								<form name="f" method="post" action="" id="verification_resend_otp_form">
									<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . wp_create_nonce( $this->nonce ) . '"/>
									<input id="verification_resend_otp" name="option" value="verification_resend_otp" type="hidden"/>
									<input name="otp_type" value="' . esc_attr( $otp_type ) . '" type="hidden"/>
									<input type="hidden" id="from_both" name="from_both" value="' . esc_attr( $from_both ) . '"/> {{EXTRA_POST_DATA}}
								</form>
								<form name="f" method="post" action="" id="goBack_choice_otp_form">
									<input id="verification_resend_otp" name="option" value="verification_resend_otp_both" type="hidden"/>
									<input type="hidden" id="mopopup_wpnonce" name="mopopup_wpnonce" value="' . wp_create_nonce( $this->nonce ) . '"/>
									<input type="hidden" id="from_both" name="from_both" value="' . esc_attr( $from_both ) . '"/>{{EXTRA_POST_DATA}}</form>';
			return wp_kses( $required_fields, MoUtility::mo_allow_html_array() );
		}

		/**
		 * This function is used to add the scripts to the template
		 * with the appropriate scripts. These scripts are required
		 * for the popup to work. Scripts are not added if the form is in
		 * preview mode.
		 */
		private function getRequiredScripts() {
			do_action( 'mo_include_js' );
			wp_register_script( 'moPopUps', MOV_URL . 'includes/js/moDefaultPopUp.js', array( 'jquery' ), MOV_VERSION, false );
			wp_localize_script(
				'moPopUps',
				'moPopUps',
				array()
			);
			wp_print_scripts( 'moPopUps' );
		}
		/**
		 * This function is used to load the required script for the catchy template.
		 *
		 * @return void
		 */
		public function getCatchyRequiredScripts() {
			$script_handle = 'mo-catchy-popup';
			if ( ! wp_script_is( $script_handle, 'registered' ) ) {
				wp_register_script(
					$script_handle,
					MOV_URL . 'includes/js/mo-catchy-popup.js',
					array(),
					MOV_VERSION,
					false
				);
			}

			// Localize script with OTP length.
			wp_localize_script(
				$script_handle,
				'moCatchyPopup',
				array(
					'otpLength' => (string) $this->mo_otp_length,
				)
			);

			// Print script immediately since this is called during HTML output.
			wp_print_scripts( $script_handle );
		}
		/**
		 * This function is used to add the required input fields to the main otp form.
		 *
		 * @param string $otp_type - the otp type invoked.
		 * @param string $from_both - does user have the option to choose b/w email and sms verification.
		 * @return string
		 */
		private function getExtraFormFields( $otp_type, $from_both ) {
			return ' <input type="hidden" name="otp_type" value="' . esc_attr( $otp_type ) . '">
                 <input type="hidden" id="from_both" name="from_both" value="' . esc_attr( $from_both ) . '">
                 {{EXTRA_POST_DATA}}';
		}
	}
}
