<?php
/**
 * Class MaxDimensionTrait
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\MaxDimension
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\MaxDimension;

use WC_Product;

/**
 * Common methods.
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\MaxDimension
 */
trait MaxDimensionTrait {
	/**
	 * @param array $contents .
	 *
	 * @return float
	 */
	private function get_cart_max_dimension( $contents ) {
		$dimensions = array( 0.0 );

		$products = wp_list_pluck( $contents, 'data' );

		/** @var WC_Product $product */
		foreach ( $products as $product ) {
			$dimensions[] = $this->get_product_max_dimension( $product );
		}

		return (float) max( array_filter( $dimensions ) );
	}

	/**
	 * @param WC_Product $product .
	 *
	 * @return float
	 */
	private function get_product_max_dimension( $product ) {
		return (float) max( array_values( $product->get_dimensions( false ) ) );
	}
}
