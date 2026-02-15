<?php
/**
 * Class ProductContentsFilterAll
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\Product
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\Product;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against product.
 */
class ProductContentsFilterAll extends AbstractProductContentsFilter {

	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	public function get_filtered_contents( array $contents ) {
		$matched = array();
		foreach ( $contents as $key => $item ) {
			if ( $this->is_matched( $item['product_id'], $item['variation_id'] ) ) {
				$matched[ $item['product_id'] ]   = 1;
				$matched[ $item['variation_id'] ] = 1;
			} else {
				unset( $contents[ $key ] );
			}
		}
		foreach ( $this->products as $product_id ) {
			if ( ! isset( $matched[ $product_id ] ) ) {

				return array();
			}
		}

		return $contents;
	}

}
