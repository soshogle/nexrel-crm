<?php
/**
 * Class AjaxHandler
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\Product
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\Product;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WC_Product;

/**
 * Can handle AJAX request.
 */
class AjaxHandler implements Hookable {

	const NONCE_ACTION = 'product';
	const AJAX_ACTION = 'flexible-shipping-pro-product';

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_' . self::AJAX_ACTION, array( $this, 'ajax_get_items' ) );
	}

	/**
	 * @internal
	 */
	public function ajax_get_items() {
		check_ajax_referer( self::NONCE_ACTION, 'security' );

		$search_text = isset( $_GET['s'] ) ? wc_clean( wp_unslash( $_GET['s'] ) ) : ''; // phpcs:ignore.

		$items = wc_get_products(
			array(
				's'     => $search_text,
				'limit' => - 1,
			)
		);

		$products = array();

		/** @var WC_Product $product */
		foreach ( $items as $product ) {
			$products[] = $this->prepare_single_item( $product->get_id(), $product->get_name() );

			if ( method_exists( $product, 'get_available_variations' ) ) {
				$variations = wp_list_pluck( $product->get_available_variations(), 'variation_id' );

				foreach ( $variations as $variation_id ) {
					$variation_product = wc_get_product( $variation_id );

					$products[] = $this->prepare_single_item( $variation_product->get_id(), '&nbsp;&nbsp;' . $variation_product->get_name() );
				}
			}
		}

		wp_send_json( $products );
	}

	/**
	 * @param int    $value .
	 * @param string $label .
	 *
	 * @return array
	 */
	public function prepare_single_item( $value, $label ) {
		return array(
			'value' => $value,
			'label' => sprintf( '%s (#%d)', esc_attr( $label ), $value ),
		);
	}
}
