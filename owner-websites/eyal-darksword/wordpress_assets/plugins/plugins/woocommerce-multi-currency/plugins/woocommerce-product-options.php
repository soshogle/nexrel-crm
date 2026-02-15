<?php

/**
 * Integrate with WooCommerce Product Options by Barn2 Plugins
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Woocommerce_Product_Options {
	protected static $settings;

	public function __construct() {
		self::$settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( is_plugin_active( 'woocommerce-product-options/woocommerce-product-options.php' ) ) {
			//need add filter to complete
//			add_filter( 'wc_product_options_cart_price', [ $this, 'convert_cart_price' ], 10, 3 );
			add_filter( 'wc_product_options_choice_label_price', [ $this, 'convert_price' ], 10, 1 );
		}
	}

	/**
	 * Convert price for Aelia.
	 *
	 * @param string|float $price
	 * @param WC_Product $product
	 * @param array $price_data
	 * @return string|float
	 */
	public function convert_cart_price( $price, $product, $price_data ) {
		if ( ! in_array( $price_data['type'], [ 'percentage_inc', 'percentage_dec' ], true ) ) {
			return wmc_get_price( $price );
//			return apply_filters( 'wc_aelia_cs_convert', $price, get_option( 'woocommerce_currency' ), get_woocommerce_currency() );
		}

		return $price;
	}

	/**
	 * Convert price.
	 *
	 * @param string|float $price
	 * @return string|float
	 */
	public function convert_price( $price ) {
		return wmc_get_price( $price );
//		return apply_filters( 'wc_aelia_cs_convert', $price, get_option( 'woocommerce_currency' ), get_woocommerce_currency() );
	}

	/**
	 * @param $product_price
	 * @param $product
	 *
	 * @return bool|float|int|string
	 */
	public function ppom_product_price( $product_price, $product ) {
		return wmc_revert_price( $product_price );
	}

	/**
	 * @param $fee_price
	 *
	 * @return float|int|mixed|void
	 */
	public function ppom_cart_fixed_fee( $fee_price ) {
		return wmc_get_price( $fee_price );
	}

	/**
	 * @param $option_price
	 *
	 * @return float|int|mixed|void
	 */
	public function ppom_option_price( $option_price ) {
		return wmc_get_price( $option_price );
	}

	/**
	 * @param $value
	 * @param $cart_item
	 *
	 * @return mixed
	 */
	public function ppom_product_price_on_cart( $value, $cart_item ) {
		$wc_product = $cart_item['data'];
		if ( $wc_product ) {
			$value = $wc_product->get_price( 'edit' );
		}

		return $value;
	}
}