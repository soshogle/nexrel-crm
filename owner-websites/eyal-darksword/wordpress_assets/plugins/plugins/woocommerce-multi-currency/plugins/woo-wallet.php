<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Woo_Wallet
 * Plugin: TeraWallet https://wordpress.org/plugins/woo-wallet/
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Woo_Wallet {
	protected $settings;
	protected $skip_convert_credit = false;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter( 'woo_wallet_new_user_registration_credit_amount', array( $this, 'convert_price' ) );
			add_filter( 'woo_wallet_rechargeable_amount', array( $this, 'revert_amount' ) );

			/*Set current currency by order currency so that credit is recorded in correct currency*/
			add_action( 'woocommerce_api_wc_gateway_uddoktapay', array( $this, 'woocommerce_api_wc_gateway_uddoktapay' ), 1 );
			add_filter( 'wmc_ignore_auto_select_currency', array( $this, 'ignore_auto_select_currency' ) );

			if ( apply_filters( 'wmc_compatible_woo_wallet_2', false ) ) {
				/*For custom terra wallet*/
				add_filter( 'woo_wmc_wallet_wc_price_args', array( $this, 'woo_wmc_wallet_wc_price_args' ), 10, 2 );
				add_filter( 'woo_wallet_settings_filds', array( $this, 'woo_wallet_settings_fields' ), 10, 2 );
				add_filter( "woo_wallet_get_option__wallet_settings_general_min_topup_amount", array( $this, 'get_min_topup' ), 10, 2 );
				add_filter( "woo_wallet_get_option__wallet_settings_general_max_topup_amount", array( $this, 'get_max_topup' ), 10, 2 );
				add_filter( 'woo_wallet_users_list_table_query_args', [ $this, 'woo_wallet_users_list_table_query_args' ] );
			} else {
				if ( is_plugin_active( 'woo-wallet/woo-wallet.php' ) ) {
					add_filter( 'woo_wallet_credit_purchase_amount', array( $this, 'woo_wallet_credit_purchase_amount' ), 10, 2 );
					add_filter( 'woo_wallet_amount', array( $this, 'woo_wallet_amount' ), 10, 2 );
					add_filter( 'woo_wallet_current_balance', array( $this, 'woo_wallet_current_balance' ), 10, 2 );
					add_filter( 'woo_wallet_form_cart_cashback_amount', array( $this, 'revert_amount' ) );
					add_filter( 'woo_wallet_transactions_args', [ $this, 'convert_refund_amount' ] );
					add_filter( 'woo_wallet_cashback_notice_text', array( $this, 'woo_wallet_cashback_notice_text' ), 10, 2 );
					add_action( 'woocommerce_admin_order_item_headers', array( $this, 'woocommerce_admin_order_item_headers' ) );
					add_filter( 'woo_wallet_get_option__wallet_settings_general_max_topup_amount', array( $this, 'min_max_topup_amount' ) );
					add_filter( 'woo_wallet_get_option__wallet_settings_general_min_topup_amount', array( $this, 'min_max_topup_amount' ) );
					add_action( 'woocommerce_new_order', array( $this, 'maybe_skip_woo_wallet_credit_purchase_amount' ), 10, 2 );
				}
			}

		}
	}

	public function woocommerce_api_wc_gateway_uddoktapay() {
		$payload = file_get_contents( 'php://input' );
		if ( ! empty( $payload ) ) {
			$data = json_decode( $payload );
			if ( isset( $data->metadata->order_id ) ) {
				$order_id       = $data->metadata->order_id;
				$order_currency = get_post_meta( $order_id, '_order_currency', true );
				if ( $order_currency ) {
					$this->settings->set_current_currency( $order_currency );
				}
			}
		}
	}

	public function ignore_auto_select_currency( $ignore ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return $ignore;
		}
		if ( ! empty( $_GET['wc-api'] ) && sanitize_key( $_GET['wc-api'] ) === 'WC_Gateway_UddoktaPay' ) {
			$ignore = true;
		}

		return $ignore;
	}

	public function min_max_topup_amount( $amount ) {
		if ( $amount ) {
			$amount = wmc_get_price( $amount );
		}

		return $amount;
	}

	public function woocommerce_admin_order_item_headers() {
		villatheme_remove_object_filter( 'woocommerce_admin_order_totals_after_tax', 'Woo_Wallet_Admin', 'add_wallet_payment_amount', 10 );
		add_action( 'woocommerce_admin_order_totals_after_tax', array( $this, 'add_wallet_payment_amount' ), 10, 1 );
	}

	public function add_wallet_payment_amount( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( $total_cashback_amount = get_total_order_cashback_amount( $order_id ) ) {
			$rate = '';
			if ( $order ) {
				$order_currency = $order->get_currency();
				$wmc_order_info = $order->get_meta('wmc_order_info', true );
				if ( $wmc_order_info ) {
					foreach ( $wmc_order_info as $key => $value ) {
						if ( isset( $value['is_main'] ) && $value['is_main'] ) {
							if ( $key !== $order_currency ) {
								if ( isset( $wmc_order_info[ $order_currency ]['rate'] ) && $wmc_order_info[ $order_currency ]['rate'] ) {
									$rate = $wmc_order_info[ $order_currency ]['rate'];
								}
							}
							break;
						}
					}
				}
			}
			?>
            <tr>
                <td class="label"><?php esc_html_e( 'Cashback', 'woo-wallet' ); ?>:</td>
                <td width="1%"></td>
                <td class="via-wallet">
					<?php
					if ( $rate ) {
						echo wc_price( $total_cashback_amount * $rate, array( 'currency' => $order->get_currency() ) );// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					} else {
						echo wc_price( $total_cashback_amount, woo_wallet_wc_price_args( $order->get_customer_id() ) );// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					}
					?>
                </td>
            </tr>
			<?php
		}
	}

	/**
	 * @param $order_id
	 * @param $order
	 */
	public function maybe_skip_woo_wallet_credit_purchase_amount( $order_id, $order ) {
		$this->skip_convert_credit = true;
	}

	/**
	 * Only convert amount to default currency if order status is manually switched to paid statuses
	 *
	 * @param $amount
	 * @param $order_id
	 *
	 * @return float|int
	 */
	public function woo_wallet_credit_purchase_amount( $amount, $order_id ) {
		if ( ! apply_filters( 'wmc_woo_wallet_skip_convert_credit', $this->skip_convert_credit, $order_id ) ) {
			$order_currency   = get_post_meta( $order_id, '_order_currency', true );
			$default_currency = $this->settings->get_default_currency();
			if ( $order_currency !== $default_currency ) {
				$currency_info = get_post_meta( $order_id, 'wmc_order_info', true );
				if ( isset( $currency_info[ $default_currency ]['is_main'] ) && $currency_info[ $default_currency ]['is_main'] ) {
					if ( isset( $currency_info[ $order_currency ]['rate'] ) && $currency_info[ $order_currency ]['rate'] ) {
						$amount = $amount / $currency_info[ $order_currency ]['rate'];
						$amount = WOOMULTI_CURRENCY_Data::convert_price_to_float( $amount, array( 'decimals' => absint( $currency_info[ $order_currency ]['decimals'] ) ) );
					}
				}
			}
			$this->skip_convert_credit = true;
		}

		return $amount;
	}

	/**
	 * @param $amount
	 *
	 * @return float|int|mixed|void
	 */
	public function convert_price( $amount ) {
		return wmc_get_price( $amount );
	}

	/**
	 * @param $wallet_balance
	 * @param $user_id
	 *
	 * @return float|int|mixed|void
	 */
	public function woo_wallet_current_balance( $wallet_balance, $user_id ) {
		if ( $user_id ) {
		    $is_admin_setting_wallet = false;
		    if ( is_admin() && ! is_ajax() ) {
			    $page_id = get_current_screen()->id;
			    if ( in_array( $page_id, array( 'toplevel_page_woo-wallet', 'admin_page_woo-wallet-transactions' ) ) ) {
				    $is_admin_setting_wallet = true;
                }
            }
			$wallet_balance = 0;
			foreach ( $this->settings->get_list_currencies() as $currency => $currency_data ) {
				$credit_amount  = array_sum( wp_list_pluck( get_wallet_transactions( array(
					'user_id' => $user_id,
					'where'   => array(
						array(
							'key'   => 'type',
							'value' => 'credit'
						),
						array(
							'key'   => 'currency',
							'value' => $currency
						)
					)
				) ), 'amount' ) );
				$debit_amount   = array_sum( wp_list_pluck( get_wallet_transactions( array(
					'user_id' => $user_id,
					'where'   => array(
						array(
							'key'   => 'type',
							'value' => 'debit'
						),
						array(
							'key'   => 'currency',
							'value' => $currency
						)
					)
				) ), 'amount' ) );
				$balance        = $credit_amount - $debit_amount;
				$wallet_balance += $is_admin_setting_wallet ? $balance : ( $balance / $currency_data['rate'] );
			}
			$wallet_balance = wmc_get_price( $wallet_balance );
		}

		return $wallet_balance;
	}

	public function revert_amount( $amount ) {
		if ( $this->settings->get_current_currency() !== $this->settings->get_default_currency() ) {
			$amount = wmc_revert_price( $amount );
		}

		return $amount;
	}

	public function woo_wallet_amount( $amount, $currency ) {
		$default_currency = $this->settings->get_default_currency();
		if ( is_admin() && ! wp_doing_ajax() ) {
			$is_admin_setting_wallet = false;
            $page_id = get_current_screen()->id;
            if ( in_array( $page_id, array( 'admin_page_woo-wallet-transactions' ) ) ) {
                $is_admin_setting_wallet = true;
            }
			$list_currencies = $this->settings->get_list_currencies();
			if ( ! empty( $list_currencies[ $currency ]['rate'] ) ) {
				if ( $currency !== $default_currency ) {
					$amount = $is_admin_setting_wallet ? $amount : $amount / $list_currencies[ $currency ]['rate'];
				}
			}
		} else {
			$wmc_current_currency = $this->settings->get_current_currency();
			if ( $currency !== $default_currency ) {
				$amount = wmc_revert_price( $amount, $currency );
			}
			if ( $wmc_current_currency !== $default_currency ) {
				$amount = wmc_get_price( $amount );
			}
		}

		return $amount;
	}

	public function woo_wallet_cashback_notice_text( $text, $cashback_amount ) {
		$cashback_amount = wmc_get_price( $cashback_amount );
		if ( is_user_logged_in() ) {
			/* translators: %s: cashback value */
			$text = sprintf( esc_html__( 'Upon placing this order a cashback of %s will be credited to your wallet.', 'woo-wallet' ), wc_price( $cashback_amount, woo_wallet_wc_price_args() ) );
		} else {
			/* translators: %1$s: login url, %2$s: cashback value */
			$text = sprintf( esc_html__( 'Please <a href="%1$s">log in</a> to avail %2$s cashback from this order.', 'woo-wallet' ), esc_url( get_permalink( get_option( 'woocommerce_myaccount_page_id' ) ) ), wc_price( $cashback_amount, woo_wallet_wc_price_args() ) );
		}

		return $text;
	}

	public function convert_refund_amount( $args ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return $args;
		}
		if ( isset( $_REQUEST['action'] ) && ( $_REQUEST['action'] === 'woocommerce_refund_line_items' || $_REQUEST['action'] === 'woo_wallet_order_refund' ) && ! empty( $_REQUEST['order_id'] ) ) {
			$order_id            = absint( $_REQUEST['order_id'] );
			$order               = wc_get_order( $order_id );
			$order_currency      = $order->get_currency();
			$order_currency_info = $order->get_meta( 'wmc_order_info' );

			if ( $order_currency == $args['currency'] ) {
				return $args;
			}

			if ( ! empty( $order_currency_info[ $order_currency ] ) ) {
				$rate = $order_currency_info[ $order_currency ]['rate'] ?? 1;
				if ( $rate ) {
					$amount          = $args['amount'];
					$convert_amount  = $amount / $rate;
					$args['amount']  = $convert_amount;
					$args['balance'] = $args['balance'] - $amount + $convert_amount;
				}
			}
		}

		return $args;
	}

	public function convert_refund_amount2( $args ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return $args;
		}

		if ( isset( $_REQUEST['action'] )
		     && ( $_REQUEST['action'] === 'woocommerce_refund_line_items' || $_REQUEST['action'] == 'woo_wallet_refund_partial_payment' )
		     && ! empty( $_REQUEST['order_id'] ) ) {

			$order_id       = absint( $_REQUEST['order_id'] );
			$order          = wc_get_order( $order_id );
			$order_currency = $order->get_currency();
//			$args['currency'] = $order_currency;
		}

		return $args;
	}

	public function woo_wmc_wallet_wc_price_args( $args, $transaction ) {
		if ( ! empty( $transaction->currency ) ) {
			$args['currency'] = $transaction->currency;
		}

		return $args;
	}

	public function woo_wallet_transactions_query( $query ) {
		if ( is_admin() && ! wp_doing_ajax() ) {

			$screen_id = get_current_screen()->id;
			if ( $screen_id === 'toplevel_page_woo-wallet' ) {
				if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
					return $query;
				}
				$default_currency = $this->settings->get_default_currency();
				$filter_currency  = ! empty( $_REQUEST['wmc_filter_currency'] ) ? sanitize_text_field( $_REQUEST['wmc_filter_currency'] ) : $default_currency;

				if ( $filter_currency ) {
					if ( strpos( $query['where'], 'transactions.currency' ) === false ) {
						$query['where'] .= " AND transactions.currency='{$filter_currency}'";
					}
				}
			}

			return $query;
		}

		if ( ! is_admin() ) {
			$currency = $this->settings->get_current_currency();

			if ( $currency ) {
				if ( strpos( $query['where'], 'transactions.currency' ) === false ) {
					$query['where'] .= " AND transactions.currency='{$currency}'";
				}
			}
		}


		return $query;
	}

	public function woo_wallet_settings_fields( $fields ) {
		$_wallet_settings_general = $fields['_wallet_settings_general'];

		$default_currency = $this->settings->get_default_currency();
		$currencies       = $this->settings->get_list_currencies();

		if ( ! empty( $currencies ) ) {
			$min_arr = [];
			$max_arr = [];
			$offset  = 0;

			foreach ( $currencies as $currency => $c_data ) {
				if ( $currency == $default_currency ) {
					continue;
				}
				$min_arr[ $currency ] = [
					'name'  => 'min_topup_amount_' . $currency,
					'label' => 'Minimum Topup Amount ' . $currency,
					'desc'  => 'The minimum amount needed for wallet top up',
					'type'  => 'number',
					'step'  => 0.01
				];

				$max_arr[ $currency ] = [
					'name'  => 'max_topup_amount_' . $currency,
					'label' => 'Maximum Topup Amount ' . $currency,
					'desc'  => 'The maximum amount needed for wallet top up',
					'type'  => 'number',
					'step'  => 0.01
				];

				$offset ++;
			}

			$_wallet_settings_general = array_slice( $_wallet_settings_general, 0, 3, true ) +
			                            $min_arr +
			                            array_slice( $_wallet_settings_general, 3, count( $_wallet_settings_general ) - 1, true );
			$_wallet_settings_general = array_values( $_wallet_settings_general );

			$_wallet_settings_general = array_slice( $_wallet_settings_general, 0, 4 + $offset, true ) +
			                            $max_arr +
			                            array_slice( $_wallet_settings_general, 4 + $offset, count( $_wallet_settings_general ) - 1, true );

			$fields['_wallet_settings_general'] = array_values( $_wallet_settings_general );
		}

		return $fields;
	}

	public function get_min_topup( $value ) {
		$default_currency = $this->settings->get_default_currency();
		$currency         = $this->settings->get_current_currency();

		if ( $default_currency == $currency ) {
			return $value;
		}

		$options = get_option( '_wallet_settings_general' );
		$option  = 'min_topup_amount_' . $currency;

		return isset( $options[ $option ] ) && ! empty( $options[ $option ] ) ? $options[ $option ] : '';
	}

	public function get_max_topup( $value ) {
		$default_currency = $this->settings->get_default_currency();
		$currency         = $this->settings->get_current_currency();

		if ( $default_currency == $currency ) {
			return $value;
		}

		$options = get_option( '_wallet_settings_general' );
		$option  = 'max_topup_amount_' . $currency;

		return isset( $options[ $option ] ) && ! empty( $options[ $option ] ) ? $options[ $option ] : '';
	}

	/*
	 * @param WC_Order $order
	 * */
	public function fix_transaction_currency( $transaction_id, $order ) {
		$user_id = $order->get_customer_id();

		if ( ! $user_id ) {
			return;
		}
		$currency = $order->get_currency();
		update_wallet_transaction( $transaction_id, $user_id, [ 'currency' => $currency ], [ '%s' ] );
	}

	public function fix_refund_transaction_currency( $order, $refund, $transaction_id ) {
		$this->fix_transaction_currency( $transaction_id, $order );
	}


	public function admin_adjust_list_balance_currency( $transaction_id, $user_id ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return;
		}

		if ( isset( $_REQUEST['action'] ) && - 1 != $_REQUEST['action'] && is_admin() && ! empty( $_REQUEST['wmc_selected_currency'] ) ) {
			$action   = $_REQUEST['action'];
			$currency = $_REQUEST['wmc_selected_currency'];

			if ( 'credit' === $action && isset( $_POST['users'] ) ) {
				update_wallet_transaction( $transaction_id, $user_id, [ 'currency' => $currency ], [ '%s' ] );
			}

			if ( 'debit' === $action && isset( $_POST['users'] ) ) {
				update_wallet_transaction( $transaction_id, $user_id, [ 'currency' => $currency ], [ '%s' ] );
			}
		}

	}

	public function disable_partial_payment( $current_wallet_amount ) {
		return $current_wallet_amount - get_woowallet_cart_total();
	}

	public function woo_wallet_users_list_table_query_args( $args ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return $args;
		}
		if ( ! empty( $args['meta_key'] ) && $args['meta_key'] == '_current_woo_wallet_balance' ) {
			$default_currency = $this->settings->get_default_currency();

			$currency = ! empty( $_REQUEST['wmc_filter_currency'] ) && $_REQUEST['wmc_filter_currency'] !== $default_currency
				? '_' . sanitize_text_field( $_REQUEST['wmc_filter_currency'] ) : '';

			$args['meta_key'] = $args['meta_key'] . $currency;// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
		}

		return $args;
	}
}