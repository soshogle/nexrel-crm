<?php
/**
 * Class ProductTagContentsFilterAll
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
class ProductTagContentsFilterAll extends AbstractProductTagContentsFilter {

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
			if ( $this->is_matched( $this->get_product_from_item( $item ) ) ) {
				$tags = $product->get_tag_ids();
				foreach ( $tags as $tag ) {
					$matched[ $tag ] = 1;
				}
			} else {
				unset( $contents[ $key ] );
			}
		}
		foreach ( $this->tags as $tag ) {
			if ( ! isset( $matched[ $tag->term_id ] ) ) {

				return array();
			}
		}

		return $contents;
	}

}
