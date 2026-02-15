<?php
/**
 * Handler functions for selected country addon
 *
 * @package miniorange-otp-verification/addons/countrycode/handler
 */

namespace OTP\Addons\CountryCode\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Addons\CountryCode\Helper\SelectedCountry;
use OTP\Helper\FormSessionVars;
use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;
use OTP\Helper\CountryList;
use OTP\Helper\SessionUtils;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use WP_User;
use OTP\MoInit;

/**
 * Selected country Handler handles sending an OTP to the user instead of
 * the link that usually gets sent out to the user's email address.
 */
class SelectedCountryCode {

	use Instance;

	/**Variable declaration
	 * $selected_country_type.
	 *
	 * @var array
	 */
	private $selected_country_type;

	/**Variable declaration
	 * $is_country_allowed.
	 *
	 * @var array
	 */
	private $is_country_allowed;

	/**Variable declaration
	 * $is_country_blocked.
	 *
	 * @var array
	 */
	private $is_country_blocked;

	/**Variable declaration
	 * $sc_allow_tag.
	 *
	 * @var array
	 */
	private $sc_allow_tag;

	/**Variable declaration
	 * $sc_block_tag.
	 *
	 * @var array
	 */
	private $sc_block_tag;

	/**
	 * Constructor checks if add-on has been enabled by the admin and initializes
	 * all the class variables. This function also defines all the hooks to
	 * hook into to make the add-on functionality work.
	 */
	protected function __construct() {
		$this->selected_country_type = mo_get_sc_option( 'select_country_type' ) ? sanitize_text_field( wp_unslash( (string) mo_get_sc_option( 'select_country_type' ) ) ) : '';
		$this->is_country_allowed    = mo_get_sc_option( 'selected_country_list' ) ? sanitize_textarea_field( wp_unslash( (string) mo_get_sc_option( 'selected_country_list' ) ) ) : '';
		$this->is_country_blocked    = mo_get_sc_option( 'block_selected_country_list' ) ? sanitize_textarea_field( wp_unslash( (string) mo_get_sc_option( 'block_selected_country_list' ) ) ) : '';
		$this->sc_allow_tag          = 'select_countries_to_show';
		$this->sc_block_tag          = 'select_countries_to_block';

		add_action( 'admin_enqueue_scripts', array( $this, 'miniorange_register_selected_country_script' ) );
		add_action( 'admin_init', array( $this, 'check_addon_options' ), 2 );
		add_filter( 'selected_countries', array( $this, 'mo_selected_countries' ), 2, 1 );
		add_filter( 'mo_blocked_phones', array( $this, 'blocked_numbers' ), 1, 2 );
	}
	/**
	 * Checks addon option
	 *
	 * @return void
	 */
	public function check_addon_options() {
		$nonce = isset( $_POST['mo_selected_countrycode_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_selected_countrycode_nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'mo-selected-countrycode-nonce' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
		}
		if ( ! isset( $_POST['option'] ) || MoUtility::sanitize_check( 'option', $_POST ) !== 'mo_selected_countrycode_value' ) {
			return;
		}

		// Sanitize only the required keys individually instead of sanitizing the entire $_POST array.
		$sanitized_post = array(
			'mo_customer_validation_sc_type'    => isset( $_POST['mo_customer_validation_sc_type'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_customer_validation_sc_type'] ) ) : '',
			'mo_selected_country_numbers'       => isset( $_POST['mo_selected_country_numbers'] ) ? sanitize_textarea_field( wp_unslash( $_POST['mo_selected_country_numbers'] ) ) : '',
			'mo_block_selected_country_numbers' => isset( $_POST['mo_block_selected_country_numbers'] ) ? sanitize_textarea_field( wp_unslash( $_POST['mo_block_selected_country_numbers'] ) ) : '',
		);

		$this->mo_handle_addon_options( $sanitized_post );
	}

	/**
	 * Adds selected countries in array
	 *
	 * @param array $countriesavail .
	 * @return array
	 */
	public function mo_selected_countries( $countriesavail ) {
		unset( $countriesavail[0] );
		$sanitized_countries = array();
		if ( is_array( $countriesavail ) ) {
			foreach ( $countriesavail as $key => $country ) {
				$sanitized_countries[ $key ] = is_array( $country ) ? MoUtility::mo_sanitize_array( $country ) : sanitize_text_field( wp_unslash( (string) $country ) );
			}
		}
		$countriesavail = $sanitized_countries;
		// Only update database if the data has actually changed to avoid unnecessary writes on every page load.
		$existing_countries = mo_get_sc_option( 'allcountrywithcountrycode' );
		if ( wp_json_encode( $existing_countries ) !== wp_json_encode( $countriesavail ) ) {
			mo_update_sc_option( 'allcountrywithcountrycode', $countriesavail );
		}

		if ( $this->selected_country_type === $this->sc_allow_tag ) {
			$selected_countries_list = array_filter(
				array_map(
					'sanitize_text_field',
					array_map(
						'trim',
						preg_split( '/\s*;\s*/', (string) $this->is_country_allowed )
					)
				)
			);
			$selected_countries      = array();

			if ( ! empty( $selected_countries_list ) ) {
				// Build a lookup table of countries by lowercase name for efficient matching.
				$country_by_name = array();
				foreach ( $countriesavail as $value ) {
					if ( isset( $value['name'] ) ) {
						$country_by_name[ strtolower( trim( $value['name'] ) ) ] = $value;
					}
				}

				// Add each selected country at most once based on its name.
				foreach ( $selected_countries_list as $country_name ) {
					$lookup_key = strtolower( $country_name );
					if ( isset( $country_by_name[ $lookup_key ] ) ) {
						$selected_countries[] = $country_by_name[ $lookup_key ];
					}
				}
			}

			$selected_countries = $selected_countries ? $selected_countries : $countriesavail;
			return $selected_countries;

		} elseif ( $this->selected_country_type === $this->sc_block_tag ) {
			$selected_countries_block_list = array_filter(
				array_map(
					'sanitize_text_field',
					array_map(
						'trim',
						preg_split( '/\s*;\s*/', (string) $this->is_country_blocked )
					)
				)
			);
			$selected_countries_block      = $countriesavail;
			if ( ! empty( $selected_countries_block_list ) ) {
				foreach ( $countriesavail as $key => $value ) {
					$name = isset( $value['name'] ) ? trim( $value['name'] ) : '';
					foreach ( $selected_countries_block_list as $value1 ) {
						if ( strtolower( $value1 ) === strtolower( $name ) ) {
							unset( $selected_countries_block[ $key ] );
							break;
						}
					}
				}
			}
			$selected_countries_block = $selected_countries_block ? $selected_countries_block : $countriesavail;
			return $selected_countries_block;

		}

		return $countriesavail;
	}

	/**
	 * Starts With
	 *
	 * @param string $mo_string .
	 * @param string $start_string .
	 * @return string
	 */
	public function mo_starts_with( $mo_string, $start_string ) {
		$len = strlen( $start_string );
		return ( substr( $mo_string, 0, $len ) === $start_string );
	}

	/**
	 * Returns blocked numbers
	 *
	 * Applies both "allow" and "block" modes:
	 * - Allow mode: only numbers from selected countries are allowed; all others are blocked.
	 * - Block mode: numbers from selected countries are blocked; all others are allowed.
	 *
	 * @param array  $blocked_phone_numbers .
	 * @param string $phone_number .
	 * @return array
	 */
	public function blocked_numbers( $blocked_phone_numbers, $phone_number ) {
		// Validate input parameters.
		if ( ! is_array( $blocked_phone_numbers ) ) {
			$blocked_phone_numbers = array();
		}

		if ( ! is_string( $phone_number ) && ! is_numeric( $phone_number ) ) {
			return $blocked_phone_numbers;
		}

		$phone_number = sanitize_text_field( wp_unslash( (string) $phone_number ) );

		// Validate phone number is not empty after sanitization.
		if ( MoUtility::is_blank( $phone_number ) ) {
			return $blocked_phone_numbers;
		}

		// Only process if country selection is enabled.
		if ( MoUtility::is_blank( $this->selected_country_type ) ) {
			return $blocked_phone_numbers;
		}

		// Decide which list to use based on the current mode.
		$mode               = '';
		$country_option_raw = '';
		if ( $this->selected_country_type === $this->sc_allow_tag ) {
			$mode               = 'allow';
			$country_option_raw = mo_get_sc_option( 'selected_country_list' );
		} elseif ( $this->selected_country_type === $this->sc_block_tag ) {
			$mode               = 'block';
			$country_option_raw = mo_get_sc_option( 'block_selected_country_list' );
		} else {
			// Feature disabled or misconfigured; do not alter the blocked list.
			return $blocked_phone_numbers;
		}

		// Admin UI stores country NAMES in the options; convert them to a clean list.
		$selected_country_names = array_filter(
			array_map(
				'sanitize_text_field',
				array_map(
					'trim',
					explode( ';', (string) $country_option_raw )
				)
			)
		);

		if ( empty( $selected_country_names ) ) {
			// No restrictions configured; leave the list unchanged.
			return $blocked_phone_numbers;
		}

		// Map country names to their corresponding numeric country codes.
		$selected_countries_code = array();
		$all_countries           = CountryList::get_countrycode_list();
		$name_to_code            = array();

		foreach ( $all_countries as $country ) {
			if ( isset( $country['name'], $country['countryCode'] ) ) {
				$name_key                  = strtolower( trim( $country['name'] ) );
				$name_to_code[ $name_key ] = (string) $country['countryCode'];
			}
		}

		foreach ( $selected_country_names as $name ) {
			$lookup_key = strtolower( $name );
			if ( isset( $name_to_code[ $lookup_key ] ) ) {
				$selected_countries_code[] = $name_to_code[ $lookup_key ];
			}
		}

		$selected_countries_code = array_values( array_unique( $selected_countries_code ) );

		if ( empty( $selected_countries_code ) ) {
			// Could not resolve any valid country codes; treat as no restriction.
			return $blocked_phone_numbers;
		}

		// Extract the country code from the phone number using the utility function.
		// Note: MoUtility::get_country_code() safely handles:
		// - Phone numbers with or without '+' prefix.
		// - Phone numbers without country code (returns default if set).
		// - Invalid or empty phone numbers (returns null/blank).
		// - Phone numbers with spaces, hyphens, or leading zeros.
		$phone_country_code = MoUtility::get_country_code( $phone_number );
		if ( MoUtility::is_blank( $phone_country_code ) ) {
			// If we can't determine the country code, don't block it.
			// This handles cases where:
			// - Phone number format is invalid.
			// - No country code can be extracted.
			// - No default country code is configured.
			return $blocked_phone_numbers;
		}

		// Allow mode: block numbers that do NOT have an allowed country code.
		if ( 'allow' === $mode ) {
			// Check if the phone number's country code is in the allowed list.
			if ( in_array( $phone_country_code, $selected_countries_code, true ) ) {
				// Number is from an allowed country.
				return $blocked_phone_numbers;
			}

			// Not from an allowed country -> block it.
			$blocked_phone_numbers[] = $phone_number;
			return $blocked_phone_numbers;
		}

		// Block mode: block numbers that DO have a blocked country code.
		if ( 'block' === $mode ) {
			// Check if the phone number's country code is in the blocked list.
			if ( in_array( $phone_country_code, $selected_countries_code, true ) ) {
				$blocked_phone_numbers[] = $phone_number;
				return $blocked_phone_numbers;
			}

			// Not in blocked list -> allowed.
			return $blocked_phone_numbers;
		}

		// Fallback - should not be reached, but keep behaviour safe.
		return $blocked_phone_numbers;
	}

	/**
	 * This function registers the js file for changins selected countory textarea.
	 */
	public function miniorange_register_selected_country_script() {
		// Only enqueue on the country code addon settings page.
		$current_screen = get_current_screen();
		$page           = MoUtility::get_current_page_parameter_value( 'page', '' );
		$addon          = MoUtility::get_current_page_parameter_value( 'addon', '' );

		// Check if we're on the addon page with selectedcountrycode addon.
		$is_addon_page    = ( 'addon' === $page || ( $current_screen && 'otp-verification_page_addon' === $current_screen->id ) );
		$is_country_addon = ( 'selectedcountrycode' === $addon );

		if ( ! $is_addon_page || ! $is_country_addon ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		wp_register_script( 'moscountry', MOV_URL . 'addons/countrycode/includes/js/moscountry.js', array( 'jquery' ), MOV_VERSION, true );
		wp_localize_script(
			'moscountry',
			'moscountryvar',
			array(
				'siteURL' => admin_url( 'admin-ajax.php' ),

			)
		);
		wp_enqueue_script( 'moscountry' );
	}

	/**
	 * Handles Addon Options
	 *
	 * @param array $data - The POST data.
	 * @return void
	 */
	public function mo_handle_addon_options( $data ) {

		$this->selected_country_type = MoUtility::sanitize_check( 'mo_customer_validation_sc_type', $data );
		$this->is_country_allowed    = MoUtility::sanitize_check( 'mo_selected_country_numbers', $data );
		$this->is_country_blocked    = MoUtility::sanitize_check( 'mo_block_selected_country_numbers', $data );

		// Validate dropdown and default-country constraints against current inputs.
		if ( ! $this->validate_default_country_settings() ) {
			return;
		}

		mo_update_sc_option( 'select_country_type', $this->selected_country_type );
		mo_update_sc_option( 'selected_country_list', $this->is_country_allowed );
		mo_update_sc_option( 'block_selected_country_list', $this->is_country_blocked );
	}

	/**
	 * Validate settings before saving addon options.
	 * Ensures dropdown is enabled and the default country is compatible with
	 * the selected allow/block lists. Emits admin errors and returns false on
	 * violation; returns true when validation passes.
	 *
	 * @return bool True if valid; false otherwise
	 */
	private function validate_default_country_settings() {
		$default_country_name = '';
		$default_country_data = CountryList::get_default_country_data();
		if ( ! MoUtility::is_blank( $default_country_data ) && isset( $default_country_data['name'] ) ) {
			$default_country_name = $default_country_data['name'];
		} else {
			$default_country_code = CountryList::get_default_countrycode();
			if ( ! MoUtility::is_blank( $default_country_code ) ) {
				foreach ( CountryList::get_countrycode_list() as $c ) {
					if ( isset( $c['countryCode'] ) && $c['countryCode'] === $default_country_code ) {
						$default_country_name = isset( $c['name'] ) ? $c['name'] : '';
						break;
					}
				}
			}
		}

		if ( MoUtility::is_blank( $default_country_name ) ) {
			return true; // No default configured; nothing to validate.
		}

		$allowed_countries = MoUtility::is_blank( $this->is_country_allowed ) ? array() : array_filter( array_map( 'trim', explode( ';', (string) $this->is_country_allowed ) ) );
		$blocked_countries = MoUtility::is_blank( $this->is_country_blocked ) ? array() : array_filter( array_map( 'trim', explode( ';', (string) $this->is_country_blocked ) ) );

		// Normalize case for comparison so validation matches the filtering logic
		// in mo_selected_countries(), which uses case-insensitive name matching.
		$default_country_normalized = strtolower( trim( $default_country_name ) );
		$allowed_normalized         = array_map(
			static function ( $country ) {
				return strtolower( trim( $country ) );
			},
			$allowed_countries
		);
		$blocked_normalized         = array_map(
			static function ( $country ) {
				return strtolower( trim( $country ) );
			},
			$blocked_countries
		);

		$settings_url = add_query_arg( array( 'page' => 'otpsettings' ), admin_url( 'admin.php' ) );
		if ( $this->selected_country_type === $this->sc_allow_tag && ! in_array( $default_country_normalized, $allowed_normalized, true ) ) {
			$message = '<b>' . esc_html__( 'Default Country', 'miniorange-otp-verification' ) . '</b>: ' . esc_html( $default_country_name ) . ' ' . esc_html__( 'must be included in the', 'miniorange-otp-verification' ) . ' <b>' . esc_html__( 'Selected Countries', 'miniorange-otp-verification' ) . '</b> ' . esc_html__( 'list. Update it in the', 'miniorange-otp-verification' ) . ' <a href="' . esc_url( $settings_url ) . '" target="_blank" class="font-semibold">' . esc_html__( 'OTP Settings', 'miniorange-otp-verification' ) . '</a> ' . esc_html__( 'or change your selection.', 'miniorange-otp-verification' );
			do_action( 'mo_registration_show_message', $message, 'ERROR' );
			return false;
		}

		if ( $this->selected_country_type === $this->sc_block_tag && in_array( $default_country_normalized, $blocked_normalized, true ) ) {
			$message = '<b>' . esc_html__( 'Default Country', 'miniorange-otp-verification' ) . '</b>: ' . esc_html( $default_country_name ) . ' ' . esc_html__( 'cannot be added to the', 'miniorange-otp-verification' ) . ' <b>' . esc_html__( 'Blocked Countries', 'miniorange-otp-verification' ) . '</b> ' . esc_html__( 'list. Remove it or change the default selection in', 'miniorange-otp-verification' ) . ' <a href="' . esc_url( $settings_url ) . '" target="_blank" class="font-semibold">' . esc_html__( 'OTP Settings', 'miniorange-otp-verification' ) . '</a>.';
			do_action( 'mo_registration_show_message', $message, 'ERROR' );
			return false;
		}

		return true;
	}
	/**
	 * Gives selected country allowed tags
	 *
	 * @return string
	 */
	public function get_is_enabled() {
		return $this->sc_allow_tag;
	}

	/**
	 * Gives blocked country allowed tags
	 *
	 * @return string
	 */
	public function get_is_block_country_enabled() {
		return $this->sc_block_tag;
	}

	/**
	 * Checks if country is allowed
	 *
	 * @return string
	 */
	public function get_is_country_allowed() {
		return $this->is_country_allowed;
	}

	/**
	 * Checks if country is blocked
	 *
	 * @return string
	 */
	public function get_is_country_blocked() {
		return $this->is_country_blocked;
	}

	/**
	 * Gives selected country type
	 *
	 * @return string
	 */
	public function get_sc_type() {
		return $this->selected_country_type;
	}
}
