<?php
/**
 * Easyship REST API Token Controller.
 *
 * @package Easyship\WooCommerce
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Easyship REST API Token controller class.
 *
 * @extends WC_REST_Controller
 */
final class Easyship_WC_REST_Token_V1_Controller extends WP_REST_Controller {
	/**
	 * Endpoint namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'easyship/v1';

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'token';

	/**
	 * Register the routes for tokens.
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_token' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_endpoint_args_for_item_schema( WP_REST_Server::CREATABLE ),
				),
			)
		);
	}

	/**
	 * Check if a given request has access to create items
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_Error|bool
	 */
	public function create_item_permissions_check( $request ) {
		$check = $this->perform_oauth_authentication( $request->get_params() );

		return is_null( $check ) ? true : $check;
	}

	/**
	 * Perform OAuth authentication.
	 *
	 * @param array $params Request parameters.
	 *
	 * @return WP_Error|bool
	 */
	private function perform_oauth_authentication( array $params ) {
		$param_names = array(
			'oauth_consumer_key',
			'oauth_timestamp',
			'oauth_nonce',
			'oauth_signature',
			'oauth_signature_method',
		);

		// Check for required OAuth parameters.
		foreach ( $param_names as $param_name ) {
			if ( empty( $params[ $param_name ] ) ) {
				return new WP_Error(
					'woocommerce_rest_authentication_error',
					__( 'Invalid signature - failed to sort parameters.', 'easyship-woocommerce-shipping-rates' ),
					array( 'status' => 401 )
				);
			}
		}

		// Fetch WP user by consumer key.
		$keys = $this->get_keys_by_consumer_key( $params['oauth_consumer_key'] );
		if ( false === $keys ) {
			return new WP_Error(
				'woocommerce_rest_authentication_error',
				__( 'Consumer key is invalid.', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 401 )
			);
		}

		// Perform OAuth validation.
		$this->check_oauth_signature( $keys, $params );
	}

	/**
	 * Get keys by consumer key.
	 *
	 * @param string $consumer_key Consumer key.
	 * @return array|false
	 *
	 * @throws Exception Invalid consumer key.
	 */
	private function get_keys_by_consumer_key( $consumer_key ) {
		global $wpdb;

		// Normalize only (do not sanitize credentials).
		$consumer_key        = trim( (string) $consumer_key );
		$hashed_consumer_key = wc_api_hash( $consumer_key );

		$table = $wpdb->prefix . 'woocommerce_api_keys';
		$row   = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . esc_sql( $table ) . ' WHERE consumer_key = %s LIMIT 1',
				$hashed_consumer_key
			),
			ARRAY_A
		);

		return ! empty( $row ) ? $row : false;
	}

	/**
	 * Verify OAuth 1.0 signature for the current request.
	 *
	 * @param array $keys   Row from woocommerce_api_keys (contains consumer_secret).
	 * @param array $params OAuth params (from query/body) including oauth_signature.
	 * @return WP_Error|true
	 */
	private function check_oauth_signature( $keys, $params ) {
		unset( $params['store_id'], $params['token'] );

		// Required OAuth params present?
		if ( empty( $params['oauth_signature'] ) || empty( $params['oauth_signature_method'] ) ) {
			return new WP_Error(
				'woocommerce_rest_authentication_error',
				__( 'Invalid signature - missing OAuth parameters.', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 401 )
			);
		}

		// HTTP method: do NOT sanitize (would change base string). Only unslash + normalize case.
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Exact value required for OAuth base string.
		$raw_method  = isset( $_SERVER['REQUEST_METHOD'] ) ? (string) wp_unslash( $_SERVER['REQUEST_METHOD'] ) : 'GET';
		$http_method = strtoupper( $raw_method );

		// Request URI path: do NOT sanitize; parse path only (drops query/fragment).
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Exact value required for OAuth base string.
		$raw_request_uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
		$request_path    = (string) wp_parse_url( $raw_request_uri, PHP_URL_PATH );
		if ( '' === $request_path ) {
			$request_path = '/';
		}

		// Derive base URL from the actual request host to avoid home_url mismatches.

		// Scheme/host/port from actual request.
		$scheme = is_ssl() ? 'https' : 'http';

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$host = isset( $_SERVER['HTTP_HOST'] ) ? (string) wp_unslash( $_SERVER['HTTP_HOST'] ) : ( isset( $_SERVER['SERVER_NAME'] ) ? (string) wp_unslash( $_SERVER['SERVER_NAME'] ) : '' );

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$port = isset( $_SERVER['SERVER_PORT'] ) && '' !== $_SERVER['SERVER_PORT'] ? (int) wp_unslash( $_SERVER['SERVER_PORT'] ) : null;

		// OAuth base URL must include the port if it’s non-standard.
		$hostport = $host;
		if ( $port && ( ( 'https' === $scheme && 443 !== $port ) || ( 'http' === $scheme && 80 !== $port ) ) ) {
			$hostport .= ':' . $port;
		}

		$base_request_uri = rawurlencode( $scheme . '://' . $hostport . $request_path );

		// Extract the signature provided by the consumer and remove it from the parameters prior to checking it.
		$consumer_signature = rawurldecode( str_replace( ' ', '+', $params['oauth_signature'] ) );
		unset( $params['oauth_signature'] );

		// Sort parameters.
		if ( ! uksort( $params, 'strcmp' ) ) {
			return new WP_Error(
				'woocommerce_rest_authentication_error',
				__( 'Invalid signature - failed to sort parameters.', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 401 )
			);
		}

		// Normalize parameter key/values.
		$params         = $this->normalize_parameters( $params );
		$query_string   = implode( '%26', self::join_with_equals_sign( $params ) ); // Join with ampersand.
		$string_to_sign = $http_method . '&' . $base_request_uri . '&' . $query_string;

		$consumer_signature_method = (string) $params['oauth_signature_method'];
		if ( 'HMAC-SHA1' !== $consumer_signature_method && 'HMAC-SHA256' !== $consumer_signature_method ) {
			return new WP_Error(
				'woocommerce_rest_authentication_error',
				__( 'Invalid signature - signature method is invalid.', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 401 )
			);
		}

		$hash_algorithm = strtolower( str_replace( 'HMAC-', '', $consumer_signature_method ) ); // This will be either 'sha1' or 'sha256'.
		$secret         = $keys['consumer_secret'] . '&';

		$calculated_signature = Easyship_Utils::base64_encode( hash_hmac( $hash_algorithm, $string_to_sign, $secret, true ) );

		if ( ! hash_equals( $calculated_signature, $consumer_signature ) ) {
			return new WP_Error(
				'woocommerce_rest_authentication_error',
				__( 'Invalid signature - provided signature does not match.', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Normalize parameters for OAuth.
	 *
	 * @param array $parameters Parameters to normalize.
	 */
	private function normalize_parameters( $parameters ): array {
		$normalized_parameters = array();

		foreach ( $parameters as $key => $value ) {
			// Percent symbols (%) must be double-encoded.
			$key   = str_replace( '%', '%25', rawurlencode( rawurldecode( $key ) ) );
			$value = str_replace( '%', '%25', rawurlencode( rawurldecode( $value ) ) );

			$normalized_parameters[ $key ] = $value;
		}

		return $normalized_parameters;
	}

	/**
	 * Prepare the item for create or update operation
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_Error|object $prepared_item
	 */
	protected function prepare_item_for_database( $request ) {
		$item           = new StdClass();
		$item->token    = $request->get_param( 'token' );
		$item->store_id = $request->get_param( 'store_id' );

		if ( empty( $item->token ) ) {
			return new WP_Error(
				'easyship_bad_param',
				__( 'token is required field', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 400 )
			);
		}
		if ( empty( $item->store_id ) ) {
			return new WP_Error(
				'easyship_bad_param',
				__( 'store_id is required field', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 400 )
			);
		}

		return $item;
	}

	/**
	 * Create one item from the collection
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return bool|WP_Error|WP_REST_Response
	 */
	public function create_token( $request ) {
		// Check if the user has admin capabilities.
		if ( ! current_user_can( 'manage_options' ) ) {
			return false;
		}

		$item = $this->prepare_item_for_database( $request );
		try {
			Easyship_WooCommerce_Integration::set_global_api_access_token( $item->token );
		} catch ( \Throwable $e ) {
			return new WP_Error(
				'easyship_internal_error',
				__( 'Something went wrong.', 'easyship-woocommerce-shipping-rates' ),
				array( 'status' => 500 )
			);
		}

		$response = new WP_REST_Response();
		$response->set_data( array( 'success' => true ) );

		return $response;
	}

	/**
	 * Join parameters with equals sign.
	 *
	 * @param array  $params       Parameters to join.
	 * @param array  $query_params Query parameters.
	 * @param string $key          Key.
	 */
	private static function join_with_equals_sign( $params, $query_params = array(), $key = '' ): array {
		foreach ( $params as $param_key => $param_value ) {
			if ( ! empty( $key ) ) {
				$param_key = $key . '%5B' . $param_key . '%5D'; // Handle multi-dimensional array.
			}

			if ( is_array( $param_value ) ) {
				$query_params = self::join_with_equals_sign( $param_value, $query_params, $param_key );
			} else {
				$encoded_key    = wc_rest_urlencode_rfc3986( $param_key );
				$encoded_value  = wc_rest_urlencode_rfc3986( $param_value );
				$query_params[] = $encoded_key . '=' . $encoded_value; // Join with equals sign.
			}
		}

		return $query_params;
	}
}
