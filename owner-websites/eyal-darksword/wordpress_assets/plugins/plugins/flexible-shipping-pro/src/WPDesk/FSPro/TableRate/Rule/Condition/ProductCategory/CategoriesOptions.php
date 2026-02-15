<?php
/**
 * Class CategoriesOptions
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

use WP_Term;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

/**
 * Can provide product categories options.
 */
class CategoriesOptions {
	const CATEGORY_SEPARATOR = ' > ';

	/**
	 * @param string $search_text .
	 *
	 * @return array
	 */
	public function search_categories( $search_text ) {
		$found_categories = array();
		$args             = array(
			'taxonomy'   => array( 'product_cat' ),
			'orderby'    => 'id',
			'order'      => 'ASC',
			'hide_empty' => false,
			'fields'     => 'all',
			'name__like' => $search_text,
		);

		$terms = get_terms( $args );

		if ( $terms ) {
			foreach ( $terms as $term ) {
				$found_categories[] = $this->prepare_option( $term->term_id, $this->get_term_formatted_name( $term ) );
			}
		}

		return $found_categories;
	}

	/**
	 * @param WP_Term $term .
	 *
	 * @return string
	 */
	private function get_term_formatted_name( WP_Term $term ) {
		$formatted_name = get_term_parents_list(
			$term->term_id,
			$term->taxonomy,
			array(
				'separator' => self::CATEGORY_SEPARATOR,
				'link'      => false,
			)
		);

		return trim( $formatted_name, self::CATEGORY_SEPARATOR );
	}

	/**
	 * @param string $category_id .
	 *
	 * @return array|null
	 */
	public function get_category_option( $category_id ) {
		$option = null;
		$term   = get_term( $category_id, 'product_cat' );

		if ( $term ) {
			$option = $this->prepare_option( $term->term_id, $this->get_term_formatted_name( $term ) );
		}

		return $option;
	}

	/**
	 * @param string $value .
	 * @param string $label .
	 *
	 * @return array
	 */
	private function prepare_option( $value, $label ) {
		return array(
			'value' => $value,
			'label' => $label,
		);
	}
}
