<?php

class WOOMULTI_CURRENCY_Plugin_Product_Add_On_Ultimate {
	public function __construct() {
		add_filter( 'pewc_filter_field_price', [ $this, 'field_price_convert' ] );
		add_filter( 'pewc_filter_option_price', [ $this, 'field_price_convert' ] );

		add_filter( 'woocommerce_get_cart_item_from_session', [ $this, 'set_price_with_current_currency' ], 10, 2 );
		add_filter( 'pewc_after_add_cart_item_data', [ $this, 'add_currency_after_add_cart_item_data' ] );
		add_filter( 'pewc_price_with_extras_before_calc_totals', [ $this, 'revert_set_price' ] );

		add_filter( 'pewc_add_cart_item_data_price', [ $this, 'revert_set_price' ] );
	}

	public function field_price_convert( $amount ) {
		return wmc_get_price( $amount );
	}

	public function revert_set_price( $price ) {
		return wmc_revert_price( $price );
	}

	public function set_price_with_current_currency( $cart_item, $values ) {
		if ( empty( $values['product_extras'] ) ) {
			return $cart_item;
		}

		$pid          = $values['variation_id'] ? $values['variation_id'] : $values['product_id'];
		$wmc_extras   = $values['product_extras']['wmc_extras'] ?? 0;
		$option_price = wmc_get_price( $wmc_extras );

		$product       = wc_get_product( $pid );
		$product_price = floatval( $product->get_price() );

		$cart_item['product_extras']['price_with_extras'] = $product_price + $option_price;
		$cart_item['product_extras']['original_price']    = $product_price;
		$wmc_groups                                       = $cart_item['product_extras']['wmc_groups'] ?? [];

		if ( ! empty( $cart_item['product_extras']['groups'] ) && ! empty( $wmc_groups ) ) {

			foreach ( $cart_item['product_extras']['groups'] as $group_id => $group ) {
				if ( ! empty( $group ) ) {
					foreach ( $group as $item_id => $item ) {
						$cart_item['product_extras']['groups'][ $group_id ][ $item_id ]['price'] = wmc_get_price( $wmc_groups[ $group_id ][ $item_id ]['price'] );
					}
				}
			}
		}

		return $cart_item;
	}

	public function add_currency_after_add_cart_item_data( $cart_item_data ) {
		// Save the selected currency
		$setting  = WOOMULTI_CURRENCY_Data::get_ins();
		$currency = $setting->get_current_currency();

		$current_price_with_extras = $cart_item_data['product_extras']['price_with_extras'] ?? 0;
		$current_original_price    = $cart_item_data['product_extras']['original_price'] ?? 0;
		$extras_price              = $current_price_with_extras - $current_original_price;

		$cart_item_data['product_extras']['wmc_currency'] = $currency;
		$cart_item_data['product_extras']['wmc_extras']   = $extras_price;

		if ( ! empty( $cart_item_data['product_extras']['groups'] ) ) {

			foreach ( $cart_item_data['product_extras']['groups'] as $group_id => $group ) {
				if ( ! empty( $group ) ) {
					foreach ( $group as $item_id => $item ) {
						$cart_item_data['product_extras']['wmc_groups'][ $group_id ][ $item_id ]['price'] = $item['price'];
					}
				}
			}
		}

		return $cart_item_data;
	}
}

