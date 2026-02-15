<?php
/**
 * Load admin view for Ulitmate Member Profile Form.
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
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationLogic;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use ReflectionException;
use UM\Core\Form;

/**
 * This is the Ultimate Member Profile Form class. This class handles all the
 * functionality related to Ultimate Member Profile Form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 *
 * <br/><br/>
 * This allows the plugin to verify the phone and the email being updated by the
 * user at the Ultimate Member Profile Page.
 */
if ( ! class_exists( 'UltimateMemberProfileForm' ) ) {
	/**
	 * UltimateMemberProfileForm class
	 */
	class UltimateMemberProfileForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Verification field Key
		 *
		 * @var string Verification field Key
		 */
		private $verify_field_key;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::UM_PROFILE_UPDATE;
			$this->type_phone_tag          = 'mo_um_profile_phone_enable';
			$this->type_email_tag          = 'mo_um_profile_email_enable';
			$this->type_both_tag           = 'mo_um_profile_both_enable';
			$this->form_key                = 'ULTIMATE_PROFILE_FORM';
			$this->verify_field_key        = 'verify_field';
			$this->form_name               = 'Ultimate Member Profile/Account Form';
			$this->is_form_enabled         = get_mo_option( 'um_profile_enable' );
			$this->restrict_duplicates     = get_mo_option( 'um_profile_restrict_duplicates' );
			$this->button_text             = get_mo_option( 'um_profile_button_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->email_key               = 'user_email';
			$this->phone_key               = get_mo_option( 'um_profile_phone_key' );
			$this->phone_key               = $this->phone_key ? $this->phone_key : 'mobile_number';
			$this->phone_form_id           = "input[name^='$this->phone_key']";
			$this->form_documents          = MoFormDocs::UM_PROFILE;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 *
		 * @throws ReflectionException In case of failures, an exception is thrown.
		 */
		public function handle_form() {
			$this->otp_type = get_mo_option( 'um_profile_enable_type' );
			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_register_um_script' ) );
			add_action( 'um_submit_account_errors_hook', array( $this, 'miniorange_um_validation' ), 99, 1 );
			add_action( 'um_add_error_on_form_submit_validation', array( $this, 'miniorange_um_profile_validation' ), 1, 3 );
			$this->route_data();
		}

		/**
		 * Is Verification enabled for the Account Page.
		 *
		 * @return bool
		 */
		private function is_account_verification_enabled() {
			return strcasecmp( $this->otp_type, $this->type_email_tag ) === 0
				|| strcasecmp( $this->otp_type, $this->type_both_tag ) === 0;
		}

		/**
		 * Is Verification enabled for the Profile Page.
		 *
		 * @return bool
		 */
		private function is_profile_verification_enabled() {
			return strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0
				|| strcasecmp( $this->otp_type, $this->type_both_tag ) === 0;
		}

		/**
		 * Initialize function to send OTP.
		 *
		 * @throws ReflectionException -In case of failures, an exception is thrown.
		 */
		private function route_data() {
			if ( ! isset( $_GET['option'] ) ) {
				return;
			}
			// Security: Use hardcoded nonce action 'form_nonce' instead of variable.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json( MoUtility::create_json( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ), MoConstants::ERROR_JSON_TYPE ) );
			}
			$data = MoUtility::mo_sanitize_array( $_POST );
			switch ( trim( sanitize_text_field( wp_unslash( $_GET['option'] ) ) ) ) {
				case 'miniorange-um-acc-ajax-verify':
					$this->send_ajax_otp_request( $data );
					break;
			}
		}

		/**
		 * This function handles the send ajax otp request. Initializes the session,
		 * checks to see if phone or email transaction have been enabled and sends
		 * OTP to the appropriate delivery point.
		 *
		 * @param array $data -the post data on send OTP request.
		 * @throws ReflectionException -In case of failures, an exception is thrown.
		 */
		private function send_ajax_otp_request( $data ) {
			MoUtility::initialize_transaction( $this->form_session_var );
			$mobile_number    = MoUtility::sanitize_check( 'user_phone', $data );
			$user_email       = MoUtility::sanitize_check( 'user_email', $data );
			$otp_request_type = MoUtility::sanitize_check( 'otp_request_type', $data );
			$this->start_otp_transaction( $user_email, $mobile_number, $otp_request_type );
		}

		/**
		 * The function is called to start the OTP Transaction based on the OTP Type
		 * set by the admin in the settings.
		 *
		 * @param string $email             the email passed by the registration_errors hook.
		 * @param string $phone_number      the phone number posted by the user during registration.
		 * @param string $otp_request_type    the request type. Decides b/w email or sms verification.
		 */
		private function start_otp_transaction( $email, $phone_number, $otp_request_type ) {
			if ( strcasecmp( $otp_request_type, $this->type_phone_tag ) === 0 ) {
				$phone_number = MoUtility::process_phone_number( $phone_number );
				$this->check_duplicates( $phone_number, $this->phone_key );
				SessionUtils::add_phone_verified( $this->form_session_var, $phone_number );
				$this->send_challenge( null, $email, null, $phone_number, VerificationType::PHONE, null, null );
			} else {
				SessionUtils::add_email_verified( $this->form_session_var, $email );
				$this->send_challenge( null, $email, null, $phone_number, VerificationType::EMAIL, null, null );
			}
		}

		/**
		 * Check if admin has set the option where each user needs to have a unique
		 * phone number. If the option is set then make sure the phone number entered
		 * by the user is unique.
		 *
		 * @param string $value  Value to check against.
		 * @param string $key Key against against wich value is stored.
		 */
		private function check_duplicates( $value, $key ) {
			if ( $this->restrict_duplicates && $this->is_phone_number_already_in_use( $value, $key ) ) {
				$message = MoMessages::showMessage( MoMessages::PHONE_EXISTS );
				wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
			}
		}

		/**
		 * Get the user data in question from the Ultimate Member database.
		 *
		 * @param string $key the usermeta key.
		 * @return string
		 */
		private function get_user_data( $key ) {
			$current_user = wp_get_current_user();
			if ( $key === $this->phone_key ) {
				$meta_value = get_user_meta( $current_user->ID, $key, true );
				return $meta_value ? $meta_value : '';
			}
			return $current_user->user_email;
		}

		/**
		 * Check form session. If user is successfully validated
		 * then unset the session variables.
		 *
		 * @param Form   $form Ultimate Member Form Object.
		 * @param string $verification_type Optional verification type (PHONE or EMAIL). If not provided, uses get_verification_type().
		 */
		private function check_form_session( $form, $verification_type = null ) {
			if ( null === $verification_type ) {
				$verification_type = $this->get_verification_type();
			}
			if ( VerificationType::BOTH === $verification_type ) {
				$phone_match     = SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::PHONE );
				$email_match     = SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::EMAIL );
				$is_status_match = $phone_match || $email_match;
			} else {
				$is_status_match = SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $verification_type );
			}
			if ( ! $is_status_match ) {
				$form->add_error( $this->email_key, MoUtility::get_invalid_otp_method() );
				$form->add_error( $this->phone_key, MoUtility::get_invalid_otp_method() );
			}
			return $is_status_match;
		}

		/**
		 * Get form data. Checks to see which version of the Ultimate Member
		 * is installed and return form data accordingly.
		 *
		 * @return \um\core\Form
		 */
		private function get_um_form_obj() {
			if ( $this->is_ultimate_member_v2_installed() ) {
				return UM()->form();
			} else {
				global $ultimatemember;
				return $ultimatemember->form;
			}
		}

		/**
		 * Checks if the plugin is installed or not. Returns true or false.
		 *
		 * @return boolean
		 */
		private function is_ultimate_member_v2_installed() {
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			return is_plugin_active( 'ultimate-member/ultimate-member.php' );
		}

		/**
		 * This functions makes a database call to check if the phone number already exists for another user.
		 *
		 * @param string $phone - the user's phone number.
		 * @param string $key - meta_key to search for.
		 * @return bool
		 */
		private function is_phone_number_already_in_use( $phone, $key ) {
			$phone = MoUtility::process_phone_number( $phone );

			// Create cache key based on phone number and meta key.
			$cache_key   = 'mo_um_phone_in_use_' . md5( $phone . '_' . $key );
			$cache_group = 'mo_um_profile';

			// Try to get from cache first.
			$cached_result = wp_cache_get( $cache_key, $cache_group );
			if ( false !== $cached_result ) {
				return (bool) $cached_result;
			}

			// Query database if not in cache.
			$args = array(
				'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Necessary to check for duplicate phone numbers. Caching implemented above.
					array(
						'key'     => $key,
						'value'   => $phone,
						'compare' => '=',
					),
				),
				'number'     => 1,
				'fields'     => 'ID',
			);

			$users = get_users( $args );

			// Check if any users were found.
			$is_in_use = ! empty( $users );

			// Store in cache for 15 minutes (900 seconds).
			wp_cache_set( $cache_key, $is_in_use, $cache_group, 900 );

			return $is_in_use;
		}

		/**
		 * Register the Profile/Account Page script which will add the OTP button and field.
		 */
		public function miniorange_register_um_script() {

			wp_register_script( 'movumprofile', MOV_URL . 'includes/js/moumprofile.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'movumprofile',
				'moumacvar',
				array(
					'siteURL'             => site_url(),
					'otpType'             => $this->otp_type,
					'emailOtpType'        => $this->type_email_tag,
					'phoneOtpType'        => $this->type_phone_tag,
					'bothOTPType'         => $this->type_both_tag,
					'nonce'               => wp_create_nonce( $this->nonce ),
					'accountProfileNonce' => wp_create_nonce( 'mo_um_account_profile_nonce' ),
					'buttonText'          => $this->button_text,
					'imgURL'              => MOV_LOADER_URL,
					'formKey'             => $this->verify_field_key,
					'emailValue'          => $this->get_user_data( $this->email_key ),
					'phoneValue'          => $this->get_user_data( $this->phone_key ),
					'phoneKey'            => $this->phone_key,
				)
			);
			wp_enqueue_script( 'movumprofile' );
		}

		/**
		 * Checks if the data entered by the user and submitted with the form
		 * is equal to what's already there in the database.
		 *
		 * @param string $type the type of OTP verification happening. Default is user_email.
		 * @param array  $args passed by the hook containing keys value pair of field and value submitted by user.
		 * @return bool
		 */
		private function user_has_change_data( $type, $args ) {
			$data = $this->get_user_data( $type );
			return strcasecmp( $data, $args[ $type ] ) !== 0;
		}

		/**
		 * This function hooks into the um_submit_account_errors_hook hook to validate
		 * the email address being submitted by the user on the account page. It is
		 * also called from miniorange_um_profile_validation function to validate
		 * the phone number.
		 *
		 * @param array  $args   passed by the hook containing keys value pair of field and value submitted by user.
		 * @param string $type   the type of OTP verification happening. Default is user_email.
		 */
		public function miniorange_um_validation( $args, $type = 'user_email' ) {
			if ( ! ( isset( $_POST['_um_account_tab'] ) && sanitize_text_field( wp_unslash( $_POST['_um_account_tab'] ) ) === 'general' && isset( $_POST['user_email'] ) ) && ! isset( $_POST['profile_nonce'] ) ) {
				return;
			}
			if ( isset( $args[ $this->verify_field_key ] ) || isset( $_POST[ $this->verify_field_key ] ) ) {
				$mo_nonce = isset( $_POST['mo_um_account_profile_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_um_account_profile_nonce'] ) ) : '';
				if ( empty( $mo_nonce ) || ! wp_verify_nonce( $mo_nonce, 'mo_um_account_profile_nonce' ) ) {
					return;
				}
			}
			$mode = MoUtility::sanitize_check( 'mode', $args );
			if ( empty( $mode ) && isset( $_POST['_um_account_tab'] ) && sanitize_text_field( wp_unslash( $_POST['_um_account_tab'] ) ) === 'general' ) {
				$mode = 'account';
			}
			// Set mode to 'profile' if phone_key is being validated and mode is not already set.
			if ( empty( $mode ) && $type === $this->phone_key ) {
				$mode = 'profile';
			}
			if ( $this->user_has_change_data( $type, $args ) && 'register' !== $mode ) {
				$form = $this->get_um_form_obj();
				if ( $this->is_validation_required( $type ) && ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
					$key = $this->is_profile_verification_enabled() && 'profile' === $mode ? $this->phone_key : $this->email_key;
					$form->add_error( $key, MoMessages::showMessage( MoMessages::PLEASE_VALIDATE ) );
				} else {
					$otp_validated = false;
					if ( isset( $args[ $this->verify_field_key ] ) ) {
						$otp_validated = $this->check_integrity_and_validate_otp( $form, $args[ $this->verify_field_key ], $args, $mode );
					}
					foreach ( $args as $key => $value ) {
						if ( $key === $this->verify_field_key ) {
							continue;
						} elseif ( $key === $this->phone_key ) {
							$this->process_phone_numbers( $value, $form );
						} elseif ( ! $otp_validated ) {
							$this->check_integrity( $form, $args, $mode );
						}
					}
					if ( $otp_validated ) {
						$this->unset_otp_session_variables();
					} elseif ( ! isset( $args[ $this->verify_field_key ] ) ) {
						$this->check_form_session( $form );
					}
				}
			}
		}

		/**
		 * Checks if validation is required for the form submission. This checks if
		 * verification has been enabled for the particular page and if the form
		 * submitted is of the same type.
		 *
		 * @param string $type the type of OTP verification happening. Default is user_email.
		 * @return bool
		 */
		private function is_validation_required( $type ) {
			return ( $this->is_account_verification_enabled() && 'user_email' === $type )
				|| ( $this->is_profile_verification_enabled() && $type === $this->phone_key );
		}

		/**
		 * This function hooks into the um_submit_account_errors_hook to validate the
		 * data submitted by the user.
		 * <br/><br/>
		 * This is used to validate the mobile number which might have been updated by
		 * the user on the profile page.
		 *
		 * @param array  $form   form details.
		 * @param string $key   the mode.
		 * @param array  $args  passed by the hook containing keys value pair of field and value submitted by user.
		 */
		public function miniorange_um_profile_validation( $form, $key, $args ) {
			if ( $key === $this->phone_key ) {
				$this->miniorange_um_validation( $args, $this->phone_key );
			}
		}

		/**
		 * Process the phone number to check it's a valid number and ensure it's
		 * not a duplicate phone number in the system if admin set the option
		 * to do so.
		 *
		 * @param string        $value  Value of the phone number.
		 * @param \Um\Core\Form $form   Ultimate Member Form Object.
		 */
		private function process_phone_numbers( $value, $form ) {

			global $phone_logic;
			if ( ! MoUtility::validate_phone_number( $value ) ) {
				$message = str_replace( '##phone##', $value, $phone_logic->get_otp_invalid_format_message() );
				$form->add_error( $this->phone_key, $message );
			}
			$this->check_duplicates( $value, $this->phone_key );
		}

		/**
		 * Check Integrity of the email or phone number. i.e. Ensure that the Email or
		 * Phone that the OTP was sent to is the same Email or Phone that is being submitted
		 * with the form.
		 * <br/<br/>
		 * Once integrity check passes validate the OTP to ensure that the user has entered
		 * the correct OTP.
		 *
		 * @param \um\core\Form $form   Ultimate Member Form Object.
		 * @param string        $value  value of the otp entered.
		 * @param array         $args   passed by the hook containing keys value pair of field and value submitted by user.
		 * @param string        $mode   mode of the user.
		 */
		private function check_integrity_and_validate_otp( $form, $value, array $args, $mode ) {
			$this->check_integrity( $form, $args, $mode );
			if ( $form->count_errors() > 0 ) {
				return false;
			}

			$verification_type = null;
			if ( $this->is_profile_verification_enabled() && 'profile' === $mode ) {
				$this->validate_challenge( 'phone', null, $value );
				$verification_type = VerificationType::PHONE;
			} else {
				$this->validate_challenge( 'email', null, $value );
				$verification_type = VerificationType::EMAIL;
			}
			return $this->check_form_session( $form, $verification_type );
		}

		/**
		 * This function checks the integrity of the phone or email value that was submitted
		 * with the form. It needs to match with the email or value that the OTP was
		 * initially sent to.
		 *
		 * @param \um\core\Form $um_form Ultimate Member form Object.
		 * @param array         $args   passed by the hook containing keys value pair of field and value submitted by user.
		 * @param string        $mode   Optional mode to determine which field to check (account or profile).
		 */
		private function check_integrity( $um_form, array $args, $mode = null ) {
			if ( $this->is_profile_verification_enabled() && isset( $args[ $this->phone_key ] ) ) {
				if ( 'account' !== $mode ) {
					$phone = MoUtility::process_phone_number( $args[ $this->phone_key ] );
					if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
						$um_form->add_error( $this->phone_key, MoMessages::showMessage( MoMessages::PHONE_MISMATCH ) );
					}
				}
			}

			if ( $this->is_account_verification_enabled() && isset( $args[ $this->email_key ] ) ) {
				if ( 'profile' !== $mode ) {
					if ( ! SessionUtils::is_email_verified_match( $this->form_session_var, $args[ $this->email_key ] ) ) {
						$um_form->add_error( $this->email_key, MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ) );
					}
				}
			}
		}

		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
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
		public function handle_post_verification(
			$redirect_to,
			$user_login,
			$user_email,
			$password,
			$phone_number,
			$extra_data,
			$otp_type
		) {
			SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
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
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param  array $selector - the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && $this->is_profile_verification_enabled() ) {
				array_push( $selector, $this->phone_form_id );
			}
			return $selector;
		}

		/**
		 * Handles saving all the Default WordPress Registration Form related options by the admin.
		 */
		public function handle_form_options() {

			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'um_profile_enable' ) ) {
				return;
			}

			$this->is_form_enabled     = $this->sanitize_form_post( 'um_profile_enable' );
			$this->otp_type            = $this->sanitize_form_post( 'um_profile_enable_type' );
			$this->button_text         = $this->sanitize_form_post( 'um_profile_button_text' );
			$this->restrict_duplicates = $this->sanitize_form_post( 'um_profile_restrict_duplicates' );
			$this->phone_key           = $this->sanitize_form_post( 'um_profile_phone_key' );

			if ( $this->basic_validation_check( BaseMessages::UM_PROFILE_CHOOSE ) ) {
				update_mo_option( 'um_profile_enable', $this->is_form_enabled );
				update_mo_option( 'um_profile_enable_type', $this->otp_type );
				update_mo_option( 'um_profile_button_text', $this->button_text );
				update_mo_option( 'um_profile_restrict_duplicates', $this->restrict_duplicates );
				update_mo_option( 'um_profile_phone_key', $this->phone_key );
			}
		}
	}
}
