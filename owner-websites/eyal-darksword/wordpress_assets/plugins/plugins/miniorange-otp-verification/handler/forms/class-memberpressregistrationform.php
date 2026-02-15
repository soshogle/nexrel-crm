<?php
/**
 * Handles the OTP verification logic for MemberPressRegistrationForm form.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\FormSessionVars;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Helper\MoConstants;
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationLogic;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use ReflectionException;
use WP_Error;

/**
 * This is the Member-Press Registration class. This class handles all the
 * functionality related to Member-Press Registration. It extends the FormHandler
 * class to implement some much needed functions.
 */
if ( ! class_exists( 'MemberPressRegistrationForm' ) ) {
	/**
	 * MemberPressRegistrationForm class
	 */
	class MemberPressRegistrationForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = false;
			$this->form_session_var        = FormSessionVars::MEMBERPRESS_REG;
			$this->type_phone_tag          = 'mo_mrp_phone_enable';
			$this->type_email_tag          = 'mo_mrp_email_enable';
			$this->type_both_tag           = 'mo_mrp_both_enable';
			$this->form_name               = 'MemberPress Registration Form';
			$this->form_key                = 'MEMBERPRESS';
			$this->is_form_enabled         = get_mo_option( 'mrp_default_enable' );
			$this->form_documents          = MoFormDocs::MRP_FORM_LINK;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 *
		 * @throws ReflectionException .
		 */
		public function handle_form() {
			$this->by_pass_login = get_mo_option( 'mpr_anon_only' );
			$this->phone_key     = get_mo_option( 'mrp_phone_key' );
			$this->otp_type      = get_mo_option( 'mrp_enable_type' );
			$this->phone_form_id = 'input[name=' . $this->phone_key . ']';
			add_filter( 'mepr-validate-signup', array( $this, 'miniorange_site_register_form' ), 99, 1 );

			// Enqueue JS to append the registration nonce field on the frontend MemberPress form.
			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_memberpress_register_script' ) );
		}

		/**
		 * Member-Press function which hooks into the mepr-validate-signup hook
		 * and gets all the necessary values to start the otp verification process.
		 *
		 * @param array|WP_Error $errors Existing errors by the forms.
		 * @return array|WP_Error
		 * @throws ReflectionException .
		 */
		public function miniorange_site_register_form( $errors ) {
			if ( $this->by_pass_login && is_user_logged_in() ) {
				if ( $errors instanceof WP_Error ) {
					$errors_array = array();
					if ( ! empty( $errors->errors ) ) {
						foreach ( $errors->errors as $code => $messages ) {
							$errors_array[] = $messages[0];
						}
					}
					return $errors_array;
				}
				return $errors;
			}

			if ( $errors instanceof WP_Error ) {
				$errors_array = array();
				if ( ! empty( $errors->errors ) ) {
					foreach ( $errors->errors as $code => $messages ) {
						$errors_array[] = $messages[0];
					}
				}
				$errors = $errors_array;
			}

			if ( ! is_array( $errors ) ) {
				$errors = array();
			}

			if ( empty( $_POST ) || ! isset( $_POST['user_email'] ) ) {
				return $errors;
			}

			// Validate MemberPress registration nonce added via frontend JS.
			$mov_nonce = isset( $_POST['mepr_register_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mepr_register_nonce'] ) ) : '';
			if ( empty( $mov_nonce ) || ! wp_verify_nonce( $mov_nonce, 'mo_register_nonce' ) ) {
				return new WP_Error(
					'registration-error-invalid-nonce',
					MoMessages::showMessage( MoMessages::INVALID_OP )
				);
			}

			$usermeta = MoUtility::mo_sanitize_array( $_POST );

			$phone_number = '';
			if ( $this->mo_is_phone_verification_enabled() ) {
				$raw_phone    = isset( $usermeta[ $this->phone_key ] ) ? wp_unslash( $usermeta[ $this->phone_key ] ) : '';
				$phone_number = $raw_phone ? MoUtility::process_phone_number( $raw_phone ) : '';
				$errors       = $this->validate_phone_number_field( $errors, $usermeta );
			}

			if ( is_array( $errors ) && ! empty( $errors ) ) {
				return $errors;
			}

			if ( $this->checkIf_verification_is_complete() ) {
				return $errors;
			}
			MoUtility::initialize_transaction( $this->form_session_var );
			$errors_obj = new WP_Error();
			$password   = '';
			$extra_data = array();
			$username   = '';
			$email      = '';

			foreach ( $usermeta as $key => $value ) {
				if ( 'user_first_name' === $key ) {
					$username = $value;
				} elseif ( 'user_email' === $key ) {
					$email = $value;
				} elseif ( 'mepr_user_password' === $key ) {
					$password = $value;
				} else {
					$extra_data[ $key ] = $value;
				}
			}

			$extra_data['usermeta'] = $usermeta;
			$this->start_verification_process( $username, $email, $errors_obj, $phone_number, $password, $extra_data );
			return array();
		}

		/**
		 * This function will do the validation of the phone value in the post form.
		 *
		 * @param array $errors Array of errors from the MemberPress form.
		 * @param array $data Posted checkout data.
		 * @return array Array of errors if any for the phone number.
		 */
		private function validate_phone_number_field( $errors, $data ) {

			global $phone_logic;
			$phone = isset( $data[ $this->phone_key ] ) ? ( wp_unslash( $data[ $this->phone_key ] ) ) : '';
			if ( ! MoUtility::sanitize_check( $this->phone_key, $data ) ) {
				$errors[] = MoMessages::showMessage( MoMessages::ENTER_PHONE_DEFAULT );
			} elseif ( ! MoUtility::validate_phone_number( $phone ) ) {
				$error_message = str_replace( '##phone##', $phone, $phone_logic->get_otp_invalid_format_message() );
				$errors[]      = $error_message;
			}
			return $errors;
		}

		/**
		 * Start the verification process. Check the type of OTP configured by the admin and
		 * start the OTP Verification process.
		 *
		 * @param string $username     Username provided by the user during registration.
		 * @param string $email        Email provided by the user during registration.
		 * @param string $errors       Any error that might have come up.
		 * @param string $phone_number The phone number provided by the user during registration.
		 * @param string $password     Password provided by the user during registration.
		 * @param array  $extra_data   Other data provided by the user during registration.
		 */
		private function start_verification_process( $username, $email, $errors, $phone_number, $password, $extra_data ) {
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				$this->send_challenge( $username, $email, $errors, $phone_number, VerificationType::PHONE, $password, $extra_data, null, $this->form_session_var );
			} elseif ( strcasecmp( $this->otp_type, $this->type_both_tag ) === 0 ) {
				$this->send_challenge( $username, $email, $errors, $phone_number, VerificationType::BOTH, $password, $extra_data, null, $this->form_session_var );
			} else {
				$this->send_challenge( $username, $email, $errors, $phone_number, VerificationType::EMAIL, $password, $extra_data, null, $this->form_session_var );
			}
		}

		/**
		 * Registers and enqueues the JS file that appends the registration nonce
		 * field to the MemberPress registration form on the frontend.
		 */
		public function miniorange_memberpress_register_script() {
			// Only enqueue on the frontend.
			if ( is_admin() ) {
				return;
			}

			wp_register_script( 'momrpreg', MOV_URL . 'includes/js/momrpreg.js', array( 'jquery' ), MOV_VERSION, true );

			// Localize the nonce value so JS can append it to the form.
			wp_localize_script(
				'momrpreg',
				'momrpreg',
				array(
					'nonce' => wp_create_nonce( 'mo_register_nonce' ),
				)
			);

			wp_enqueue_script( 'momrpreg' );
		}


		/**
		 * Checks if the OTP Verification is completed and there were no errors.
		 * Returns TRUE or FALSE indicating if OTP Verification was a success.
		 *
		 * @return bool True if verification is complete, false otherwise.
		 */
		private function checkIf_verification_is_complete() {
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
				$this->unset_otp_session_variables();
				return true;
			}
			return false;
		}

		/**
		 * This function hooks into the otp_verification_successful hook. This function is
		 * details what needs to be done if OTP Verification is successful.
		 *
		 * @param string $redirect_to  The redirect to URL after new user registration.
		 * @param string $user_login   The username posted by the user.
		 * @param string $user_email   The email posted by the user.
		 * @param string $password     The password posted by the user.
		 * @param string $phone_number The phone number posted by the user.
		 * @param string $extra_data   Any extra data posted by the user.
		 * @param string $otp_type     The verification type.
		 */
		public function handle_post_verification( $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type ) {

			SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
		}

		/**
		 * This function hooks into the otp_verification_failed hook. This function
		 * details what is done if the OTP verification fails.
		 *
		 * @param string $user_login   The username posted by the user.
		 * @param string $user_email   The email posted by the user.
		 * @param string $phone_number The phone number posted by the user.
		 * @param string $otp_type     The verification type.
		 */
		public function handle_failed_verification( $user_login, $user_email, $phone_number, $otp_type ) {

			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				return;
			}
			$otpver_type = $this->get_verification_type();
			$from_both   = VerificationType::BOTH === $otpver_type ? true : false;
			miniorange_site_otp_validation_form(
				$user_login,
				$user_email,
				$phone_number,
				MoUtility::get_invalid_otp_method(),
				$otpver_type,
				$from_both
			);
		}

		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param array $selector The Jquery selector to be modified.
		 * @return array $selector The Jquery selector to be modified.
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && $this->mo_is_phone_verification_enabled() ) {
				array_push( $selector, $this->phone_form_id );
				if ( ! wp_style_is( 'mo-inttelinput-css', 'enqueued' ) ) {
					wp_enqueue_style( 'mo-inttelinput-css', MO_INTTELINPUT_CSS, array(), MOV_VERSION );
				}
			}
			return $selector;
		}

		/**
		 * This is a utility function specific to this class which checks if
		 * SMS Verification has been enabled by the admin for MemberPress Registration
		 * form.
		 *
		 * @return bool True if phone verification is enabled, false otherwise.
		 */
		private function mo_is_phone_verification_enabled() {
			$otp_type = $this->get_verification_type();
			return VerificationType::PHONE === $otp_type || VerificationType::BOTH === $otp_type;
		}

		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
		}

		/**
		 * Handles saving all the MemberPress form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'mrp_default_enable' ) ) {
				return;
			}
			if ( get_mo_option( 'mrp_single_default_enable' ) ) {
				do_action( 'mo_registration_show_message', __( 'Disable MemberPress Single Checkout form to enable OTP verification on MemberPress Registration Form', 'miniorange-otp-verification' ), MoConstants::ERROR_JSON_TYPE );
				return;
			}

			$this->is_form_enabled = $this->sanitize_form_post( 'mrp_default_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'mrp_enable_type' );
			$this->phone_key       = $this->sanitize_form_post( 'mrp_phone_field_key' );
			$this->by_pass_login   = $this->sanitize_form_post( 'mpr_anon_only' );

			if ( $this->basic_validation_check( BaseMessages::MEMBERPRESS_CHOOSE ) ) {
				update_mo_option( 'mrp_default_enable', $this->is_form_enabled );
				update_mo_option( 'mrp_enable_type', $this->otp_type );
				update_mo_option( 'mrp_phone_key', $this->phone_key );
				update_mo_option( 'mpr_anon_only', $this->by_pass_login );
			}
		}

		/**
		 * Retrieves email and phone data from the submitted form.
		 *
		 * @return array {
		 *     @type string $email Email address.
		 *     @type string $phone Phone number.
		 * }
		 */
		public function get_email_phone_data() {
			if ( ! isset( $_POST['mopopup_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['mopopup_wpnonce'] ) ), 'mo_popup_options' ) ) {
				return array(
					'email' => '',
					'phone' => '',
				);
			}
			$data      = MoUtility::mo_sanitize_array( $_POST );
			$email     = isset( $data['user_email'] ) ? sanitize_email( wp_unslash( $data['user_email'] ) ) : '';
			$phone_raw = isset( $data[ $this->phone_key ] ) ? sanitize_text_field( wp_unslash( $data[ $this->phone_key ] ) ) : '';
			$phone     = $phone_raw ? MoUtility::process_phone_number( $phone_raw ) : '';
			return array(
				'email' => $email,
				'phone' => $phone,
			);
		}
	}
}
