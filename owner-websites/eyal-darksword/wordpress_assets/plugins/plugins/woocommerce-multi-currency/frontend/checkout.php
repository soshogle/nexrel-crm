<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Frontend_Checkout
 */
class WOOMULTI_CURRENCY_Frontend_Checkout {

	public $settings;
	public $old_currency;
	public $rate;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_action( 'woocommerce_checkout_process', array( $this, 'woocommerce_checkout_process' ) );
			add_action( 'woocommerce_checkout_update_order_review', array(
				$this,
				'woocommerce_checkout_update_order_review'
			), 99 );

			add_filter( 'woocommerce_available_payment_gateways', array( $this, 'control_payment_methods' ), 12 );
			add_action( 'woocommerce_before_checkout_process', array( $this, 'change_currency_to_checkout' ) );

			$equivalent_currency_page = $this->settings->get_param( 'equivalent_currency_page' );
			switch ( $equivalent_currency_page ) {
				case '':
				case 'checkout':
					add_action( 'woocommerce_checkout_init', array( $this, 'checkout_init' ) );
					break;
				case 'cart':
					add_action( 'woocommerce_before_cart', array( $this, 'checkout_init' ), 9999 );
					break;
				case 'cart_n_checkout':
					add_action( 'woocommerce_before_cart', array( $this, 'checkout_init' ), 9999 );
					add_action( 'woocommerce_checkout_init', array( $this, 'checkout_init' ) );
					break;
			}

			add_filter( 'woocommerce_cart_totals_order_total_html', array( $this, 'previous_currency_order_total' ) );
			add_filter( 'woocommerce_cart_totals_taxes_total_html', array( $this, 'previous_currency_taxes_total' ) );
//			add_filter( 'woocommerce_cart_tax_totals', array( $this, 'woocommerce_cart_tax_totals' ), 10, 2 );
			add_filter( 'woocommerce_cart_totals_fee_html', array( $this, 'previous_currency_fee_html' ), 10, 2 );
			add_filter( 'woocommerce_cart_subtotal', array( $this, 'previous_currency_cart_subtotal' ), 10, 3 );
			add_filter( 'woocommerce_cart_item_price', array( $this, 'previous_currency_item_price' ), 10, 3 );
			add_filter( 'woocommerce_cart_product_subtotal', array( $this, 'previous_currency_item_subtotal' ), 10, 4 );
			add_filter( 'woocommerce_cart_totals_coupon_html', array( $this, 'previous_currency_coupon_html' ), 10, 3 );
			add_filter( 'woocommerce_cart_shipping_method_full_label', array(
				$this,
				'previous_currency_shipping_label'
			), 10, 2 );

			add_filter( 'woocommerce_checkout_get_value', array( $this, 'save_shipping_country' ), 10, 2 );

			$theme = wp_get_theme();
			if ( 'Elessi Theme Child' != $theme->name && 'Elessi Theme' != $theme->name && 'Elessi' != $theme->name ) {
				add_filter( 'woocommerce_ship_to_different_address_checked', array(
					$this,
					'save_shipping_to_different_address'
				) );
			}

			//Set order currency correctly
			add_filter( 'woocommerce_paypal_args', array( $this, 'woocommerce_paypal_args' ), 10, 2 );
			add_filter( 'woocommerce_twoco_args', array( $this, 'woocommerce_twoco_args' ) );

			add_filter( 'woocommerce_bacs_accounts', [ $this, 'diplay_bacs_account_follow_currency' ], 10, 2 );

//			add_action( 'woocommerce_after_checkout_validation', array( $this, 'wompi_woocommerce_after_checkout_validation' ), 9 );
		}
	}

	/**
	 * @param $payment_methods
	 *
	 * @return mixed
	 */
	public function control_payment_methods( $payment_methods ) {

		if ( is_admin() ) {
			return $payment_methods;
		}
		$current_currency = $this->settings->get_current_currency();
		if ( $this->settings->get_enable_multi_payment() ) {
			$payments = $this->settings->get_payments_by_currency( $current_currency );
			if ( is_array( $payments ) && count( $payments ) ) {
				foreach ( $payment_methods as $key => $payment_method ) {
					if ( ! in_array( $key, $payments ) ) {
						unset( $payment_methods[ $key ] );
					}
				}
			}
		}

		return $payment_methods;
	}

	/**
	 * Update checkout page with one currency
	 *
	 * @param $data
	 */
	public function woocommerce_checkout_update_order_review( $data ) {
		$allow_multi      = $this->settings->get_enable_multi_payment();
		$current_currency = $this->settings->get_current_currency();
		if ( $allow_multi ) {
			$change_currency_option = $this->settings->get_param( 'billing_shipping_currency' );
			$only_shipping_country = $this->settings->get_param( 'only_shipping_country' );
			$change = false;
			if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
				return;
			}
			if ( $change_currency_option && ! isset( $_GET['wmc-currency'] ) ) {
				$checkout_currency_args = $this->settings->get_checkout_currency_args();//array('USD')
				$current_currency       = $this->settings->get_current_currency(); //vnd

				if ( is_string( $data ) ) {
					parse_str( $data, $data );
				}

				if ( isset( $data['ship_to_different_address'] ) ) {
					wc()->session->set( 'wmc_ship_to_different_address', true );
				} else {
					wc()->session->__unset( 'wmc_ship_to_different_address' );
				}

				WC()->customer->set_props( array( 'billing_country' => isset( $_POST['country'] ) ? wc_clean( wp_unslash( $_POST['country'] ) ) : null ) );

				if ( wc_ship_to_billing_address_only() ) {
					WC()->customer->set_props( array( 'shipping_country' => isset( $_POST['country'] ) ? wc_clean( wp_unslash( $_POST['country'] ) ) : null ) );
				} else {
					if ( is_array( $data ) && isset( $data['shipping_country'] ) ) {
						$c_shipping_country = $data['shipping_country'];
					} else {
						$c_shipping_country = isset( $_POST['s_country'] ) ? wc_clean( wp_unslash( $_POST['s_country'] ) ) : null;
					}
					WC()->customer->set_props( array( 'shipping_country' => $c_shipping_country ) );
				}

				WC()->customer->save();
				$country = '';
				switch ( $change_currency_option ) {
					case 1:
						$country = wc()->customer->get_billing_country();
						break;
					case 2:
						if ( isset( $data['ship_to_different_address'] ) ) {
							$country = $data['ship_to_different_address'] ? wc()->customer->get_shipping_country() : wc()->customer->get_billing_country();
						} else {
							if ( $only_shipping_country ) {
								$country = wc()->customer->get_shipping_country();
							} else {
								$country = wc()->customer->get_billing_country();
							}
						}
						break;
					default:
				}

				if ( $country ) {
					$currency = '';
					if ( $this->settings->get_enable_currency_by_country() ) {
						$currency = $this->settings->get_currency_by_detect_country( $country );
					}

					if ( ! $currency ) {
						$currency = $this->settings->get_currency_code( $country );
					}

					if ( $currency && $currency != $current_currency ) {
						$currencies_list = $this->settings->get_currencies();
						if ( in_array( $currency, $checkout_currency_args ) && in_array( $currency, $currencies_list ) ) {
							$checkout = $this->fix_ppcp_gateway( $currency ) || $this->settings->get_params( 'sync_checkout_currency' );
							$this->settings->set_current_currency( $currency, $checkout );
							if ( $checkout ) {
								$this->reload_after_update_order_review( $checkout );
							} else {
								$this->maybe_trigger_updated_checkout( $current_currency, $currency );
							}
							$change = true;
						}
					}
				}
			}
			if ( ! $change ) {
				$payment_method      = isset( $_POST['payment_method'] ) ? wc_clean( wp_unslash( $_POST['payment_method'] ) ) : '';
				$currency_by_payment = $this->settings->get_param( 'currency_by_payment_method_' . $payment_method );
				if ( $currency_by_payment && $current_currency !== $currency_by_payment ) {
					if ( $this->settings->get_param( 'currency_by_payment_method_immediate' ) ) {
						$this->settings->set_current_currency( $currency_by_payment, true );
						WC()->session->set( 'chosen_payment_method', empty( $_POST['payment_method'] ) ? '' : wc_clean( wp_unslash( $_POST['payment_method'] ) ) );
						$without_reload_page = $this->settings->get_param( 'currency_by_payment_method_without_reload_page' );
						$this->reload_after_update_order_review( ! $without_reload_page, true );
					}

				} else {
					$checkout_currency_args = $this->settings->get_checkout_currency_args();
					$checkout_currency      = $this->settings->get_checkout_currency();
					if ( $checkout_currency && ! in_array( $current_currency, $checkout_currency_args ) ) {
						$checkout = $this->fix_ppcp_gateway( $checkout_currency );
						$this->settings->set_current_currency( $checkout_currency, $checkout );
						if ( $checkout ) {
							$this->reload_after_update_order_review( $checkout );
						} else {
							$this->maybe_trigger_updated_checkout( $current_currency, $checkout_currency );
						}
					}
				}
			}
		} else {
			$default_currency = $this->settings->get_default_currency();
			if ( $current_currency !== $default_currency ) {
				$this->settings->set_current_currency( $default_currency, false );
			}
		}
	}

	public function maybe_trigger_updated_checkout( $current_currency, $currency ) {
		$current_currency_payments = $this->settings->get_payments_by_currency( $current_currency );
		$target_currency_payments  = $this->settings->get_payments_by_currency( $currency );
		if ( count( array_diff( $current_currency_payments, $target_currency_payments ) ) || count( array_diff( $target_currency_payments, $current_currency_payments ) ) ) {
			$this->reload_after_update_order_review( false, true );
		}
	}

	public function fix_ppcp_gateway( $currency ) {
		$payment_gateways         = WC()->payment_gateways->payment_gateways();
		$ppcp                     = 'ppcp-gateway';
		$checkout                 = false;
		$target_currency_payments = $this->settings->get_payments_by_currency( $currency );
		if ( isset( $payment_gateways[ $ppcp ] ) && $payment_gateways[ $ppcp ]->settings['enabled'] === 'yes' ) {
			if ( ! count( $target_currency_payments ) || in_array( $ppcp, $target_currency_payments ) ) {
				$checkout = true;
			}
		}
//		$payment_method           = isset( $_POST['payment_method'] ) ? wc_clean( wp_unslash( $_POST['payment_method'] ) ) : '';
//		if ( $payment_method === $ppcp ) {
//			$checkout = true;
//		}

		return $checkout;
	}

	/**
	 * @param bool $reload
	 * @param bool $update_checkout
	 */
	public function reload_after_update_order_review( $reload = false, $update_checkout = false ) {
		if ( ! apply_filters( 'wmc_checkout_reload_after_update_order_review', true ) ) {
			return;
		}
		if ( is_plugin_active( 'checkout-for-woo/checkout-for-woocommerce.php' ) ) {
			$setting_cfw = get_option( "_cfw__settings", false );
			if ( $setting_cfw && is_array( $setting_cfw ) && isset( $setting_cfw['template_loader'] ) && 'redirect' == $setting_cfw['template_loader'] ) {
				return;
			}
		}
		WC()->cart->calculate_shipping();
		WC()->cart->calculate_totals();
		// Get order review fragment
		ob_start();
		woocommerce_order_review();
		$woocommerce_order_review = ob_get_clean();

		// Get checkout payment fragment
		ob_start();
		woocommerce_checkout_payment();
		$woocommerce_checkout_payment = ob_get_clean();
		$args                         = array(
			'result'              => 'success',
			'messages'            => '',
			'reload'              => $reload,
			'wmc_update_checkout' => $update_checkout,
			'fragments'           => apply_filters(
				'woocommerce_update_order_review_fragments', array(
					'.woocommerce-checkout-review-order-table' => $woocommerce_order_review,
					'.woocommerce-checkout-payment'            => $woocommerce_checkout_payment,
				)
			),
		);
		if ( is_plugin_active( 'checkout-for-woocommerce/checkout-for-woocommerce.php' ) ) {
			$_cfw__settings = get_option( '_cfw__settings' );
			if ( isset( $_cfw__settings['enable'] ) && $_cfw__settings['enable'] === 'yes' ) {
				$args['redirect'] = wc_get_checkout_url();
			}
		}

		unset( WC()->session->refresh_totals, WC()->session->reload_checkout );
		wp_send_json( $args );
	}

	public function save_shipping_country( $value, $input ) {
		if ( $input == 'shipping_country' ) {
			$value = wc()->customer->get_shipping_country();
		}

		return $value;
	}

	public function save_shipping_to_different_address( $checked ) {
		$wmc_stda = wc()->session->get( 'wmc_ship_to_different_address' );
		return $wmc_stda == '' ? $checked : $wmc_stda;
	}

	/**
	 * Compare currency on checkout page
	 */
	public function woocommerce_checkout_process() {
		$allow_multi = $this->settings->get_enable_multi_payment();
		if ( $allow_multi ) {
			$checkout_currency_args = $this->settings->get_checkout_currency_args();
			$current_currency       = $this->settings->get_current_currency();
			$checkout_currency      = $this->settings->get_checkout_currency();
			if ( $checkout_currency && ! in_array( $current_currency, $checkout_currency_args ) ) {
				$this->settings->set_current_currency( $checkout_currency, false );
				$this->send_ajax_failure_response();
			}
		}
	}

	/**
	 * If checkout failed during an AJAX call, send failure response.
	 */
	protected function send_ajax_failure_response() {
		if ( wp_doing_ajax() ) {
			// only print notices if not reloading the checkout, otherwise they're lost in the page reload
			if ( ! isset( WC()->session->reload_checkout ) ) {
				ob_start();
				wc_print_notices();
				$messages = ob_get_clean();
			}

			$response = array(
				'result'   => 'failure',
				'messages' => isset( $messages ) ? $messages : '',
				'refresh'  => isset( WC()->session->refresh_totals ),
				'reload'   => isset( WC()->session->reload_checkout ),
			);

			unset( WC()->session->refresh_totals, WC()->session->reload_checkout );

			wp_send_json( $response );
		}
	}

	public function change_currency_to_checkout() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}
		$payment_method = isset( $_POST['payment_method'] ) ? wc_clean( wp_unslash( $_POST['payment_method'] ) ) : '';
		$currency       = $this->settings->get_param( 'currency_by_payment_method_' . $payment_method );
		if ( $currency && $payment_method !== 'ppcp-gateway' ) {
			$this->settings->set_current_currency( $currency, false );
			WC()->cart->calculate_totals();
		}
	}


	public function checkout_init() {
		if ( ! $this->settings->get_param( 'equivalent_currency' ) ) {
			return;
		}
		$current_currency   = $this->settings->get_current_currency();
		$this->old_currency = $this->settings->getcookie( 'wmc_current_currency_old' );
//		$allow_multi      = $this->settings->get_enable_multi_payment();
//		if ( $allow_multi ) {
//			$checkout_currency_args = $this->settings->get_checkout_currency_args();
//			if ( in_array( $this->old_currency, $checkout_currency_args ) ) {
//				return;
//			}
//		}
		if ( ! $this->old_currency || $this->old_currency == $current_currency ) {
			return;
		}

		$rate1 = $current_currency !== $this->old_currency ? wmc_get_price( 1, $current_currency ) : '';

		if ( ! empty( $rate1 ) ) {
			$rate2      = wmc_get_price( 1, $this->old_currency );
			$this->rate = $rate2 / $rate1;
		}
	}


	public function previous_value_format( $value ) {
		return wc_price( $this->rate * $value, array( 'currency' => $this->old_currency ) );
	}

	public function previous_currency_item_price( $html, $cart_item, $cart_item_key ) {
		if ( ! $this->old_currency || ! $this->rate ) {
			return $html;
		}

		$product = $cart_item['data'];
		if ( ! $product ) {
			return $html;
		}
		$row_price = wc_get_price_to_display( $product );

		$prev_value = $this->previous_value_format( $row_price );
		$html       = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>(%s)</div>", $prev_value, $html );

		return apply_filters( 'wmc_previous_currency_cart_item_price', $html, $prev_value );
	}

	/**
	 * @param $html
	 * @param $product WC_Product
	 * @param $quantity
	 * @param $this_cart WC_Cart
	 *
	 * @return string
	 */
	public function previous_currency_item_subtotal( $html, $product, $quantity, $this_cart ) {
		if ( ! $this->old_currency || ! $this->rate ) {
			return $html;
		}

		$row_price = wc_get_price_to_display( $product, [ 'qty' => $quantity ] );

		$prev_value = $this->previous_value_format( $row_price );
		$html       = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>(%s)</div>", $prev_value, $html );

		return apply_filters( 'wmc_previous_currency_item_subtotal', $html );
	}

	public function previous_currency_order_total( $value ) {
		if ( $this->rate && $this->old_currency ) {
			$order_total = wc()->cart->get_total( 'edit' );
			$prev_value  = $this->previous_value_format( $order_total );
			$message     = esc_html__( 'You will be billed:', 'woocommerce-multi-currency' );
			$value       = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>(%s %s)</div>", $prev_value, $message, $value );
		}

		return apply_filters( 'wmc_previous_currency_order_total', $value );
	}

	/**
	 * @param $value
	 *
	 * @return string
	 */
	public function previous_currency_taxes_total( $value ) {
		if ( $this->rate && $this->old_currency ) {
			$taxes_total = WC()->cart->get_taxes_total();
			$prev_value  = $this->previous_value_format( $taxes_total );
			$value       = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>(%s)</div>", $prev_value, $value );
		}

		return apply_filters( 'wmc_previous_currency_taxes_total', $value );
	}

	/**
	 * Tax when 'itemized' === get_option( 'woocommerce_tax_total_display' )
	 *
	 * @param $tax_totals
	 * @param $cart
	 *
	 * @return mixed
	 */
	public function woocommerce_cart_tax_totals( $tax_totals, $cart ) {
		if ( $this->rate && $this->old_currency ) {
			foreach ( $tax_totals as &$value ) {
				if ( isset( $value->amount, $value->formatted_amount ) && $value->amount ) {
					$prev_value              = $this->previous_value_format( $value->amount );
					$value->formatted_amount = sprintf( "<div class='wmc-custom-checkout-left tax'>%s</div><div class='wmc-custom-checkout-right'>(%s)</div>", $prev_value, $value->formatted_amount );
				}
			}
		}

		return apply_filters( 'wmc_previous_cart_tax_totals', $tax_totals );
	}

	public function previous_currency_fee_html( $value, $fee ) {
		if ( $this->rate && $this->old_currency ) {
			$fee        = WC()->cart->display_prices_including_tax() ? $fee->total + $fee->tax : $fee->total;
			$prev_value = $this->previous_value_format( $fee );
			$value      = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>(%s)</div>", $prev_value, $value );
		}
//		if ( is_plugin_active( 'wpfunnels/wpfnl.php' ) && is_object( $fee ) &&
//		     property_exists( $fee, 'amount' ) && property_exists( $fee, 'total' ) ) {
//			echo '<pre>' . print_r(22222, true) . '</pre>';
//			echo '<pre>' . print_r(WC()->cart->get_total(), true) . '</pre>';
//			$fee_total = wmc_get_price( $fee->total );
//			$fee_amount = wmc_get_price( $fee->amount );
//			$fee_tax = wmc_get_price( $fee->tax );
//			if ( WC()->cart->display_prices_including_tax() ) {
//				return wc_price( $fee_total + $fee_tax );
//			} else {
//				return wc_price( $fee_total );
//			}
//		}

		return apply_filters( 'wmc_previous_currency_fee_html', $value );
	}

	/**
	 * @param $html
	 * @param $compound
	 * @param $this_cart WC_Cart
	 *
	 * @return string
	 */
	public function previous_currency_cart_subtotal( $html, $compound, $this_cart ) {
		if ( $this->rate && $this->old_currency ) {
			if ( $compound ) {
				$prev_value = $this_cart->get_cart_contents_total() + $this_cart->get_shipping_total() + $this_cart->get_taxes_total( false, false );
			} elseif ( $this_cart->display_prices_including_tax() ) {
				$prev_value = $this_cart->get_subtotal() + $this_cart->get_subtotal_tax();
			} else {
				$prev_value = $this_cart->get_subtotal();
			}
			$prev_value = $this->previous_value_format( $prev_value );
			$html       = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>(%s)</div>", $prev_value, $html );
		}

		return apply_filters( 'wmc_previous_currency_cart_subtotal', $html );
	}

	public function previous_currency_coupon_html( $html, $coupon, $discount_amount_html ) {

		if ( $this->rate && $this->old_currency ) {
			if ( is_string( $coupon ) ) {
				$coupon = new WC_Coupon( $coupon );
			}

			$amount     = WC()->cart->get_coupon_discount_amount( $coupon->get_code(), WC()->cart->display_cart_ex_tax );
			$prev_value = $this->previous_value_format( $amount );
			$old_html   = str_replace( $discount_amount_html, '', $html );
			$html       = sprintf( "<div class='wmc-custom-checkout-left'>-%s %s</div><div class='wmc-custom-checkout-right'>(%s)</div>",
				$prev_value, $old_html, $discount_amount_html );
		}

		return apply_filters( 'wmc_previous_currency_coupon_html', $html );
	}

	/**
	 * @param $label
	 * @param $method WC_Shipping_Rate
	 *
	 * @return string
	 */
	public function previous_currency_shipping_label( $label, $method ) {
		if ( $this->rate && $this->old_currency ) {
			$new_label = $method->get_label();
			$has_cost  = 0 < $method->cost;
			$hide_cost = ! $has_cost && in_array( $method->get_method_id(), array(
					'free_shipping',
					'local_pickup'
				), true );
			$old_label = '';
			if ( $has_cost && ! $hide_cost ) {
				$old_label = str_replace( $new_label, '', $label );
				$old_label = trim( str_replace( ':', '', $old_label ) );
				if ( WC()->cart->display_prices_including_tax() ) {
					$new_label .= ': ' . $this->previous_value_format( $method->cost + $method->get_shipping_tax() );
				} else {
					$new_label .= ': ' . $this->previous_value_format( $method->cost );
				}
			}
			$old_label = $old_label ? "({$old_label})" : '';

			$label = sprintf( "<div class='wmc-custom-checkout-left'>%s</div><div class='wmc-custom-checkout-right'>%s</div>",
				$new_label, $old_label );
		}

		return apply_filters( 'wmc_previous_currency_shipping_label', $label );
	}

	/**
	 * PayPal args
	 *
	 * @param $payment_args
	 * @param $order WC_Order
	 *
	 * @return mixed
	 */
	public function woocommerce_paypal_args( $payment_args, $order ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return $payment_args;
		}
		if ( isset( $_GET['pay_for_order'] ) && $_GET['pay_for_order'] ) {
			$payment_args['currency_code'] = $order->get_currency();
		}

		return $payment_args;
	}

	/**
	 * WooCommerce 2Checkout Payment Gateway
	 *
	 * @param $payment_args
	 *
	 * @return mixed
	 */
	public function woocommerce_twoco_args( $payment_args ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return $payment_args;
		}
		if ( isset( $_GET['pay_for_order'] ) && $_GET['pay_for_order'] ) {
			$order_id = isset( $payment_args['merchant_order_id'] ) ? $payment_args['merchant_order_id'] : '';
			if ( $order_id ) {
				$order = wc_get_order( $order_id );
				if ( $order ) {
					$payment_args['currency_code'] = $order->get_currency();
				}
			}
		}

		return $payment_args;
	}

	public function diplay_bacs_account_follow_currency( $accounts, $order_id ) {
		$order    = wc_get_order( $order_id );
		$currency = $order->get_currency();

		$accepted_account = $this->settings->get_param( 'bacs_account_' . $currency );

		if ( ! empty( $accounts ) && ! empty( $accepted_account ) ) {
			foreach ( $accounts as $account ) {
				if ( ! empty( $account['account_number'] ) && $accepted_account == $account['account_number'] ) {
					return [ $account ];
				}
			}
		}

		return $accounts;
	}

	public function wompi_woocommerce_after_checkout_validation() {
		remove_filter( 'woocommerce_after_checkout_validation', array( 'WC_Gateway_Wompi_Custom', 'checkout_validation' ), 10 );
	}
}
