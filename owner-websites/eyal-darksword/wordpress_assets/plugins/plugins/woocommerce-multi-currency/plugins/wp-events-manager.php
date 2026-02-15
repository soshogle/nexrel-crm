<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_WP_Events_Manager
 * Pending development
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_WP_Events_Manager {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			if ( is_plugin_active( 'wp-events-manager/wp-events-manager.php' ) ) {
				add_filter( 'tp_event_price_format', array(
					$this,
					'tp_event_price_format'
				), 99, 3 );
			}
		}
	}

	public function tp_event_price_format( $price_format, $price, $with_currency ) {
		return $this->wc_price( wmc_get_price( $price ) );
	}

	public function wc_price( $price, $args = array() ) {
		extract(
			apply_filters(
				'wc_price_args', wp_parse_args(
					$args, array(
						'ex_tax_label'       => false,
						'currency'           => get_woocommerce_currency_symbol(),
						'decimal_separator'  => wc_get_price_decimal_separator(),
						'thousand_separator' => wc_get_price_thousand_separator(),
						'decimals'           => wc_get_price_decimals(),
						'price_format'       => get_woocommerce_price_format(),
					)
				)
			)
		);

		$negative = $price < 0;
		$price    = apply_filters( 'raw_woocommerce_price', floatval( $negative ? $price * - 1 : $price ) );
		$price    = apply_filters( 'formatted_woocommerce_price', number_format( $price, $decimals, $decimal_separator, $thousand_separator ), $price, $decimals, $decimal_separator, $thousand_separator );

		if ( apply_filters( 'woocommerce_price_trim_zeros', false ) && $decimals > 0 ) {
			$price = wc_trim_zeros( $price );
		}
		$formatted_price = ( $negative ? '-' : '' ) . sprintf( $price_format, $currency, $price );

		return $formatted_price;
	}

	private function is_default_currency() {
		return $this->settings->get_current_currency() === $this->settings->get_default_currency();
	}
}