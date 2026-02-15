<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Extra_Product_Options
 * Author: ThemeHigh
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Extra_Product_Options {
	protected $settings;

	public function __construct() {
		if ( ! is_plugin_active( 'woocommerce-extra-product-options-pro/woocommerce-extra-product-options-pro.php' ) ) {
			return;
		}
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter( 'thwepo_extra_option_display_price', array(
				$this,
				'thwepo_extra_option_display_price'
			), 10, 2 );

			add_filter( 'woocommerce_add_cart_item_data', array( $this, 'woocommerce_add_cart_item_data' ), 20, 4 );
			add_filter( 'thwepo_product_price', array( $this, 'thwepo_product_price' ), 10, 3 );
			add_filter( 'thwepo_product_field_price', array( $this, 'thwepo_product_field_price' ), 10, 5 );

			//new version base on it comp
//			add_action('woocommerce_before_add_to_cart_button', [$this, 'thwepo_render_woocs_multiplier']);
			// Convert the display price of each field
//			add_filter('thwepo_extra_cost_unit_price', [$this, 'thwepo_extra_cost_unit_price'], 10, 4);
//			add_filter('thwepo_extra_cost_option_price', [$this, 'thwepo_extra_cost_option_price'], 10, 4);

			// Check the ajax filter is triggering on Ajax.
			$action = isset($_POST['action']) && $_POST['action'] ? $_POST['action'] : '';
			if(wp_doing_ajax() && $action === 'thwepo_calculate_extra_cost'){
				// Convert the field price during the calculation.
//				add_filter('thwepo_product_field_extra_cost', [$this, 'thwepo_convert_ajax_field_price'], 10, 5);
				// Convert the product price
//				add_filter('thwepo_product_price', [$this, 'thwepo_convert_ajax_product_price'], 10, 3);
			} else {
				add_filter('thwepo_product_field_extra_cost', [$this, 'thwepo_convert_cart_field_price'], 10, 4);
			}
			add_filter('thwepo_cart_page_item_price', array($this, 'thwepo_cart_page_item_price_display'), 10, 3);
			//end version
		}
	}

	/**
	 * @param $price
	 * @param $price_type
	 * @param $name
	 * @param $price_info
	 * @param $index
	 *
	 * @return float|int|mixed|void
	 */
	public function thwepo_product_field_price( $price, $price_type, $name, $price_info, $index ) {
		if ( $price && wp_doing_ajax() ) {
			if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
				return $price;
			}
			$action = isset( $_POST['action'] ) ? sanitize_text_field( $_POST['action'] ) : '';
			if ( $action === 'thwepo_calculate_extra_cost' ) {
				if ( $price_type === 'normal' ) {
					$price = wmc_get_price( $price );
				}
			}
		}

		return $price;
	}

	public function thwepo_extra_cost_unit_price($price, $name, $product_price, $price_type){

		if($this->should_convert_field_price($price_type)) {
			$price = wmc_get_price($price);
		}

		return $price;
	}

	public function thwepo_extra_cost_option_price($price, $price_type, $option, $name){
		$price_type = isset($option['price_type']) && !empty($option['price_type']) ? $option['price_type'] : 'normal';
		if($price && $price_type === 'normal') {
			$price = wmc_get_price($price);
		}

		return $price;
	}

	protected function should_convert_field_price($price_type){
		$covertable_price_type = $this->get_price_type_to_convert();
		return isset($price_type) && in_array($price_type, $covertable_price_type);
	}

	protected function get_price_type_to_convert(){
		$price_types = array('normal', 'custom', 'dynamic', 'dynamic-excl-base-price', 'char-count', 'custom-formula');
		return apply_filters('thwepo_price_types_to_convert', $price_types, $this);
	}

	public function thwepo_convert_ajax_field_price($price, $name, $price_info, $product_info, $price_type){

		if($this->should_convert_field_price($price_type)) {
			$price = wmc_get_price($price);
		}

		return $price;
	}

	public function thwepo_convert_cart_field_price($price, $name, $price_info, $product_info){

		$is_flat_fee = isset($price_info['is_flat_fee']) ? $price_info['is_flat_fee'] : '';

		if($is_flat_fee){
			$price = wmc_get_price( $price );
		}

		return $price;
	}

	public function thwepo_convert_ajax_product_price($price, $product, $is_default) {
		return $product->get_price();
	}

	public function thwepo_cart_page_item_price_display($price, $args, $product_info){
		$price_type = isset($args['price_type']) ? $args['price_type'] : '';
		$field_type = isset($args['field_type']) ? $args['field_type'] : 'text';
		if(!$price_type && THWEPO_Utils_Field::is_option_field($field_type)){
			$price_type = 'normal';
		}

		if($this->should_convert_field_price($price_type) || $price_type === 'percentage') {
			$price = wmc_get_price($price);
		}

		return $price;

	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 * @param $is_default
	 *
	 * @return mixed
	 */
	public function thwepo_product_price( $price, $product, $is_default ) {
		if ( $product ) {
			$price = $is_default ? $product->get_price_html() : $product->get_price();
		}

		return $price;
	}

	/**
	 * @param $cart_item_data
	 * @param $product_id
	 * @param $variation_id
	 * @param $quantity
	 *
	 * @return mixed
	 */
	public function woocommerce_add_cart_item_data( $cart_item_data, $product_id, $variation_id, $quantity ) {
		$current_currency = $this->settings->get_current_currency();
		$default_currency = $this->settings->get_default_currency();
		if ( is_array( $cart_item_data['thwepo_options'] ) && count( $cart_item_data['thwepo_options'] ) ) {
			foreach ( $cart_item_data['thwepo_options'] as $key => $value ) {
				if ( $value['price_type'] == 'custom' ) {
					if ( $current_currency != $default_currency ) {
						$cart_item_data['thwepo_options'][ $key ]['value'] *= 1 / wmc_get_price( 1, $current_currency );
					}
				}
			}
		}

		return $cart_item_data;
	}

	/**
	 * @param $display_price
	 * @param $price
	 *
	 * @return string
	 */
	public function thwepo_extra_option_display_price( $display_price, $price ) {
		return wc_price( wmc_get_price( $price ) );
	}
}