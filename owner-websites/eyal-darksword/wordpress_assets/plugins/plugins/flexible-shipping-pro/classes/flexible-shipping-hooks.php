<?php

use FSProVendor\WPDesk\Beacon\Beacon\WooCommerceSettingsFieldsModifier;
use WPDesk\FSPro\TableRate\CalculationMethodOptions;
use WPDesk\FSPro\TableRate\CartCalculationOptions;
use WPDesk\FSPro\TableRate\FreeShipping\FreeShippingRequiresOptions;
use WPDesk\FSPro\TableRate\Rule\Condition\CartLineItem;
use WPDesk\FSPro\TableRate\Rule\Condition\Item;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;
use WPDesk\FSPro\TableRate\ShippingClassSettings;

class WPDesk_Flexible_Shipping_Pro_FS_Hooks {

	use ShippingClassSettings;

	const METHOD_FREE_SHIPPING_IGNORE_DISCOUNTS = 'method_free_shipping_ignore_discounts';

	private $scripts_version = '3';

	public function __construct() {

		add_filter( 'flexible_shipping_method_settings', array( $this, 'flexible_shipping_method_settings' ), 1, 2 );
		add_filter( 'flexible_shipping_process_admin_options', array(
			$this,
			'flexible_shipping_process_admin_options'
		), 10, 1 );

		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );

		add_action( 'flexible_shipping_actions_row', array( $this, 'flexible_shipping_actions_row' ) );

	}

	/**
	 * @param array $form_fields .
	 *
	 * @return array
	 */
	private function add_beacon_search_data_to_fields( array $form_fields ) {
		$modifier = new WooCommerceSettingsFieldsModifier();

		return $modifier->append_beacon_search_data_to_fields( $form_fields );
	}

	/**
	 * Append and modify shipping method fields.
	 *
	 * @param array $flexible_shipping_settings .
	 * @param array $shipping_method            .
	 *
	 * @return array
	 */
	public function flexible_shipping_method_settings( $flexible_shipping_settings, $shipping_method ) {
		$flexible_shipping_settings_new = array();
		foreach ( $flexible_shipping_settings as $key => $setting ) {
			if ( 'method_visibility' === $key ) {
				$flexible_shipping_settings_new['cart_calculation'] = array(
					'title'       => __( 'Cart Calculation', 'flexible-shipping-pro' ),
					'type'        => 'select',
					'default'     => isset( $shipping_method['cart_calculation'] ) ? $shipping_method['cart_calculation'] : 'cart',
					'options'     => ( new CartCalculationOptions() )->get_options(),
					'description' => __( 'Choose Package value to exclude virtual products from rules calculation.', 'flexible-shipping-pro' ),
					'desc_tip'    => true,
				);
			}
			if ( 'method_free_shipping' === $key ) {
				$flexible_shipping_settings_new['method_free_shipping_requires'] = array(
					'title'       => __( 'Free Shipping Requires', 'flexible-shipping-pro' ),
					'type'        => 'select',
					'default'     => isset( $shipping_method['method_free_shipping_requires'] ) ? $shipping_method['method_free_shipping_requires'] : 'order_amount',
					'options'     => ( new FreeShippingRequiresOptions() )->get_options(),
					'description' => __( 'Condition for free shipping', 'flexible-shipping-pro' ),
					'desc_tip'    => true,
				);
			}
			if ( 'method_free_shipping_label' === $key ) {
				$method_free_shipping_ignore_discounts_value = isset( $shipping_method[ self::METHOD_FREE_SHIPPING_IGNORE_DISCOUNTS ] ) ? $shipping_method[ self::METHOD_FREE_SHIPPING_IGNORE_DISCOUNTS ] : 'no';

				$flexible_shipping_settings_new[ self::METHOD_FREE_SHIPPING_IGNORE_DISCOUNTS ] = array(
					'title'       => __( 'Coupons discounts', 'flexible-shipping-pro' ),
					'label'       => __( 'Apply minimum order rule before coupon discount', 'flexible-shipping-pro' ),
					'type'        => 'checkbox',
					'default'     => $method_free_shipping_ignore_discounts_value,
					'description' => __( 'If checked, free shipping would be available based on pre-discount order amount.', 'flexible-shipping-pro' ),
					'desc_tip'    => true,
				);
			}
			if ( 'method_calculation_method' === $key ) {
				$flexible_shipping_settings_new['method_max_cost'] = array(
					'title'       => __( 'Maximum Cost', 'flexible-shipping-pro' ),
					'type'        => 'price',
					'default'     => isset( $shipping_method['method_max_cost'] ) ? $shipping_method['method_max_cost'] : '',
					'description' => __( 'Set a maximum cost of shipping. This will override the costs configured below.', 'flexible-shipping-pro' ),
					'desc_tip'    => true,
				);
			}
			$flexible_shipping_settings_new[ $key ] = $setting;
		}
		$flexible_shipping_settings_new['method_calculation_method']['options'] = ( new CalculationMethodOptions() )->get_options();

		return $this->add_beacon_search_data_to_fields( $flexible_shipping_settings_new );
	}

	function enqueue_admin_scripts() {
		$current_screen = get_current_screen();
		$wc_screen_id = sanitize_title( __( 'WooCommerce', 'woocommerce' ) );

		if ( $wc_screen_id . '_page_wc-settings' === $current_screen->id  ) {
			$suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
			wp_enqueue_style( 'flexible-shipping-pro-admin', plugins_url( 'flexible-shipping-pro/assets/css/admin' . $suffix . '.css' ), array(), $this->scripts_version );
			wp_enqueue_script( 'flexible-shipping-pro-admin', plugins_url( 'flexible-shipping-pro/assets/js/admin' . $suffix . '.js' ), array(), $this->scripts_version );
		}
	}

	/**
	 * Process admin options.
	 *
	 * @param array $shipping_method .
	 *
	 * @return array
	 */
	public function flexible_shipping_process_admin_options( $shipping_method ) {
		$post_data = $_POST; // phpcs:ignore

		$shipping_method['method_max_cost'] = wc_format_decimal( sanitize_text_field( wp_unslash( $post_data['woocommerce_flexible_shipping_method_max_cost'] ) ) );

		$shipping_method['method_free_shipping_requires'] = sanitize_text_field( wp_unslash( $post_data['woocommerce_flexible_shipping_method_free_shipping_requires'] ) );

		$shipping_method[ self::METHOD_FREE_SHIPPING_IGNORE_DISCOUNTS ] = isset( $post_data['woocommerce_flexible_shipping_method_free_shipping_ignore_discounts'] ) ? 'yes' : 'no';

		$shipping_method['cart_calculation'] = sanitize_text_field( wp_unslash( $post_data['woocommerce_flexible_shipping_cart_calculation'] ) );

		return $shipping_method;
	}

	public function flexible_shipping_actions_row() {
		$atts = [
			'id'               => 'flexible_shipping_export_selected',
			'data-instance-id' => $_GET['instance_id'],
			'data-nonce'       => wp_create_nonce( "flexible_shipping" ),
			'disabled'         => '',
		];

		submit_button( __( 'Export selected', 'flexible-shipping-pro' ), 'button', 'export', false, $atts );
	}

}
