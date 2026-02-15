<?php
/**
 * ProductTagExportData.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WP_Term;
use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractExportData;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductTag;

/**
 * Class Hooks
 */
class ProductTagExportData extends AbstractExportData {
	/**
	 * @var string
	 */
	protected $condition_id = ProductTag::CONDITION_ID;

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 *
	 * @return mixed
	 */
	public function prepare_data( $value, $field_name ) {
		if ( ProductTag::CONDITION_ID !== $field_name ) {
			return $value;
		}

		$product_tag_ids = wp_parse_id_list( $value );

		$new_value = array();

		foreach ( $product_tag_ids as $product_tag_id ) {
			$product_tag = $this->get_product_tag_name_by_id( $product_tag_id );

			if ( $product_tag ) {
				$new_value[] = htmlspecialchars_decode( str_replace( ',', '\,', $product_tag ) );
			}
		}

		return $new_value;
	}

	/**
	 * @param int $term_id .
	 *
	 * @return false|string
	 */
	private function get_product_tag_name_by_id( $term_id ) {
		$term = get_term_by( 'id', $term_id, 'product_tag' );

		if ( $term instanceof WP_Term ) {
			return $term->name;
		}

		return false;
	}
}
