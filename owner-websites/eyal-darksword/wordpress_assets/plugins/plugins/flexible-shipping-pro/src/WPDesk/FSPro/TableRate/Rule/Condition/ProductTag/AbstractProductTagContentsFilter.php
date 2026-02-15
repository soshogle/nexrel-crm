<?php
/**
 * Class AbstractTagContentsFilter
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
abstract class AbstractProductTagContentsFilter implements ContentsFilter {

	/**
	 * @var WP_Term[]
	 */
	protected $tags;

	/**
	 * ProductContentsFilter constructor.
	 *
	 * @param WP_Term[] $tags .
	 */
	public function __construct( array $tags ) {
		$this->tags = $tags;
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
	 * @param WC_Product $product .
	 *
	 * @return bool
	 */
	protected function is_matched( $product ) {
		foreach ( $this->tags as $tag ) {
			if ( has_term( $tag->term_id, $tag->taxonomy, $product->get_id() ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param array $item .
	 *
	 * @return WC_Product
	 */
	protected function get_product_from_item( array $item ) {
		$parent_id = $item['data']->get_parent_id();

		return $parent_id ? wc_get_product( $parent_id ) : $item['data'];
	}
}
