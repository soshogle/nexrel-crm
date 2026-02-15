<?php
/**
 * Class ProductCategoryContentsFilterAny
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against product categories.
 */
class ProductCategoryContentsFilterAny extends AbstractProductCategoryContents {

	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	public function get_filtered_contents( array $contents ) {
		foreach ( $contents as $key => $item ) {
			if ( $this->is_matched( $this->get_product_from_item( $item ) ) ) {
				continue;
			}

			unset( $contents[ $key ] );
		}

		return $contents;
	}

}
