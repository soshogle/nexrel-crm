<?php
/**
 * Class AjaxProvider
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can handle AJAX request.
 */
class AjaxHandler implements Hookable {

	const NONCE_ACTION = 'product-category';
	const AJAX_ACTION  = 'flexible-shipping-pro-product-category';

	/**
	 * @var CategoriesOptions
	 */
	private $categories_options;

	/**
	 * AjaxProvider constructor.
	 *
	 * @param CategoriesOptions $categories_options .
	 */
	public function __construct( CategoriesOptions $categories_options ) {
		$this->categories_options = $categories_options;
	}

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_' . self::AJAX_ACTION, array( $this, 'send_product_categories_json' ) );
	}

	/**
	 * @internal
	 */
	public function send_product_categories_json() {
		check_ajax_referer( self::NONCE_ACTION, 'security' );
		$search_text = isset( $_GET['s'] ) ? wc_clean( wp_unslash( $_GET['s'] ) ) : ''; // phpcs:ignore.
		wp_send_json( $this->categories_options->search_categories( $search_text ) );
	}

}
