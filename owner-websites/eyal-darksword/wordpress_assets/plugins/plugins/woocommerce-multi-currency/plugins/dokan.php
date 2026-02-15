<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Dokan
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Dokan {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() && class_exists( 'WeDevs_Dokan' ) ) {
			add_action( 'dokan_enqueue_scripts', array( $this, 'init' ), 0 );
			add_filter( 'wmc_enable_cache_compatible_frontend', array( $this, 'disable_cache_compatible' ) );
			if ( $this->settings->check_fixed_price() ) {
				add_action( 'dokan_product_edit_after_pricing', array(
					$this,
					'dokan_product_edit_after_pricing'
				), 9, 2 );
				add_action( 'dokan_variation_options_pricing', array(
					$this,
					'dokan_variation_options_pricing'
				), 10, 3 );
				add_action( 'dokan_enqueue_scripts', array(
					$this,
					'dokan_enqueue_scripts'
				) );
			}
//			add_filter( 'dokan_get_earning_by_order', array( $this, 'dokan_get_earning_by_order' ) );

//			add_filter( 'dokan_order_net_amount', array( $this, 'dokan_order_net_amount' ), 10, 2 );
//			add_filter( 'dokan_orders_vendor_net_amount', array( $this, 'dokan_orders_vendor_net_amount' ), 10, 5 );

//			add_filter( 'dokan_earning_by_order_item_price', array( $this, 'dokan_earning_by_order_item_price' ),10,3 );
		}
	}

	public function disable_cache_compatible( $cache_compatible = true ) {
		if ( dokan_is_seller_dashboard() ) {
			$cache_compatible = false;
		}

		return $cache_compatible;
	}

	/**
	 * Force currency to default if accessing vendor dashboard
	 */
	public function init() {
		if ( dokan_is_seller_dashboard() ) {
			$this->settings->setcookie( 'wmc_ip_add', '', time() - 3600 );
			$this->settings->setcookie( 'wmc_ip_info', '', time() - 3600 );
			$this->settings->setcookie( 'wmc_current_currency_old', '', time() - 3600 );
			$this->settings->setcookie( 'wmc_current_currency', '', time() - 3600 );
		}
	}

	public function dokan_orders_vendor_net_amount( $net_amount, $vendor_earning, $gateway_fee, $tmp_order, $order ) {
		return $net_amount;
	}

	public function dokan_get_earning_by_order( $earning ) {
		return $earning;
	}

	/**
	 * @param $net_amount
	 * @param $order WC_Order
	 *
	 * @return bool|float|int|string
	 */
	public function dokan_order_net_amount( $net_amount, $order ) {
//		$seller_id    = dokan_get_seller_id_by_order( $order->get_id() );
//		$order_total  = $order->get_total();
//		if ( dokan_is_admin_coupon_applied( $order, $seller_id ) ) {
//			$net_amount = dokan()->commission->get_earning_by_order( $order, 'seller' );
//		} else {
//			$admin_commission = dokan()->commission->get_earning_by_order( $order, 'admin' );
//			$net_amount       = $order_total - $admin_commission;
//		}

		$old        = $net_amount;
		$net_amount = wmc_revert_price( $net_amount, $order->get_currency() );

//	    error_log('dokan_order_net_amount: '.$old.' => '.$net_amount);
		return $net_amount;
	}

	/**
	 * @param $item_price
	 * @param $item
	 * @param $order WC_Order
	 *
	 * @return bool|float|int|string
	 */
	public function dokan_earning_by_order_item_price( $item_price, $item, $order ) {
		$old        = $item_price;
		$item_price = wmc_revert_price( $item_price, $order->get_currency() );

//		error_log('dokan_earning_by_order_item_price: '.$old.' => '.$item_price);
		return $item_price;
	}

	public function dokan_enqueue_scripts() {
		global $wp;
		if ( dokan_is_seller_dashboard() && isset( $wp->query_vars['products'] ) ) {
			if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
				return;
			}
			$action = isset( $_GET['action'] ) ? sanitize_text_field( $_GET['action'] ) : '';
			if ( $action === 'edit' && ! empty( $_GET['product_id'] ) ) {
				if ( WP_DEBUG ) {
					wp_enqueue_style( 'woocommerce-alidropship-dokan-edit-product', WOOMULTI_CURRENCY_CSS . 'dokan-product.css', array(), WOOMULTI_CURRENCY_VERSION );
				} else {
					wp_enqueue_style( 'woocommerce-alidropship-dokan-edit-product', WOOMULTI_CURRENCY_CSS . 'dokan-product.min.css', array(), WOOMULTI_CURRENCY_VERSION );
				}
			}
		}
	}

	public function dokan_product_edit_after_pricing( $post, $post_id ) {
		?>
        <div class="wmc-dokan-product-fixed-price-container show_if_simple show_if_subscription"><?php WOOMULTI_CURRENCY_Admin_Product::simple_price_input(); ?></div>
		<?php
	}

	public function dokan_variation_options_pricing( $loop, $variation_data, $variation ) {
		WOOMULTI_CURRENCY_Admin_Product::variation_price_input( $loop, $variation_data, $variation );
	}
}