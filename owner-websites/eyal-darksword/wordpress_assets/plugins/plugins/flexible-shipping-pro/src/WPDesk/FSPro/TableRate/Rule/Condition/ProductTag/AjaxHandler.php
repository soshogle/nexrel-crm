<?php
/**
 * Class AjaxHandler
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductTag
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductTag;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WP_Term;

/**
 * Can handle AJAX request.
 */
class AjaxHandler implements Hookable {

	const NONCE_ACTION = 'tag';
	const AJAX_ACTION = 'flexible-shipping-pro-tag';

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

		$items = get_terms(
			array(
				'taxonomy'   => 'product_tag',
				'hide_empty' => false,
				'name__like' => $search_text,
			)
		);

		$items = array_map( array( $this, 'prepare_single_item' ), $items );

		wp_send_json( $items );
	}

	/**
	 * @param WP_Term $item .
	 *
	 * @return array
	 */
	public function prepare_single_item( $item ) {
		return array(
			'value' => $item->term_id,
			'label' => $item->name,
		);
	}
}
