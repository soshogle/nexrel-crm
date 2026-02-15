<?php
/**
 * Load the backend functionality for OTP Verification process for Latest Woocommerce Checkout Form(New UI) form.
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
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Helper\Templates\DefaultPopup;
use OTP\Traits\Instance;
use ReflectionException;
use WC_Checkout;
use WP_Error;

/**
 * This is the WooCommerce CheckOut form class. This class handles all the
 * functionality related to WooCommerce CheckOut form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 *
 * @todo scripts needs to be better managed
 * @todo disable autologin after checkout needs to be better managed
 */
if ( ! class_exists( 'MoWCCheckoutNew' ) ) {
	/**
	 * MoWCCheckoutNew class
	 */
	class MoWCCheckoutNew extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Enabled default address on the WooCommerce Checkout Form.
		 *
		 * @var string
		 */
		private $enabled_address;

		/**
		 * Should show a popUp for verifying the OTP
		 * sent instead of fields on the page
		 *
		 * @var boolean
		 */
		private $popup_enabled;

		/**
		 * Should OTP Verification be applied only
		 * for guest users
		 *
		 * @var bool
		 */
		private $guest_check_out_only;


		/**
		 * The array of all the available payment
		 * options
		 *
		 * @var array
		 */
		private $payment_methods;

		/**
		 * Option to enable/disable OTP Verification based
		 * on payment type
		 *
		 * @var bool
		 */
		private $selective_payment;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::WC_NEW_CHECKOUT;
			$this->type_phone_tag          = 'mo_wc_phone_enable';
			$this->type_email_tag          = 'mo_wc_email_enable';
			$this->form_key                = 'WC_CHECKOUT_FORM';
			$this->form_name               = 'Woocommerce Checkout Form';
			$this->is_form_enabled         = $this->mo_get_migrated_option( 'wc_new_checkout_enable', 'wc_checkout_enable' );
			$this->form_documents          = MoFormDocs::WC_NEW_CHECKOUT_LINK;
			$this->generate_otp_action     = 'mo_new_wc_send_otp';
			$this->validate_otp_action     = 'mo_new_wc_verify_otp';
			$this->button_text             = get_mo_option( 'wc_checkout_button_link_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
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
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			if ( ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
				return;
			}

			if ( ! mo_is_block_based_checkout() ) {
				return; // Block-based checkout logic.
			}

			if ( ! class_exists( 'WC_Shipping_Zones' ) ) {
				$this->enabled_address = 'billing';
			} else {
				$this->enabled_address = $this->get_woocommerce_shipping_address_setting();
			}
			$this->phone_form_id        = 'shipping' === $this->enabled_address ? '#shipping-phone' : '#billing-phone';
			$this->otp_type             = $this->mo_get_migrated_option( 'wc_new_checkout_type', 'wc_checkout_type' );
			$this->payment_methods      = maybe_unserialize( get_mo_option( 'wc_checkout_payment_type' ) );
			$this->selective_payment    = get_mo_option( 'wc_checkout_selective_payment' );
			$this->popup_enabled        = $this->mo_get_migrated_option( 'wc_new_checkout_popup', 'wc_checkout_popup' );
			$this->guest_check_out_only = $this->mo_get_migrated_option( 'wc_new_checkout_guest', 'wc_checkout_guest' );
			$this->restrict_duplicates  = get_mo_option( 'wc_checkout_restrict_duplicates' );

			if ( function_exists( 'WC' ) ) {
				$this->payment_methods = $this->payment_methods ? $this->payment_methods : WC()->payment_gateways->payment_gateways();
			}
			if ( $this->guest_check_out_only && is_user_logged_in() ) {
				return;
			}
			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'send_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'send_otp' ) );

			add_action( "wp_ajax_{$this->validate_otp_action}", array( $this, 'process_form_and_validate_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->validate_otp_action}", array( $this, 'process_form_and_validate_otp' ) );

			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_script_on_page' ) );
			add_action( 'woocommerce_store_api_checkout_order_processed', array( $this, 'my_custom_checkout_field_process' ), 99, 1 );
		}

		/**
		 * Check if block checkout option was enabled on the instance.
		 *
		 * @param string $key1 the first key.
		 * @param string $key2 the second key.
		 */
		private function mo_get_migrated_option( $key1, $key2 ) {
			$first_option_saved = get_mo_option( $key1 );
			if ( $first_option_saved ) {
				update_mo_option( $key2, $first_option_saved );
				delete_mo_option( $key1 );
			}
			return get_mo_option( $key2 );
		}

		/**
		 * Get the shipping address setting from WooCommerce.
		 */
		private function get_woocommerce_shipping_address_setting() {
			if ( empty( \WC_Shipping_Zones::get_zones() ) ) {
				return 'billing';
			}
			$ship_to_destination = get_option( 'woocommerce_ship_to_destination' );

			if ( 'billing_only' === $ship_to_destination ) {
				return 'billing';
			} else {
				return $this->has_shipping_methods() ? 'shipping' : 'billing';
			}
		}

		/**
		 * Check if the shipping zones added has shipping methods saved.
		 */
		private function has_shipping_methods() {
			$zones                = \WC_Shipping_Zones::get_zones();
			$has_shipping_methods = false;

			foreach ( $zones as $zone ) {
				$selected_zone    = new \WC_Shipping_Zone( $zone['id'] );
				$shipping_methods = $selected_zone->get_shipping_methods();

				if ( ! empty( $shipping_methods ) ) {
					$has_shipping_methods = true;
					break;
				}
			}

			$default_zone             = new \WC_Shipping_Zone( 0 );
			$default_shipping_methods = $default_zone->get_shipping_methods();

			if ( ! empty( $default_shipping_methods ) ) {
				$has_shipping_methods = true;
			}

			return $has_shipping_methods;
		}

		/**
		 * The function is used to process the email or phone number provided
		 * and send OTP to it for verification. This is called from the form
		 * using AJAX calls.
		 */
		public function send_otp() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$data = MoUtility::mo_sanitize_array( wp_unslash( $_POST ) );
			MoPHPSessions::check_session();
			MoUtility::initialize_transaction( $this->form_session_var );
			if ( MoUtility::sanitize_check( 'otpType', $data ) === VerificationType::PHONE ) {
				$this->check_phone_validity( $data );
				$this->process_phone_and_send_otp( $data );
			}
			if ( MoUtility::sanitize_check( 'otpType', $data ) === VerificationType::EMAIL ) {
				$this->process_email_and_send_otp( $data );
			}
		}

		/**
		 * Checks if the phone is valid and not a duplicate
		 * if admin has enabled the restrictDuplicate option
		 *
		 * @param array $get_data    $_GET data.
		 */
		private function check_phone_validity( $get_data ) {
			if ( $this->is_phone_number_already_in_use( $get_data['user_phone'] ) && $this->restrict_duplicates ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::PHONE_EXISTS ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Checks if the Phone number is already associated with any other account.
		 *
		 * @param string $phone Phone number in the checkout form.
		 * @return boolean
		 */
		private function is_phone_number_already_in_use( $phone ) {
			$phone = MoUtility::process_phone_number( $phone );
			$key   = $this->enabled_address . '_phone';

			// Create cache key based on phone number and meta key.
			$cache_key   = 'mo_wc_phone_in_use_' . md5( $phone . '_' . $key );
			$cache_group = 'mo_wc_checkout';

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
		 * Validates phone entered by the user and calls function for sending OTP.
		 *
		 * @param array $data - Post data submitted on the send OTP ajax call.
		 */
		private function process_phone_and_send_otp( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_phone', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$user_phone = MoUtility::process_phone_number( $data['user_phone'] );
				SessionUtils::add_phone_verified( $this->form_session_var, $user_phone );
				$this->send_challenge( '', null, null, $user_phone, VerificationType::PHONE );
			}
		}

		/**
		 * Validates email entered by the user and calls function for sending OTP.
		 *
		 * @param array $data - Post data submitted on the send OTP ajax call.
		 */
		private function process_email_and_send_otp( $data ) {
			MoPHPSessions::check_session();
			if ( ! MoUtility::sanitize_check( 'user_email', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$raw_email       = isset( $data['user_email'] ) ? (string) $data['user_email'] : '';
				$sanitized_email = sanitize_email( wp_unslash( $raw_email ) );
				if ( empty( $sanitized_email ) || ! is_email( $sanitized_email ) ) {
					$display_email = sanitize_text_field( $raw_email );
					$message       = str_replace( '##email##', $display_email, MoMessages::showMessage( MoMessages::ERROR_EMAIL_FORMAT ) );
					wp_send_json(
						MoUtility::create_json(
							$message,
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
				SessionUtils::add_email_verified( $this->form_session_var, $sanitized_email );
				$this->send_challenge( '', $sanitized_email, null, null, VerificationType::EMAIL );
			}
		}

		/**
		 * Checks if OTP is entered and validates the OTP.
		 */
		public function process_form_and_validate_otp() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$data = MoUtility::mo_sanitize_array( wp_unslash( $_POST ) );
			$this->check_integrity_and_validate_otp( $data );
		}

		/**
		 * Checks if email or phone is altered after the OTP is sent.
		 * Also, verifies the OTP.
		 *
		 * @param array $data - post data submitted on validate OTP button.
		 */
		private function check_integrity_and_validate_otp( $data ) {
			$this->check_integrity( $data );
			$this->validate_challenge( sanitize_text_field( $data['otpType'] ), null, sanitize_text_field( $data['otp_token'] ) );
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $data['otpType'] ) ) {
				MoPHPSessions::add_session_var( 'is_otp_verified_' . $data['otpType'], true );
				wp_send_json(
					MoUtility::create_json(
						MoConstants::SUCCESS_JSON_TYPE,
						MoConstants::SUCCESS_JSON_TYPE
					)
				);
			} else {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OTP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Checks if email or phone is altered after the OTP is sent.
		 *
		 * @param array $data - post data submitted on validate OTP button.
		 */
		private function check_integrity( $data ) {
			if ( VerificationType::PHONE === $data['otpType'] ) {
				$phone = MoUtility::process_phone_number( sanitize_text_field( $data['user_phone'] ) );
				if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
					wp_send_json(
						MoUtility::create_json(
							MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
			}
			if ( VerificationType::EMAIL === $data['otpType'] ) {
				if ( ! SessionUtils::is_email_verified_match( $this->form_session_var, sanitize_email( $data['user_email'] ) ) ) {
					wp_send_json(
						MoUtility::create_json(
							MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
			}
		}

		/**
		 * Process the checkout form being submitted. Validate if
		 * OTP has been sent and the form has been submitted with an OTP.
		 *
		 * @param object $order The details submitted by the form.
		 */
		public function my_custom_checkout_field_process( $order ) {
			$order_details    = $order->get_data();
			$billing_details  = $order_details['billing'];
			$shipping_details = $order_details['shipping'];
			$payment_method   = $order_details['payment_method'];

			if ( ! $this->is_payment_verification_needed( $payment_method ) ) {
				return;
			}

			$message = $this->handle_otp_token_submitted( $billing_details, $shipping_details ) ? $this->handle_otp_token_submitted( $billing_details, $shipping_details ) : null;
			if ( ! empty( $message ) ) {
				if ( function_exists( 'WC' ) ) {
					$notices = WC()->session->get( 'wc_notices', array() );
				}

				$message = apply_filters( 'woocommerce_add_error', $message );
				if ( ! empty( $message ) ) {
					$notices['error'][] = array(
						'notice' => $message,
						'data'   => $order,
					);
				}
				if ( function_exists( 'WC' ) ) {
					return WC()->session->set( 'wc_notices', $notices );
				}
			} else {
				$this->unset_otp_session_variables();
			}
		}

		/**
		 * Checks if OTP Verification is enabled for the current.
		 *
		 * @param string $payment_method - payment method selected.
		 */
		private function is_payment_verification_needed( $payment_method ) {
			return $this->selective_payment ? array_key_exists( $payment_method, $this->payment_methods ) : true;
		}

		/**
		 * Validate if the phone number or email otp was sent to and
		 * the phone number and email in the final submission are the
		 * same. If not then throw an error.
		 *
		 * @param array $billing_data - billing data from form submission.
		 * @param array $shipping_data - shipping data from form submission.
		 */
		public function handle_otp_token_submitted( $billing_data, $shipping_data ) {
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				return $this->process_phone_number( $shipping_data );
			} else {
				return $this->process_email( $billing_data );
			}
		}

		/**
		 * Check to see if email address OTP was sent to and the phone number
		 * submitted in the final form submission are the same.
		 *
		 * @param array $data post data.
		 */
		public function process_phone_number( $data ) {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) || ! MoPHPSessions::get_session_var( 'is_otp_verified_phone' ) ) {
				$message = MoMessages::showMessage( MoMessages::ENTER_PHONE_VERIFY_CODE );
				return $message;
			}
			$phone = MoUtility::process_phone_number( sanitize_text_field( $data['phone'] ) );
			if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
				$message = MoMessages::showMessage( MoMessages::PHONE_MISMATCH );
				return $message;
			}
		}

		/**
		 * Check to see if email address OTP was sent to and the phone number
		 * submitted in the final form submission are the same.
		 *
		 * @param array $data post data.
		 */
		public function process_email( $data ) {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) || ! MoPHPSessions::get_session_var( 'is_otp_verified_email' ) ) {
				$message = MoMessages::showMessage( MoMessages::ENTER_EMAIL_VERIFY_CODE );
				return $message;
			}
			if ( ! SessionUtils::is_email_verified_match( $this->form_session_var, sanitize_email( $data['email'] ) ) ) {
				$message = MoMessages::showMessage( MoMessages::EMAIL_MISMATCH );
				return $message;
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
		 * This function is used to enqueue script on the frontend to facilitate
		 * OTP Verification for the FormCraft form. This function
		 * also localizes certain values required by the script.
		 */
		public function enqueue_script_on_page() {
			$script_url = MOV_URL . 'includes/js/mowccheckoutnew.js?version=' . MOV_VERSION;
			wp_register_script( 'wccheckout', $script_url, array( 'jquery' ), MOV_VERSION, true );

			// Build popup HTML (used on block-based checkout when popup is enabled).
			$popup_html = '';
			if ( $this->popup_enabled ) {
				$default_popup_handler = DefaultPopup::instance();
				$message               = '<div id="mo_message_wc_pop_up"></div>';
				$otp_type              = 'mo_wc_phone_enable' === $this->otp_type ? 'phone' : 'email';
				$from_both             = 'from_both';
				$template_content      = apply_filters( 'mo_template_build', '', $default_popup_handler->get_template_key(), $message, $otp_type, $from_both );
				$popup_html            = '<div id="popup_wc_mo" style="display:none">' . $template_content . '</div>';
			}
			wp_localize_script(
				'wccheckout',
				'mowcnewcheckout',
				array(
					'siteURL'                 => admin_url( 'admin-ajax.php' ),
					'otpType'                 => strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? 'phone' : 'email',
					'field'                   => strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? ( 'shipping' === $this->enabled_address ? 'shipping-phone' : 'billing-phone' ) : 'email',
					'gaction'                 => $this->generate_otp_action,
					'vaction'                 => $this->validate_otp_action,
					'otp_length_mo'           => get_mo_option( 'otp_length' ) ? get_mo_option( 'otp_length' ) : 5,
					'popupEnabled'            => $this->popup_enabled,
					'popupHtml'               => $popup_html,
					'popupInputPattern'       => MoConstants::POPUP_INPUT_PATTERN,
					'nonce'                   => wp_create_nonce( $this->nonce ),
					'otp_timer_enable'        => get_mo_option( 'otp_timer_enable', 'mo_rc_sms_' ),
					'otp_timer'               => get_mo_option( 'otp_timer', 'mo_rc_sms_' ),
					'paymentMethods'          => $this->payment_methods,
					'selectivePaymentEnabled' => $this->selective_payment,
					'buttonText'              => $this->button_text,
				)
			);
			wp_enqueue_script( 'wccheckout' );
		}


		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
			MoPHPSessions::unset_session( 'is_otp_verified_phone' );
			MoPHPSessions::unset_session( 'is_otp_verified_email' );
		}

		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param  array $selector the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && ( $this->otp_type === $this->type_phone_tag ) ) {
				array_push( $selector, $this->phone_form_id );
			}
			return $selector;
		}


		/**
		 * Handles saving all the woocommerce checkout form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'wc_checkout_enable' ) ) {
				return;
			}
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			if ( $this->sanitize_form_post( 'wc_checkout_enable' ) && ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
				$message = MoMessages::showMessage( MoMessages::PLUGIN_INSTALL, array( 'formname' => $this->form_name ) );
				do_action( 'mo_registration_show_message', $message, MoConstants::ERROR );
				return;
			}
			$payment_methods = array();
			$wc_payment      = $this->sanitize_form_post( 'wc_payment', '' );
			if ( ! empty( $wc_payment ) ) {
				foreach ( $wc_payment as $selected ) {
					$payment_methods[ $selected ] = $selected;
				}
			}

			$this->is_form_enabled      = $this->sanitize_form_post( 'wc_checkout_enable' );
			$this->otp_type             = $this->sanitize_form_post( 'wc_checkout_type' );
			$this->guest_check_out_only = $this->sanitize_form_post( 'wc_checkout_guest' );
			$this->popup_enabled        = $this->sanitize_form_post( 'wc_checkout_popup' );
			$this->selective_payment    = $this->sanitize_form_post( 'wc_checkout_selective_payment' );
			$this->button_text          = $this->sanitize_form_post( 'wc_checkout_button_link_text' );
			$this->payment_methods      = $payment_methods;
			$this->restrict_duplicates  = $this->sanitize_form_post( 'wc_checkout_restrict_duplicates' );

			if ( $this->basic_validation_check( BaseMessages::WC_CHECKOUT_CHOOSE ) ) {
				update_mo_option( 'wc_checkout_restrict_duplicates', $this->restrict_duplicates );
				update_mo_option( 'wc_checkout_enable', $this->is_form_enabled );
				update_mo_option( 'wc_checkout_type', $this->otp_type );
				update_mo_option( 'wc_checkout_guest', $this->guest_check_out_only );
				update_mo_option( 'wc_checkout_popup', $this->popup_enabled );
				update_mo_option( 'wc_checkout_selective_payment', $this->selective_payment );
				update_mo_option( 'wc_checkout_button_link_text', $this->button_text );
				update_mo_option( 'wc_checkout_payment_type', maybe_serialize( $payment_methods ) );
			}
		}

		/**
		 * Getter for guest checkout option
		 *
		 * @return bool
		 */
		public function isGuestCheckoutOnlyEnabled() {
			return $this->guest_check_out_only; }

		/**
		 * Getter for payment methods for which OTP Verification has been enabled for Block checkout
		 *
		 * @return array
		 */
		public function getPaymentMethods() {
			return $this->payment_methods;
		}

		/**
		 * Getter for is popup enabled for otp verification during wc checkout
		 *
		 * @return bool
		 */
		public function isPopUpEnabled() {
			return $this->popup_enabled; }

		/**
		 * Getter for is selective payment enabled (based on payment methods)
		 *
		 * @return bool
		 */
		public function isSelectivePaymentEnabled() {
			return $this->selective_payment;
		}
	}
}
