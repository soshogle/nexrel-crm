<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Ingrid_Woo
 * Plugin: Ingrid Delivery Checkout https://www.ingrid.com/
 * in development https://developer.ingrid.com/delivery_checkout/features/currency_conversion/
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Ingrid_Woo {

	public function __construct() {

	}

	public static function register_multi_currency($currency, $currencies) {
		$list_currency = $currencies;
		$api_currency = [];
		if ( empty( $list_currency ) || count( $list_currency ) < 2 || ! is_array( $list_currency ) || empty( $currency ) ) {
			return false;
		}
		foreach ( $list_currency as $l_key => $l_val ) {
			$api_currency[$l_key] = $l_val['rate'];
		}
		$url            = "https://api-stage.ingrid.com/v1/currency_conversion/fxrates/upload";
		$request        = wp_remote_get(
			$url, array(
				'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
				'timeout'    => 100,
				'headers'    => array(
					'Content-Type' => 'application/json',
					'Accept' => 'application/json',
					'Authorization' => 'Bearer XXE5ODA0NTU0Y2JmNDRkYjhiYTdhM2NhX2EyZjFiNGE='
				),
				'data-raw'    => array(
//					"base" => $currency,
//					'rates' => $api_currency
					"base" => 'SEK',
					'rates' => array(
						'EUR' => '0.8'
					)
				)
			)
		);

		if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
			$body = json_decode( wp_remote_retrieve_body( $request ) );
			return $body;
		}

		return false;
	}
}