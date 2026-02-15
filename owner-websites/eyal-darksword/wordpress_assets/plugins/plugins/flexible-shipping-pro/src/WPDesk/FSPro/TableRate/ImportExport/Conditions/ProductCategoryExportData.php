<?php
/**
 * ProductTagExportData.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractExportData;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory;

/**
 * Class Hooks
 */
class ProductCategoryExportData extends AbstractExportData {
	const CATEGORY_SEPARATOR = '>>';

	/**
	 * @var string
	 */
	protected $condition_id = ProductCategory::CONDITION_ID;

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 *
	 * @return mixed
	 */
	public function prepare_data( $value, $field_name ) {
		if ( ProductCategory::CONDITION_ID !== $field_name ) {
			return $value;
		}

		$product_category_ids = wp_parse_id_list( $value );

		$new_value = array();

		foreach ( $product_category_ids as $product_category_id ) {
			$product_category = $this->get_term_parents_list( $product_category_id );

			if ( $product_category ) {
				$new_value[] = htmlspecialchars_decode( str_replace( ',', '\,', $product_category ) );
			}
		}

		return $new_value;
	}

	/**
	 * @param int $term_id .
	 *
	 * @return false|string
	 */
	private function get_term_parents_list( $term_id ) {
		$terms_list = get_term_parents_list(
			$term_id,
			'product_cat',
			array(
				'separator' => self::CATEGORY_SEPARATOR,
				'link'      => false,
			)
		);

		if ( is_wp_error( $terms_list ) ) {
			return false;
		}

		return trim( $terms_list, self::CATEGORY_SEPARATOR );
	}
}
