<?php
/**
 * Easyship Registration.
 *
 * @package Easyship\WooCommerce
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Easyship Registration class.
 */
final class Easyship_WC_Registration {
	/**
	 * Description to allow us to find the Easyship OAuth key in the WooCommerce keys table.
	 */
	private const API_KEY_DESCRIPTION = 'Easyship Integration';

	/**
	 * WPDB instance.
	 *
	 * @var wpdb
	 */
	private $wpdb;

	/**
	 * WooCommerce instance.
	 *
	 * @var WooCommerce
	 */
	private $woocommerce;

	/**
	 * Constructor.
	 */
	public function __construct() {
		global $wpdb;
		global $woocommerce;

		$this->wpdb        = $wpdb;
		$this->woocommerce = $woocommerce;
	}

	/**
	 * Send request to Easyship.
	 *
	 * @return string|array
	 */
	public function send_request() {
		$request            = array();
		$request['oauth']   = $this->get_oauth_info();
		$request['user']    = $this->get_user_info();
		$request['company'] = $this->get_company_info();
		$request['store']   = $this->get_store_info();
		$request['address'] = $this->get_address_info();

		$endpoint = Easyship_Utils::api_base_url( 'api/v1/woo_commerce_group/registrations' );

		$request_args = array(
			'headers' => array(
				'Content-Type'  => 'application/json',
				'Cache-Control' => 'no-cache',
			),
			'body'    => wp_json_encode( $request ),
			'timeout' => 30,
			'method'  => 'POST',
		);

		$response = wp_remote_post( $endpoint, $request_args );

		header( 'Content-Type: application/json' );

		try {
			if ( is_wp_error( $response ) ) {
				return array(
					'error'         => esc_html__( 'Service temporarily unavailable', 'easyship-woocommerce-shipping-rates' ),
					'error_code'    => $response->get_error_code(),
					'error_message' => $response->get_error_message(),
					'response'      => null,
				);
			}

			$raw_response = wp_remote_retrieve_body( $response );
			$data         = json_decode( $raw_response, true );

			if ( null === $data ) {
				return array(
					'error'         => esc_html__( 'Service temporarily unavailable', 'easyship-woocommerce-shipping-rates' ),
					'error_code'    => 0,
					'error_message' => '',
					'response'      => $raw_response,
				);
			}

			return $data;
		} catch ( \Throwable $e ) {
			return array( 'error' => $e->getMessage() );
		}
	}

	/**
	 * Get OAuth info.
	 */
	private function get_oauth_info(): array {
		return $this->create_api_keys();
	}

	/**
	 * Create API keys.
	 *
	 * @return array|bool
	 */
	private function create_api_keys() {
		// Check if the user has admin capabilities.
		if ( ! current_user_can( 'manage_options' ) ) {
			Easyship_Logger::warning( 'API key creation blocked, due to insufficient capability.' );
			return false;
		}

		// Expect to be called from an admin click; nevertheless, guard for a valid user_id.
		$user_id = (int) get_current_user_id();
		if ( $user_id <= 0 ) {
			Easyship_Logger::error( 'API key creation failed: no current user.' );
			return false;
		}

		$wpdb = $this->wpdb;

		$table = $wpdb->prefix . 'woocommerce_api_keys';

		// Generate credentials.
		$consumer_key           = 'ck_' . wc_rand_hash();
		$consumer_secret        = 'cs_' . wc_rand_hash();
		$truncated_consumer_key = substr( $consumer_key, -7 ); // WC shows last 7 chars.

		// Rotate: remove any previous Easyship site-wide keys by description (site scope).
		// We do NOT filter by user_id on purpose — this key is a site singleton.
		$deleted = $wpdb->delete(
			$table,
			array( 'description' => self::API_KEY_DESCRIPTION ),
			array( '%s' )
		);
		if ( false === $deleted && ! empty( $wpdb->last_error ) ) {
			Easyship_Logger::error( 'Failed deleting previous API keys', array(
				'table' => $table,
				'error' => $wpdb->last_error,
				'desc'  => self::API_KEY_DESCRIPTION,
			) );
			// We won’t hard‑fail here. Insert may still succeed even if delete failed.
		}

		$inserted = $wpdb->insert(
			$table,
			array(
				'user_id'         => $user_id,
				'description'     => self::API_KEY_DESCRIPTION, // Unique to this plugin.
				'permissions'     => 'read_write',
				'consumer_key'    => wc_api_hash( $consumer_key ),
				'consumer_secret' => $consumer_secret, // WC stores plaintext secret.
				'truncated_key'   => $truncated_consumer_key,
			),
			array(
				'%d',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
			)
		);
		if ( false === $inserted ) {
			Easyship_Logger::error( 'API key insert failed', array(
				'table' => $table,
				'error' => $wpdb->last_error,
				'owner' => $user_id,
			) );
			return false;
		}

		Easyship_Logger::info( 'API key created', array(
			'key_id'      => $wpdb->insert_id,
			'owner'       => $user_id,
			'truncated'   => $truncated_consumer_key,
			'description' => self::API_KEY_DESCRIPTION,
		) );

		return array(
			'consumer_key'    => $consumer_key,
			'consumer_secret' => $consumer_secret,
		);
	}

	/**
	 * Get user info.
	 */
	private function get_user_info(): array {
		$response = array(
			'email'        => '',
			'first_name'   => '',
			'last_name'    => '',
			'mobile_phone' => '',
		);

		// Logged-in user?
		$user = wp_get_current_user();
		if ( $user && 0 !== (int) $user->ID ) {
			// Email.
			$email             = (string) $user->user_email;
			$response['email'] = is_email( $email ) ? $email : '';

			// Names.
			$first                  = trim( get_user_meta( $user->ID, 'first_name', true ) );
			$last                   = trim( get_user_meta( $user->ID, 'last_name', true ) );
			$nicename               = (string) $user->user_nicename;
			$response['first_name'] = '' !== $first ? $first : $nicename;
			$response['last_name']  = $last;

			// WooCommerce billing phone (from user meta).
			$raw_phone = (string) get_user_meta( $user->ID, 'billing_phone', true );
			if ( function_exists( 'wc_sanitize_phone_number' ) ) {
				$phone = wc_sanitize_phone_number( $raw_phone );
			} else {
				// Simple, permissive cleanup.
				$phone = preg_replace( '/[^\d+\-\s\(\)]/', '', $raw_phone );
			}
			$response['mobile_phone'] = $phone;
		}

		return $response;
	}

	/**
	 * Get company info.
	 */
	private function get_company_info(): array {
		$country = explode( ':', get_option( 'woocommerce_default_country' ) );

		$response                 = array();
		$response['name']         = get_option( 'blogname' );
		$response['country_code'] = ! empty( $country[0] ) ? $country[0] : '';

		return $response;
	}

	/**
	 * Get store info.
	 */
	private function get_store_info(): array {
		$response                      = array();
		$response['platform_store_id'] = Easyship_Utils::get_store_id();
		$response['name']              = get_option( 'blogname' );
		$response['url']               = get_home_url();
		$response['wc_version']        = $this->woocommerce->version;

		return $response;
	}

	/**
	 * Get address info.
	 */
	private function get_address_info(): array {
		$country     = explode( ':', get_option( 'woocommerce_default_country', '' ) );
		$city        = get_option( 'woocommerce_store_city', '' );
		$postal_code = get_option( 'woocommerce_store_postcode', '' );
		$line_1      = get_option( 'woocommerce_store_address', '' );
		$line_2      = get_option( 'woocommerce_store_address_2', '' );

		$response                = array();
		$response['state']       = ! empty( $country[1] ) ? $country[1] : '';
		$response['city']        = ! empty( $city ) ? $city : '';
		$response['postal_code'] = ! empty( $postal_code ) ? $postal_code : '';
		$response['line_1']      = ! empty( $line_1 ) ? $line_1 : '';
		$response['line_2']      = ! empty( $line_2 ) ? $line_2 : '';

		return $response;
	}
}
