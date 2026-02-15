<?php
/**
 * Easyship Endpoints.
 *
 * @package Easyship\WooCommerce
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Easyship Endpoints class.
 */
final class Easyship_WC_Endpoints {
	/**
	 * Init REST API.
	 */
	public static function rest_api_init(): void {
		// WP_REST_Controller was only introduced in WordPress 4.7.0.
		// register_rest_route, WP_REST_Server, WP_REST_Response were introduced in WP 4.4.0.
		if ( class_exists( 'WP_REST_Controller' ) ) {
			// Init REST API routes.
			add_action( 'rest_api_init', function (): void {
				require_once EASYSHIP_PATH . 'includes/woocommerce/class-easyship-wc-rest-token-v1-controller.php';
				$controller = new Easyship_WC_REST_Token_V1_Controller();
				$controller->register_routes();
			}, 10 );
		}
	}
}
