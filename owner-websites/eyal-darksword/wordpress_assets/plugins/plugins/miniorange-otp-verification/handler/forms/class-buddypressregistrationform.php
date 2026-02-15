<?php
/**
 * Load admin view for BuddyPressRegistrationForm.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\FormSessionVars;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use WP_Error;
use BP_Signup;
use WP_User;

/**
 * This is the BuddyPress Registration class. This class handles all the
 * functionality related to BuddyPress Registration. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'BuddyPressRegistrationForm' ) ) {
	/**
	 * BuddyPressRegistrationForm class
	 */
	class BuddyPressRegistrationForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = false;
			$this->form_session_var        = FormSessionVars::BUDDYPRESS_REG;
			$this->type_phone_tag          = 'mo_bbp_phone_enable';
			$this->type_email_tag          = 'mo_bbp_email_enable';
			$this->type_both_tag           = 'mo_bbp_both_enabled';
			$this->form_key                = 'BP_DEFAULT_FORM';
			$this->form_name               = 'BuddyPress / BuddyBoss Registration Form';
			$this->is_form_enabled         = get_mo_option( 'bbp_default_enable' );
			$this->form_documents          = MoFormDocs::BBP_FORM_LINK;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {
			$this->phone_key             = get_mo_option( 'bbp_phone_key' );
			$this->otp_type              = get_mo_option( 'bbp_enable_type' );
			$this->disable_auto_activate = get_mo_option( 'bbp_disable_activation' );
			$this->phone_form_id         = 'input[name=field_' . $this->mo_bbp_get_phone_field_id() . ']';
			$this->restrict_duplicates   = get_mo_option( 'bbp_restrict_duplicates' );

			add_filter( 'bp_registration_needs_activation', array( $this, 'fix_signup_form_validation_text' ) );
			add_filter( 'bp_core_signup_send_activation_key', array( $this, 'disable_activation_email' ) );
			add_filter( 'bp_signup_usermeta', array( $this, 'miniorange_bp_user_registration' ), 1, 1 );
			add_action( 'bp_signup_validate', array( $this, 'validate_otp_request' ), 99, 0 );

			if ( $this->disable_auto_activate ) {
				add_action( 'bp_core_signup_user', array( $this, 'mo_activate_bbp_user' ), 1, 5 );
			}
		}

		/**
		 * This function hooks into the bp_registration_needs_activation hook
		 * and returns TRUE or FALSE based on the settings done by the Admin.
		 * Response is true if autoActivate has been enabled.
		 */
		public function fix_signup_form_validation_text() {
			return $this->disable_auto_activate ? false : true;
		}

		/**
		 * This function hooks into the bp_core_signup_send_activation_key hook
		 * and returns TRUE or FALSE based on the settings done by the Admin.
		 * Response is true if autoActivate has been enabled.
		 */
		public function disable_activation_email() {
			return $this->disable_auto_activate ? false : true;
		}

		/**
		 * This is a utility function specific to this class which checks if
		 * SMS Verification has been enabled by the admin for BuddyPress Registration
		 * form
		 */
		private function is_phone_verification_enabled() {
			$otp_type = $this->get_verification_type();
			return VerificationType::PHONE === $otp_type || VerificationType::BOTH === $otp_type;
		}

		/**
		 * This function validates the phone number coming in the form post
		 * of the user registration form and makes sure it's a valid phone
		 * number.
		 */
		public function validate_otp_request() {
			if ( ! ( $this->is_phone_verification_enabled() && ! is_null( $this->mo_bbp_get_phone_field_id() ) ) ) {
				return;
			}
			if ( ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ) ), 'bp_new_signup' ) ) {
				return;
			}
			global $bp, $phone_logic;
			$field_key = 'field_' . $this->mo_bbp_get_phone_field_id();
			$raw_phone = isset( $_POST[ $field_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $field_key ] ) ) : '';
			if ( $raw_phone && ! MoUtility::validate_phone_number( $raw_phone ) ) {
				$bp->signup->errors[ $field_key ] = str_replace( '##phone##', esc_html( $raw_phone ), $phone_logic->get_otp_invalid_format_message() );
			} elseif ( $raw_phone && $this->restrict_duplicates && $this->is_phone_number_already_in_use( $raw_phone ) ) {
				$bp->signup->errors[ $field_key ] = __( 'Phone number already in use. Please Enter a different Phone number.', 'miniorange-otp-verification' );
			}
		}

		/**
		 * Check if the phone number already exists in BuddyPress profile fields.
		 *
		 * @param string $phone The phone number entered by the user.
		 * @return bool True if phone exists, false otherwise.
		 */
		private function is_phone_number_already_in_use( $phone ) {

			$phone    = MoUtility::process_phone_number( $phone );
			$field_id = $this->mo_bbp_get_phone_field_id();

			if ( ! function_exists( 'bp_is_active' ) || empty( $field_id ) ) {
				return false;
			}

			$query = new \BP_User_Query(
				array(
					'xprofile_query' => array(
						array(
							'field'   => $field_id,
							'value'   => $phone,
							'compare' => '=',
						),
					),
					'fields'         => 'ids',
					'number'         => 1,
				)
			);

			return ! empty( $query->results );
		}

		/**
		 * Checks if the OTP Verification is completed and there were no errors.
		 * Returns TRUE or FALSE indicating if OTP Verification was a success.
		 */
		private function check_if_verification_is_complete() {
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
				$this->unset_otp_session_variables();
				return true;
			}
			return false;
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
			$otp_ver_type = $this->get_verification_type();
			$from_both    = VerificationType::BOTH === $otp_ver_type ? true : false;
			miniorange_site_otp_validation_form(
				$user_login,
				$user_email,
				$phone_number,
				MoUtility::get_invalid_otp_method(),
				$otp_ver_type,
				$from_both
			);
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
		 * Major BuddyPress function which hooks into the bp_signup_usermeta hook
		 * and gets all the necessary values to start the otp verification process.
		 *
		 * @param array $usermeta all the extra information provided by the user during registration.
		 * @return array
		 */
		public function miniorange_bp_user_registration( $usermeta ) {
			if ( $this->check_if_verification_is_complete() ) {
				return $usermeta;
			}
			MoUtility::initialize_transaction( $this->form_session_var );
			$errors       = new WP_Error();
			$phone_number = null;
			$username     = '';
			$email        = '';
			$password     = '';
			$extra_data   = array();
			if ( ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ) ), 'bp_new_signup' ) ) {
				return;
			}
			foreach ( $_POST as $key => $value ) {
				if ( 'signup_username' === $key ) {
					$username = sanitize_user( wp_unslash( $value ) );
				} elseif ( 'signup_email' === $key ) {
					$email = sanitize_email( wp_unslash( $value ) );
				} elseif ( 'signup_password' === $key ) {
					$password = wp_unslash( $value ); // Passwords should not be sanitized.
				} else {
					$extra_data[ sanitize_key( $key ) ] = sanitize_text_field( wp_unslash( $value ) );
				}
			}

			$reg1 = $this->mo_bbp_get_phone_field_id();

			if ( isset( $_POST[ 'field_' . $reg1 ] ) ) {
				$phone_number = sanitize_text_field( wp_unslash( $_POST[ 'field_' . $reg1 ] ) );
			}

			$extra_data['usermeta'] = $usermeta;
			$this->start_verification_process( $username, $email, $errors, $phone_number, $password, $extra_data );
			return $usermeta;
		}

		/**
		 * Start the verification process. Check the type of OTP configured by the admin and
		 * start the OTP Verification process.
		 *
		 * @param string $username     - username provided by the user during registration.
		 * @param string $email        - email provided by the user during registration.
		 * @param string $errors       - any error that might have come up.
		 * @param string $phone_number - the phone number provided by the user during registration.
		 * @param string $password     - password provided by the user during registration.
		 * @param string $extra_data   - other data provided by the user during registration.
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
		 * Retrieves sanitized email and phone number data from the form.
		 *
		 * @return array {
		 *     @type string $email Sanitized email address.
		 *     @type string $phone Sanitized phone number.
		 * }
		 */
		public function get_email_phone_data() {
			if ( ! isset( $_POST['mopopup_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['mopopup_wpnonce'] ) ), 'mo_popup_options' ) ) {
				return array(
					'email' => '',
					'phone' => '',
				);
			}
			$data        = MoUtility::mo_sanitize_array( $_POST );
			$email       = isset( $_POST['signup_email'] ) ? sanitize_email( wp_unslash( $_POST['signup_email'] ) ) : '';
			$phone_field = $this->mo_bbp_get_phone_field_id();
			$phone       = isset( $_POST[ 'field_' . $phone_field ] ) ? sanitize_text_field( wp_unslash( $_POST[ 'field_' . $phone_field ] ) ) : '';
			$phone       = MoUtility::process_phone_number( $phone );
			return array(
				'email' => $email,
				'phone' => $phone,
			);
		}

		/**
		 * This function hooks into the bp_core_signup_user buddypress hook to automatically
		 * activate the user after they have registered.
		 *
		 * @param int    $user_id       UserID refers to the user Id of the user who just registered.
		 * @param string $user_login    Username of the user who registered.
		 * @param string $user_password Password of the user who registered.
		 * @param string $user_email    Email address of the user who registered.
		 * @param array  $usermeta      Additional user metadata provided during registration.
		 */
		public function mo_activate_bbp_user( $user_id, $user_login, $user_password = null, $user_email = null, $usermeta = null ) {
			$activation_key = $this->mo_bbp_get_activation_key( $user_login );
			bp_core_activate_signup( $activation_key );
			BP_Signup::validate( $activation_key );
			$u = new WP_User( $user_id );
			$u->add_role( 'subscriber' );
		}

		/**
		 * This function is used to run a database call to get the activation key associated
		 * with the user who had registered. This is being used to autoactivate the user
		 * after the initial registration.
		 *
		 * @param string $user_login - the username of the user who has registered.
		 * @return null|string
		 */
		private function mo_bbp_get_activation_key( $user_login ) {

			if ( ! class_exists( 'BP_Signup' ) ) {
				return false; // BuddyPress not active.
			}

			$results = BP_Signup::get(
				array(
					'user_login' => $user_login,
					'active'     => 0,
					'number'     => 1,
				)
			);

			if ( empty( $results['signups'] ) ) {
				return false;
			}

			return $results['signups'][0]->activation_key;
		}

		/**
		 * This function is used to run a database call to get the phone field id
		 * associated with phone field key provided by the user in the plugin settings.
		 * The id is used to check the post field.
		 */
		private function mo_bbp_get_phone_field_id() {

			if ( empty( $this->phone_key ) ) {
				$this->phone_key = get_mo_option( 'bbp_phone_key' );
			}

			if ( ! function_exists( 'xprofile_get_field_id_from_name' ) ) {
				return false; // BuddyPress not active.
			}

			return xprofile_get_field_id_from_name( $this->phone_key );
		}

		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->form_session_var, $this->tx_session_id ) );
		}

		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param array $selector - the Jquery selector to be modified.
		 * @return String
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && $this->is_phone_verification_enabled() ) {
				array_push( $selector, $this->phone_form_id );
			}
			return $selector;
		}

		/**
		 * Handles saving all the BuddyPress form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'bbp_default_enable' ) ) {
				return;
			}

			$this->is_form_enabled       = $this->sanitize_form_post( 'bbp_default_enable' );
			$this->disable_auto_activate = $this->sanitize_form_post( 'bbp_disable_activation' );
			$this->otp_type              = $this->sanitize_form_post( 'bbp_enable_type' );
			$this->phone_key             = $this->sanitize_form_post( 'bbp_phone_key' );
			$this->restrict_duplicates   = $this->sanitize_form_post( 'bbp_restrict_duplicates' );
			if ( $this->basic_validation_check( BaseMessages::BP_CHOOSE ) ) {
				update_mo_option( 'bbp_default_enable', $this->is_form_enabled );
				update_mo_option( 'bbp_disable_activation', $this->disable_auto_activate );
				update_mo_option( 'bbp_enable_type', $this->otp_type );
				update_mo_option( 'bbp_restrict_duplicates', $this->restrict_duplicates );
				update_mo_option( 'bbp_phone_key', $this->phone_key );
			}
		}
	}
}
