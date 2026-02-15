<?php
/**
 * ProductCategoryImportData.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

/**
 * Class Hooks
 */
class ProductCategoryImportData extends ProductTaxonomy {
	/**
	 * @var string
	 */
	protected $taxonomy = 'product_cat';

	/**
	 * @var string
	 */
	protected $condition_id = ProductCategory::CONDITION_ID;


	/**
	 * @param string[] $product_term_names .
	 *
	 * @return array
	 */
	protected function populate_terms( array $product_term_names ) {
		$terms = array();

		foreach ( $product_term_names as $term_name ) {
			$terms[] = $this->get_term_id_by_hierarchy( $this->get_parsed_categories( $term_name ) );
		}

		return array_filter( $terms );
	}

	/**
	 * @param array $categories .
	 *
	 * @return int
	 */
	private function get_term_id_by_hierarchy( $categories ) {
		$term_id = 0;

		foreach ( $categories as $category ) {
			$term = $this->term_exists( $category, $term_id );

			if ( $term ) {
				$term_id = $term['term_id'];
			} else {
				$term_id = $this->create_term( $category, $term_id );
			}
		}

		return $term_id;
	}

	/**
	 * @param string $categories .
	 *
	 * @return string[]
	 */
	private function get_parsed_categories( $categories ) {
		return explode( ProductCategoryExportData::CATEGORY_SEPARATOR, $categories );
	}
}
