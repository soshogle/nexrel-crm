<?php
/**
 * Easyship API.
 *
 * @package Easyship\WooCommerce
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Easyship API class.
 */
final class Easyship_WC_Shipping_API {
	/**
	 * API Key.
	 *
	 * @var string
	 */
	private $api_key;

	/**
	 * API Secret.
	 *
	 * @var string
	 */
	private $api_secret;

	/**
	 * Access Token.
	 *
	 * @var string
	 */
	private $access_token;

	/**
	 * Shipping method instance ID.
	 *
	 * @var int
	 */
	private $shipping_method_instance_id;

	/**
	 * Is insured.
	 *
	 * @var bool
	 */
	private $is_insured;

	/**
	 * Taxes and duties paid by.
	 *
	 * @var string
	 */
	private $taxes_duties_paid_by;

	/**
	 * Constructor.
	 *
	 * @param string $token Access token.
	 * @param string $api_key The API key to use.
	 * @param string $api_secret The API secret.
	 * @param string $taxes_duties_paid_by Whoever pays for taxes.
	 * @param array  $opts Options.
	 * @throws Exception If API Key or API Secret is empty.
	 */
	public function __construct( ?string $token, ?string $api_key, ?string $api_secret, ?string $taxes_duties_paid_by, array $opts = array() ) {
		$this->access_token = trim( $token ?? '' );
		$this->api_key      = trim( $api_key ?? '' );
		$this->api_secret   = str_replace( '\n', "\n", $api_secret ?? '' );

		$this->shipping_method_instance_id = (int) ( $opts['shipping_method_instance_id'] ?? 0 );

		if ( empty( $this->access_token ) && ( empty( $this->api_key ) || empty( $this->api_secret ) ) ) {
			throw new Exception( esc_html__( 'Missing API Key and API Secret OR Access Token!', 'easyship-woocommerce-shipping-rates' ) );
		}

		// If incoterms/insurance already exist on WC, send it with API.
		$this->is_insured           = false;
		$this->taxes_duties_paid_by = $taxes_duties_paid_by ?? 'Sender';
	}

	/**
	 * Get the transient option name.
	 */
	private function transient_option_name(): string {
		return self::generate_transient_option_name( $this->shipping_method_instance_id );
	}

	/**
	 * Get the transient option name.
	 *
	 * @param int $instance_id The shipping method instance ID.
	 */
	private static function generate_transient_option_name( int $instance_id = 0 ): string {
		return $instance_id > 0 ? 'easyship_api_tmp_access_token:i' . $instance_id : 'easyship_api_tmp_access_token';
	}

	/**
	 * Clear the cached information (e.g., the access token) for a specific context (sometimes given by a shipping method instance).
	 *
	 * @param int $instance_id The shipping method instance ID.
	 */
	public static function clear_cached_info( int $instance_id = 0 ): void {
		delete_transient( self::generate_transient_option_name( $instance_id ) );
	}

	/**
	 * Get Auth info.
	 *
	 * @throws Exception If API Key or API Secret is empty.
	 */
	private function auth(): void {
		$access_token_transient_option_name = $this->transient_option_name();

		// If access token is found in the transient (session-like) options and not expired, reuse it.
		$access_token = get_transient( $access_token_transient_option_name );
		if ( is_string( $access_token ) && '' !== $access_token ) {
			$this->access_token = $access_token;
			return;
		}

		$url = Easyship_Utils::auth_base_url( 'oauth2/token' );

		$jwt_head = Easyship_Utils::base64url_encode( '{"typ":"JWT","alg":"RS256"}' );

		$now                = time();
		$jwt_claim_set_json = '{"iss":"' . $this->api_key . '","aud":"' . $url . '","scope":"rate","exp":' . ( $now + 3600 ) . ',"iat":' . $now . '}'; // 3600 = number of seconds in 1 hour.
		$jwt_claim_set      = Easyship_Utils::base64url_encode( $jwt_claim_set_json );

		$private_key = openssl_pkey_get_private( $this->api_secret );
		if ( ! $private_key ) {
			throw new Exception( esc_html__( 'Failed to parse API Secret as a private key.', 'easyship-woocommerce-shipping-rates' ) );
		}

		$signature = '';
		openssl_sign( $jwt_head . '.' . $jwt_claim_set, $signature, $private_key, 'sha256' );
		$signature = Easyship_Utils::base64url_encode( $signature );

		$jwt_token = $jwt_head . '.' . $jwt_claim_set . '.' . $signature;

		/**
		 * API Document - request access token
		 * POST https://auth.easyship.com/oauth2/token
		 * {
		 *   "grant_type": "assertion",
		 *   "assertion": "<YOUR_JWT>",
		 *   "assertion_type": "urn:ietf:params:oauth:grant-type:jwt-bearer"
		 * }
		 */
		$request_array = array(
			'grant_type'     => 'assertion',
			'assertion'      => $jwt_token,
			'assertion_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
		);

		$response = wp_remote_post(
			$url,
			array(
				'headers' => array( 'content-type' => 'application/json' ),
				'body'    => wp_json_encode( $request_array ),
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new Exception( esc_html( $response->get_error_message() ) );
		}

		if ( 200 === $response['response']['code'] ) {
			$body = json_decode( $response['body'], true );

			$now = time();
			$ttl = max( ( $body['created_at'] + $body['expires_in'] ) - $now, 1 );

			$new_access_token   = $body['access_token'];
			$this->access_token = $new_access_token;
			set_transient( $access_token_transient_option_name, $new_access_token, $ttl );
		}
	}

	/**
	 * Get shipping rate.
	 *
	 * @param array $destination Destination.
	 * @param array $items       Items.
	 * @throws Exception If API Key or API Secret is empty.
	 */
	public function get_shipping_rate( array $destination, array $items ): array {
		$url = Easyship_Utils::api_base_url( 'rate/v1/woocommerce' );

		if ( empty( $this->access_token ) ) { // Access token is not set yet.
			try {
				$this->auth();
			} catch ( \Throwable $e ) {
				wc_add_notice(
					/* translators: %s: error message */
					sprintf( __( 'Error: %s', 'easyship-woocommerce-shipping-rates' ), $e->getMessage() ),
					'error'
				);
				return array();
			}
		}

		// Shopper-facing context: get the actual active currency (WOOCS/WCML respected).
		$currency = Easyship_Utils::get_active_currency();

		$request_array = array(
			'destination_country_alpha2' => $destination['country'],
			'destination_postal_code'    => ( empty( $destination['postcode'] ) ) ? 0 : $destination['postcode'],
			'destination_address_line_1' => $destination['address'] ?? ( $destination['address_1'] ?? '' ),
			'destination_address_line_2' => $destination['address_2'],
			'destination_city'           => $destination['city'] ?? '',
			'destination_state'          => $destination['state'] ?? '',
			'taxes_duties_paid_by'       => $this->taxes_duties_paid_by,
			'is_insured'                 => $this->is_insured,
			'output_currency'            => $currency,
			'items'                      => $items,
		);

		$args = array(
			'headers' => array(
				'Content-Type'  => 'application/json',
				'Authorization' => 'Bearer ' . $this->access_token,
				'X-Woocommerce' => 'woocommerce-easyship',
			),
			'body'    => wp_json_encode( $request_array ),
			'method'  => 'POST',
			'timeout' => 25,
		);

		$t0       = microtime( true );
		$response = wp_remote_post( $url, $args );
		$ms       = (int) ( ( microtime( true ) - $t0 ) * 1000 );

		if ( is_wp_error( $response ) ) {
			$error_message = $response->get_error_message();

			if ( 'fsocket timed out' === $error_message ) {
				throw new Exception( esc_html__( 'Sorry, the shipping rates are currently unavailable, please refresh the page or try again later', 'easyship-woocommerce-shipping-rates' ) );
			}

			throw new Exception( esc_html__( 'Sorry, something went wrong with the shipping rates. If the problem persists, please contact us!', 'easyship-woocommerce-shipping-rates' ) );
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = (string) wp_remote_retrieve_body( $response );

		if ( 200 !== $status ) {
			Easyship_Logger::error(
				'Easyship API error response.',
				array(
					'instance_id'   => $this->shipping_method_instance_id,
					'destination'   => array(
						'country'  => $destination['country'] ?? '',
						'postcode' => $destination['postcode'] ?? '',
						'city'     => $destination['city'] ?? '',
						'state'    => $destination['state'] ?? '',
					),
					'items_count'   => count( $items ),
					'response_time' => $ms . ' ms',
					'status'        => $status,
					'body'          => $body, // Raw response for debugging.
				)
			);
			return array();
		}

		// Parse JSON + visibility.
		$data = json_decode( $body, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			Easyship_Logger::error(
				'Easyship API returned invalid JSON.',
				array(
					'instance_id'   => $this->shipping_method_instance_id,
					'destination'   => array(
						'country'  => $destination['country'] ?? '',
						'postcode' => $destination['postcode'] ?? '',
						'city'     => $destination['city'] ?? '',
						'state'    => $destination['state'] ?? '',
					),
					'items_count'   => count( $items ),
					'response_time' => $ms . ' ms',
					'body'          => $body,
				)
			);
			return array();
		}

		// Extract rates with graceful fallbacks, then log counts.
		// (We do not change your returned shape; we only make the lookup tolerant).
		$rates = array();
		if ( isset( $data['rates'] ) && is_array( $data['rates'] ) ) {
			$rates = $data['rates'];
		} elseif ( isset( $data['preferred_rates'] ) && is_array( $data['preferred_rates'] ) ) {
			$rates = $data['preferred_rates'];
		} elseif ( isset( $data['data']['rates'] ) && is_array( $data['data']['rates'] ) ) {
			$rates = $data['data']['rates'];
		}

		if ( empty( $rates ) ) {
			Easyship_Logger::info(
				'Easyship API returned no rates.',
				array(
					'instance_id'   => $this->shipping_method_instance_id,
					'destination'   => array(
						'country'  => $destination['country'] ?? '',
						'postcode' => $destination['postcode'] ?? '',
						'city'     => $destination['city'] ?? '',
						'state'    => $destination['state'] ?? '',
					),
					'items_count'   => count( $items ),
					'response_time' => $ms . ' ms',
					'raw_keys'      => $data, // Full API response body (already JSON-decoded).
				)
			);
		}

		return is_array( $rates ) ? $rates : array();
	}
}
