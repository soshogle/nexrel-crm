<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Frontend_Mini_Cart
 */
class WOOMULTI_CURRENCY_Frontend_Mini_Cart {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			if ( is_plugin_active( 'woocommerce-memberships/woocommerce-memberships.php' ) || is_plugin_active( 'polylang/polylang.php' ) || is_plugin_active( 'woocommerce-side-cart-premium/xoo-wsc-main.php' ) || is_plugin_active( 'woocommerce-myparcel/woocommerce-myparcel.php' ) ) {
				add_action( 'woocommerce_before_mini_cart', array( $this, 'woocommerce_before_mini_cart' ), 99 );
				if ( is_plugin_active( 'elementor-pro/elementor-pro.php' ) ) {
					add_action( 'woocommerce_before_mini_cart_contents', array(
						$this,
						'woocommerce_before_mini_cart'
					), 99 );
				}
			} else {
				add_action( 'woocommerce_cart_loaded_from_session', array(
					$this,
					'woocommerce_before_mini_cart'
				), 99 );
			}

			add_action( 'wp_enqueue_scripts', array( $this, 'remove_session' ) );
		}
	}

	public function remove_session() {
		$selected_currencies = $this->settings->get_currencies();
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}
		if ( isset( $_GET['wmc-currency'] ) && in_array( $_GET['wmc-currency'], $selected_currencies ) ) {
			$src_min = WP_DEBUG ? '' : '.min';
			wp_enqueue_script( 'woocommerce-multi-currency-cart', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency-cart' . $src_min . '.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
		}
	}

	/**
	 * Recalculator for mini cart
	 */
	public function woocommerce_before_mini_cart() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}
		if ( is_plugin_active( 'yith-woocommerce-eu-vat-premium/init.php' ) && is_plugin_active( 'woocommerce-paypal-payments/woocommerce-paypal-payments.php' )
		     && ( isset( $_REQUEST['wc-ajax'] ) && wc_clean( wp_unslash( $_REQUEST['wc-ajax'] ) ) == 'ppc-create-order' ) ) {
		} else {
			if ( is_plugin_active( 'woo-discount-rules/woo-discount-rules.php' ) && defined( 'WDR_VERSION' ) &&
			     version_compare( WDR_VERSION, '2.6.2', '>=' ) ) {
				return;
			}
			if ( is_plugin_active( 'cart-for-woocommerce/plugin.php' ) ) {
				return;
			}
			do_action( 'wmc_before_force_recalculate_totals' );
			@WC()->cart->calculate_totals();
			do_action( 'wmc_after_force_recalculate_totals' );
		}
	}
}