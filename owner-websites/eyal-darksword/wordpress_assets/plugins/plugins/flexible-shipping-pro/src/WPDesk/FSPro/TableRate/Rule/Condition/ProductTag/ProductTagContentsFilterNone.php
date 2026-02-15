<?php
/**
 * Class ProductTagContentsFilterNone
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductTag
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductTag;

use WC_Product;
use WP_Term;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against product tags.
 */
class ProductTagContentsFilterNone extends AbstractProductTagContentsFilter {

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

				return array();
			}
		}

		return $contents;
	}

}
