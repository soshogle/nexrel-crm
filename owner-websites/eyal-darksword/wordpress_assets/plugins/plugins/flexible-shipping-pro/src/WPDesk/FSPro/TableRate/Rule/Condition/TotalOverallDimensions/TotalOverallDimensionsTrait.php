<?php
/**
 * Class TotalOverallDimensions
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions;

use WC_Product;

/**
 * Common methods.
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions
 */
trait TotalOverallDimensionsTrait {
	/**
	 * @param WC_Product $product .
	 *
	 * @return float
	 */
	private function get_product_sum_dimension( $product ) {
		return (float) array_sum( array_values( $product->get_dimensions( false ) ) );
	}
}
