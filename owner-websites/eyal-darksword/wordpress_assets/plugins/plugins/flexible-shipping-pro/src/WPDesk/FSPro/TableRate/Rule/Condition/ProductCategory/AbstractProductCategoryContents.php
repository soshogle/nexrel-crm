<?php
/**
 * Class AbstractProductCategoryContentsFilter
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

use WC_Product;
use WPDesk\FS\TableRate\Rule\ContentsFilter;

/**
 * Can filter shipping contents against product categories.
 */
abstract class AbstractProductCategoryContents implements ContentsFilter {

	/**
	 * @var int[]
	 */
	protected $categories;

	/**
	 * @var array
	 */
	protected $present_product_categories = array();

	/**
	 * ProductCategoryContentsFilter constructor.
	 *
	 * @param array $categories .
	 */
	public function __construct( array $categories ) {
		$this->categories = wp_parse_id_list( $categories );
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
	 * @param array $item .
	 *
	 * @return WC_Product
	 */
	protected function get_product_from_item( array $item ) {
		$parent_id = $item['data']->get_parent_id();

		return $parent_id ? wc_get_product( $parent_id ) : $item['data'];
	}

	/**
	 * @param WC_Product $product .
	 *
	 * @return bool
	 */
	protected function is_matched( $product ) {
		$categories         = $this->get_all_categories( $this->categories );
		$product_categories = wp_parse_id_list( $product->get_category_ids() );

		foreach ( $product_categories as $product_category ) {
			if ( in_array( $product_category, $categories, true ) ) {
				$this->present_product_categories[ $product_category ] = 1;

				return true;
			}
		}

		return false;
	}

	/**
	 * @param int[] $category_ids .
	 *
	 * @return int[]
	 */
	private function get_all_categories( $category_ids ) {
		$categories = array();

		foreach ( $category_ids as $category_id ) {
			$categories[] = $category_id;

			$category_children = get_term_children( $category_id, 'product_cat' );

			$categories = array_merge( $categories, $category_children );
		}

		return array_filter( array_unique( wp_parse_id_list( $categories ) ) );
	}
}
