<?php
/**
 * Class AbstractProductContentsFilter
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\Product
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\Product;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against product.
 */
abstract class AbstractProductContentsFilter implements ContentsFilter {

	/**
	 * @var array
	 */
	protected $products = array();

	/**
	 * ProductContentsFilter constructor.
	 *
	 * @param WC_Product[] $products .
	 */
	public function __construct( array $products ) {
		foreach ( $products as $product ) {
			$this->products[] = $product->get_id();
		}
	}

	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	abstract public function get_filtered_contents( array $contents );

	/**
	 * @param int $product_id   .
	 * @param int $variation_id .
	 *
	 * @return bool
	 */
	protected function is_matched( $product_id, $variation_id ) {
		return in_array( $product_id, $this->products ) || in_array( $variation_id, $this->products );
	}

}
