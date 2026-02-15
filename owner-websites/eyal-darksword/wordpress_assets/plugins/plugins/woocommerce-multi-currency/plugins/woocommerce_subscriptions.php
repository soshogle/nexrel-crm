<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_WooCommerce_Subscriptions
 * Author: WooCommerce
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_WooCommerce_Subscriptions {

	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() && is_plugin_active( 'woocommerce-subscriptions/woocommerce-subscriptions.php' ) ) {
			/* Convert currency of item switched to the same with subscription */
			/* Only working right if fixed price option is disabled */
			add_filter( 'wcs_switch_proration_new_price_per_day', array( $this, 'switch_currency_of_new_price_per_day' ), 10, 4 );
			add_filter( 'wcs_switch_proration_old_price_per_day', array( $this, 'switch_currency_of_old_price_per_day' ), 10, 5 );
			add_filter( 'wcs_switch_proration_extra_to_pay', array( $this, 'switch_currency_of_extra_to_pay' ), 10, 2 );
			/* Change currency of subscription to the same with switched item */
			add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'switch_currency_of_subscription' ), 10, 4 );

			// add_filter( 'woocommerce_subscriptions_product_price', array( $this, 'get_price' ) );
			add_filter( 'woocommerce_subscriptions_product_sale_price', array( $this, 'revert_sale_price' ), 10, 2 );
			add_filter( 'woocommerce_subscriptions_product_sign_up_fee', array( $this, 'woocommerce_subscriptions_product_sign_up_fee' ) );
			/*Use fixed price if enabled*/
			add_filter( 'woocommerce_subscriptions_product_price', array( $this, 'woocommerce_subscriptions_product_price' ), 10, 2 );
			/*Convert renewal cart to default currency*/
			add_action( 'woocommerce_load_cart_from_session', array( $this, 'woocommerce_load_cart_from_session' ) );
			add_action( 'woocommerce_cart_loaded_from_session', array( $this, 'woocommerce_cart_loaded_from_session' ) );

			/*Convert renewal cart to subscription currency*/
//			add_action( 'wcs_before_early_renewal_setup_cart_subscription', array( $this, 'wcs_before_early_renewal_setup_cart_subscription' ) );
//			add_action( 'wcs_before_renewal_setup_cart_subscriptions', array( $this, 'wcs_before_renewal_setup_cart_subscriptions' ) );
		}
	}

	public function switch_currency_of_subscription( $item, $cart_item_key, $cart_item, $order ) {
		if ( wcs_is_subscription( $order ) ) {
			$currency = isset( WC()->cart->wmc_item_switched_currency ) ? WC()->cart->wmc_item_switched_currency : '';
			if ( $currency ) {
				$order->set_currency( $currency );
				$order->save();
			}
		} else {
			WC()->cart->wmc_item_switched_currency = $order->get_currency();
		}
	}

	public function get_currency_rate( $subscription ) {
		$items = $subscription->get_items();
		$currency_code   = $subscription->get_currency();
		$list_currencies = $this->settings->get_list_currencies();
		if ( isset( $list_currencies[ $currency_code ] ) ) {
			$currency_rate = $list_currencies[ $currency_code ]['rate'];
		} else {
			$currency_rate = 1; // Set rate to default
		}

		return $currency_rate;
	}

	public function switch_currency_of_extra_to_pay( $extra_to_pay, $subscription ) {
		return $extra_to_pay / $this->get_currency_rate( $subscription );
	}

	public function switch_currency_of_new_price_per_day( $new_price_per_day, $subscription, $cart_item, $days_in_old_circle ) {
		return ( $new_price_per_day * $this->get_currency_rate( $subscription ) );
	}

	public function switch_currency_of_old_price_per_day( $old_price_per_day, $subscription, $cart_item, $total_paid_for_current_period, $days_in_old_cycle ) {
		/* Because related Orders may be in different currencies, need to conver to the same currency */
		$existing_item                 = wcs_get_order_item( $cart_item['subscription_switch']['item_id'], $subscription );
		$switch_item                   = new WCS_Switch_Cart_Item( $cart_item, $subscription, $existing_item );
		$total_paid_for_current_period = $this->get_total_paid_for_curerent_period( $switch_item );
		$old_price_per_day             = $days_in_old_cycle > 0 ? $total_paid_for_current_period / $days_in_old_cycle : $total_paid_for_current_period;

		return ( $old_price_per_day * $this->get_currency_rate( $subscription ) );
	}

	public function get_total_paid_for_curerent_period( $switch_item ) {
		if ( ! isset( $switch_item->total_paid_for_current_period ) ) {
			if ( $this->is_switch_after_fully_reduced_prepaid_term( $switch_item ) ) {
				$switch_item->total_paid_for_current_period = $this->calculate_total_paid_since_last_order( $switch_item->subscription, $switch_item->existing_item, 'exclude_sign_up_fees', array( $switch_item->get_last_switch_order() ) );
			} else {
				$switch_item->total_paid_for_current_period = $this->calculate_total_paid_since_last_order( $switch_item->subscription, $switch_item->existing_item, 'exclude_sign_up_fees' );
			}
		}

		return $switch_item->total_paid_for_current_period;
	}

	public function is_switch_after_fully_reduced_prepaid_term( $switch_item ) {
		if ( ! isset( $switch_item->is_switch_after_fully_reduced_prepaid_term ) ) {
			$switch_order = $switch_item->subscription->get_last_order( 'all', 'switch' );

			if ( empty( $last_switch_order ) || ! $last_switch_order->get_date_paid() ) {
				$switch_item->is_switch_after_fully_reduced_prepaid_term = false;

				return false;
			}

			$switch_paid_date = $last_switch_order->get_date_paid();

			if ( $switch_paid_date->getTimestamp() < $switch_item->get_last_order_paid_time() ) {
				$switch_item->is_switch_after_fully_reduced_prepaid_term = false;

				return false;
			}

			$first_payment_after_switch = WC_Subscriptions_Product::get_first_renewal_payment_time( $switch_item->existing_item->get_product(), gmdate( 'Y-m-d H:i:s', $switch_paid_date->format( 'U' ) ) );

			$switch_item->is_switch_after_fully_reduced_prepaid_term = ( $switch_item->next_payment_timestamp - HOUR_IN_SECONDS <= $first_payment_after_switch ) && ( $first_payment_after_switch <= $switch_item->next_payment_timestamp + HOUR_IN_SECONDS );
		}

		return $switch_item->is_switch_after_fully_reduced_prepaid_term;
	}

	public function calculate_total_paid_since_last_order( $subscription, $subscription_item, $include_sign_up_fees = 'include_sign_up_fees', $orders_to_include = array() ) {
		$found_item      = false;
		$item_total_paid = 0;
		$orders          = empty( $orders_to_include ) ? $subscription->get_related_orders( 'all', array( 'parent', 'renewal', 'switch' ) ) : $orders_to_include;

		wcs_sort_objects( $orders, 'date_paid', 'descending' );

		$has_been_switched           = $subscription_item->meta_exists( '_switched_subscription_item_id' );
		$switched_subscription_items = $subscription->get_items( 'line_item_switched' );

		foreach ( $orders as $order ) {
			$order_is_parent = $order->get_id() === $subscription->get_parent_id();

			$order_item = wcs_find_matching_line_item( $order, $subscription_item );
			if ( $order_item ) {
				$found_item = true;
				$item_total = $order_item->get_total();
				if ( $order->get_prices_include_tax( 'edit' ) ) {
					$item_total += $order_item->get_total_tax();
				}
				if ( 'include_sign_up_fees' !== $include_sign_up_fees ) {
					if ( $order_is_parent ) {
						if ( $order_item->meta_exists( '_synced_sign_up_fee' ) ) {
							$item_total -= $order_item->get_meta( '_synced_sign_up_fee' ) * $order_item->get_quantity();
						} elseif ( $subscription_item->meta_exists( '_has_trial' ) ) {
							$item_total = 0;
						} else {
							$item_total -= max( $order_item->get_total() - $subscription_item->get_subtotal(), 0 );
						}
					} elseif ( $order_item->meta_exists( '_switched_subscription_sign_up_fee_prorated' ) ) {
						$item_total -= $order_item->get_meta( '_switched_subscription_sign_up_fee_prorated' ) * $order_item->get_quantity();
					}
				}

				/* Convert currency to default currency */
				$currency_rate = $this->get_currency_rate( $order );
				$item_total    = $item_total / $currency_rate;

				$item_total_paid += $item_total;
			}
			if ( $has_been_switched && wcs_order_contains_switch( $order ) ) {
				$switched_subscription_item_id = $subscription_item->get_meta( '_switched_subscription_item_id' );

				if ( isset( $switched_subscription_items[ $switched_subscription_item_id ] ) ) {
					$switched_subscription_item = $switched_subscription_items[ $switched_subscription_item_id ];
					$switch_order_item_id       = $switched_subscription_item->get_meta( '_switched_subscription_new_item_id' );
					if ( $switch_order_item_id && (bool) wcs_get_order_item( $switch_order_item_id, $order ) ) {
						$subscription_item = $switched_subscription_item;
						$has_been_switched = $subscription_item->meta_exists( '_switched_subscription_item_id' );
					}
				}
			}
			if ( $order_is_parent || ( wcs_order_contains_renewal( $order ) && ! wcs_order_contains_early_renewal( $order ) ) ) {
				break;
			}
		}

		return $found_item ? $item_total_paid : $subscription_item['line_total'];
	}

	/**
	 * @param $price
	 *
	 * @return float|int|mixed
	 */
	public function get_price( $price ) {
		return wmc_get_price( $price );
	}

	/**
	 * @param $sale_price
	 * @param $product
	 *
	 * @return mixed
	 */
	public function revert_sale_price( $sale_price, $product ) {
		$sale_price = $product->get_sale_price( 'edit' );

		return $sale_price;
	}

	/**
	 * Simple subscription
	 *
	 * @param $price
	 *
	 * @return mixed
	 */
	public function woocommerce_subscriptions_product_sign_up_fee( $price ) {
		return wmc_get_price( $price );
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_subscriptions_product_price( $price, $product ) {
		if ( $product ) {
			if ( $this->settings->check_fixed_price() ) {
				$current_currency = $this->settings->get_current_currency();
				if ( $current_currency !== $this->settings->get_default_currency() ) {
					$product_price = wmc_adjust_fixed_price( json_decode( $product->get_meta( '_regular_price_wmcp', true ), true ) );
					$sale_price    = wmc_adjust_fixed_price( json_decode( $product->get_meta( '_sale_price_wmcp', true ), true ) );
					if ( isset( $product_price[ $current_currency ] ) && ! $product->is_on_sale( 'edit' ) && $product_price[ $current_currency ] > 0 ) {
						$price = $product_price[ $current_currency ];
					} elseif ( isset( $sale_price[ $current_currency ] ) && $sale_price[ $current_currency ] > 0 ) {
						$price = $sale_price[ $current_currency ];
					}
				}
			}
		}

		return $price;
	}

	/**
	 *
	 */
	public function woocommerce_load_cart_from_session() {
		add_filter( 'woocommerce_order_get_items', array(
			$this,
			'woocommerce_order_get_items'
		), 10, 2 );
	}

	/**
	 *
	 */
	public function woocommerce_cart_loaded_from_session() {
		remove_filter( 'woocommerce_order_get_items', array( $this, 'woocommerce_order_get_items' ) );
	}

	public function wcs_before_early_renewal_setup_cart_subscription( $subscription ) {
		if ( wcs_is_subscription( $subscription ) ) {
			$renewal_order_id = $subscription->get_id();
			$renewal_data = $subscription->get_data();
			$related_order_id = $renewal_data && is_array( $renewal_data ) ? $renewal_data['parent_id'] : '';
			$order_currency = $related_order_id ? get_post_meta( $related_order_id, '_order_currency', true ) : '';
			if ( ! $order_currency ) {
				$related_order = wc_get_order( $related_order_id );
				if ( $related_order && is_object( $related_order ) ) {
					$order_currency = $related_order->get_meta( '_order_currency', true );
//					$subscription->update_meta_data( '_order_currency', $order_currency );
//					$subscription->save_meta_data();
				}
			} else {
//				update_post_meta( $renewal_order_id, '_order_currency', $order_currency );
			}
			if ( $order_currency ) {
				$this->settings->set_current_currency( $order_currency );
			}
//			$subscriptions = wcs_get_subscriptions_for_renewal_order( $subscription );
//			if ( ! count( $subscriptions ) ) {
//				return '';
//			}
		}
		return '';
	}

	public function wcs_before_renewal_setup_cart_subscriptions() {

		return '';
	}

	/**
	 * @param $items
	 * @param $order WC_Order
	 *
	 * @return array
	 */
	public function woocommerce_order_get_items( $items, $order ) {
		if ( ! wcs_is_subscription( $order ) ) {
			$subscriptions = wcs_get_subscriptions_for_renewal_order( $order );
			if ( ! count( $subscriptions ) ) {
				return $items;
			}
		}
		$renewal_order_id = $order->get_id();
		$related_order_id = wp_get_post_parent_id( $renewal_order_id );
		if ( $order ) {
			$order_currency = $order->get_currency();
			$wmc_order_info = $order->get_meta( 'wmc_order_info', true );
		} else {
			$order_currency = get_post_meta( $renewal_order_id, '_order_currency', true );
			$wmc_order_info = get_post_meta( $renewal_order_id, 'wmc_order_info', true );
		}
		if ( $related_order_id ) {
			$related_order_currency = get_post_meta( $related_order_id, '_order_currency', true );
			if ( $order_currency === $related_order_currency ) {
				$related_wmc_order_info = get_post_meta( $related_order_id, 'wmc_order_info', true );
				$wmc_order_info = $related_wmc_order_info ? $related_wmc_order_info : $wmc_order_info;
			}
		}
		$default_currency = $this->settings->get_default_currency();
		$list_currencies  = $this->settings->get_list_currencies();
		/*Skip if base currency is different*/
		if ( $wmc_order_info && ( ! isset( $wmc_order_info[ $default_currency ] ) || ! isset( $wmc_order_info[ $default_currency ]['is_main'] ) || $wmc_order_info[ $default_currency ]['is_main'] != 1 ) ) {
			return $items;
		}
		/*Skip if order currency does not exist*/
		if ( ! isset( $list_currencies[ $order_currency ] ) ) {
			return $items;
		}
		$return_items = array();

		foreach ( $items as $item_id => $item ) {
			if ( $item && is_a( $item, 'WC_Order_Item_Product' ) ) {
				$item = clone $item;
				$item->set_subtotal( wmc_revert_price( $item->get_subtotal(), $order_currency ) );
				$item->set_total( wmc_revert_price( $item->get_total(), $order_currency ) );
			}
			$return_items[ $item_id ] = $item;
		}

		return $return_items;
	}
}