<?php
/**
 * Class TotalOverallDimensions
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against sum of dimension.
 */
class TotalOverallDimensionsContentsFilter implements ContentsFilter {
	use TotalOverallDimensionsTrait;

	/** @var float */
	private $min;

	/** @var float */
	private $max;

	/**
	 * SumOfDimensionsContentsFilter constructor.
	 *
	 * @param float $min .
	 * @param float $max .
	 */
	public function __construct( $min, $max ) {
		$this->min = $min;
		$this->max = $max;
	}

	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	public function get_filtered_contents( array $contents ) {
		foreach ( $contents as $key => $item ) {
			if ( $this->should_be_item_removed( $this->get_product_from_item( $item ) ) ) {
				unset( $contents[ $key ] );
			}
		}

		return $contents;
	}

	/**
	 * @param array $item .
	 *
	 * @return WC_Product
	 */
	private function get_product_from_item( array $item ) {
		return $item['data'];
	}

	/**
	 * @param WC_Product $product .
	 *
	 * @return bool
	 */
	private function should_be_item_removed( $product ) {
		$dimension_sum = $this->get_product_sum_dimension( $product );

		return $dimension_sum < $this->min || $dimension_sum > $this->max;
	}
}
