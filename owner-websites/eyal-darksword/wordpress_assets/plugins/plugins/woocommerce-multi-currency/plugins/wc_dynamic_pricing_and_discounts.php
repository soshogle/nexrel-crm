<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Plugin_Wc_Dynamic_Pricing_And_Discounts
 */
class WOOMULTI_CURRENCY_Plugin_Wc_Dynamic_Pricing_And_Discounts {
	protected $settings;
	protected $convert;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		$this->convert  = false;
		if ( $this->settings->get_enable() ) {
//			add_filter( 'rightpress_product_price_cart_item_product_display_price',
//				array( $this, 'rightpress_product_price_cart_item_product_display_price' ), 10, 3 );

//			add_filter( 'woocs_exchange_value',
//				array( $this, 'woocs_exchange_value' ) );

			add_filter( 'woocs_convert_price_wcdp',
				array( $this, 'woocs_convert_price_wcdp' ), 10, 3 );
		}
	}

	/**Display cart item price
	 *
	 * @param $formatted_price
	 * @param $price_breakdown_entry
	 * @param $full_price
	 *
	 * @return string
	 */
	public function rightpress_product_price_cart_item_product_display_price( $formatted_price, $price_breakdown_entry, $full_price ) {
		$price = $price_breakdown_entry['price'];
		// Format price

		$formatted_price = wc_price( wmc_get_price( $price ) );
		if ( $full_price && $price != $full_price ) {
			$formatted_price = '<del>' . wc_price( wmc_get_price( $full_price ) ) . '</del> <ins>' . $formatted_price . '</ins>';
		}

		return $formatted_price;
	}

	/**
	 * @param $amount
	 *
	 * @return float|int|mixed
	 */
	public function woocs_exchange_value( $amount ) {
		if ( is_cart() || is_checkout() ) {
			if ( ! $this->convert ) {
				$this->convert = true;
				$amount        = wmc_get_price( $amount );
			}
		} else {
			//wmc_get_price( $amount );//?
			$amount = wmc_get_price( $amount );
		}

		return $amount;
	}

	/**
	 * @param $pricing_value
	 * @param $unknown
	 * @param $pricing_method
	 *
	 * @return float|int|mixed
	 */
	public function woocs_convert_price_wcdp( $pricing_value, $unknown, $pricing_method ) {
		if ( $pricing_method !== 'discount__percentage' ) {
			$pricing_value = (float) wmc_get_price( $pricing_value );
		}

		return $pricing_value;
	}
}