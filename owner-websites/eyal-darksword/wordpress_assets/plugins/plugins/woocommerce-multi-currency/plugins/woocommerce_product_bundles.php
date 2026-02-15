<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_WooCommerce_Product_Bundles
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_WooCommerce_Product_Bundles {
	protected $settings;
	protected $bundle_price;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			if ( is_plugin_active( 'woocommerce-product-bundles/woocommerce-product-bundles.php' ) ) {

				add_filter( 'woocommerce_bundle_front_end_params', array( $this, 'woocommerce_bundle_front_end_params' ) );

				if ( is_plugin_active( 'woocommerce-subscriptions/woocommerce-subscriptions.php' ) ) {
					add_filter( 'woocommerce_get_bundle_price_html', array( $this, 'woocommerce_get_bundle_price_html' ), 10, 2 );
				}
			}
		}
	}

	/**
	 * @param $price
	 * @param $product WC_Product_Bundle
	 *
	 * @return mixed
	 */
	public function woocommerce_get_bundle_price_html( $price, $product ) {
		if ( $this->settings->get_current_currency() !== $this->settings->get_default_currency() && $product && $product->is_type( 'bundle' ) && $product->contains( 'subscriptions_priced_individually' ) ) {
			$this->bundle_price = $price;
			add_filter( 'woocommerce_get_price_html', array( $this, 'woocommerce_get_price_html' ), 10, 2 );
		}

		return $price;
	}

	/**
	 * @param $price
	 * @param $product WC_Product_Bundle
	 *
	 * @return mixed
	 */
	public function woocommerce_get_price_html( $price, $product ) {
		if ( $this->bundle_price !== null ) {
			$price              = $this->bundle_price;
			$this->bundle_price = null;
			$bundled_items      = $product->get_bundled_items();

			if ( ! empty( $bundled_items ) ) {

				$subs_details            = array();
				$subs_details_html       = array();
				$non_optional_subs_exist = false;
				$from_string             = wc_get_price_html_from_text();
				$has_payment_up_front    = $product->get_bundle_regular_price( 'min' ) > 0;
				$is_range                = false !== strpos( $price, $from_string );

				foreach ( $bundled_items as $bundled_item_id => $bundled_item ) {

					if ( $bundled_item->is_subscription() && $bundled_item->is_priced_individually() ) {

						$bundled_product    = $bundled_item->product;
						$bundled_product_id = $bundled_item->get_product_id();

						if ( $bundled_item->is_variable_subscription() ) {
							$product = $bundled_item->min_price_product;
						} else {
							$product = $bundled_product;
						}

						$sub_string = str_replace( '_synced', '', WC_Subscriptions_Cart::get_recurring_cart_key( array( 'data' => $product ), ' ' ) );

						if ( ! isset( $subs_details[ $sub_string ]['bundled_items'] ) ) {
							$subs_details[ $sub_string ]['bundled_items'] = array();
						}

						if ( ! isset( $subs_details[ $sub_string ]['price'] ) ) {
							$subs_details[ $sub_string ]['price']         = 0;
							$subs_details[ $sub_string ]['regular_price'] = 0;
							$subs_details[ $sub_string ]['is_range']      = false;
						}

						$subs_details[ $sub_string ]['bundled_items'][] = $bundled_item_id;

						$subs_details[ $sub_string ]['price']         += $bundled_item->get_quantity( 'min', array(
								'context'        => 'price',
								'check_optional' => true
							) ) * WC_PB_Product_Prices::get_product_price( $product, array(
								'price' => wmc_get_price( $bundled_item->min_recurring_price ),
								'calc'  => 'display'
							) );
						$subs_details[ $sub_string ]['regular_price'] += $bundled_item->get_quantity( 'min', array(
								'context'        => 'price',
								'check_optional' => true
							) ) * WC_PB_Product_Prices::get_product_price( $product, array(
								'price' => wmc_get_price( $bundled_item->min_regular_recurring_price ),
								'calc'  => 'display'
							) );

						if ( $bundled_item->is_variable_subscription() ) {

							$bundled_item->add_price_filters();

							if ( $bundled_item->has_variable_subscription_price() ) {
								$subs_details[ $sub_string ]['is_range'] = true;
							}

							$bundled_item->remove_price_filters();
						}

						if ( ! isset( $subs_details[ $sub_string ]['price_html'] ) ) {
							$subs_details[ $sub_string ]['price_html'] = WC_PB_Product_Prices::get_recurring_price_html_component( $product );
						}
					}
				}

				if ( ! empty( $subs_details ) ) {

					foreach ( $subs_details as $sub_details ) {

						if ( $sub_details['is_range'] ) {
							$is_range = true;
						}

						if ( $sub_details['regular_price'] > 0 ) {

							$sub_price_html = wc_price( $sub_details['price'] );

							if ( $sub_details['price'] !== $sub_details['regular_price'] ) {

								$sub_regular_price_html = wc_price( $sub_details['regular_price'] );
								$sub_price_html         = wc_format_sale_price( $sub_regular_price_html, $sub_price_html );
							}

							$sub_price_details_html = sprintf( $sub_details['price_html'], $sub_price_html );
							$subs_details_html[]    = '<span class="bundled_sub_price_html">' . $sub_price_details_html . '</span>';
						}
					}

					$subs_price_html       = '';
					$subs_details_html_len = count( $subs_details_html );

					foreach ( $subs_details_html as $i => $sub_details_html ) {
						if ( $i === $subs_details_html_len - 1 || ( $i === 0 && ! $has_payment_up_front ) ) {
							if ( $i > 0 || $has_payment_up_front ) {
								/* translators: %1$s: subs price html, %2$s: subs detail html */
								$subs_price_html = sprintf( _x( '%1$s, and</br>%2$s', 'subscription price html', 'woocommerce-product-bundles' ), $subs_price_html, $sub_details_html );
							} else {
								$subs_price_html = $sub_details_html;
							}
						} else {
							/* translators: %1$s: subs price html, %2$s: subs detail html */
							$subs_price_html = sprintf( _x( '%1$s,</br>%2$s', 'subscription price html', 'woocommerce-product-bundles' ), $subs_price_html, $sub_details_html );
						}
					}

					if ( $subs_price_html ) {

						if ( $has_payment_up_front ) {
							/* translators: %1$s: price value, %2$s: subs price html */
							$price = sprintf( _x( '%1$s<span class="bundled_subscriptions_price_html"> one time%2$s</span>', 'subscription price html', 'woocommerce-product-bundles' ), $price, $subs_price_html );
						} else {
							$price = '<span class="bundled_subscriptions_price_html">' . $subs_price_html . '</span>';
						}

						if ( $is_range && false === strpos( $price, $from_string ) ) {
							/* translators: %1$s: price from, %2$s: value price */
							$price = sprintf( _x( '%1$s%2$s', 'Price range: from', 'woocommerce-product-bundles' ), $from_string, $price );// phpcs:ignore WordPress.WP.I18n.NoEmptyStrings
						}
					}
				}
			}
		}

		return $price;
	}


	public function woocommerce_bundle_front_end_params( $data ) {
		if ( isset( $data['currency_symbol'] ) ) {
			preg_match( '/#PRICE#/i', $data['currency_symbol'], $result );
			if ( count( array_filter( $result ) ) ) {
				$data['currency_symbol'] = str_replace( '#PRICE#', '', $data['currency_symbol'] );
			}
		}

		return $data;
	}
}