<?php
/**
 * Load administrator changes for MoUtility
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\NotificationSettings;
use OTP\Objects\TabDetails;
use OTP\Objects\Tabs;
use OTP\Objects\VerificationType;
use ReflectionClass;
use ReflectionException;
use stdClass;
use OTP\LicenseLibrary\Mo_License_Service;
use OTP\Helper\MoConstants;
use OTP\Helper\CountryList;

/**
 * This is the main Utility class of the plugin.
 * Lists down all the necessary common utility
 * functions being used in the plugin.
 */
if ( ! class_exists( 'MoUtility' ) ) {
	/**
	 * MoUtility class
	 */
	class MoUtility {


		/**
		 * Checking Script tags
		 *
		 * @param string $template checking script tag.
		 * @return string
		 */
		public static function check_for_script_tags( $template ) {
			return preg_match( '/<script>/', $template, $match );
		}

		/**
		 * Sanitizing array
		 *
		 * @param array $data data array to be sanitized.
		 * @return array
		 */
		public static function mo_sanitize_array( $data ) {
			$sanitized_data = array();
			foreach ( $data as $key => $value ) {
				if ( is_array( $value ) ) {
					$sanitized_data[ $key ] = self::mo_sanitize_array( $value );
				} else {
					$sanitized_data[ $key ] = sanitize_text_field( wp_unslash( $value ) );
				}
			}
			return $sanitized_data;
		}

		/**
		 * MoInternal Function
		 *
		 * @return array
		 */
		public static function mo_allow_html_array() {
			$allowed_tags = array(
				'a'          => array(
					'style'  => array(),
					'class'  => array(),
					'href'   => array(),
					'rel'    => array(),
					'title'  => array(),
					'hidden' => array(),
					'target' => array(),
				),
				'b'          => array(
					'style' => array(),
					'class' => array(),
					'id'    => array(),
				),
				'blockquote' => array(
					'cite' => array(),
				),
				'code'       => array(),
				'del'        => array(
					'datetime' => array(),
					'title'    => array(),
				),
				'div'        => array(
					'name'   => array(),
					'dir'    => array(),
					'id'     => array(),
					'class'  => array(),
					'title'  => array(),
					'style'  => array(),
					'hidden' => array(),
				),
				'dl'         => array(),
				'dt'         => array(),
				'em'         => array(),
				'h1'         => array(),
				'h2'         => array(),
				'h3'         => array(),
				'h4'         => array(),
				'h5'         => array(),
				'h6'         => array(),
				'hr'         => array(),
				'i'          => array(),
				'textarea'   => array(
					'id'          => array(),
					'class'       => array(),
					'name'        => array(),
					'row'         => array(),
					'style'       => array(),
					'placeholder' => array(),
					'readonly'    => array(),
				),
				'img'        => array(
					'alt'    => array(),
					'class'  => array(),
					'height' => array(),
					'style'  => array(),
					'src'    => array(),
					'width'  => array(),
					'href'   => array(),
					'hidden' => array(),
				),
				'link'       => array(
					'rel'    => array(),
					'type'   => array(),
					'href'   => array(),
					'hidden' => array(),
				),
				'li'         => array(
					'class'  => array(),
					'hidden' => array(),
				),
				'ol'         => array(
					'class' => array(),
				),
				'p'          => array(
					'class'  => array(),
					'hidden' => array(),
					'style'  => array(),
				),
				'q'          => array(
					'cite'  => array(),
					'title' => array(),
				),
				'span'       => array(
					'id'     => array(),
					'value'  => array(),
					'class'  => array(),
					'title'  => array(),
					'style'  => array(),
					'hidden' => array(),
				),
				'strike'     => array(),
				'strong'     => array(),
				'u'          => array(),
				'ul'         => array(
					'class' => array(),
					'style' => array(),
				),
				'form'       => array(
					'name'   => array(),
					'method' => array(),
					'id'     => array(),
					'style'  => array(),
					'hidden' => array(),
				),
				'table'      => array(
					'class'       => array(),
					'style'       => array(),
					'cellpadding' => array(),
					'cellspacing' => array(),
					'border'      => array(),
					'width'       => array(),
				),
				'tbody'      => array(),
				'button'     => array(),
				'tr'         => array(),
				'td'         => array(
					'class' => array(),
					'style' => array(),
				),
				'input'      => array(
					'type'          => array(),
					'id'            => array(),
					'name'          => array(),
					'value'         => array(),
					'class'         => array(),
					'size '         => array(),
					'tabindex'      => array(),
					'hidden'        => array(),
					'style'         => array(),
					'placeholder'   => array(),
					'disabled'      => array(),
					'data-next'     => array(),
					'data-previous' => array(),
					'maxlength'     => array(),
				),
				'br'         => array(),
				'title'      => array(
					'title' => true,
				),
			);
			return $allowed_tags;
		}

		/**
		 * Allowing tags for popup templates
		 *
		 * @return array
		 */
		public static function mo_allow_popup_tags() {
			$allowed_tags = array(
				'head'           => array(),
				'title'          => array(),
				'meta'           => array(
					'http-equiv' => array(),
					'content'    => array(),
					'name'       => array(),
				),
				'html'           => array(),
				'body'           => array(),
				'div'            => array(
					'name'     => array(),
					'dir'      => array(),
					'id'       => array(),
					'class'    => array(),
					'title'    => array(),
					'style'    => array(),
					'tabindex' => array(),
					'role'     => array(),
					'hidden'   => array(),
				),
				'link'           => array(
					'href'   => array(),
					'target' => array(),
					'rel'    => array(),
					'type'   => array(),
					'title'  => array(),
					'hidden' => array(),
				),
				'input'          => array(
					'type'     => array(),
					'id'       => array(),
					'name'     => array(),
					'value'    => array(),
					'class'    => array(),
					'size '    => array(),
					'tabindex' => array(),
					'hidden'   => array(),
				),
				'button'         => array(
					'class' => array(),
					'id'    => array(),
					'type'  => array(),
					'name'  => array(),
					'value' => array(),
				),
				'form'           => array(
					'name'   => array(),
					'method' => array(),
					'action' => array(),
					'id'     => array(),
					'class'  => array(),
					'hidden' => array(),
				),
				'br'             => array(),
				'i'              => array(),
				'u'              => array(),
				'span'           => array(
					'id'     => array(),
					'value'  => array(),
					'class'  => array(),
					'title'  => array(),
					'style'  => array(),
					'hidden' => array(),
				),
				'a'              => array(
					'href'   => array(),
					'target' => array(),
					'rel'    => array(),
					'title'  => array(),
					'hidden' => array(),
					'class'  => array(),
				),
				'svg'            => array(
					'class'   => array(),
					'id'      => array(),
					'width'   => array(),
					'height'  => array(),
					'viewBox' => array(),
					'viewbox' => array(),
					'fill'    => array(),
				),
				'circle'         => array(
					'id' => array(),
					'cx' => array(),
					'cy' => array(),
					'cz' => array(),
					'r'  => array(),
				),
				'g'              => array(
					'fill' => array(),
					'id'   => array(),
				),
				'path'           => array(
					'd'               => array(),
					'fill'            => array(),
					'stroke'          => array(),
					'stroke-width'    => array(),
					'stroke-linecap'  => array(),
					'stroke-linejoin' => array(),
				),
				'rect'           => array(
					'x'               => array(),
					'y'               => array(),
					'width'           => array(),
					'height'          => array(),
					'rx'              => array(),
					'fill'            => array(),
					'stroke'          => array(),
					'stroke-width'    => array(),
					'stroke-linejoin' => array(),
				),
				'defs'           => array(),
				'lineargradient' => array(
					'id'            => array(),
					'x1'            => array(),
					'x2'            => array(),
					'y1'            => array(),
					'y2'            => array(),
					'gradientunits' => array(),
				),
			);
			return $allowed_tags;
		}

		/**
		 * MoInternal Function
		 *
		 * @return array
		 */
		public static function mo_allow_svg_array() {
			$allowed_tags = array(
				'svg'            => array(
					'class'   => true,
					'width'   => true,
					'height'  => true,
					'viewbox' => true,
					'fill'    => true,
				),
				'circle'         => array(
					'id'           => true,
					'cx'           => true,
					'cy'           => true,
					'cz'           => true,
					'r'            => true,
					'stroke'       => true,
					'stroke-width' => true,
				),
				'g'              => array(
					'fill' => true,
					'id'   => true,
				),
				'path'           => array(
					'd'              => true,
					'fill'           => true,
					'id'             => true,
					'fill-rule'      => true,
					'clip-rule'      => true,
					'stroke'         => true,
					'stroke-width'   => true,
					'stroke-linecap' => true,
				),
				'rect'           => array(
					'width'  => true,
					'height' => true,
					'rx'     => true,
					'fill'   => true,
				),
				'defs'           => array(),
				'lineargradient' => array(
					'id'            => true,
					'x1'            => true,
					'x2'            => true,
					'y1'            => true,
					'y2'            => true,
					'gradientunits' => true,
				),
				'stop'           => array(
					'stop-color' => true,
					'offset'     => true,
				),
			);
			return $allowed_tags;
		}


		/**
		 * Masking the Phone Number of User
		 *
		 * @param string $phone   Phone Number of the user.
		 */
		public static function mo_mask_phone_number( $phone ) {
			$length      = strlen( $phone );
			$masked_part = str_repeat( '*', max( 0, $length - 3 ) );
			$last_three  = substr( $phone, -3 );
			return $masked_part . $last_three;
		}


		/**
		 * Masking the Email of User
		 *
		 * @param string $email    email of the user.
		 */
		public static function mo_mask_email( $email ) {
			$parts = explode( '@', $email );
			if ( count( $parts ) !== 2 ) {
				return $email;
			}
			$username     = $parts[0];
			$domain       = $parts[1];
			$visible_part = substr( $username, 0, 2 );
			$masked_part  = str_repeat( '*', max( 0, strlen( $username ) - 2 ) );
			return $visible_part . $masked_part . '@' . $domain;
		}

		/** Process the phone number and get_hidden_phone.
		 *
		 * @param string $phone - the phone number to processed.
		 *
		 * @return string
		 */
		public static function get_hidden_phone( $phone ) {
			return 'xxxxxxx' . substr( $phone, strlen( $phone ) - 3 );
		}


		/**
		 * Process the value being passed and checks if it is empty or null
		 *
		 * @param string $value - the value to be checked.
		 *
		 * @return bool
		 */
		public static function is_blank( $value ) {
			return ! isset( $value ) || empty( $value );
		}

		/**
		 * Process the plugin name is being passed and checks if it plugin is active or not
		 *
		 * @param string $plugin - the plugin name to be checked.
		 *
		 * @return bool
		 */
		public static function is_plugin_installed( $plugin ) {
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			return is_plugin_active( $plugin );
		}


		/**
		 * Creates and returns the JSON response.
		 *
		 * @param string $message - the message.
		 * @param string $type - the type of result ( success or error ).
		 * @return array
		 */
		public static function create_json( $message, $type ) {
			return array(
				'message' => $message,
				'result'  => $type,
			);
		}
		/**
		 * Check for Country Restriction Addon
		 *
		 * @param mixed $phone .
		 * @return bool
		 */
		public static function check_for_selected_country_addon( $phone ) {
			$countriesavail = CountryList::get_countrycode_list();
			$countriesavail = apply_filters( 'selected_countries', $countriesavail );

			foreach ( $countriesavail as $key => $value ) {
				if ( 'All Countries' !== $value['name'] ) {
					if ( strpos( $phone, $value['countryCode'] ) !== false ) {
						return false;
					}
				}
			}
			return true;
		}

		/**
		 * This function checks if cURL is installed on the server.
		 *
		 * @return bool
		 */
		public static function mo_is_curl_installed() {
			return in_array( 'curl', get_loaded_extensions(), true );
		}


		/**
		 * The function returns the current page URL.
		 *
		 * @return string
		 */
		public static function current_page_url() {
			$page_url = 'http';

			if ( ( isset( $_SERVER['HTTPS'] ) ) && ( sanitize_text_field( wp_unslash( $_SERVER['HTTPS'] ) ) === 'on' ) ) {
				$page_url .= 's';
			}

			$page_url .= '://';

			$server_port = isset( $_SERVER['SERVER_PORT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_PORT'] ) ) : '';
			$server_uri  = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
			$server_name = isset( $_SERVER['SERVER_NAME'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_NAME'] ) ) : '';

			if ( '80' !== $server_port ) {
				$page_url .= $server_name . ':' . $server_port . $server_uri;

			} else {
				$page_url .= $server_name . $server_uri;
			}

			if ( function_exists( 'apply_filters' ) ) {
				$page_url = apply_filters( 'mo_curl_page_url', $page_url );
			}

			// Validate and escape the URL before returning.
			$validated_url = filter_var( $page_url, FILTER_VALIDATE_URL );
			return $validated_url ? esc_url_raw( $validated_url ) : esc_url_raw( $page_url );
		}

		/**
		 * Validates a file path against a base directory to prevent LFI/RFI attacks.
		 * This function does not include/require the file. It only returns whether
		 * the given file path is valid and readable within the allowed base directory.
		 *
		 * @param string $file_path The file path to validate.
		 * @param string $base_dir  The base directory to restrict file access to.
		 * @return bool  True if the file exists, is readable, and is within base dir; otherwise false.
		 */
		public static function mo_require_file( $file_path, $base_dir ) {
			if ( empty( $file_path ) || empty( $base_dir ) ) {
				return false;
			}

			$real_base_dir  = realpath( $base_dir );
			$real_file_path = realpath( $file_path );

			if ( false === $real_file_path || false === $real_base_dir ) {
				return false;
			}

			if ( ! is_dir( $real_base_dir ) || ! is_file( $real_file_path ) || ! is_readable( $real_file_path ) ) {
				return false;
			}

			// Normalize separators and ensure base dir boundary using trailing separator match.
			$base_norm = rtrim( str_replace( '\\', '/', $real_base_dir ), '/' ) . '/';
			$file_norm = str_replace( '\\', '/', $real_file_path );
			if ( strncmp( $file_norm, $base_norm, strlen( $base_norm ) ) !== 0 ) {
				return false;
			}

			return true;
		}

		/**
		 * Checks if the current user has the required capabilities for admin access.
		 * This is a centralized function to ensure consistent capability checks across the plugin.
		 *
		 * @param array $capabilities Array of capabilities to check. User needs at least one. Default: ['manage_options'].
		 * @param bool  $require_admin Whether to also require is_admin() context. Default: false.
		 * @return bool True if user has required capabilities (and admin context if required), false otherwise.
		 */
		public static function mo_check_admin_capability( $capabilities = array( 'manage_options' ), $require_admin = false ) {
			// Validate input.
			if ( ! is_array( $capabilities ) || empty( $capabilities ) ) {
				$capabilities = array( 'manage_options' );
			}

			// Check if required functions exist.
			if ( ! function_exists( 'current_user_can' ) ) {
				return false;
			}

			// If admin context is required, check it first.
			if ( $require_admin ) {
				if ( ! function_exists( 'is_admin' ) || ! is_admin() ) {
					return false;
				}
			}

			// Check if user has at least one of the required capabilities.
			foreach ( $capabilities as $capability ) {
				if ( is_string( $capability ) && current_user_can( $capability ) ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * The function retrieves the domain part of the email
		 *
		 * @param string $email - the email whose domain has to be validated.
		 *
		 * @return bool|string
		 */
		public static function get_domain( $email ) {
			$domain_name = substr( strrchr( $email, '@' ), 1 );
			return $domain_name;
		}


		/**
		 * This function validates the phone number format. Makes sure that country code
		 * is appended to the phone number. Return True or false.
		 *
		 * @param string $phone - the phone number to be validated.
		 *
		 * @return false|int
		 */
		public static function validate_phone_number( $phone ) {
			$phone = self::process_phone_number( $phone );

			// Basic format validation using regex patterns.
			if ( ! preg_match( MoConstants::PATTERN_PHONE, $phone ) ) {
				return false;
			}

			// Get country code from phone number.
			$country_code = self::get_country_code( $phone );
			if ( ! $country_code ) {
				return false;
			}

			// Extract national significant number (without country code).
			$nsn        = substr( $phone, strlen( $country_code ) );
			$nsn_length = strlen( $nsn );
			if ( 0 === $nsn_length ) {
				return false;
			}
			$first_digit = substr( $nsn, 0, 1 );

			// Find the best matching country for this country code using prefixes; keep first match as fallback.
			$country_list = CountryList::get_countrycode_list();
			$country_data = null;
			$fallback     = null;
			foreach ( $country_list as $cand ) {
				if ( ! isset( $cand['countryCode'] ) || $cand['countryCode'] !== $country_code ) {
					continue;
				}
				if ( null === $fallback ) {
					$fallback = $cand;
				}
				if ( isset( $cand['prefixes'] ) && is_array( $cand['prefixes'] ) && in_array( $first_digit, $cand['prefixes'], true ) ) {
					$country_data = $cand;
					break;
				}
			}
			if ( ! $country_data && $fallback ) {
				$country_data = $fallback;
			}
			if ( ! $country_data ) {
				return false;
			}

			// Validate length using min/max from metadata if present; else default 7-15 digits.
			$min_len = ( isset( $country_data['minLength'] ) && is_numeric( $country_data['minLength'] ) ) ? (int) $country_data['minLength'] : 7;
			$max_len = ( isset( $country_data['maxLength'] ) && is_numeric( $country_data['maxLength'] ) ) ? (int) $country_data['maxLength'] : 15;
			if ( $nsn_length < $min_len || $nsn_length > $max_len ) {
				return false;
			}

			// Validate allowed first-digit prefixes if provided.
			if ( isset( $country_data['prefixes'] ) && is_array( $country_data['prefixes'] ) && ! empty( $country_data['prefixes'] ) ) {
				if ( ! in_array( $first_digit, $country_data['prefixes'], true ) ) {
					return false;
				}
			}

			return true;
		}


		/**
		 * This function validates the phone number format and checks if it has country code appended.
		 * Return True or false.
		 *
		 * @param string $phone - the phone number to be checked.
		 *
		 * @return bool
		 */
		public static function is_country_code_appended( $phone ) {
			return preg_match( MoConstants::PATTERN_COUNTRY_CODE, $phone, $matches ) ? true : false;
		}

		/**
		 * Process the phone number, return the country code appended to the phone number. If
		 * country code is not appended then return the default country code if set any by the
		 * admin.
		 *
		 * @param string $phone - the phone number to be processed.
		 *
		 * @return mixed
		 */
		public static function get_country_code( $phone ) {
			if ( ! $phone ) {
				return;
			}
			$phone                = preg_replace( MoConstants::PATTERN_SPACES_HYPEN, '', ltrim( trim( $phone ), '0' ) );
			$default_country_code = CountryList::get_default_countrycode();
			$country_list         = CountryList::get_countrycode_list();
			if ( ! self::is_country_code_appended( $phone ) ) {
				return $default_country_code;
			}
			usort(
				$country_list,
				function ( $country_a, $country_b ) {
					return strlen( $country_b['countryCode'] ) - strlen( $country_a['countryCode'] );
				}
			);
			foreach ( $country_list as $country_data ) {
				if ( strpos( $phone, $country_data['countryCode'] ) === 0 ) {
					return $country_data['countryCode'];
				}
			}
		}

		/**
		 * Process the phone number. Check if country code is appended to the phone number. If
		 * country code is not appended then add the default country code if set any by the
		 * admin.
		 *
		 * @param string $phone - the phone number to be processed.
		 *
		 * @return mixed
		 */
		public static function process_phone_number( $phone ) {
			if ( ! $phone ) {
				return;
			}
			$phone                = preg_replace( MoConstants::PATTERN_SPACES_HYPEN, '', ltrim( trim( $phone ), '0' ) );
			$default_country_code = CountryList::get_default_countrycode();
			$phone                = ! isset( $default_country_code ) || self::is_country_code_appended( $phone ) ? $phone : $default_country_code . $phone;
			return apply_filters( 'mo_process_phone', $phone );
		}


		/**
		 * Checks if user has completed his registration in miniOrange.
		 *
		 * @return int
		 */
		public static function micr() {
			$email        = get_mo_option( 'admin_email' );
			$customer_key = get_mo_option( 'admin_customer_key' );
			if ( ! $email || ! $customer_key || ! is_numeric( trim( $customer_key ) ) ) {
				return 0;
			} else {
				return 1;
			}
		}

		/**
		 * Checks the class for license library and returns bool by checking if the license is expired.
		 *
		 * @return bool|array
		 */
		public static function mllc() {
			$is_free_plugin = strcmp( MOV_TYPE, 'MiniOrangeGateway' ) === 0;
			return ( class_exists( MoConstants::LICENCE_LIBRARY, false ) || ( ! $is_free_plugin ) ) ? Mo_License_Service::is_license_expired() : array( 'STATUS' => false );
		}
		/**
		 * Function generates a random alphanumeric value and returns it.
		 *
		 * @return string
		 */
		public static function rand() {
			$length        = wp_rand( 0, 15 );
			$characters    = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
			$random_string = '';
			for ( $i = 0; $i < $length; $i++ ) {
				$random_string .= $characters[ wp_rand( 0, strlen( $characters ) - 1 ) ];
			}
			return $random_string;
		}


		/**
		 * Checks if user has upgraded to one of the plans.
		 *
		 * @return int
		 */
		public static function micv() {
			$email        = get_mo_option( 'admin_email' );
			$customer_key = get_mo_option( 'admin_customer_key' );
			$check_ln     = get_mo_option( 'check_ln' );
			if ( ! $email || ! $customer_key || ! is_numeric( trim( $customer_key ) ) ) {
				return 0;
			} else {
				return $check_ln ? $check_ln : 0;
			}
		}

		/**
		 * This function checks the license of the customer. Updates the license plan,
		 * sms and email remaining values in the database if user has upgraded.
		 *
		 * @param string $show_message - show message or not.
		 * @param string $customer_key - customerKey of the admin.
		 * @param string $api_key - apiKey of the admin.
		 * @return void
		 */
		public static function handle_mo_check_ln( $show_message, $customer_key, $api_key ) {
			$msg  = MoMessages::FREE_PLAN_MSG;
			$plan = array();

			$gateway = GatewayFunctions::instance();
			$content = json_decode( MocURLCall::check_customer_ln( $customer_key, $api_key, $gateway->get_application_name(), 'PREMIUM' ), true );
			if ( isset( $content['status'] ) && strcasecmp( $content['status'], 'SUCCESS' ) === 0 ) {

				$email_remaining = isset( $content['emailRemaining'] ) ? $content['emailRemaining'] : 0;
				$sms_remaining   = isset( $content['smsRemaining'] ) ? $content['smsRemaining'] : 0;
				$license_plan    = isset( $content['licensePlan'] ) ? $content['licensePlan'] : '';

				if ( self::sanitize_check( 'licensePlan', $content ) ) {
					if ( 0 === strcmp( MOV_TYPE, 'MiniOrangeGateway' ) || 0 === strcmp( MOV_TYPE, 'EnterpriseGatewayWithAddons' ) ) {
						$msg  = MoMessages::REMAINING_TRANSACTION_MSG;
						$plan = array(
							'plan'  => $license_plan,
							'sms'   => $sms_remaining,
							'email' => $email_remaining,
						);

					} else {
						$msg  = MoMessages::UPGRADE_MSG;
						$plan = array( 'plan' => $license_plan );
					}
					update_mo_option( 'check_ln', $license_plan );
				}
				update_mo_option( 'customer_license_plan', $license_plan );
				update_mo_option( 'email_transactions_remaining', $email_remaining );
				update_mo_option( 'phone_transactions_remaining', $sms_remaining );
			} else {
				$content         = json_decode( MocURLCall::check_customer_ln( $customer_key, $api_key, 'wp_email_verification_intranet', 'PREMIUM' ), true );
				$email_remaining = isset( $content['emailRemaining'] ) ? $content['emailRemaining'] : 0;
				$sms_remaining   = isset( $content['smsRemaining'] ) ? $content['smsRemaining'] : 0;
				$license_plan    = isset( $content['licensePlan'] ) ? $content['licensePlan'] : '';
				update_mo_option( 'customer_license_plan', $license_plan );
				update_mo_option( 'email_transactions_remaining', $email_remaining );
				update_mo_option( 'phone_transactions_remaining', $sms_remaining );

				if ( self::sanitize_check( 'licensePlan', $content ) ) {
					$msg = MoMessages::INSTALL_PREMIUM_PLUGIN;
				}
			}

			if ( isset( $content['status'] ) && strcasecmp( $content['status'], 'FAILED' ) === 0 ) {
				$content         = json_decode( MocURLCall::check_customer_ln( $customer_key, $api_key, '' ), true );
				$email_remaining = isset( $content['emailRemaining'] ) ? $content['emailRemaining'] : 0;
				$sms_remaining   = isset( $content['smsRemaining'] ) ? $content['smsRemaining'] : 0;
				$license_plan    = isset( $content['licenseType'] ) ? $content['licenseType'] : '';
				update_mo_option( 'customer_license_plan', $license_plan );
				update_mo_option( 'email_transactions_remaining', $email_remaining );
				update_mo_option( 'phone_transactions_remaining', $sms_remaining );
			}
			if ( isset( $content['licenseExpiry'] ) && strcasecmp( $content['status'], 'SUCCESS' ) === 0 ) {
				if ( class_exists( MoConstants::LICENCE_LIBRARY, false ) ) {
					Mo_License_Service::update_license_expiry( $content['licenseExpiry'] );
				}
			}

			if ( $show_message ) {
				do_action( 'mo_registration_show_message', MoMessages::showMessage( $msg, $plan ), 'SUCCESS' );
			}
		}


		/**
		 * Initialize the form session indicating that the OTP Verification for the
		 * form has started.
		 *
		 * @param string $form - form for which session is being initialized / session constant name.
		 */
		public static function initialize_transaction( $form ) {
			if ( empty( $form ) ) {
				return;
			}

			// Ensure session is started before any operations (for SESSION type).
			if ( defined( 'MOV_SESSION_TYPE' ) && 'SESSION' === MOV_SESSION_TYPE ) {
				MoPHPSessions::check_session();
			}

			$reflect = new ReflectionClass( FormSessionVars::class );
			foreach ( $reflect->getConstants() as $key => $value ) {
				// Don't unset the current form session variable as we're about to initialize it.
				if ( $value !== $form ) {
					MoPHPSessions::unset_session( $value );
				}
			}

			SessionUtils::initialize_form( $form );
		}


		/**
		 * Returns the invalid OTP message. This function checks if admin has set an
		 * invalid otp message in the settings. If so then that is returned instead of the default.
		 *
		 * @return string
		 */
		public static function get_invalid_otp_method() {
			return get_mo_option( 'invalid_message', 'mo_otp_' ) ? get_mo_option( 'invalid_message', 'mo_otp_' )
			: MoMessages::showMessage( MoMessages::INVALID_OTP );
		}


		/**
		 * Returns TRUE or FALSE depending on if the POLYLANG plugin is active.
		 * This is used to check if the translation should use the polylang
		 * function or the default local translation.
		 *
		 * @return boolean
		 */
		public static function is_polylang_installed() {
			return function_exists( 'pll__' ) && function_exists( 'pll_register_string' );
		}

		/**
		 * Take an array of string having the keyword to replace
		 * and the keyword to be replaced. This is used to modify
		 * the SMS templates that the user might have saved in the
		 * settings or the default ones by the plugin.
		 *
		 * @param array  $replace      The array containing search and replace keywords.
		 * @param string $input_string Entire string to be modified.
		 *
		 * @return mixed
		 */
		public static function replace_string( array $replace, $input_string ) {
			foreach ( $replace as $key => $value ) {
				$input_string = str_replace( '{' . $key . '}', $value, $input_string );
			}

			return $input_string;
		}

		/**
		 * Returns a stdClass Object with status Success as a
		 * temporary result when TEST_MODE is on
		 *
		 * @return stdClass
		 */
		private static function test_result() {
			$temp         = new stdClass();
			$temp->status = MO_FAIL_MODE ? 'ERROR' : 'SUCCESS';
			return $temp;
		}

		/**
		 * Checks if the whatsapp notifications and presonal business account is enabled
		 *
		 * @return bool
		 */
		public static function mo_is_whatsapp_notif_enabled() {
			return get_mo_option( 'mo_whatsapp_enable' )
			&& get_mo_option( 'mo_whatsapp_notification_enable' )
			&& get_mo_option( 'mo_whatsapp_type' ) === 'bussiness_whatsapp';
		}


		/**
		 * Send the notification to the number provided and
		 * process the response to check if the message was sent
		 * successfully or not. Return TRUE or FALSE based on the
		 * API call response.
		 *
		 * @param string $number the number to be sent.
		 * @param string $msg the message to be sent.
		 * @param string $notification_type the specific type of notification (e.g., 'NEW_ACCOUNT', 'ORDER_STATUS').
		 *
		 * @return bool
		 */
		public static function send_phone_notif( $number, $msg, $notification_type = 'NOTIFICATION' ) {

			$api_call_result = function ( $number, $msg ) {
				return json_decode( MocURLCall::send_notif( new NotificationSettings( $number, $msg ) ) );
			};

			$mle = self::mllc();
			if ( $mle['STATUS'] ) {
				return false;
			}
			$number       = self::process_phone_number( $number );
			$msg          = self::replace_string( array( 'phone' => str_replace( '+', '', '%2B' . $number ) ), $msg );
			$content      = MO_TEST_MODE ? self::test_result() : $api_call_result( $number, $msg );
			$notif_status = strcasecmp( $content->status, 'SUCCESS' ) === 0 ? 'SMS_NOTIF_SENT' : 'SMS_NOTIF_FAILED';
			apply_filters( 'mo_start_reporting', null, $number, $number, $notification_type . '_PHONE_NOTIF', $msg, $notif_status );
			return strcasecmp( $content->status, 'SUCCESS' ) === 0 ? true : false;
		}

		/**
		 * Send the notification to the number provided and
		 * process the response to check if the message was sent
		 * successfully or not. Return TRUE or FALSE based on the
		 * API call response.
		 *
		 * @param string $number the number to be sent.
		 * @param string $template_name the template name.
		 * @param string $sms_tags the tags used in sms template.
		 * @param string $notification_type the specific type of notification (e.g., 'NEW_ACCOUNT', 'ORDER_STATUS').
		 *
		 * @return bool
		 */
		public static function mo_send_whatsapp_notif( $number, $template_name, $sms_tags, $notification_type = 'WHATSAPP_NOTIFICATION' ) {
			$api_call_result = function ( $number, $data ) {
				return apply_filters( 'mo_wa_send_otp_token', 'WHATSAPP_NOTIFICATION', null, null, $number, $data );
			};

			$data         = array(
				'template_name' => $template_name,
				'sms_tags'      => $sms_tags,
			);
			$number       = self::process_phone_number( $number );
			$content      = MO_TEST_MODE ? self::test_result() : $api_call_result( $number, $data );
			$notif_status = strcasecmp( $content->status, 'SUCCESS' ) === 0 ? 'SMS_NOTIF_SENT' : 'SMS_NOTIF_FAILED';
			apply_filters( 'mo_start_reporting', null, $number, $number, $notification_type . '_WHATSAPP_NOTIF', $template_name, $notif_status );
			return strcasecmp( $content->status, 'SUCCESS' ) === 0 ? true : false;
		}


		/**
		 * Send the notification to the email provided and
		 * process the response to check if the message was sent
		 * successfully or not. Return TRUE or FALSE based on the
		 * API call response.
		 *
		 * @param string $from_email The From Email.
		 * @param string $from_name  The From Name.
		 * @param string $to_email   The email to send message to.
		 * @param string $subject   The subject of the email.
		 * @param string $message   The message to be sent.
		 *
		 * @return bool
		 */
		public static function send_email_notif( $from_email, $from_name, $to_email, $subject, $message ) {
			$api_call_result = function ( $from_email, $from_name, $to_email, $subject, $message ) {
				$notification_settings = new NotificationSettings();
				$notification_settings->create_email_notification_settings( $from_email, $from_name, $to_email, $subject, $message );
				return json_decode( MocURLCall::send_notif( $notification_settings ) );
			};
			$content         = MO_TEST_MODE ? self::test_result() : $api_call_result( $from_email, $from_name, $to_email, $subject, $message );
			return strcasecmp( $content->status, 'SUCCESS' ) === 0 ? true : false;
		}
		/**
		 * Check if there is an existing value in the array/buffer and return the value
		 * that exists against that key otherwise return false.
		 * <p></p>
		 * The function also makes sure to sanitize the values being fetched.
		 * <p></p>
		 * If the buffer to fetch the value from is not an array then return buffer as it is.
		 *
		 * @param string       $key    the key to check against.
		 * @param   string|array $buffer the post/get or array.
		 * @return string|bool|array
		 */
		public static function sanitize_check( $key, $buffer ) {
			if ( ! isset( $buffer[ $key ] ) ) {
				return false;
			}
			if ( is_array( $buffer[ $key ] ) ) {
				return self::mo_sanitize_array( $buffer[ $key ] );
			} else {
				return sanitize_text_field( wp_unslash( $buffer[ $key ] ) );
			}
		}

		/**
		 * Checks if user has upgraded to the on-prem plugin
		 */
		public static function mclv() {
			$gateway = GatewayFunctions::instance();
			return $gateway->mclv();
		}


		/**Checks if the current plugin is Custom Gateway Plugin
		 */
		public static function is_gateway_config() {
			$gateway = GatewayFunctions::instance();
			return $gateway->is_gateway_config();
		}

		/**
		 * Checks if the current plugin is MiniOrangeGateway Plugin
		 *
		 * @return bool
		 */
		public static function is_mg() {
			$gateway = GatewayFunctions::instance();
			return $gateway->is_mg();
		}


		/**
		 * This function checks if all conditions to save the form settings
		 * are true. This checks if the user saving the form settings is an admin,
		 * has registered with miniorange and the the form post has an option value
		 * mo_customer_validation_settings
		 *
		 * @param string $key_val the key to check against (typically 'mo_customer_validation_settings').
		 * @param string $form_option_key Optional POST key that must be present to proceed (form-specific).
		 *
		 * @return bool
		 */
		public static function are_form_options_being_saved( $key_val, $form_option_key = '' ) {
			if ( ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ) ), 'mo_admin_actions' ) ) {
				return false;
			}
			if ( ! current_user_can( 'manage_options' ) ) {
				return false;
			}
			if ( ! self::mclv() ) {
				return false;
			}

			$option_value = isset( $_POST['option'] ) ? sanitize_text_field( wp_unslash( $_POST['option'] ) ) : '';
			if ( empty( $option_value ) || $option_value !== $key_val ) {
				return false;
			}
			if ( ! empty( $form_option_key ) ) {
				$prefixed_key    = 'mo_customer_validation_' . $form_option_key;
				$form_key_exists = isset( $_POST[ $prefixed_key ] ) || isset( $_POST[ $form_option_key ] );
				if ( $form_key_exists ) {
					return true;
				}
				// Form checkbox doesn't exist - form might be disabled, but we're in form settings save context.
				$form_base     = str_replace( '_enable', '', $form_option_key );
				$parts         = explode( '_', $form_base );
				$form_id       = $parts[0];
				$form_data_key = str_replace( '_enable', '_form', $form_option_key );
				if ( isset( $_POST[ $form_data_key ] ) ) {
					return true;
				}
				foreach ( $_POST as $key => $value ) {
					$key_to_check = $key;
					if ( strpos( $key, 'mo_customer_validation_' ) === 0 ) {
						$key_to_check = str_replace( 'mo_customer_validation_', '', $key );
					} elseif ( strpos( $key, 'mo_' ) === 0 ) {
						$key_to_check = str_replace( 'mo_', '', $key );
					}
					if ( strpos( $key_to_check, $form_id . '_' ) === 0 || strpos( $key_to_check, $form_base ) === 0 ) {
						return true;
					}
				}
				// Return false to prevent unnecessary processing.
				return false;
			}
			return true;
		}

		/**
		 * Update SMS Email transaction in DataBase
		 *
		 * @param string $response Response form Gateway.
		 * @param string $type     OTP Type email or phone.
		 */
		public static function mo_update_sms_email_transations( $response, $type ) {
			$content = json_decode( $response );
			if ( strcasecmp( $content->status, 'SUCCESS' ) === 0 ) {
				$option_type   = ( VerificationType::PHONE === $type ) ? 'phone_transactions_remaining' : 'email_transactions_remaining';
				$remaining_txn = get_mo_option( $option_type );
				if ( $remaining_txn > 0 ) {
					update_mo_option( $option_type, $remaining_txn - 1 );
				}
			}
		}

		/**
		 * Update WhatsApp transaction in DataBase
		 *
		 * @param string $response      Resposne form Gateway.
		 */
		public static function mo_update_whatsapp_transations( $response ) {
			$content = json_decode( $response );
			if ( isset( $content->status ) && strcasecmp( $content->status, 'SUCCESS' ) === 0 ) {
				$remaining_txn = get_mo_option( 'whatsapp_transactions_remaining', 'mowp_customer_validation_' );
				if ( $remaining_txn > 0 ) {
					update_mo_option( 'whatsapp_transactions_remaining', $remaining_txn - 1, 'mowp_customer_validation_' );
				}
			}
		}

		/**
		 * Checks if the customer is registered or not and shows a message on the page
		 * to the user so that they can register or login themselves to use the plugin.
		 */
		public static function is_addon_activated() {
			if ( self::micr() && self::mclv() ) {
				return;
			}
			$tab_details      = TabDetails::instance();
			$server_uri       = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
			$registration_url = add_query_arg(
				array( 'page' => $tab_details->tab_details[ Tabs::ACCOUNT ]->menu_slug ),
				remove_query_arg( 'addon', $server_uri )
			);
			echo '<div style="display:block;margin-top:10px;color:red;background-color:rgba(251, 232, 0, 0.15);
								padding:5px;border:solid 1px rgba(255, 0, 9, 0.36);">
			 		<a href="' . esc_url( $registration_url ) . '">' . esc_html( __( 'Validate your purchase', 'miniorange-otp-verification' ) ) . '</a>
			 				' . esc_html( __( ' to enable the Add On', 'miniorange-otp-verification' ) ) . '</div>';
		}

		/**
		 * Check if the phone number is empty and return error.
		 *
		 * @param string $phone_number phone number of the user.
		 */
		public static function check_if_phone_exist( $phone_number ) {
			if ( empty( $phone_number ) ) {
				wp_send_json( self::create_json( MoMessages::showMessage( MoMessages::PHONE_NOT_FOUND ), MoConstants::ERROR_JSON_TYPE ) );
			}
		}

		/**
		 * Checks the version of the plugin active with the mentioned name.
		 *
		 * @param string  $plugin_name     -   Plugin Name.
		 * @param integer $sequence       -   index of the version digit to get.
		 * @return integer  Version number.
		 */
		public static function get_active_plugin_version( $plugin_name, $sequence = 0 ) {
			if ( ! function_exists( 'get_plugins' ) ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			$all_plugins   = get_plugins();
			$active_plugin = get_mo_option( 'active_plugins', '' );
			if ( ! is_array( $active_plugin ) ) {
				$active_plugin = array();
			}
			foreach ( $all_plugins as $key => $value ) {
				if ( isset( $value['Name'] ) && strcasecmp( $value['Name'], $plugin_name ) === 0 ) {
					if ( in_array( $key, $active_plugin, true ) ) {
						// Make sure the version is set and has the requested sequence.
						if ( isset( $value['Version'] ) && isset( $value['Version'][ $sequence ] ) ) {
							return (int) $value['Version'][ $sequence ];
						}
					}
				}
			}
			return null;
		}

		/**
		 * Encrypts a plaintext password using AES-256-CBC encryption.
		 *
		 * @param string $plaintext_password The plain text password to encrypt.
		 * @return string Hex-encoded encrypted string.
		 */
		public static function encrypt_password( $plaintext_password ) {
			if ( empty( $plaintext_password ) ) {
				return '';
			}
			$encryption_key = hash( 'sha256', wp_salt( 'auth' ), true );
			$iv             = substr( hash( 'sha256', 'otp-plugin-password-iv' ), 0, 16 );
			$encrypted      = openssl_encrypt(
				$plaintext_password,
				'AES-256-CBC',
				$encryption_key,
				0,
				$iv
			);
			if ( false === $encrypted ) {
				return '';
			}
			return bin2hex( $encrypted );
		}

		/**
		 * Decrypts an AES-256-CBC encrypted password back to plain text.
		 *
		 * @param string $encrypted_password The hex-encoded encrypted password.
		 * @return string|false Decrypted plain text password, or false on failure.
		 */
		public static function decrypt_password( $encrypted_password ) {
			if ( empty( $encrypted_password ) ) {
				return '';
			}
			$encryption_key = hash( 'sha256', wp_salt( 'auth' ), true );
			$iv             = substr( hash( 'sha256', 'otp-plugin-password-iv' ), 0, 16 );
			$encrypted_data = hex2bin( $encrypted_password );
			if ( false === $encrypted_data ) {
				return '';
			}
			$decrypted = openssl_decrypt(
				$encrypted_data,
				'AES-256-CBC',
				$encryption_key,
				0,
				$iv
			);
			return false === $decrypted ? '' : $decrypted;
		}

		/**
		 * Get the current user's IP address.
		 *
		 * @return string - IP address
		 */
		public static function get_current_ip_address() {
			$ip_sources = array(
				'REMOTE_ADDR'           => array(
					'trust' => true,
					'risk'  => 'low',
				),
				'HTTP_X_FORWARDED_FOR'  => array(
					'trust' => false,
					'risk'  => 'medium',
				),
				'HTTP_X_REAL_IP'        => array(
					'trust' => false,
					'risk'  => 'low',
				),
				'HTTP_CF_CONNECTING_IP' => array(
					'trust' => false,
					'risk'  => 'low',
				),
				'HTTP_CLIENT_IP'        => array(
					'trust' => false,
					'risk'  => 'high',
				),
			);

			$found_ips      = array();
			$suspicious_ips = array();

			foreach ( $ip_sources as $source => $metadata ) {
				if ( empty( $_SERVER[ $source ] ) ) {
					continue;
				}

				$raw_value = sanitize_text_field( wp_unslash( $_SERVER[ $source ] ) );
				$ip        = self::extract_first_valid_ip( $raw_value );

				if ( $ip && self::is_valid_ip( $ip ) ) {
					$found_ips[] = array(
						'ip'    => $ip,
						'trust' => $metadata['trust'],
						'risk'  => $metadata['risk'],
					);
				} else {
					$suspicious_ips[] = array(
						'ip'        => $ip ? $ip : 'invalid_format',
						'source'    => $source,
						'raw_value' => $raw_value,
						'reason'    => $ip ? 'contains_attack_patterns' : 'invalid_ip_format',
					);
				}
			}

			if ( ! empty( $found_ips ) ) {
				usort(
					$found_ips,
					function ( $a, $b ) {
						if ( $a['trust'] === $b['trust'] ) {
							$risk_order = array(
								'low'    => 0,
								'medium' => 1,
								'high'   => 2,
							);
							return $risk_order[ $a['risk'] ] - $risk_order[ $b['risk'] ];
						}
						return $b['trust'] - $a['trust'];
					}
				);

				$best_ip      = $found_ips[0];
				$risk_markers = array(
					'high'   => ' (high_risk_proxy)',
					'medium' => ' (medium_risk_proxy)',
				);

				return $best_ip['ip'] . ( $risk_markers[ $best_ip['risk'] ] ?? '' );
			}

			if ( isset( $_SERVER['REMOTE_ADDR'] ) ) {
				$fallback_ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
				return self::is_valid_ip( $fallback_ip ) ? $fallback_ip : $fallback_ip . ' (suspicious_format)';
			}

			if ( ! empty( $suspicious_ips ) ) {
				self::log_suspicious_ip_activity( $suspicious_ips );
				$first_suspicious = $suspicious_ips[0];
				return 'invalid_format' !== $first_suspicious['ip'] ? $first_suspicious['ip'] : 'Unknown';
			}

			return 'Unknown';
		}

		/**
		 * Get the first matching page ID by its title using a non-deprecated approach.
		 *
		 * @param string $page_title  Page title to search for.
		 * @param string $post_status Page status to include (default 'all').
		 * @return int|string Page ID if found; empty string if not found or title blank.
		 */
		public static function mo_get_page_id_by_title( $page_title, $post_status = 'all' ) {
			if ( self::is_blank( $page_title ) ) {
				return '';
			}

			$pages = get_posts(
				array(
					'post_type'        => 'page',
					'title'            => $page_title,
					'post_status'      => $post_status,
					'numberposts'      => 1,
					'suppress_filters' => false,
				)
			);

			return ( ! empty( $pages ) && isset( $pages[0]->ID ) ) ? (int) $pages[0]->ID : '';
		}

		/**
		 * Get the permalink for the first matching page title, or a default if not found.
		 *
		 * @param string $page_title Page title to search for.
		 * @param string $default_url    Default URL to return if not found (default home_url('/')).
		 * @param string $post_status Page status to include (default 'all').
		 * @return string Resolved permalink or default.
		 */
		public static function mo_get_permalink_by_page_title( $page_title, $default_url = '', $post_status = 'all' ) {
			$default      = $default_url ? $default_url : home_url( '/' );
			$page_id      = self::mo_get_page_id_by_title( $page_title, $post_status );
			$redirect_url = $page_id ? get_permalink( $page_id ) : $default;
			return esc_url_raw( $redirect_url );
		}

		/**
		 * Check for suspicious IP patterns (disabled for now).
		 *
		 * @param string $ip - IP address to validate.
		 * @return bool - True if valid and safe
		 */
		private static function is_valid_ip( $ip ) {
			if ( ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6 ) ) {
				return false;
			}
			if ( self::contains_attack_patterns( $ip ) ) {
				return false;
			}
			return true;
		}

		/**
		 * Check for attack patterns in IP string.
		 *
		 * @param string $ip - IP address to check.
		 * @return bool - True if contains attack patterns
		 */
		private static function contains_attack_patterns( $ip ) {
			$suspicious_chars = array( '<', '>', '"', "'", '\\', '/', '&', ';', '(', ')' );
			foreach ( $suspicious_chars as $char ) {
				if ( strpos( $ip, $char ) !== false ) {
					return true;
				}
			}
			return false;
		}

		/**
		 * Get relevant server variables for security logging.
		 *
		 * @return array - Sanitized server variables
		 */
		private static function get_relevant_server_vars() {
			$relevant_vars = array(
				'REMOTE_ADDR',
				'HTTP_X_FORWARDED_FOR',
				'HTTP_X_REAL_IP',
				'HTTP_CF_CONNECTING_IP',
				'HTTP_CLIENT_IP',
				'HTTP_USER_AGENT',
				'REQUEST_URI',
				'REQUEST_METHOD',
				'HTTP_REFERER',
			);

			$server_data = array();
			foreach ( $relevant_vars as $var ) {
				if ( isset( $_SERVER[ $var ] ) ) {
					$server_data[ $var ] = sanitize_text_field( wp_unslash( $_SERVER[ $var ] ) );
				}
			}

			return $server_data;
		}

		/**
		 * Validate IP address with basic security checks.
		 *
		 * @param string $ip_string - Comma-separated IP addresses.
		 * @return string|false - First valid IP or false
		 */
		private static function extract_first_valid_ip( $ip_string ) {
			$ips = explode( ',', $ip_string );
			foreach ( $ips as $ip ) {
				$ip = trim( $ip );

				if ( empty( $ip ) || ! is_string( $ip ) ) {
					continue;
				}

				if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6 ) ) {
					return $ip;
				}
			}
			return false;
		}

		/**
		 * Log suspicious IP activity for security analysis.
		 *
		 * @param array $suspicious_ips - Array of suspicious IP data.
		 */
		private static function log_suspicious_ip_activity( $suspicious_ips ) {
			$log_data = array(
				'timestamp'       => current_time( 'mysql' ),
				'user_agent'      => sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown' ) ),
				'request_uri'     => sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ?? 'Unknown' ) ),
				'suspicious_ips'  => $suspicious_ips,
				'all_server_vars' => self::get_relevant_server_vars(),
			);

			$security_logs   = get_mo_option( 'mo_otp_security_logs', array() );
			$security_logs[] = $log_data;

			if ( count( $security_logs ) > 100 ) {
				$security_logs = array_slice( $security_logs, -100 );
			}

			update_mo_option( 'mo_otp_security_logs', $security_logs );
		}

		/**
		 * Get current page parameter value from URL query string.
		 * This function safely retrieves GET parameters without triggering PHPCS nonce verification warnings.
		 * It parses the REQUEST_URI to extract query parameters, which is safe for routing/display purposes.
		 *
		 * @param string $parameter_name The name of the parameter to retrieve.
		 * @param string $default_value  Default value to return if parameter is not found.
		 * @return string The parameter value or default value.
		 */
		public static function get_current_page_parameter_value( $parameter_name, $default_value = '' ) {
			$path = ! empty( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

			$parameter_value = '';

			// Parse the URL to get the query string.
			$query_str = wp_parse_url( $path, PHP_URL_QUERY );

			// Parse the query string into an array.
			if ( $query_str ) {
				parse_str( $query_str, $query_params );

				// Get the parameter value if it exists.
				if ( ! empty( $query_params[ $parameter_name ] ) ) {
					$parameter_value = sanitize_text_field( $query_params[ $parameter_name ] );
				}
				unset( $query_params );
			}

			return ! empty( $parameter_value ) ? $parameter_value : $default_value;
		}
	}
}
