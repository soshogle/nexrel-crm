<?php
/**
 * Class ProductDimensionContentsFilter
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductDimension
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductDimension;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against specified dimension.
 */
abstract class ProductDimensionContentsFilter implements ContentsFilter {

	/** @var float */
	private $min;

	/** @var float */
	private $max;

	/**
	 * MaximumDimensionContentsFilter constructor.
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
	private function should_be_item_removed( $product ): bool {
		$dimension_max = $this->get_product_dimension( $product );

		return $dimension_max < $this->min || $dimension_max > $this->max;
	}

	/**
	 * @param WC_Product
	 *
	 * @return float
	 * @throws NotImplementedException .
	 */
	protected function get_product_dimension( $product ): float {
		throw new NotImplementedException();
	}

}
