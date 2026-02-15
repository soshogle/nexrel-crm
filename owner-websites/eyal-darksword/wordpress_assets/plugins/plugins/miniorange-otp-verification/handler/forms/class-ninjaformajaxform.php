<?php
/**
 * Load admin view for Ninja Forms.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\FormSessionVars;
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use ReflectionException;

/**
 * Undocumented class
 */
if ( ! class_exists( 'NinjaFormAjaxForm' ) ) {
	/**
	 * NinjaFormAjaxForm class
	 */
	class NinjaFormAjaxForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::NINJA_FORM_AJAX;
			$this->type_phone_tag          = 'mo_ninja_form_phone_enable';
			$this->type_email_tag          = 'mo_ninja_form_email_enable';
			$this->type_both_tag           = 'mo_ninja_form_both_enable';
			$this->form_key                = 'NINJA_FORM_AJAX';
			$this->form_name               = 'Ninja Forms ( Above version 3.0 )';
			$this->is_form_enabled         = get_mo_option( 'nja_enable' );
			$this->button_text             = get_mo_option( 'nja_button_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->phone_form_id           = array();
			$this->form_documents          = MoFormDocs::NINJA_FORMS_AJAX_LINK;
			$this->generate_otp_action     = 'miniorange-nj-ajax-verify';
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {
			$this->otp_type     = get_mo_option( 'ninja_form_enable_type' );
			$this->form_details = maybe_unserialize( get_mo_option( 'ninja_form_otp_enabled' ) );
			if ( empty( $this->form_details ) ) {
				return;
			}
			foreach ( $this->form_details as $key => $value ) {
				array_push( $this->phone_form_id, 'input[id=nf-field-' . $value['phonekey'] . ']' );
			}

			add_action( 'ninja_forms_after_form_display', array( $this, 'enqueue_nj_form_script' ), 99, 1 );
			add_filter( 'ninja_forms_submit_data', array( $this, 'mo_handle_nj_ajax_form_submit' ), 99, 1 );
			// Register AJAX handler for OTP verification.
			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'mo_route_data' ) );
			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'mo_route_data' ) );
		}

		/**
		 * This function checks what kind of OTP Verification needs to be done.
		 * and starts the otp verification process with appropriate parameters.
		 * This is registered as an AJAX handler.
		 *
		 * @throws ReflectionException .
		 */
		public function mo_route_data() {
			// Verify AJAX nonce.
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
					wp_send_json(
						MoUtility::create_json(
							MoMessages::showMessage( MoMessages::INVALID_OP ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
			}

			// Sanitize POST data.
			$post_data = wp_unslash( $_POST );
			$data      = MoUtility::mo_sanitize_array( $post_data );
			$this->mo_send_otp_nj_ajax_verify( $data );
		}

		/**
		 * This function hooks into the ninja_forms_after_form_display hook to add.
		 * the script on the page required for OTP Verification.
		 *
		 * @param array $form_id - id of the form being processed.
		 * @return mixed
		 */
		public function enqueue_nj_form_script( $form_id ) {
			if ( array_key_exists( $form_id, $this->form_details ) ) {
				$form_data     = $this->form_details[ $form_id ];
				$form_key_vals = array_keys( $this->form_details );
				wp_register_script( 'njscript', MOV_URL . 'includes/js/ninjaformajax.js', array( 'jquery' ), MOV_VERSION, true );
				wp_localize_script(
					'njscript',
					'moninjavars',
					array(
						'siteURL'     => admin_url( 'admin-ajax.php' ),
						'otpType'     => $this->otp_type === $this->type_phone_tag ? VerificationType::PHONE : VerificationType::EMAIL,
						'forms'       => $this->form_details,
						'nonce'       => wp_create_nonce( $this->nonce ),
						'action'      => $this->generate_otp_action,
						'formKeyVals' => $form_key_vals,
						'buttontext'  => $this->button_text,
						'formId'      => $form_id,
					)
				);
				wp_enqueue_script( 'njscript' );
			}
			return $form_id;
		}

		/**
		 * This function handles the Ninja Ajax Form submit. It checks if OTP Verification has
		 * been started and process the phone / email before sending the OTP to the user for
		 * verification.
		 *
		 * @param array $data - this is the ninja form variable containing the form data.
		 * @return array
		 */
		public function mo_handle_nj_ajax_form_submit( $data ) {
			if ( ! array_key_exists( $data['id'], $this->form_details ) ) {
				return $data;
			}

			$form_data = $this->form_details[ $data['id'] ];
			$data      = $this->mo_check_if_verification_started( $form_data, $data );

			if ( isset( $data['errors']['fields'] ) ) {
				return $data;
			}

			if ( strcasecmp( $this->otp_type, $this->type_email_tag ) === 0 ) {
				$data = $this->mo_process_email( $form_data, $data );
			}
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				$data = $this->mo_process_phone( $form_data, $data );
			}
			if ( ! isset( $data['errors']['fields'] ) ) {
				$data = $this->mo_process_entered_otp( $data, $form_data );
			}

			return $data;
		}


		/**
		 * Process and validate the OTP entered by the user.
		 *
		 * @param array $data - fetch the data of user.
		 * @param array $form_data - to get the fomrdata.
		 * @return array
		 */
		private function mo_process_entered_otp( $data, $form_data ) {
			$verify_field = $form_data['verifyKey'];
			$otp_type     = $this->get_verification_type();
			$this->validate_challenge( $otp_type, null, $data['fields'][ $verify_field ]['value'] );
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_type ) ) {
				$data['errors']['fields'][ $verify_field ] = MoUtility::get_invalid_otp_method();
			} else {
				$this->unset_otp_session_variables();
			}
			return $data;
		}


		/**
		 * This function hooks into the ninja_forms_submit_data hook and checks if
		 * OTP verification has been started by checking if the session variable
		 * has been set in session.
		 *
		 * @param array $form_data .
		 * @param array $data - this is the ninja form variable containing the form data.
		 * @return array
		 */
		private function mo_check_if_verification_started( $form_data, $data ) {
			if ( SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				return $data;
			}

			if ( strcasecmp( $this->otp_type, $this->type_email_tag ) === 0 ) {
				$data['errors']['fields'][ $form_data['emailkey'] ] = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
			} else {
				$data['errors']['fields'][ $form_data['phonekey'] ] = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
			}

			return $data;
		}


		/**
		 * The function is used to process email to send the OTP to.
		 * and return the data associated with the form.
		 *
		 * @param array $form_data - array of all the phone and email keys and ids stored in the database.
		 * @param array $data - this is the ninja form variable containing the form data.
		 * @return array
		 */
		private function mo_process_email( $form_data, $data ) {
			$field_id = $form_data['emailkey'];
			if ( ! SessionUtils::is_email_verified_match( $this->form_session_var, $data['fields'][ $field_id ]['value'] ) ) {
				$data['errors']['fields'][ $field_id ] = MoMessages::showMessage( MoMessages::EMAIL_MISMATCH );
			}
			return $data;
		}


		/**
		 * The function is used to process the phone number to send the OTP to
		 * and return the data associated with the form
		 *
		 * @param array $form_data - array of all the phone and email keys and ids stored in the database.
		 * @param array $data - this is the ninja form variable.
		 * @return array
		 */
		private function mo_process_phone( $form_data, $data ) {
			$field_id = $form_data['phonekey'];
			$phone = MoUtility::process_phone_number( $data['fields'][ $field_id ]['value'] );
			if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
				$data['errors']['fields'][ $field_id ] = MoMessages::showMessage( MoMessages::PHONE_MISMATCH );
			}
			return $data;
		}

		/**
		 * The function is used to process the email or phone number provided.
		 * and send OTP to it for verification. This is called from the form.
		 * using AJAX calls.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 * @throws ReflectionException .
		 */
		private function mo_send_otp_nj_ajax_verify( $data ) {

			MoUtility::initialize_transaction( $this->form_session_var );
			if ( $this->otp_type === $this->type_phone_tag ) {
				$this->mo_send_nj_ajax_otp_to_phone( $data );
			} else {
				$this->mo_send_nj_ajax_otp_to_email( $data );
			}
		}


		/**
		 * The function is used to check if user has provided an phone number.
		 * address in the form to initiate SMS verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function mo_send_nj_ajax_otp_to_phone( $data ) {
			if ( ! array_key_exists( 'user_phone', $data ) || ! isset( $data['user_phone'] ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$phone = MoUtility::process_phone_number( trim( $data['user_phone'] ) );
				$this->mo_start_verification( $phone, null, $phone, VerificationType::PHONE );
			}
		}


		/**
		 * The function is used to check if user has provided an email.
		 * address in the form to initiate email verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function mo_send_nj_ajax_otp_to_email( $data ) {
			if ( ! array_key_exists( 'user_email', $data ) || ! isset( $data['user_email'] ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$this->mo_start_verification( $data['user_email'], $data['user_email'], null, VerificationType::EMAIL );

			}
		}


		/**
		 * This function is used to set session variables and start the
		 * OTP Verification process.
		 *
		 * @param array $session_value - the session value which is usually the email or phone number.
		 * @param array $user_email    - the email provided by the user.
		 * @param array $phone_number  - the phone number provided by the user.
		 * @param array $otp_type      - the otp type denoting the type of otp verification. Can be phone or email.
		 */
		private function mo_start_verification( $session_value, $user_email, $phone_number, $otp_type ) {
			if ( VerificationType::PHONE === $otp_type ) {
				SessionUtils::add_phone_verified( $this->form_session_var, $session_value );
			} else {
				SessionUtils::add_email_verified( $this->form_session_var, $session_value );
			}
			$this->send_challenge( '', $user_email, null, $phone_number, $otp_type );
		}


		/**
		 * This function hooks into the otp_verification_failed hook. This function
		 * details what is done if the OTP verification fails.
		 *
		 * @param string $user_login the username posted by the user.
		 * @param string $user_email the email posted by the user.
		 * @param string $phone_number the phone number posted by the user.
		 * @param string $otp_type the verification type.
		 */
		public function handle_failed_verification( $user_login, $user_email, $phone_number, $otp_type ) {
			SessionUtils::add_status( $this->form_session_var, self::VERIFICATION_FAILED, $otp_type );
		}


		/**
		 * This function hooks into the otp_verification_successful hook. This function is
		 * details what needs to be done if OTP Verification is successful.
		 *
		 * @param string $redirect_to the redirect to URL after new user registration.
		 * @param string $user_login the username posted by the user.
		 * @param string $user_email the email posted by the user.
		 * @param string $password the password posted by the user.
		 * @param string $phone_number the phone number posted by the user.
		 * @param string $extra_data any extra data posted by the user.
		 * @param string $otp_type the verification type.
		 */
		public function handle_post_verification( $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type ) {

			SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
		}


		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
		}


		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param  array $selector - the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && ( $this->otp_type === $this->type_phone_tag ) ) {
				$selector = array_merge( $selector, $this->phone_form_id );
			}
			return $selector;
		}


		/**
		 * This function is used to get the field id based on the field.
		 * label provided by the admin.
		 *
		 * @param array $form_id - id of the form.
		 * @param array $key - the key of the field.
		 * @return null|string
		 */
		private function mo_get_field_id( $form_id, $key ) {

			$cache_key   = 'mo_ninja_field_id_' . md5( $form_id . '_' . $key );
			$cache_group = 'mo_ninja_forms';

			$cached = wp_cache_get( $cache_key, $cache_group );
			if ( false !== $cached ) {
				return $cached;
			}

			if ( ! function_exists( 'Ninja_Forms' ) ) {
				return false;
			}

			$form = Ninja_Forms()->form( $form_id );
			if ( ! $form ) {
				return false;
			}

			$fields = $form->get_fields();
			if ( empty( $fields ) ) {
				return false;
			}

			$field_id = false;

			foreach ( $fields as $field ) {

				if ( $field->get_setting( 'key' ) === $key ) {
					$field_id = $field->get_id();
					break;
				}

				if ( $field->get_setting( 'type' ) === $key ) {
					$field_id = $field->get_id();
					break;
				}

				if (
					$field->get_setting( 'label' ) === $key ||
					$field->get_setting( 'admin_label' ) === $key
				) {
					$field_id = $field->get_id();
					break;
				}
			}

			wp_cache_set( $cache_key, $field_id, $cache_group, 3600 );

			return $field_id;
		}


		/**
		 * Handles saving all the Ninja form V3 related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'nja_enable' ) ) {
				return;
			}

			// Ensure Ninja Forms is installed/active before trying to read its form configuration.
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}

			if ( $this->sanitize_form_post( 'nja_enable' ) && ! is_plugin_active( 'ninja-forms/ninja-forms.php' ) ) {
				$message = MoMessages::showMessage( MoMessages::PLUGIN_INSTALL, array( 'formname' => $this->form_name ) );
				do_action( 'mo_registration_show_message', $message, MoConstants::ERROR );
				return;
			}

			$form_raw = $this->sanitize_form_post( 'ninja_ajax_form', '' );

			if ( empty( $form_raw ) ) {
				return;
			}

			$form_details = $this->mo_parse_form_details( $form_raw );

			$this->form_details    = ! empty( $form_details ) ? $form_details : '';
			$this->otp_type        = $this->sanitize_form_post( 'nja_enable_type' );
			$this->is_form_enabled = $this->sanitize_form_post( 'nja_enable' );
			$this->button_text     = $this->sanitize_form_post( 'nja_button_text' );

			update_mo_option( 'ninja_form_enable', 0 );
			update_mo_option( 'nja_enable', $this->is_form_enabled );
			update_mo_option( 'ninja_form_enable_type', $this->otp_type );
			update_mo_option( 'ninja_form_otp_enabled', maybe_serialize( $this->form_details ) );
			update_mo_option( 'nja_button_text', $this->button_text );
		}

		/**
		 * This function will parse the Form Details and return an array to be
		 * stored in the database.
		 *
		 * @param array $data this is the caldera form variable containing the form data.
		 * @return array
		 */
		private function mo_parse_form_details( $data ) {

			if ( empty( $data['form'] ) ) {
				return array();
			}

			$form = array();

			foreach ( array_filter( $data['form'] ) as $key => $value ) {
				$form[ $value ] = array(
					'emailkey'    => $this->mo_get_field_id( $value, (string) $data['emailkey'][ $key ] ),
					'phonekey'    => $this->mo_get_field_id( $value, (string) $data['phonekey'][ $key ] ),
					'verifyKey'   => $this->mo_get_field_id( $value, (string) $data['verifyKey'][ $key ] ),
					'phone_show'  => (string) $data['phonekey'][ $key ],
					'email_show'  => (string) $data['emailkey'][ $key ],
					'verify_show' => (string) $data['verifyKey'][ $key ],
				);
			}

			return $form;
		}
	}
}
