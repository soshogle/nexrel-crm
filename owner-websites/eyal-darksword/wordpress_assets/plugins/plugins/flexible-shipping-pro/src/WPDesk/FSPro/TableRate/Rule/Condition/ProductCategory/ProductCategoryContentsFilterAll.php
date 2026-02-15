<?php
/**
 * Class ProductCategoryContentsFilterAll
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against product categories.
 */
class ProductCategoryContentsFilterAll extends AbstractProductCategoryContents {

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
			$product = $this->get_product_from_item( $item );
			if ( $this->is_matched( $product ) ) {
				$categries = $product->get_category_ids();
				foreach ( $categries as $category_id ) {
					$matched[ $category_id ] = 1;
				}
			} else {
				unset( $contents[ $key ] );
			}
		}
		foreach ( $this->categories as $category_id ) {
			if ( ! isset( $matched[ $category_id ] ) ) {

				return array();
			}
		}

		return $contents;
	}

}
