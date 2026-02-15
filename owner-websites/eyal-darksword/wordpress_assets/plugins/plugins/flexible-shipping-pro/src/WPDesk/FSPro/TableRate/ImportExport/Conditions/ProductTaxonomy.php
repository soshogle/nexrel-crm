<?php
/**
 * ProductTagImportData.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WP_Term;
use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractImportData;

/**
 * Class Hooks
 */
abstract class ProductTaxonomy extends AbstractImportData {
	/**
	 * @var string
	 */
	protected $taxonomy;

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 * @param array  $mapped     .
	 *
	 * @return mixed
	 */
	public function prepare_data( $value, $field_name, $mapped = array() ) {
		if ( $this->condition_id !== $field_name ) {
			return $value;
		}

		$value = str_replace( '\,', '%2C', $value );

		$product_terms = array_map(
			function ( $product_term ) {
				return str_replace( '%2C', ',', $product_term );
			},
			explode( ',', $value )
		);

		return $this->populate_terms( $product_terms );
	}

	/**
	 * @param string[] $product_term_names .
	 *
	 * @return array
	 */
	protected function populate_terms( array $product_term_names ) {
		$terms = array();

		foreach ( $product_term_names as $term_name ) {
			$term = $this->get_term_by_name( $term_name );

			if ( $term ) {
				$terms[] = $term->term_id;
			} else {
				$terms[] = $this->create_term( $term_name );
			}
		}

		return array_filter( $terms );
	}

	/**
	 * @param string $name   .
	 * @param int    $parent .
	 *
	 * @return false|int
	 */
	protected function create_term( $name, $parent = 0 ) {
		$term = wp_insert_term( $name, $this->taxonomy, array( 'parent' => $parent ) );

		if ( is_array( $term ) ) {
			return (int) $term['term_id'];
		}

		return false;
	}

	/**
	 * @param int $name .
	 *
	 * @return false|WP_Term
	 */
	protected function get_term_by_name( $name ) {
		$term = get_term_by( 'name', $name, $this->taxonomy );

		if ( $term instanceof WP_Term ) {
			return $term;
		}

		return false;
	}

	/**
	 * @param string $name   .
	 * @param int    $parent .
	 *
	 * @return int|mixed
	 */
	protected function term_exists( $name, $parent = 0 ) {
		return term_exists( $name, $this->taxonomy, $parent );
	}
}
