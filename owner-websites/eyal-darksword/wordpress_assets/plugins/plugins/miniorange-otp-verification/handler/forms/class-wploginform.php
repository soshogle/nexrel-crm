<?php
/**
 * Load admin view for WordPress / WooCommerce / Ultimate Member Login Form.
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
use OTP\Helper\MoPHPSessions;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use ReflectionException;
use WP_Error;
use WP_User;

/**
 * This is the WordPress Login Form class. This class handles all the
 * functionality related to WordPress Login. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'WPLoginForm' ) ) {
	/**
	 * WPLoginForm class
	 */
	class WPLoginForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Enable disable saving of phone numbers after verification
		 *
		 * @var string
		 */
		private $save_phone_numbers;

		/**
		 * Allow admins to bypass otp verification
		 *
		 * @var string
		 */
		private $by_pass_admin;

		/**
		 * Allow users to log in with their phone number
		 *
		 * @var String
		 */
		private $allow_login_through_phone;

		/**
		 * Skip Password Check and allow users to log
		 * in using OTP instead
		 *
		 * @var bool
		 */
		private $skip_password_check;

		/**
		 * The Username field label to be shown to the
		 * users.
		 *
		 * @var string
		 */
		private $user_label;

		/**
		 * The option which tells if admins has set the
		 * option to force users to OTP Verification only
		 * in certain intervals.
		 *
		 * @var bool
		 */
		private $delay_otp;

		/**
		 * The interval time if $delay_otp is set.
		 *
		 * @var int
		 */
		private $delay_otp_interval;

		/**
		 * Allow users to fallback to username + password
		 * if they don't wish to do login with OTP
		 *
		 * @var bool
		 */
		private $skip_pass_fallback;

		/**
		 * Create User Action Hook
		 *
		 * @var string
		 */
		private $create_user_action;

		/**
		 * Stores the unix timestamp of when the user did OTP Verification last
		 *
		 * @var string
		 */
		private $time_stamp_meta_key = 'mov_last_verified_dttm';

		/**
		 * Redirect page after Login.
		 *
		 * @var string
		 */
		private $redirect_to_page;
		/**
		 * Redirect user after Login.
		 *
		 * @var boolean
		 */
		private $redirect_after_login;
		/**
		 * Login with OTP button text.
		 *
		 * @var boolean
		 */
		private $login_with_otp_button_text;
		/**
		 * Login with password button text.
		 *
		 * @var boolean
		 */
		private $login_with_pass_button_text;
		/**
		 * Login with password button CSS.
		 *
		 * @var boolean
		 */
		private $login_with_pass_button_css;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form     = true;
			$this->is_ajax_form                = true;
			$this->form_session_var            = FormSessionVars::WP_LOGIN_REG_PHONE;
			$this->form_session_var2           = FormSessionVars::WP_DEFAULT_LOGIN;
			$this->phone_form_id               = '#mo_phone_number';
			$this->type_phone_tag              = 'mo_wp_login_phone_enable';
			$this->type_email_tag              = 'mo_wp_login_email_enable';
			$this->form_key                    = 'WP_DEFAULT_LOGIN';
			$this->form_name                   = 'WordPress / WooCommerce / Ultimate Member Login Form';
			$this->is_form_enabled             = get_mo_option( 'wp_login_enable' );
			$this->user_label                  = get_mo_option( 'wp_username_label_text' );
			$this->user_label                  = $this->user_label ? $this->user_label : '';
			$this->skip_password_check         = get_mo_option( 'wp_login_skip_password' );
			$this->allow_login_through_phone   = get_mo_option( 'wp_login_allow_phone_login' );
			$this->skip_pass_fallback          = get_mo_option( 'wp_login_skip_password_fallback' );
			$this->delay_otp                   = get_mo_option( 'wp_login_delay_otp' );
			$this->delay_otp_interval          = get_mo_option( 'wp_login_delay_otp_interval' );
			$this->login_with_otp_button_text  = get_mo_option( 'wp_login_with_otp_button_text' );
			$this->login_with_pass_button_text = get_mo_option( 'wp_login_with_pass_button_text' );
			$this->login_with_otp_button_text  = ! MoUtility::is_blank( $this->login_with_otp_button_text ) ? $this->login_with_otp_button_text : '';
			$this->login_with_pass_button_text = ! MoUtility::is_blank( $this->login_with_pass_button_text ) ? $this->login_with_pass_button_text : '';
			$this->login_with_pass_button_css  = get_mo_option( 'wp_login_with_pass_button_css' );
			$this->delay_otp_interval          = $this->delay_otp_interval ? $this->delay_otp_interval : 43800;
			$this->form_documents              = MoFormDocs::LOGIN_FORM;

			if ( $this->skip_password_check || $this->allow_login_through_phone ) {
				add_action( 'login_enqueue_scripts', array( $this, 'miniorange_register_login_script' ) );
				add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_register_login_script' ) );
			}
			parent::__construct();
		}

		/**
		 * Get the option name for the phone key.
		 *
		 * @return string The option name for the phone key.
		 */
		protected function get_phone_key_option_name() {
			return 'wp_login_key';
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {

			$this->otp_type             = get_mo_option( 'wp_login_enable_type' );
			$this->save_phone_numbers   = get_mo_option( 'wp_login_register_phone' );
			$this->by_pass_admin        = get_mo_option( 'wp_login_bypass_admin' );
			$this->restrict_duplicates  = get_mo_option( 'wp_login_restrict_duplicates' );
			$this->redirect_after_login = get_mo_option( 'wp_login_redirection_enable' );
			$this->redirect_to_page     = get_mo_option( 'login_custom_redirect' );

			add_filter( 'authenticate', array( $this, 'mo_handle_mo_wp_login' ), 99, 3 );

			add_action( 'wp_ajax_mo-admin-check', array( $this, 'mo_is_admin_check' ) );
			add_action( 'wp_ajax_nopriv_mo-admin-check', array( $this, 'mo_is_admin_check' ) );

			if ( class_exists( 'UM' ) ) {
				add_filter( 'wp_authenticate_user', array( $this, 'mo_get_and_return_user' ), 99, 2 );
				add_filter( 'um_custom_authenticate_error_codes', array( $this, 'mo_get_um_form_errors' ), 99, 1 );
			}
			$this->mo_route_data();
		}

		/**
		 * Function check if the user loggin in is admin.
		 */
		public function mo_is_admin_check() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$username = MoUtility::sanitize_check( 'username', $_POST );

			$user = is_email( $username ) ? get_user_by( 'email', $username ) : get_user_by( 'login', $username );

			if ( ! $user && $this->allow_login_through_phone && MoUtility::validate_phone_number( $username ) ) {
				$user = $this->mo_get_user_from_phone_number( $username );
			}

			if ( ! $user ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_USERNAME ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}

			$is_admin = user_can( $user, 'manage_options' );
			$type     = $is_admin ? MoConstants::SUCCESS_JSON_TYPE : MoConstants::ERROR_JSON_TYPE;
			$message  = $is_admin ? __( 'Admin user', 'miniorange-otp-verification' ) : __( 'Not an admin user', 'miniorange-otp-verification' );

			wp_send_json( MoUtility::create_json( $message, $type ) );
		}

		/**
		 * Function to handle login errors on UM invalid form
		 *
		 * @param Array $errors - Errors.
		 */
		public function mo_get_um_form_errors( $errors ) {
			$nonce = isset( $_POST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ) : '';
			if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'um_login_form' ) || ! wp_verify_nonce( $nonce, 'um-form-nonce' ) || ! wp_verify_nonce( $nonce, 'um_login_nonce' ) ) {
				return $errors;
			}

			$form_id  = MoUtility::sanitize_check( 'form_id', $_POST );
			$username = MoUtility::sanitize_check( 'username-' . $form_id, $_POST );
			$password = MoUtility::sanitize_check( 'user_password-' . $form_id, $_POST );
			$user     = $this->mo_get_user( $username, $password );

			if ( is_wp_error( $user ) ) {
				array_push( $errors, $user->get_error_code() );
			}
			return $errors;
		}

		/**
		 * This function checks what kind of OTP Verification needs to be done.
		 * and starts the otp verification process with appropriate parameters.
		 *
		 * @throws ReflectionException .
		 */
		private function mo_route_data() {

			$popup_option = MoUtility::get_current_page_parameter_value( 'mo_external_popup_option', '' );

			if ( ! check_ajax_referer( 'mo_popup_options', 'mopopup_wpnonce', false ) ) {
				return;
			}

			$post_data = MoUtility::mo_sanitize_array( $_POST );

			// If not present in query string, fallback to POST after nonce verification.
			if ( '' === $popup_option && isset( $post_data['mo_external_popup_option'] ) ) {
				$popup_option = sanitize_text_field( wp_unslash( $post_data['mo_external_popup_option'] ) );
			}

			if ( '' === $popup_option ) {
				return;
			}

			switch ( trim( $popup_option ) ) {
				case 'miniorange-ajax-otp-generate':
					$this->mo_handle_wp_login_ajax_send_otp( $post_data );
					break;
				case 'miniorange-ajax-otp-validate':
					$this->mo_handle_wp_login_ajax_form_validate_action( $post_data );
					break;
				case 'mo_ajax_form_validate':
					$this->mo_handle_wp_login_create_user_action( $post_data );
					break;
			}
		}

		/**
		 * This function registers the js file for enabling OTP Verification
		 * for WP Login using AJAX calls.
		 */
		public function miniorange_register_login_script() {
			wp_register_script( 'mologin', MOV_URL . 'includes/js/loginform.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'mologin',
				'movarlogin',
				array(
					'userLabel'           => ( $this->allow_login_through_phone && $this->get_verification_type() === VerificationType::PHONE ) ? $this->user_label : null,
					'skipPwdCheck'        => $this->skip_password_check,
					'skipPwdFallback'     => $this->skip_pass_fallback,
					'loginOTPButtonText'  => $this->login_with_otp_button_text,
					'loginPassButtonText' => $this->login_with_pass_button_text,
					'loginPassButtonCSS'  => $this->login_with_pass_button_css,
					'isAdminAction'       => 'mo-admin-check',
					'nonce'               => wp_create_nonce( $this->nonce ),
					'byPassAdmin'         => $this->by_pass_admin,
					'siteURL'             => admin_url( 'admin-ajax.php' ),
				)
			);
			wp_enqueue_script( 'mologin' );
		}


		/**
		 * Return Authenticated User object for Ultimate Member Login.
		 *
		 * @param string|WP_User $username   username of the user.
		 * @param string         $password   password of the user.
		 * @return WP_Error|WP_User
		 */
		public function mo_get_and_return_user( $username, $password ) {

			if ( is_object( $username ) ) {
				return $username;
			}

			$user = $this->mo_get_user( $username, $password );
			if ( is_wp_error( $user ) ) {
				return $user;
			}
			if ( ! class_exists( 'UM' ) ) {
				UM()->login()->auth_id = $user->data->ID;
				UM()->form()->errors   = null;
			}
			return $user;
		}



		/**
		 * Function detects if the user trying to log in is an admin and detects
		 * if admin has set two factor bypass for Admins. Returns True or False
		 *
		 * @param WP_User $user             role or roles of the user trying to log in.
		 * @param bool    $skip_otp_process   skip validating OTP.
		 * @return bool
		 */
		private function mo_by_pass_login( $user, $skip_otp_process ) {
			$user_meta = get_userdata( $user->data->ID );
			$user_role = $user_meta->roles;
			return ( in_array( 'administrator', $user_role, true ) && $this->by_pass_admin ) || $skip_otp_process || $this->mo_delay_otp_process( $user->data->ID );
		}

		/**
		 * Handle WordPress login user creation after OTP verification
		 *
		 * @param array $post_data - $_POST data.
		 * @return void
		 */
		private function mo_handle_wp_login_create_user_action( $post_data ) {
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
				return;
			}

			/**
			 * Anonymous function that returns the user for the email or
			 * username that the user has submitted on the login screen
			 *
			 * @param $post_data
			 * @return bool|WP_User
			 */
			$get_user_from_post = function ( $post_data ) {
				$username = MoPHPSessions::get_session_var( 'login_user_mo' );

				if ( ! $username ) {
					$array    = array_filter(
						$post_data,
						function ( $key ) {
							return strpos( $key, 'username' ) === 0;
						},
						ARRAY_FILTER_USE_KEY
					);
					$username = ! empty( $array ) ? array_shift( $array ) : $username;
				}
				return is_email( $username ) ? get_user_by( 'email', $username ) : get_user_by( 'login', $username );
			};

			$user  = $get_user_from_post( $post_data );
			$phone = MoPHPSessions::get_session_var( 'phone_number_mo' );
			$phone = $phone ? $phone : '';
			update_user_meta( $user->data->ID, $this->get_phone_key_details(), $phone );
			$this->login_wp_user( $user->data->user_login, null, $phone );
		}

		/**
		 * The function is called to login the user
		 *
		 * @param array $user_log - the username of the user logging in.
		 * @param array $extra_data - Extra dada stored in the session during sending the OTP.
		 */
		private function login_wp_user( $user_log, $extra_data = null, $phone_number = null ) {
			$user = is_email( $user_log ) ? get_user_by( 'email', $user_log ) : get_user_by( 'login', $user_log );
			if ( ! $user && $this->mo_allow_login_through_phone() ) {
				$user = $this->mo_get_user_from_phone_number( $phone_number );
			}	
			if ( $user ) {
				wp_set_auth_cookie( $user->data->ID, true );
				if ( $this->delay_otp && $this->delay_otp_interval > 0 ) {
					update_user_meta( $user->data->ID, $this->time_stamp_meta_key, time() );
				}
				$this->unset_otp_session_variables();
				do_action( 'wp_login', $user->user_login, $user );
			}

			if ( 'redirect_to_the_page' === $this->redirect_after_login ) {
				$target = $this->redirect_to_page ? get_permalink( $this->redirect_to_page ) : site_url();
				if ( ! $target ) {
					$target = site_url();
				}
				wp_safe_redirect( $target );
				exit;
			} else {
				$redirect = MoUtility::is_blank( $extra_data ) ? site_url() : $extra_data;
				wp_safe_redirect( $redirect );
				exit;

			}
		}


		/**
		 * The function hooks into the authenticate hook of WordPress to
		 * start the OTP Verification process.
		 *
		 * @param array $user - the WordPress user data object containing all the user information.
		 * @param array $username - username of the user trying to log in.
		 * @param array $password - password of the user trying to log in.
		 * @return WP_Error|WP_User .
		 * @throws ReflectionException .
		 */
		public function mo_handle_mo_wp_login( $user, $username, $password ) {

			if ( ! MoUtility::is_blank( $username ) ) {
				$user = $this->mo_get_user( $username, $password );

				if ( is_wp_error( $user ) ) {
					return $user;
				}

				if ( class_exists( 'UM' ) ) {
					$user_id = $user->ID;
					um_fetch_user( $user_id );

					$status = um_user( 'account_status' );
					switch ( $status ) {
						case 'inactive':
						case 'awaiting_admin_review':
						case 'awaiting_email_confirmation':
						case 'rejected':
							um_reset_user();

							wp_safe_redirect( add_query_arg( 'err', esc_attr( $status ), UM()->permalinks()->get_current_url() ) );
							exit;
					}
				}

				$skip_otp_process = $this->skip_otp_process( $password, $user );

				if ( $this->mo_by_pass_login( $user, $skip_otp_process ) ) {
					return $user;
				}

				apply_filters( 'mo_master_otp_send_user', $user );
				MoPHPSessions::add_session_var( 'login_user_mo', $username );
				$this->startOTPVerificationProcess( $user, $username, $password );
			}
			return $user;
		}


		/**
		 * Function checks the type of verification enabled by the admins and then starts the appropriate
		 * OTP Verification.
		 *
		 * @param WP_User $user the user object of the user who needs to be logged in.
		 * @param string  $username the username provided by the user.
		 * @param string  $password the password provided by the user.
		 * @throws ReflectionException .
		 */
		private function startOTPVerificationProcess( $user, $username, $password ) {
			$otp_type = $this->get_verification_type();

			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_type )
			|| SessionUtils::is_status_match( $this->form_session_var2, self::VALIDATED, $otp_type ) ) {
				return;
			}

			if ( VerificationType::PHONE === $otp_type ) {
				$phone_number = get_user_meta( $user->data->ID, $this->get_phone_key_details(), true );
				$phone_number = MoUtility::process_phone_number( $phone_number );
				$this->mo_ask_phone_and_start_verification( $user, $this->get_phone_key_details(), $username, $phone_number );
				$this->mo_fetch_phone_and_start_verification( $username, $password, $phone_number );
			} elseif ( VerificationType::EMAIL === $otp_type ) {
				$email = $user->data->user_email;
				$this->mo_start_email_verification( $username, $email, $password );
			}
		}

		/**
		 * This functions checks if user has enabled phone number as a valid username and fetches the user
		 * associated with the phone number. Checks if the skip Password is enabled with feedback to handle
		 * OTP login and normal login.
		 *
		 * @param string $username the user's username.
		 * @param string $password the users's password.
		 * @return WP_Error|WP_User
		 */
		private function mo_get_user( $username, $password = null ) {
			$user = is_email( $username ) ? get_user_by( 'email', $username ) : get_user_by( 'login', $username );
			if ( ! $user && $this->allow_login_through_phone && MoUtility::validate_phone_number( $username ) ) {
				$user = $this->mo_get_user_from_phone_number( $username );
			}
			if ( $user && ! $this->mo_is_login_with_otp( $user->roles, $password ) ) {
				$user = wp_authenticate_username_password( null, $user->data->user_login, $password );
			}
			return $user ? $user : new WP_Error( 'INVALID_USERNAME', MoMessages::showMessage( MoMessages::INVALID_USERNAME ) );
		}


		/**
		 * Fetch the user associated with different input formats of the phone number.
		 *
		 * @param string $phone Entered phone number.
		 * @return bool|WP_User
		 */
		private function mo_get_user_from_phone_number( $phone ) {

			// get_user_from_db returns a user ID (int) or false.
			$user_id = $this->get_user_from_db( $phone );

			if ( MoUtility::is_blank( $user_id ) ) {
				if ( ! MoUtility::is_country_code_appended( $phone ) ) {
					$phone   = MoUtility::process_phone_number( $phone );
					$user_id = $this->get_user_from_db( $phone );
				} else {
					$country_code       = MoUtility::get_country_code( $phone );
					$phone_without_code = substr( $phone, strlen( $country_code ) );
					$user_id            = $this->get_user_from_db( $phone_without_code );
				}
			}

			return ! MoUtility::is_blank( $user_id ) ? get_userdata( $user_id ) : false;
		}

		/**
		 * Check if user exists in the database with the phone number.
		 *
		 * @param string $phone Processed phone number.
		 * @return int|false Returns user ID or false when not found.
		 */
		private function get_user_from_db( $phone ) {

			$users = get_users(
				array(
					'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Necessary to check for duplicate phone numbers. Caching implemented above.
						array(
							'key'     => $this->get_phone_key_details(),
							'value'   => $phone,
							'compare' => '=',
						),
					),
					'number'     => 1,
					'fields'     => 'ID',
				)
			);

			if ( empty( $users ) ) {
				return false;
			}

			return (int) $users[0];
		}


		/**
		 * This functions is used to ask users the phone number and start the otp verification
		 * process.
		 *
		 * @param object $user the WordPress user data object containing all the user information.
		 * @param string $key the phone user_meta key which stores the user's phone number.
		 * @param string $username the user's username.
		 * @param string $phone_number the phone number entered by the user.
		 * @throws ReflectionException .
		 */
		private function mo_ask_phone_and_start_verification( $user, $key, $username, $phone_number ) {
			if ( ! MoUtility::is_blank( $phone_number ) ) {
				return;
			}

			if ( ! $this->mo_save_phone_numbers() ) {
				miniorange_site_otp_validation_form(
					null,
					null,
					null,
					MoMessages::showMessage( MoMessages::PHONE_NOT_FOUND ),
					null,
					null
				);
			} else {
				MoUtility::initialize_transaction( $this->form_session_var );
				$this->send_challenge(
					null,
					$user->data->user_login,
					null,
					null,
					'external',
					null,
					array(
						'data'    => array( 'user_login' => $username ),
						'message' => MoMessages::showMessage( MoMessages::REGISTER_PHONE_LOGIN ),
						'form'    => $key,
						'curl'    => MoUtility::current_page_url(),
					),
					null,
					$this->form_session_var
				);
			}
		}


		/**
		 * This functions is used to fetch the phone number from the database and start
		 * the OTP Verification process.
		 *
		 * @param array $username - the user's username.
		 * @param array $password - the password provided by the user.
		 * @param array $phone_number - phone number to send otp to.
		 * @throws ReflectionException .
		 */
		private function mo_fetch_phone_and_start_verification( $username, $password, $phone_number ) {
			MoUtility::initialize_transaction( $this->form_session_var2 );
			$redirect_raw = MoUtility::get_current_page_parameter_value( 'redirect_to', '' );
			$redirect_to  = wp_validate_redirect( $redirect_raw, MoUtility::current_page_url() );
			$this->send_challenge( $username, null, null, $phone_number, VerificationType::PHONE, $password, $redirect_to, false, $this->form_session_var );
		}


		/**
		 * This functions is used to  start the otp verification process via email.
		 *
		 * @param array $username - the user's username.
		 * @param array $email - email to send otp to.
		 * @param array $password - password of the user.
		 * @throws ReflectionException .
		 */
		private function mo_start_email_verification( $username, $email, $password ) {
			MoUtility::initialize_transaction( $this->form_session_var2 );
			$redirect_raw = MoUtility::get_current_page_parameter_value( 'redirect_to', '' );
			$redirect_to  = wp_validate_redirect( $redirect_raw, MoUtility::current_page_url() );
			$this->send_challenge( $username, $email, null, null, VerificationType::EMAIL, $password, $redirect_to, false, $this->form_session_var );
		}


		/**
		 * This function is used to send the OTP to the user's phone number.
		 *
		 * @param array $post_data - $_POST.
		 */
		private function mo_handle_wp_login_ajax_send_otp( $post_data ) {
			$user_phone = $post_data['user_phone'];
			MoUtility::initialize_transaction( $this->form_session_var );
			if ( $this->restrict_duplicates() && ! MoUtility::is_blank( $this->mo_get_user_from_phone_number( $user_phone ) ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::PHONE_EXISTS ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} elseif ( SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				$this->send_challenge( 'ajax_phone', '', null, $user_phone, VerificationType::PHONE, null, $post_data, null, $this->form_session_var );
			} else {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}


		/**
		 * This function is used to process the OTP entered by the user. Check
		 * if the phone number being sent is the same one OTP was sent to .
		 *
		 * @param array $post_data - $_POST.
		 */
		private function mo_handle_wp_login_ajax_form_validate_action( $post_data ) {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				return;
			}

			$phone = MoPHPSessions::get_session_var( 'phone_number_mo' );
			if ( strcmp( $phone, MoUtility::process_phone_number( $post_data['user_phone'] ) ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$this->validate_challenge( $this->get_verification_type() );
			}
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
			if ( SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				SessionUtils::add_status( $this->form_session_var, self::VERIFICATION_FAILED, $otp_type );
				wp_send_json( MoUtility::create_json( MoMessages::showMessage( MoMessages::INVALID_OTP ), MoConstants::ERROR_JSON_TYPE ) );
			}

			if ( SessionUtils::is_otp_initialized( $this->form_session_var2 ) ) {
				miniorange_site_otp_validation_form(
					$user_login,
					$user_email,
					$phone_number,
					MoMessages::showMessage( MoMessages::INVALID_OTP ),
					'phone',
					false
				);
			}
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
			if ( ( ! isset( $_POST['mopopup_wpnonce'] ) || ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['mopopup_wpnonce'] ) ), 'mo_popup_options' ) ) ) ) {
				return;
			}
			if ( SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
				wp_send_json( MoUtility::create_json( '', MoConstants::SUCCESS_JSON_TYPE ) );
			}

			if ( SessionUtils::is_otp_initialized( $this->form_session_var2 ) ) {
				$username = MoUtility::is_blank( $user_login ) ? MoUtility::sanitize_check( 'log', $_POST ) : $user_login;
				$username = MoUtility::is_blank( $username ) ? MoUtility::sanitize_check( 'username', $_POST ) : $username;
				$this->login_wp_user( $username, $extra_data, $phone_number );
			}
		}


		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var, $this->form_session_var2 ) );
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
			if ( $this->is_form_enabled() ) {
				array_push( $selector, $this->phone_form_id );
			}
			return $selector;
		}


		/**
		 * Checks if user has initiated login with OTP.
		 *
		 * @param array  $user_roles  to check the user roles.
		 * @param string $password password entered by the user.
		 * @return bool TRUE or FALSE
		 */
		private function mo_is_login_with_otp( $user_roles = array(), $password = null ) {
			if ( in_array( 'administrator', $user_roles, true ) && $this->by_pass_admin ) {
				return false;
			}

			if ( $this->skip_password_check && $this->skip_pass_fallback && isset( $password ) && ! empty( $password ) ) {
				return false;
			} elseif ( $this->skip_password_check && $this->skip_pass_fallback && ( ! isset( $password ) || empty( $password ) ) ) {
				return true;
			} elseif ( $this->skip_password_check && ! $this->skip_pass_fallback && isset( $password ) && ! empty( $password ) ) {
				return true;
			} elseif ( $this->skip_password_check && ! $this->skip_pass_fallback && ( ! isset( $password ) || empty( $password ) ) ) {
				return true;
			}
			return false;
		}

		/**
		 * Check if the user needs to be validated via OTP. Makes sure to check if admin has
		 * allowed fallback. If so check if password is entered by the user. If password is entered
		 * then do not initiate OTP
		 *
		 * @param string $password password entered by the user.
		 * @param object $user     roles of the user trying to log in.
		 * @return bool
		 */
		private function skip_otp_process( $password, $user ) {
			$user_meta = get_userdata( $user->data->ID );
			return $this->skip_password_check && $this->skip_pass_fallback && isset( $password ) && ! $this->mo_is_login_with_otp( $user_meta->roles, $password );
		}



		/**
		 * Checks to see if delay OTP has been enabled and if user's last verified DTTM is
		 * greater or equal to the time interval that has been set.
		 *
		 * @param int $user_id    user id of the user.
		 * @return bool TRUE or FALSE
		 */
		private function mo_delay_otp_process( $user_id ) {
			if ( $this->delay_otp && $this->delay_otp_interval < 0 ) {
				return true;
			}
			$last_verified_dttm = get_user_meta( $user_id, $this->time_stamp_meta_key, true );
			if ( MoUtility::is_blank( $last_verified_dttm ) ) {
				return false;
			}
			$time_diff = time() - $last_verified_dttm;
			return $this->delay_otp && $time_diff < ( $this->delay_otp_interval * 60 );
		}

		/**
		 * Handles saving all the WordPress Login Form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'wp_login_enable' ) ) {
				return;
			}

			$this->is_form_enabled             = $this->sanitize_form_post( 'wp_login_enable' );
			$this->save_phone_numbers          = $this->sanitize_form_post( 'wp_login_register_phone' );
			$this->by_pass_admin               = $this->sanitize_form_post( 'wp_login_bypass_admin' );
			$this->phone_key                   = $this->sanitize_form_post( 'wp_login_phone_field_key' );
			$this->allow_login_through_phone   = $this->sanitize_form_post( 'wp_login_allow_phone_login' );
			$this->restrict_duplicates         = $this->sanitize_form_post( 'wp_login_restrict_duplicates' );
			$this->otp_type                    = $this->sanitize_form_post( 'wp_login_enable_type' );
			$this->skip_password_check         = $this->sanitize_form_post( 'wp_login_skip_password' );
			$this->user_label                  = $this->sanitize_form_post( 'wp_username_label_text' );
			$this->skip_pass_fallback          = $this->sanitize_form_post( 'wp_login_skip_password_fallback' );
			$this->delay_otp                   = $this->sanitize_form_post( 'wp_login_delay_otp' );
			$this->delay_otp_interval          = $this->sanitize_form_post( 'wp_login_delay_otp_interval' );
			$this->redirect_after_login        = $this->sanitize_form_post( 'wp_login_redirection_enable' );
			$this->login_with_otp_button_text  = $this->sanitize_form_post( 'wp_login_with_otp_button_text' );
			$this->login_with_pass_button_text = $this->sanitize_form_post( 'wp_login_with_pass_button_text' );
			$this->login_with_pass_button_css  = $this->sanitize_form_post( 'wp_login_with_pass_button_css' );
			$page_id                           = $this->sanitize_form_post( 'mo_login_page_id', '' );
			$this->redirect_to_page            = $page_id ? absint( $page_id ) : 0;

			update_mo_option( 'wp_login_enable_type', $this->otp_type );
			update_mo_option( 'wp_login_enable', $this->is_form_enabled );
			update_mo_option( 'wp_login_register_phone', $this->save_phone_numbers );
			update_mo_option( 'wp_login_bypass_admin', $this->by_pass_admin );
			update_mo_option( 'wp_login_key', $this->phone_key );
			update_mo_option( 'wp_login_allow_phone_login', $this->allow_login_through_phone );
			update_mo_option( 'wp_login_restrict_duplicates', $this->restrict_duplicates );
			update_mo_option( 'wp_login_skip_password', $this->skip_password_check && $this->is_form_enabled );
			update_mo_option( 'wp_login_skip_password_fallback', $this->skip_pass_fallback );
			update_mo_option( 'wp_username_label_text', $this->user_label );
			update_mo_option( 'wp_login_delay_otp', $this->delay_otp && $this->is_form_enabled );
			update_mo_option( 'wp_login_delay_otp_interval', $this->delay_otp_interval );
			update_mo_option( 'wp_login_redirection_enable', $this->redirect_after_login );
			update_mo_option( 'login_custom_redirect', $this->redirect_to_page );
			update_mo_option( 'wp_login_with_pass_button_text', $this->login_with_pass_button_text );
			update_mo_option( 'wp_login_with_pass_button_css', $this->login_with_pass_button_css );
			update_mo_option( 'wp_login_with_otp_button_text', $this->login_with_otp_button_text );
		}



		/*
		|--------------------------------------------------------------------------------------------------------
		| Getters
		|--------------------------------------------------------------------------------------------------------
		*/
		/**
		 * Checks if admin has set the option to save the phone number in the database for each user.
		 *
		 * @return string
		 */
		public function mo_save_phone_numbers() {
			return $this->save_phone_numbers; }

		/**
		 * Checks if admin has set the option to bypass two factor for logged in users.
		 *
		 * @return string
		 */
		public function mo_by_pass_check_for_admins() {
			return $this->by_pass_admin; }

		/**
		 * Checks if admin has set the option to allow phone number login
		 *
		 * @return String
		 */
		public function mo_allow_login_through_phone() {
			return $this->allow_login_through_phone; }

		/**
		 * Checks if admin has set the option to allow login through username+otp
		 *
		 * @return bool|String
		 */
		public function mo_get_skip_password_check() {
			return $this->skip_password_check; }

		/**
		 * Gets the User Label Text to be shown on the Default Login Form
		 *
		 * @return string
		 */
		public function mo_get_user_label() {
			return $this->user_label; }

		/**
		 * Checks if admin has set the option to allow users to use username + password as well as username + otp
		 *
		 * @return bool
		 */
		public function mo_get_skip_password_check_fallback() {
			return $this->skip_pass_fallback; }

		/**
		 * Getter for $delay_otp
		 *
		 * @return bool
		 */
		public function mo_is_delay_otp() {
			return $this->delay_otp; }

		/**
		 * Getter for $delay_otp_interval
		 *
		 * @return int
		 */
		public function mo_get_delay_otp_interval() {
			return $this->delay_otp_interval; }

		/**
		 * Checks if admin has set the option to redirect users after loggin in
		 *
		 * @return bool
		 */
		public function mo_select_redirection_after_login() {
			return $this->redirect_after_login; }

		/**
		 * Getter for $redirect_to_page
		 *
		 * @return string
		 */
		public function mo_redirect_to_page() {
			return $this->redirect_to_page; }

		/**
		 * Getter for $login_with_pass_button_text
		 *
		 * @return string
		 */
		public function mo_get_login_with_pass_button_text() {
			return $this->login_with_pass_button_text; }

		/**
		 * Getter for $login_with_pass_button_css
		 *
		 * @return string
		 */
		public function mo_get_login_with_pass_button_css() {
			return $this->login_with_pass_button_css; }

		/**
		 * Getter for $login_with_otp_button_text
		 *
		 * @return string
		 */
		public function mo_get_login_with_otp_button_text() {
			return $this->login_with_otp_button_text; }

		/**
		 * Retrieves email and phone data from the submitted form.
		 *
		 * @return array {
		 *     @type string $email email address.
		 *     @type string $phone phone number.
		 * }
		 */
		public function get_email_phone_data() {
			if ( ! isset( $_POST['mopopup_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['mopopup_wpnonce'] ) ), 'mo_popup_options' ) ) {
				return array(
					'email' => '',
					'phone' => '',
				);
			}
			$data  = MoUtility::mo_sanitize_array( $_POST );
			$phone = isset( $data['phone_number_mo'] ) ? $data['phone_number_mo'] : '';
			return array(
				'email' => '',
				'phone' => $phone,
			);
		}
	}
}
